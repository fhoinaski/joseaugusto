import { NextRequest, NextResponse } from 'next/server'
import { dbGetSeenStoryIds, dbMarkStorySeen } from '@/lib/db'

function getSafeUserId(raw: string | null): string {
  return (raw ?? '').toString().trim().slice(0, 120)
}

export async function GET(req: NextRequest) {
  try {
    const userId = getSafeUserId(req.nextUrl.searchParams.get('user_id'))
    if (!userId) return NextResponse.json({ seen: [] })

    const seen = await dbGetSeenStoryIds(userId)
    return NextResponse.json({ seen })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, media_id } = await req.json() as { user_id?: string; media_id?: string }
    const userId = getSafeUserId(user_id ?? null)
    const mediaId = (media_id ?? '').toString().trim().slice(0, 300)

    if (!userId || !mediaId) {
      return NextResponse.json({ error: 'user_id e media_id são obrigatórios' }, { status: 400 })
    }

    await dbMarkStorySeen(userId, mediaId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
