import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { dbGetPushSubscriptions } from '@/lib/db'
import { getVapidPublicKey, sendPushToAll, sendPushToSubscription } from '@/lib/push'
import { cleanText, jsonError, jsonServerError, readJsonBody } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const blocked = requireAdmin(req)
  if (blocked) return blocked

  try {
    const subscriptions = await dbGetPushSubscriptions()
    return NextResponse.json({
      ok: true,
      configured: Boolean(getVapidPublicKey()),
      subscribers: subscriptions.length,
    })
  } catch (err) {
    return jsonServerError('[push/send GET]', err, 'Erro ao carregar status de push.')
  }
}

/** Admin-only: send a manual push notification to all subscribers */
export async function POST(req: NextRequest) {
  const blocked = requireAdmin(req)
  if (blocked) return blocked

  try {
    const body = await readJsonBody<Record<string, unknown>>(req)
    if (!body) return jsonError('Requisicao invalida.', 400)

    if (body.action === 'self-test') {
      const rawSubscription = body.subscription as { endpoint?: unknown; keys?: { auth?: unknown; p256dh?: unknown } } | undefined
      const endpoint = cleanText(rawSubscription?.endpoint, 2048)
      const auth = cleanText(rawSubscription?.keys?.auth, 512)
      const p256dh = cleanText(rawSubscription?.keys?.p256dh, 512)

      if (!endpoint || !auth || !p256dh) {
        return jsonError('Subscription de teste invalida.', 400)
      }

      const title = cleanText(body.title, 80) || 'Teste de notificacao'
      const message = cleanText(body.body, 240) || 'Seu aparelho recebeu o push corretamente.'
      const url = cleanText(body.url, 300) || '/admin'

      const push = await sendPushToSubscription(
        { endpoint, keys: { auth, p256dh } },
        { title, body: message, icon: '/icon-192.png', url },
      )

      return NextResponse.json({ ok: true, push })
    }

    const title = cleanText(body.title, 80)
    const message = cleanText(body.body, 240)
    const url = cleanText(body.url, 300) || '/'

    if (!title || !message) {
      return jsonError('Titulo e mensagem sao obrigatorios.', 400)
    }

    const push = await sendPushToAll({
      title,
      body: message,
      icon: '/icon-192.png',
      url,
    })

    return NextResponse.json({ ok: true, push })
  } catch (err) {
    return jsonServerError('[push/send]', err, 'Erro ao enviar notificacao.')
  }
}
