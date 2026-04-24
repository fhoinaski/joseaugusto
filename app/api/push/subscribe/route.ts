import { NextRequest, NextResponse } from 'next/server'
import { dbSavePushSubscription, dbDeletePushSubscription } from '@/lib/db'
import { getVapidPublicKey } from '@/lib/push'
import { cleanText, jsonError, jsonServerError, readJsonBody, requireRateLimit } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

const POST_LIMIT = 300
const POST_WINDOW_MS = 60 * 60 * 1000

export async function GET() {
  const publicKey = getVapidPublicKey()
  if (!publicKey) return NextResponse.json({ publicKey: null })
  return NextResponse.json({ publicKey })
}

export async function POST(req: NextRequest) {
  const limited = requireRateLimit(req, 'push-subscribe', {
    limit: POST_LIMIT,
    windowMs: POST_WINDOW_MS,
    message: 'Muitas tentativas de notificacao em pouco tempo.',
  })
  if (limited) return limited

  try {
    const body = await readJsonBody<{
      action?: unknown
      endpoint?: unknown
      keys?: { auth?: unknown; p256dh?: unknown }
    }>(req)
    if (!body) return jsonError('Requisicao invalida.', 400)

    const endpoint = cleanText(body.endpoint, 2048)

    if (body.action === 'unsubscribe' && endpoint) {
      await dbDeletePushSubscription(endpoint)
      return NextResponse.json({ ok: true })
    }

    const auth = cleanText(body.keys?.auth, 512)
    const p256dh = cleanText(body.keys?.p256dh, 512)
    if (!endpoint || !auth || !p256dh) {
      return jsonError('Dados de subscription invalidos.', 400)
    }

    await dbSavePushSubscription(endpoint, auth, p256dh)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return jsonServerError('[push/subscribe]', err, 'Erro ao salvar subscription.')
  }
}
