import { cookies } from 'next/headers'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const COOKIE = 'cha_admin_session'
const LEGACY_COOKIE = 'cha_admin'
const SESSION_TTL_SECONDS = 60 * 60 * 12
const MIN_SECRET_LENGTH = 12

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function getSessionSecret() {
  const secret = (process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '').trim()
  return secret.length >= MIN_SECRET_LENGTH ? secret : ''
}

function sign(payload: string, secret: string) {
  return base64url(createHmac('sha256', secret).update(payload).digest())
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function isAuthConfigured() {
  return Boolean(getSessionSecret())
}

export function isAuthenticated() {
  try {
    const secret = getSessionSecret()
    if (!secret) return false

    const token = cookies().get(COOKIE)?.value
    if (!token) return false

    const parts = token.split('.')
    if (parts.length !== 5 || parts[0] !== 'v1') return false

    const payload = parts.slice(0, 4).join('.')
    const expected = sign(payload, secret)
    if (!safeEqual(parts[4], expected)) return false

    const expiresAt = Number(parts[2])
    return Number.isFinite(expiresAt) && Date.now() < expiresAt
  } catch {
    return false
  }
}

export function setSession() {
  const secret = getSessionSecret()
  if (!secret) throw new Error('ADMIN_SESSION_SECRET or ADMIN_PASSWORD must be configured with at least 12 characters.')

  const issuedAt = Date.now()
  const expiresAt = issuedAt + SESSION_TTL_SECONDS * 1000
  const nonce = base64url(randomBytes(18))
  const payload = `v1.${issuedAt}.${expiresAt}.${nonce}`
  const token = `${payload}.${sign(payload, secret)}`

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  })
  cookies().set(LEGACY_COOKIE, '', { maxAge: 0, path: '/' })
}

export function clearSession() {
  cookies().set(COOKIE, '', { maxAge: 0, path: '/' })
  cookies().set(LEGACY_COOKIE, '', { maxAge: 0, path: '/' })
}
