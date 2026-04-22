export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { dbRecordPwaSession } from '@/lib/db'
import { cleanText, readJsonBody, requireRateLimit } from '@/lib/api-helpers'

const POST_LIMIT = 40
const POST_WINDOW_MS = 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const limited = requireRateLimit(req, 'pwa-session', {
    limit: POST_LIMIT,
    windowMs: POST_WINDOW_MS,
    message: 'Muitas sessoes registradas em pouco tempo.',
  })
  if (limited) return limited

  try {
    const body = await readJsonBody<Record<string, unknown>>(req)
    if (!body) return NextResponse.json({ ok: true })

    await dbRecordPwaSession(
      cleanText(body.event, 40, 'session') || 'session',
      cleanText(body.userAgent, 500),
      cleanText(body.author, 80) || null,
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // never block the client
  }
}

export async function GET() {
  try {
    const { dbGetPwaStats } = await import('@/lib/db')
    const stats = await dbGetPwaStats()
    return NextResponse.json(stats)
  } catch {
    return NextResponse.json({ installs: 0, sessions: 0, devices: [] })
  }
}
