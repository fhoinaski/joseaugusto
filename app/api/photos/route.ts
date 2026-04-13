import { NextRequest, NextResponse } from 'next/server'
import { dbGetMediaPage } from '@/lib/db'
import { dbGetTopAuthors } from '@/lib/db'
import { dbGetConfig } from '@/lib/db'
import { isD1AuthError } from '@/lib/db'
import { objectUrl } from '@/lib/r2'
import { imageVariantKey, imageThumb400Key } from '@/lib/r2'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const cursor = req.nextUrl.searchParams.get('cursor')?.trim() || undefined
    const rawLimit = Number(req.nextUrl.searchParams.get('limit') ?? 20)
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, rawLimit)) : 50
    const { items, nextCursor } = await dbGetMediaPage('approved', limit, cursor)

    const media = items.map(row => {
      if (row.type !== 'image') {
        return {
          ...row,
          thumbUrl: objectUrl(row.id),
          fullUrl: objectUrl(row.id),
        }
      }

      const src320 = objectUrl(imageVariantKey(row.id, 320))
      const src640 = objectUrl(imageVariantKey(row.id, 640))
      const src1080 = objectUrl(imageVariantKey(row.id, 1080))

      return {
        ...row,
        thumbUrl: objectUrl(imageThumb400Key(row.id)),
        fullUrl: objectUrl(row.id),
        imageSources: { w320: src320, w640: src640, w1080: src1080 },
      }
    })

    if (cursor) {
      return NextResponse.json({ media, nextCursor })
    }

    const [topAuthors, pinnedMediaId, pinnedTextRaw, parentsMessage]  = await Promise.all([
      dbGetTopAuthors(3),
      dbGetConfig('pinned_media_id', ''),
      dbGetConfig('pinned_text', ''),
      dbGetConfig('parents_message', ''),
    ])

    const pinnedText = pinnedTextRaw || parentsMessage || ''

    const pinnedPost = media.find(m => m.id === pinnedMediaId) ?? null

    return NextResponse.json({ media, nextCursor, topAuthors, pinnedPost, pinnedMediaId, pinnedText })
  } catch (err) {
    if (isD1AuthError(err)) {
      console.warn('GET /api/photos degraded: D1 auth error')
      return NextResponse.json({ media: [], nextCursor: null, topAuthors: [], pinnedPost: null, pinnedMediaId: '', pinnedText: '', degraded: true, reason: 'd1-auth' })
    }
    console.error('GET /api/photos degraded: unexpected error', err)
    return NextResponse.json({ media: [], nextCursor: null, topAuthors: [], pinnedPost: null, pinnedMediaId: '', pinnedText: '', degraded: true, reason: 'photos-fetch-failed' })
  }
}
