import { NextResponse } from 'next/server'
import { dbGetRsvpList, dbCreateRsvp, dbGetRsvpStats } from '@/lib/db'
import { getClientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
const POST_LIMIT = 12
const POST_WINDOW_MS = 60 * 60 * 1000

export async function GET() {
  try {
    const [rsvps, stats] = await Promise.all([dbGetRsvpList(), dbGetRsvpStats()])
    return NextResponse.json({ rsvps, stats })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { allowed, resetAt } = rateLimit(`rsvp:${ip}`, { limit: POST_LIMIT, windowMs: POST_WINDOW_MS })
    if (!allowed) {
      const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Muitas confirmacoes em pouco tempo. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      )
    }

    const body = await req.json() as {
      name?: unknown; status?: unknown; guests_count?: unknown; message?: unknown; contact?: unknown
    }
    const name = String(body.name ?? '').trim().slice(0, 80)
    const status = ['confirmed', 'maybe', 'declined'].includes(String(body.status ?? ''))
      ? String(body.status)
      : 'confirmed'
    const guests_count = Math.max(1, Math.min(20, Number(body.guests_count) || 1))
    const message = body.message ? String(body.message).trim().slice(0, 300) : undefined
    const contact = body.contact ? String(body.contact).trim().slice(0, 120) : undefined

    if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

    await dbCreateRsvp({ name, status, guests_count, message, contact })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
