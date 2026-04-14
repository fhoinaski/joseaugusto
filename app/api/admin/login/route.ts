import { NextRequest, NextResponse } from 'next/server'
import { setSession } from '@/lib/auth'
import { dbGetConfig } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// 5 attempts per 15 minutes per IP
const LIMIT = 5
const WINDOW_MS = 15 * 60 * 1000

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed, remaining, resetAt } = rateLimit(`admin-login:${ip}`, { limit: LIMIT, windowMs: WINDOW_MS })

  if (!allowed) {
    const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${Math.ceil(retryAfterSec / 60)} min.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    )
  }

  const { password } = await req.json()

  // Try D1 stored password first, fallback to env var
  let adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123'
  try {
    const stored = await dbGetConfig('admin_password', '')
    if (stored) adminPassword = stored
  } catch {}

  if (password !== adminPassword)
    return NextResponse.json(
      { error: `Senha incorreta. ${remaining} tentativa${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}.` },
      { status: 401 },
    )

  setSession()
  return NextResponse.json({ ok: true })
}
