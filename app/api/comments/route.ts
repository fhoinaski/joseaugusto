import { NextRequest, NextResponse } from 'next/server'
import { dbGetComments, dbInsertComment, dbGetMediaAuthor, dbCreateNotification, dbGetLatestCommentPerMedia } from '@/lib/db'
import { pingCommentR2 } from '@/lib/r2'
import { getClientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
const POST_LIMIT = 30
const POST_WINDOW_MS = 10 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    // Batch mode: ?ids=id1,id2,... returns latest comment per media
    const idsParam = req.nextUrl.searchParams.get('ids')
    if (idsParam) {
      const ids = idsParam.split(',').map(decodeURIComponent).filter(Boolean).slice(0, 20)
      const results = await dbGetLatestCommentPerMedia(ids)
      return NextResponse.json({ comments: results })
    }

    const mediaId = req.nextUrl.searchParams.get('media_id')
    if (!mediaId) return NextResponse.json({ error: 'media_id obrigatório' }, { status: 400 })
    const comments = await dbGetComments(mediaId)
    return NextResponse.json({ comments })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const { allowed, resetAt } = rateLimit(`comments:${ip}`, { limit: POST_LIMIT, windowMs: POST_WINDOW_MS })
    if (!allowed) {
      const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Muitos comentarios em pouco tempo. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      )
    }

    const { media_id, author, text } = await req.json()

    if (!media_id || !text?.trim()) {
      return NextResponse.json({ error: 'media_id e text são obrigatórios' }, { status: 400 })
    }

    const safeAuthor = (author ?? 'Convidado').toString().trim().slice(0, 60) || 'Convidado'
    const safeText   = text.toString().trim().slice(0, 300)

    const comment = await dbInsertComment(media_id, safeAuthor, safeText)
    await pingCommentR2(media_id, safeAuthor).catch(() => {})

    // Notify the media author (silently — do not break the response)
    try {
      const mediaAuthor = await dbGetMediaAuthor(media_id)
      if (mediaAuthor) {
        await dbCreateNotification(mediaAuthor, 'comment', safeAuthor, media_id, safeText)
      }
    } catch {
      // intentionally silent
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
