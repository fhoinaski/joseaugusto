import { NextRequest, NextResponse } from 'next/server'
import { dbGetComments, dbInsertComment } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
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
    const { media_id, author, text } = await req.json()

    if (!media_id || !text?.trim()) {
      return NextResponse.json({ error: 'media_id e text são obrigatórios' }, { status: 400 })
    }

    const safeAuthor = (author ?? 'Convidado').toString().trim().slice(0, 60) || 'Convidado'
    const safeText   = text.toString().trim().slice(0, 300)

    const comment = await dbInsertComment(media_id, safeAuthor, safeText)
    return NextResponse.json({ comment }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
