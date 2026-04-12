import { NextRequest, NextResponse } from 'next/server'
import { listMedia } from '@/lib/r2'

export async function GET(req: NextRequest) {
  try {
    const cursor = req.nextUrl.searchParams.get('cursor') ?? undefined
    const { media, nextCursor } = await listMedia('approved', cursor)
    return NextResponse.json({ media, nextCursor })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
