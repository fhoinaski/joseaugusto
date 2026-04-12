import { NextRequest, NextResponse } from 'next/server'
import { dbGetMedia } from '@/lib/db'
import { isD1AuthError } from '@/lib/db'
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
    if (isD1AuthError(err)) {
      console.warn('GET /api/photos degraded: D1 auth error')
      return NextResponse.json({ media: [], nextCursor: null, degraded: true, reason: 'd1-auth' })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
