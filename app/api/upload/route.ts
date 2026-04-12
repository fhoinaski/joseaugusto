import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { uploadBuffer, objectUrl, pingRealtimeR2 } from '@/lib/r2'
import { dbInsertMedia } from '@/lib/db'
import { isD1AuthError } from '@/lib/db'

const MAX_IMAGE = 20 * 1024 * 1024  // 20 MB
const MAX_VIDEO = 100 * 1024 * 1024 // 100 MB
const MAX_AUDIO = 30 * 1024 * 1024  //  30 MB

// ── Cloudflare AI image moderation (resnet-50 via REST API) ──────────────────
// Returns 'rejected' if the top label matches a known suspicious category.
// Fails open (returns 'approved') on any error so uploads are never blocked
// by a moderation service outage.
async function moderateImage(imageBuffer: Buffer): Promise<'approved' | 'rejected'> {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const token     = process.env.CLOUDFLARE_API_TOKEN
    if (!accountId || !token) return 'approved'

    const formData = new FormData()
    formData.append('image', new Blob([new Uint8Array(imageBuffer)], { type: 'image/webp' }))

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/microsoft/resnet-50`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData },
    )
    if (!res.ok) return 'approved'

    const json = await res.json() as { result: Array<{ label: string; score: number }> }
    const top  = json.result?.[0]

    // Resnet-50 is not an NSFW classifier — we check for a conservative blocklist
    // of ImageNet categories that may indicate explicit content with high confidence
    const flagged = ['bikini', 'brassiere', 'swimming_trunks', 'miniskirt', 'maillot']
    if (top && flagged.some(s => top.label.toLowerCase().includes(s)) && top.score > 0.85) {
      return 'rejected'
    }
    return 'approved'
  } catch {
    return 'approved' // fail open
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file   = formData.get('media') as File | null
    const authorRaw = ((formData.get('author') as string) || '').trim()
    const author = authorRaw.slice(0, 60)
    const caption = ((formData.get('caption') as string) || '').trim().slice(0, 180)

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    const isAudio = file.type.startsWith('audio/') ||
                    /\.(mp3|webm|ogg|m4a|wav|aac)$/i.test(file.name)

    if (isImage && !author) {
      return NextResponse.json({ error: 'Informe seu nome para enviar imagem.' }, { status: 400 })
    }

    if (!isVideo && !isImage && !isAudio)
      return NextResponse.json({ error: 'Envie uma foto, vídeo (MP4/MOV) ou áudio (MP3/WebM).' }, { status: 400 })

    const maxSize = isVideo ? MAX_VIDEO : isAudio ? MAX_AUDIO : MAX_IMAGE
    if (file.size > maxSize)
      return NextResponse.json({ error: `Arquivo muito grande. Máximo ${isVideo ? '100' : isAudio ? '30' : '20'}MB.` }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    let body:        Buffer
    let contentType: string
    let ext:         string
    let mediaType:   'image' | 'video' | 'audio'
    let status:      'approved' | 'rejected' = 'approved'

    if (isAudio) {
      body        = Buffer.from(arrayBuffer)
      contentType = file.type || 'audio/webm'
      ext         = file.name.split('.').pop() ?? 'webm'
      mediaType   = 'audio'
    } else if (isVideo) {
      body        = Buffer.from(arrayBuffer)
      contentType = file.type
      ext         = file.name.split('.').pop() ?? 'mp4'
      mediaType   = 'video'
    } else {
      // Convert image to WebP 80 quality + run AI moderation in parallel
      const webpBuf = await sharp(Buffer.from(arrayBuffer)).webp({ quality: 80 }).toBuffer()
      const [modStatus] = await Promise.all([moderateImage(webpBuf)])
      body        = webpBuf
      contentType = 'image/webp'
      ext         = 'webp'
      mediaType   = 'image'
      status      = modStatus
    }

    const folder = isAudio ? 'audio' : isVideo ? 'videos' : 'fotos'
    const key    = `cha-jose-augusto/${folder}/foto_${suffix}.${ext}`

    // 1. Upload file to R2
    await uploadBuffer(key, body, contentType, { author: author || 'Convidado', status })

    // 2. Record metadata in D1 (degrade gracefully if token is invalid)
    let degraded = false
    try {
      await dbInsertMedia(key, author || 'Convidado', mediaType, status, caption)
    } catch (err) {
      if (isD1AuthError(err)) {
        degraded = true
        console.warn('[upload] D1 auth error: upload kept in R2 without DB row')
      } else {
        throw err
      }
    }

    // 3. Ping SSE stream (skip for rejected items)
    if (status === 'approved') {
      await pingRealtimeR2(author || 'Convidado', objectUrl(key)).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      type:    mediaType,
      status,
      degraded,
      ...(status === 'rejected' ? { message: 'Imagem bloqueada automaticamente pela moderação.' } : {}),
      ...(degraded ? { warning: 'Upload salvo, mas o banco D1 está indisponível.' } : {}),
    })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: 'Erro ao enviar. Tente novamente.' }, { status: 500 })
  }
}
