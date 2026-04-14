import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'

/** Admin-only: send a manual push notification to all subscribers */
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { title, body, url } = await req.json() as { title?: string; body?: string; url?: string }
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Título e mensagem são obrigatórios' }, { status: 400 })
    }

    await sendPushToAll({
      title: title.trim(),
      body: body.trim(),
      icon: '/icon-192.png',
      url: url?.trim() || '/',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/send]', err)
    return NextResponse.json({ error: 'Erro ao enviar notificação' }, { status: 500 })
  }
}
