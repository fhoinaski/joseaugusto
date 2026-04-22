import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { sendPushToAll } from '@/lib/push'
import { cleanText, jsonError, jsonServerError, readJsonBody } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

/** Admin-only: send a manual push notification to all subscribers */
export async function POST(req: NextRequest) {
  const blocked = requireAdmin(req)
  if (blocked) return blocked

  try {
    const body = await readJsonBody<Record<string, unknown>>(req)
    if (!body) return jsonError('Requisicao invalida.', 400)

    const title = cleanText(body.title, 80)
    const message = cleanText(body.body, 240)
    const url = cleanText(body.url, 300) || '/'

    if (!title || !message) {
      return jsonError('Titulo e mensagem sao obrigatorios.', 400)
    }

    await sendPushToAll({
      title,
      body: message,
      icon: '/icon-192.png',
      url,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return jsonServerError('[push/send]', err, 'Erro ao enviar notificacao.')
  }
}
