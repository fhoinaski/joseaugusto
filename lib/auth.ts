import { cookies } from 'next/headers'

const COOKIE = 'cha_admin'
const VAL    = 'ok'

export function isAuthenticated() {
  try { return cookies().get(COOKIE)?.value === VAL } catch { return false }
}
export function setSession() {
  cookies().set(COOKIE, VAL, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 86400, path: '/' })
}
export function clearSession() {
  cookies().set(COOKIE, '', { maxAge: 0, path: '/' })
}
