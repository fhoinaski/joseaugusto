import { NextRequest, NextResponse } from 'next/server'
import { uploadBuffer, objectUrl } from '@/lib/r2'
import { dbGetCapsuleCount, dbGetConfig, dbInsertCapsule, isD1AuthError } from '@/lib/db'
import { jsonError, jsonServerError, requireRateLimit } from '@/lib/api-helpers'

const POST_LIMIT = 6
const POST_WINDOW_MS = 60 * 60 * 1000
const MAX_IMAGE = 8 * 1024 * 1024

export async function GET() {
  try {
    const [count, openDate] = await Promise.all([
      dbGetCapsuleCount(),
      dbGetConfig('capsule_open_date', '18 anos'),
    ])
    return NextResponse.json({ count, openDate })
  } catch (err) {
    if (isD1AuthError(err)) {
      console.warn('GET /api/capsule degraded: D1 auth error')
      return NextResponse.json({ count: 0, openDate: '18 anos', degraded: true, reason: 'd1-auth' })
    }
    return jsonServerError('[capsule GET]', err, 'Erro ao carregar capsula.')
  }
}

export async function POST(req: NextRequest) {
  const limited = requireRateLimit(req, 'capsule-post', {
    limit: POST_LIMIT,
    windowMs: POST_WINDOW_MS,
    message: 'Muitas mensagens em pouco tempo. Tente novamente mais tarde.',
  })
  if (limited) return limited

  try {
    const formData = await req.formData()
    const image = formData.get('image') as File | null
    const author = ((formData.get('author') as string) ?? '').trim().slice(0, 100)
    const message = ((formData.get('message') as string) ?? '').trim().slice(0, 500)

    if (!author || !message) return jsonError('Nome e mensagem sao obrigatorios.', 400)

    let imageUrl = ''

    if (image && image.size > 0) {
      if (!image.type.startsWith('image/')) return jsonError('Envie apenas imagem na capsula.', 400)
      if (image.size > MAX_IMAGE) return jsonError('Imagem muito grande. Maximo 8 MB.', 400)

      const buffer = Buffer.from(await image.arrayBuffer())
      const rawExt = image.name.split('.').pop()?.toLowerCase() ?? 'png'
      const ext = /^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : 'png'
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const key = `cha-jose-augusto/capsulas/capsule_${suffix}.${ext}`
      await uploadBuffer(key, buffer, image.type || 'image/png', { author, type: 'capsule' })
      imageUrl = objectUrl(key)
    }

    await dbInsertCapsule(author, message, imageUrl)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return jsonServerError('[capsule POST]', err, 'Erro ao salvar mensagem.')
  }
}
