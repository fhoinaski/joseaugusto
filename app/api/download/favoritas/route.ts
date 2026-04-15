import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { r2, BUCKET } from '@/lib/r2'

export const dynamic = 'force-dynamic'

// ── D1 helper ─────────────────────────────────────────────────────────────────

interface D1Response<T> {
  result: Array<{ results: T[]; success: boolean }>
  success: boolean
  errors: Array<{ message: string }>
}

interface MediaRow {
  id: string
  type: string
}

async function getMediaByIds(ids: string[]): Promise<MediaRow[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const dbId = process.env.CLOUDFLARE_D1_DATABASE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN

  if (!accountId || !dbId || !token) return []

  const placeholders = ids.map(() => '?').join(',')
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sql: `SELECT id, type FROM media WHERE id IN (${placeholders}) AND status = 'approved'`,
      params: ids,
    }),
    cache: 'no-store',
  })

  if (!res.ok) return []
  const json = (await res.json()) as D1Response<MediaRow>
  if (!json.success) return []
  return json.result[0]?.results ?? []
}

// ── R2 download helper ────────────────────────────────────────────────────────

async function downloadR2Object(key: string): Promise<Buffer | null> {
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
    const res = await r2.send(cmd)
    if (!res.Body) return null
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

// ── GET /api/download/favoritas?ids=id1,id2,... ───────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const idsParam = (searchParams.get('ids') ?? '').trim()

  if (!idsParam) {
    return NextResponse.json({ error: 'Parâmetro ids é obrigatório.' }, { status: 400 })
  }

  const ids = idsParam
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 50)

  if (ids.length === 0) {
    return NextResponse.json({ error: 'Nenhum ID válido fornecido.' }, { status: 400 })
  }

  const rows = await getMediaByIds(ids)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Nenhuma foto aprovada encontrada.' }, { status: 404 })
  }

  const zip = new JSZip()
  const folder = zip.folder('favoritas-cha-jose-augusto')!

  let added = 0
  await Promise.all(
    rows.map(async (row, idx) => {
      const buffer = await downloadR2Object(row.id)
      if (buffer) {
        const ext = row.id.endsWith('.webp') ? 'webp' : row.id.split('.').pop() ?? 'jpg'
        folder.file(`favorita_${String(idx + 1).padStart(3, '0')}.${ext}`, buffer)
        added++
      }
    }),
  )

  if (added === 0) {
    return NextResponse.json({ error: 'Não foi possível baixar as fotos. Tente novamente.' }, { status: 500 })
  }

  const zipNodeBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
  const zipBuffer = new Uint8Array(zipNodeBuffer)

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="favoritas-cha-jose-augusto.zip"',
      'Cache-Control': 'no-store',
    },
  })
}
