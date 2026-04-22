import { NextRequest, NextResponse } from 'next/server'
import { dbIncrementReaction, dbGetMediaAuthor, dbCreateNotification } from '@/lib/db'
import { pingReactionR2 } from '@/lib/r2'
import { getClientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
const POST_LIMIT = 120
const POST_WINDOW_MS = 15 * 60 * 1000

const ALLOWED_EMOJIS = ['👍', '♥', '😍', '🎉', '👶', '😂']

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const { allowed, resetAt } = rateLimit(`reactions:${ip}`, { limit: POST_LIMIT, windowMs: POST_WINDOW_MS })
    if (!allowed) {
      const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Muitas reacoes em pouco tempo. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      )
    }

    const { id, emoji, author } = await req.json()

    if (!id || !ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const reactions = await dbIncrementReaction(id, emoji)
    await pingReactionR2(id, emoji).catch(() => {})

    // Notify the media author (silently — do not break the response)
    try {
      const actor = (author ?? '').toString().trim()
      const mediaAuthor = await dbGetMediaAuthor(id)
      if (mediaAuthor && actor) {
        await dbCreateNotification(mediaAuthor, 'reaction', actor, id, emoji)
      }
    } catch {
      // intentionally silent
    }

    return NextResponse.json({ reactions })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
