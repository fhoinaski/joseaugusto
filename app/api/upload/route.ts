import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { uploadBuffer, objectUrl, pingRealtimeR2 } from '@/lib/r2'
import { dbInsertMedia } from '@/lib/db'

const MAX_IMAGE = 20 * 1024 * 1024  // 20 MB
const MAX_VIDEO = 100 * 1024 * 1024 // 100 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file   = formData.get('media') as File | null
    const author = ((formData.get('author') as string) || 'Convidado').trim().slice(0, 60)

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')

    if (!isVideo && !isImage)
      return NextResponse.json({ error: 'Envie uma foto (JPG/PNG/WEBP) ou vídeo (MP4/MOV).' }, { status: 400 })

    const maxSize = isVideo ? MAX_VIDEO : MAX_IMAGE
    if (file.size > maxSize)
      return NextResponse.json({ error: `Arquivo muito grande. Máximo ${isVideo ? '100' : '20'}MB.` }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    let body: Buffer
    let contentType: string
    let ext: string

    if (isVideo) {
      body = Buffer.from(arrayBuffer)
      contentType = file.type
      ext = file.name.split('.').pop() ?? 'mp4'
    } else {
      body = await sharp(Buffer.from(arrayBuffer)).webp({ quality: 80 }).toBuffer()
      contentType = 'image/webp'
      ext = 'webp'
    }

    const key = `cha-jose-augusto/foto_${suffix}.${ext}`

    // 1. Upload file to R2
    await uploadBuffer(key, body, contentType, { author, status: 'approved' })

    // 2. Record metadata in D1
    await dbInsertMedia(key, author, isVideo ? 'video' : 'image')

    // 3. Ping SSE stream
    await pingRealtimeR2(author, objectUrl(key)).catch(() => {})

    return NextResponse.json({ success: true, type: isVideo ? 'video' : 'image' })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: 'Erro ao enviar. Tente novamente.' }, { status: 500 })
  }
}
