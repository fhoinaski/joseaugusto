import { NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'

type HeaderRequest = { headers: { get(name: string): string | null } }

export function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers })
}

export function jsonServerError(scope: string, err: unknown, fallback = 'Erro interno. Tente novamente.') {
  console.error(scope, err)
  return NextResponse.json({ error: fallback }, { status: 500 })
}

export async function readJsonBody<T extends Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return await req.json() as T
  } catch {
    return null
  }
}

export function cleanText(value: unknown, maxLength: number, fallback = '') {
  const text = typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : fallback
  return text.slice(0, maxLength)
}

export function requireRateLimit(
  req: HeaderRequest,
  keyPrefix: string,
  options: { limit: number; windowMs: number; message: string },
) {
  const ip = getClientIp(req)
  const { allowed, resetAt } = rateLimit(`${keyPrefix}:${ip}`, options)
  if (allowed) return null

  const retryAfterSec = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
  return jsonError(options.message, 429, { 'Retry-After': String(retryAfterSec) })
}
