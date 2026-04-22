import { NextRequest, NextResponse } from 'next/server'
import { dbGetSeenStoryIds, dbMarkStorySeen } from '@/lib/db'
import { cleanText, jsonError, jsonServerError, readJsonBody, requireRateLimit } from '@/lib/api-helpers'

const POST_LIMIT = 200
const POST_WINDOW_MS = 15 * 60 * 1000

function getSafeUserId(raw: string | null): string {
  return cleanText(raw, 120)
}

export async function GET(req: NextRequest) {
  try {
    const userId = getSafeUserId(req.nextUrl.searchParams.get('user_id'))
    if (!userId) return NextResponse.json({ seen: [] })

    const seen = await dbGetSeenStoryIds(userId)
    return NextResponse.json({ seen })
  } catch (err) {
    return jsonServerError('[stories/seen GET]', err, 'Erro ao carregar stories vistos.')
  }
}

export async function POST(req: NextRequest) {
  const limited = requireRateLimit(req, 'stories-seen', {
    limit: POST_LIMIT,
    windowMs: POST_WINDOW_MS,
    message: 'Muitas atualizacoes em pouco tempo.',
  })
  if (limited) return limited

  try {
    const body = await readJsonBody<Record<string, unknown>>(req)
    if (!body) return jsonError('Requisicao invalida.', 400)

    const userId = getSafeUserId(cleanText(body.user_id, 120))
    const mediaId = cleanText(body.media_id, 300)

    if (!userId || !mediaId) {
      return jsonError('user_id e media_id sao obrigatorios.', 400)
    }

    await dbMarkStorySeen(userId, mediaId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return jsonServerError('[stories/seen POST]', err, 'Erro ao marcar story.')
  }
}
