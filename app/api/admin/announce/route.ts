import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbSetConfig } from '@/lib/db'
import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  void req
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { message, sendPush = true } = await req.json() as { message?: string; sendPush?: boolean }
    if (!message?.trim()) {
      await dbSetConfig('live_announce', '')
      return NextResponse.json({ ok: true, cleared: true })
    }
    const payload = JSON.stringify({ message: message.trim(), ts: Date.now() })
    await dbSetConfig('live_announce', payload)
    if (sendPush) {
      try {
        await sendPushToAll({ title: '📣 Anúncio', body: message.trim(), icon: '/icon-192.png', url: '/' })
      } catch (e) {
        console.warn('[announce] push failed:', e)
      }
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[announce]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
