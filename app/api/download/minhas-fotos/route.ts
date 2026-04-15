import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { r2, BUCKET } from '@/lib/r2'

export const dynamic = 'force-dynamic'

// ── D1 helpers (inline — no auth needed beyond env) ──────────────────────────

interface MediaRow {
  id: string
  author: string
  status: string
  type: string
  created_at: string
}

async function getApprovedPhotosByAuthor(author: string, limit = 50): Promise<MediaRow[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const dbId      = process.env.CLOUDFLARE_D1_DATABASE_ID
  const token     = process.env.CLOUDFLARE_API_TOKEN

  if (!accountId || !dbId || !token) return []

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sql: `SELECT id, author, status, type, created_at FROM media WHERE author = ? AND status = 'approved' AND type = 'image' ORDER BY created_at DESC LIMIT ?`,
      params: [author, limit],
    }),
    cache: 'no-store',
  })

  if (!res.ok) return []
  const json = await res.json() as { result: Array<{ results: MediaRow[] }>; success: boolean }
  if (!json.success) return []
  return json.result[0]?.results ?? []
}

function keyFromId(id: string): string {
  // The media ID stored in D1 is the R2 object key
  return id
}

async function downloadR2Object(key: string): Promise<Buffer | null> {
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
    const res = await r2.send(cmd)
    if (!res.Body) return null
    // Body is a ReadableStream from AWS SDK — collect it
    const chunks: Uint8Array[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const chunk of res.Body as AsyncIterable<any>) {
      chunks.push(chunk instanceof Uint8Array ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  } catch {
    return null
  }
}

// GET /api/download/minhas-fotos?author=NomeDoConvidado
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const author = (searchParams.get('author') ?? '').trim()

  if (!author) {
    return NextResponse.json({ error: 'Parâmetro author é obrigatório.' }, { status: 400 })
  }

  const photos = await getApprovedPhotosByAuthor(author, 50)

  if (photos.length === 0) {
    return NextResponse.json({ error: 'Nenhuma foto encontrada para este nome.' }, { status: 404 })
  }

  const zip = new JSZip()
  const folder = zip.folder('minhas-fotos-cha-jose-augusto')!

  let added = 0
  await Promise.all(
    photos.map(async (photo, idx) => {
      const key = keyFromId(photo.id)
      const buffer = await downloadR2Object(key)
      if (buffer) {
        const ext = key.endsWith('.webp') ? 'webp' : key.split('.').pop() ?? 'jpg'
        folder.file(`foto_${String(idx + 1).padStart(3, '0')}.${ext}`, buffer)
        added++
      }
    }),
  )

  if (added === 0) {
    return NextResponse.json({ error: 'Não foi possível baixar as fotos. Tente novamente.' }, { status: 500 })
  }

  const zipNodeBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  const zipBuffer = new Uint8Array(zipNodeBuffer)

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="minhas-fotos-cha-jose-augusto.zip"',
      'Cache-Control': 'no-store',
    },
  })
}
