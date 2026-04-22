import { NextRequest, NextResponse } from 'next/server'
import { dbGetPhotoTags, dbAddPhotoTag, dbGetTaggedPhotosForPerson } from '@/lib/db'
import { cleanText, jsonError, jsonServerError, readJsonBody, requireRateLimit } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

const POST_LIMIT = 60
const POST_WINDOW_MS = 60 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    const mediaId = cleanText(req.nextUrl.searchParams.get('media_id'), 300)
    const person = cleanText(req.nextUrl.searchParams.get('person'), 120)

    if (person) {
      const photos = await dbGetTaggedPhotosForPerson(person)
      return NextResponse.json({ photos })
    }
    if (mediaId) {
      const tags = await dbGetPhotoTags(mediaId)
      return NextResponse.json({ tags })
    }
    return jsonError('Parametro obrigatorio: media_id ou person.', 400)
  } catch (err) {
    return jsonServerError('[tags GET]', err, 'Erro ao carregar marcacoes.')
  }
}

export async function POST(req: NextRequest) {
  const limited = requireRateLimit(req, 'photo-tags', {
    limit: POST_LIMIT,
    windowMs: POST_WINDOW_MS,
    message: 'Muitas marcacoes em pouco tempo. Tente novamente mais tarde.',
  })
  if (limited) return limited

  try {
    const body = await readJsonBody<Record<string, unknown>>(req)
    if (!body) return jsonError('Requisicao invalida.', 400)

    const mediaId = cleanText(body.media_id, 300)
    const taggedName = cleanText(body.tagged_name, 80)
    const taggedBy = cleanText(body.tagged_by, 80, 'Convidado') || 'Convidado'

    if (!mediaId || !taggedName) {
      return jsonError('media_id e tagged_name sao obrigatorios.', 400)
    }

    const ok = await dbAddPhotoTag(mediaId, taggedName, taggedBy)
    if (!ok) return jsonError('Esta pessoa ja foi marcada nesta foto.', 409)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return jsonServerError('[tags POST]', err, 'Erro ao adicionar marcacao.')
  }
}
