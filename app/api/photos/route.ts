import { NextRequest, NextResponse } from 'next/server'
import { dbGetMedia } from '@/lib/db'
import { objectUrl } from '@/lib/r2'

export async function GET(req: NextRequest) {
  try {
    // cursor-based pagination not yet supported with D1 HTTP API — ignored for now
    void req.nextUrl.searchParams.get('cursor')

    const rows  = await dbGetMedia('approved')
    const media = rows.map(row => ({
      ...row,
      thumbUrl: objectUrl(row.id),
      fullUrl:  objectUrl(row.id),
    }))

    return NextResponse.json({ media, nextCursor: null })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
