import { NextRequest, NextResponse } from 'next/server'
import { dbGetMediaPage, dbGetMediaById } from '@/lib/db'
import { dbGetTopAuthors } from '@/lib/db'
import { dbGetConfig } from '@/lib/db'
import { isD1AuthError } from '@/lib/db'
import { imageUrls } from '@/lib/r2'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // ── Single-item lookup (WhatsApp / external deep-links) ──────────────────
    const singleId = req.nextUrl.searchParams.get('id')?.trim()
    if (singleId) {
      const item = await dbGetMediaById(singleId)
      if (!item) return NextResponse.json({ media: [] })
      return NextResponse.json({
        media: [{ ...item, ...imageUrls(item.id, item.type) }],
      })
    }

    const cursor = req.nextUrl.searchParams.get('cursor')?.trim() || undefined
    const rawLimit = Number(req.nextUrl.searchParams.get('limit') ?? 20)
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, rawLimit)) : 50
    const { items, nextCursor } = await dbGetMediaPage('approved', limit, cursor)

    const media = items.map(row => ({
      ...row,
      ...imageUrls(row.id, row.type),
    }))

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
