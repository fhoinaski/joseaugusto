import { NextRequest, NextResponse } from 'next/server'
import { getMedia } from '@/lib/cloudinary'

export async function GET(req: NextRequest) {
  try {
    const cursor = req.nextUrl.searchParams.get('cursor') ?? undefined
    const { media, nextCursor } = await getMedia('approved', cursor)
    return NextResponse.json({ media, nextCursor })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
