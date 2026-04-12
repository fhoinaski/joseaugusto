import { NextRequest, NextResponse } from 'next/server'
import { dbGetMedia } from '@/lib/db'
import { dbGetTopAuthors } from '@/lib/db'
import { dbGetConfig } from '@/lib/db'
import { isD1AuthError } from '@/lib/db'
import { objectUrl } from '@/lib/r2'

export async function GET(req: NextRequest) {
  try {
    // cursor-based pagination not yet supported with D1 HTTP API — ignored for now
    void req.nextUrl.searchParams.get('cursor')

    const [rows, topAuthors, pinnedMediaId, pinnedTextRaw, parentsMessage]  = await Promise.all([
      dbGetMedia('approved'),
      dbGetTopAuthors(3),
      dbGetConfig('pinned_media_id', ''),
      dbGetConfig('pinned_text', ''),
      dbGetConfig('parents_message', ''),
    ])
    const media = rows.map(row => ({
      ...row,
      thumbUrl: objectUrl(row.id),
      fullUrl:  objectUrl(row.id),
    }))

    const pinnedText = pinnedTextRaw || parentsMessage || ''

    const pinnedPost = media.find(m => m.id === pinnedMediaId) ?? null

    return NextResponse.json({ media, nextCursor: null, topAuthors, pinnedPost, pinnedMediaId, pinnedText })
  } catch (err) {
    if (isD1AuthError(err)) {
      console.warn('GET /api/photos degraded: D1 auth error')
      return NextResponse.json({ media: [], nextCursor: null, topAuthors: [], pinnedPost: null, pinnedMediaId: '', pinnedText: '', degraded: true, reason: 'd1-auth' })
    }
    console.error('GET /api/photos degraded: unexpected error', err)
    return NextResponse.json({ media: [], nextCursor: null, topAuthors: [], pinnedPost: null, pinnedMediaId: '', pinnedText: '', degraded: true, reason: 'photos-fetch-failed' })
  }
}
