import { NextRequest, NextResponse } from 'next/server'
import { HeadObjectCommand } from '@aws-sdk/client-s3'
import { r2, BUCKET, decodeReactions, encodeReactions, updateObjectMetadata } from '@/lib/r2'

const ALLOWED_EMOJIS = ['♥', '😍', '🎉', '👶']

export async function POST(req: NextRequest) {
  try {
    const { id, emoji } = await req.json()

    if (!id || !ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    // Read current metadata
    const head = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: id }))
    const meta = head.Metadata ?? {}

    const reactions = decodeReactions(meta.reactions)
    reactions[emoji] = (reactions[emoji] ?? 0) + 1

    // Update metadata via copy-to-self (S3/R2 pattern)
    await updateObjectMetadata(id, { reactions: encodeReactions(reactions) }, head.ContentType ?? 'image/webp')

    return NextResponse.json({ reactions })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
