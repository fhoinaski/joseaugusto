import { NextRequest, NextResponse } from 'next/server'
import { dbGetNotifications, dbGetUnreadCount, dbMarkAllRead } from '@/lib/db'
import { cleanText, jsonError, jsonServerError, readJsonBody, requireRateLimit } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const limited = requireRateLimit(req, 'notifications-get', {
    limit: 30,
    windowMs: 60 * 1000,
    message: 'Muitas requisicoes. Aguarde um momento.',
  })
  if (limited) return limited

  const author = cleanText(req.nextUrl.searchParams.get('author'), 80)
  if (!author) return jsonError('Parametro author e obrigatorio.', 400)

  try {
    const [notifications, unread] = await Promise.all([
      dbGetNotifications(author, 50),
      dbGetUnreadCount(author),
    ])
    return NextResponse.json({ notifications, unread })
  } catch (err) {
    console.error('[notifications GET]', err)
    return NextResponse.json({ notifications: [], unread: 0 })
  }
}

export async function POST(req: NextRequest) {
  const limited = requireRateLimit(req, 'notifications-post', {
    limit: 30,
    windowMs: 60 * 1000,
    message: 'Muitas atualizacoes. Aguarde um momento.',
  })
  if (limited) return limited

  try {
    const body = await readJsonBody<Record<string, unknown>>(req)
    if (!body) return jsonError('Requisicao invalida.', 400)

    const action = cleanText(body.action, 40)
    const author = cleanText(body.author, 80)

    if (action === 'mark_read') {
      if (!author) return jsonError('author e obrigatorio.', 400)
      await dbMarkAllRead(author)
      return NextResponse.json({ ok: true })
    }

    return jsonError('Acao invalida.', 400)
  } catch (err) {
    return jsonServerError('[notifications POST]', err, 'Erro ao processar notificacao.')
  }
}
