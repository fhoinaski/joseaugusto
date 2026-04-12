import { NextRequest, NextResponse } from 'next/server'
import cloudinary, { parseReactions, stringifyReactions } from '@/lib/cloudinary'

const ALLOWED_EMOJIS = ['♥', '😍', '🎉', '👶']

export async function POST(req: NextRequest) {
  try {
    const { id, emoji, resourceType = 'image' } = await req.json()

    if (!id || !ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    // Fetch current context
    const resource = await (cloudinary.api as any).resource(id, {
      context: true,
      resource_type: resourceType,
    })

    const reactions = parseReactions(resource.context?.custom?.reactions)
    reactions[emoji] = (reactions[emoji] ?? 0) + 1

    await (cloudinary.api as any).update(
      id,
      { context: `reactions=${stringifyReactions(reactions)}` },
      { resource_type: resourceType }
    )

    return NextResponse.json({ reactions })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
