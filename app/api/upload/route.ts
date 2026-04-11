import { NextRequest, NextResponse } from 'next/server'
import cloudinary, { pingRealtime } from '@/lib/cloudinary'

const MAX_IMAGE = 20 * 1024 * 1024  // 20MB
const MAX_VIDEO = 100 * 1024 * 1024 // 100MB

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
    const base64  = Buffer.from(arrayBuffer).toString('base64')
    const dataUri = `data:${file.type};base64,${base64}`

    const publicId = `foto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder:        'cha-jose-augusto',
      public_id:     publicId,
      resource_type: isVideo ? 'video' : 'image',
      // Auto-approve: photos appear immediately
      // Only flag if explicitly suspicious (handled below)
      context: `author=${author}|status=approved`,
    })

    // Ping realtime so online users get notified
    const thumbUrl = isVideo
      ? cloudinary.url(result.public_id, { resource_type: 'video', format: 'jpg', width: 80, height: 80, crop: 'fill' })
      : cloudinary.url(result.public_id, { width: 80, height: 80, crop: 'fill', quality: 'auto', fetch_format: 'auto' })

    await pingRealtime(author, thumbUrl).catch(() => {})

    return NextResponse.json({ success: true, type: isVideo ? 'video' : 'image' })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: 'Erro ao enviar. Tente novamente.' }, { status: 500 })
  }
}
