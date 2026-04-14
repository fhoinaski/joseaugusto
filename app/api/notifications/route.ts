import { NextRequest, NextResponse } from 'next/server'
import { dbGetNotifications, dbGetUnreadCount, dbMarkAllRead } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`notifications-get:${ip}`, { limit: 30, windowMs: 60 * 1000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Muitas requisições. Aguarde um momento.' }, { status: 429 })
  }

  const author = req.nextUrl.searchParams.get('author')
  if (!author?.trim()) {
    return NextResponse.json({ error: 'Parâmetro author é obrigatório.' }, { status: 400 })
  }

  try {
    const [notifications, unread] = await Promise.all([
      dbGetNotifications(author.trim(), 50),
      dbGetUnreadCount(author.trim()),
    ])
    return NextResponse.json({ notifications, unread })
  } catch (err) {
    console.error('[notifications GET]', err)
    return NextResponse.json({ notifications: [], unread: 0 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = body.action
    const author = (body.author ?? '').toString().trim()

    if (action === 'mark_read') {
      if (!author) {
        return NextResponse.json({ error: 'author é obrigatório.' }, { status: 400 })
      }
      await dbMarkAllRead(author)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  } catch (err) {
    console.error('[notifications POST]', err)
    return NextResponse.json({ error: 'Erro ao processar notificação.' }, { status: 500 })
  }
}
