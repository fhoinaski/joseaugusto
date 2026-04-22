import { NextRequest, NextResponse } from 'next/server'
import { isAuthConfigured, setSession } from '@/lib/auth'
import { dbGetConfig } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { timingSafeEqual } from 'crypto'

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

  let password = ''
  try {
    const body = await req.json() as { password?: unknown }
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json({ error: 'Requisicao invalida.' }, { status: 400 })
  }

  if (!isAuthConfigured()) {
    console.error('[admin-login] Missing ADMIN_SESSION_SECRET or sufficiently long ADMIN_PASSWORD.')
    return NextResponse.json({ error: 'Login indisponivel. Configuracao de seguranca ausente.' }, { status: 500 })
  }

  // Try D1 stored password first, fallback to env var. No hardcoded password is allowed.
  let adminPassword = (process.env.ADMIN_PASSWORD ?? '').trim()
  try {
    const stored = await dbGetConfig('admin_password', '')
    if (stored) adminPassword = stored.trim()
  } catch {}

  if (!adminPassword) {
    console.error('[admin-login] Missing admin password.')
    return NextResponse.json({ error: 'Login indisponivel. Senha administrativa nao configurada.' }, { status: 500 })
  }

  const left = Buffer.from(password)
  const right = Buffer.from(adminPassword)
  const valid = left.length === right.length && timingSafeEqual(left, right)

  if (!valid)
    return NextResponse.json(
      { error: `Senha incorreta. ${remaining} tentativa${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}.` },
      { status: 401 },
    )

  setSession()
  return NextResponse.json({ ok: true })
}
