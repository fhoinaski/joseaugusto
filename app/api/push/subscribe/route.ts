import { NextRequest, NextResponse } from 'next/server'
import { dbSavePushSubscription, dbDeletePushSubscription } from '@/lib/db'
import { getVapidPublicKey } from '@/lib/push'

export const dynamic = 'force-dynamic'

export async function GET() {
  const publicKey = getVapidPublicKey()
  if (!publicKey) return NextResponse.json({ publicKey: null })
  return NextResponse.json({ publicKey })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action?: 'subscribe' | 'unsubscribe'
      endpoint?: string
      keys?: { auth?: string; p256dh?: string }
    }

    if (body.action === 'unsubscribe' && body.endpoint) {
      await dbDeletePushSubscription(body.endpoint)
      return NextResponse.json({ ok: true })
    }

    const { endpoint, keys } = body
    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      return NextResponse.json({ error: 'Dados de subscription inválidos' }, { status: 400 })
    }

    await dbSavePushSubscription(endpoint, keys.auth, keys.p256dh)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe]', err)
    return NextResponse.json({ error: 'Erro ao salvar subscription' }, { status: 500 })
  }
}
