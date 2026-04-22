import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { dbSetConfig } from '@/lib/db'
import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const blocked = requireAdmin(req)
  if (blocked) return blocked

  try {
    const { message, sendPush = true } = await req.json() as { message?: string; sendPush?: boolean }
    const safeMessage = (message ?? '').trim().slice(0, 240)

    if (!safeMessage) {
      await dbSetConfig('live_announce', '')
      return NextResponse.json({ ok: true, cleared: true })
    }

    const payload = JSON.stringify({ message: safeMessage, ts: Date.now() })
    await dbSetConfig('live_announce', payload)

    if (sendPush) {
      try {
        await sendPushToAll({ title: 'Anuncio', body: safeMessage, icon: '/icon-192.png', url: '/' })
      } catch (err) {
        console.warn('[announce] push failed:', err)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[announce]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
