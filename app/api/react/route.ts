import { NextRequest, NextResponse } from 'next/server'
import { dbIncrementReaction, dbGetMediaAuthor, dbCreateNotification } from '@/lib/db'
import { pingReactionR2 } from '@/lib/r2'

export const dynamic = 'force-dynamic'

const ALLOWED_EMOJIS = ['👍', '♥', '😍', '🎉', '👶', '😂']

export async function POST(req: NextRequest) {
  try {
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
