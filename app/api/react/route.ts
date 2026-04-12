import { NextRequest, NextResponse } from 'next/server'
import { dbIncrementReaction } from '@/lib/db'

const ALLOWED_EMOJIS = ['♥', '😍', '🎉', '👶']

export async function POST(req: NextRequest) {
  try {
    const { id, emoji } = await req.json()

    if (!id || !ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const reactions = await dbIncrementReaction(id, emoji)
    return NextResponse.json({ reactions })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
