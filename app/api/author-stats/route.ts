import { NextRequest, NextResponse } from 'next/server'
import { dbGetAuthorStats } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const author = req.nextUrl.searchParams.get('author')
    if (!author) {
      return NextResponse.json({ error: 'Parâmetro obrigatório: author' }, { status: 400 })
    }
    const stats = await dbGetAuthorStats(author)
    return NextResponse.json(stats)
  } catch (err) {
    console.error('[author-stats GET]', err)
    return NextResponse.json({ photos: 0, reactions: 0, comments: 0 })
  }
}
