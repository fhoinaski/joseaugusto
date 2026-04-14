import { NextRequest, NextResponse } from 'next/server'
import { dbVerifyAccessKey } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// 10 attempts per 10 minutes per IP
const LIMIT = 10
const WINDOW_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed, resetAt } = rateLimit(`verify-key:${ip}`, { limit: LIMIT, windowMs: WINDOW_MS })

  if (!allowed) {
    const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { valid: false, error: `Muitas tentativas. Tente em ${Math.ceil(retryAfterSec / 60)} min.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    )
  }

  try {
    const { key } = await req.json()
    if (!key?.trim()) return NextResponse.json({ valid: false })
    const valid = await dbVerifyAccessKey(key.trim())
    return NextResponse.json({ valid })
  } catch {
    return NextResponse.json({ valid: false })
  }
}
