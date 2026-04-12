import { NextRequest, NextResponse } from 'next/server'
import { setSession } from '@/lib/auth'
import { dbGetConfig } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  // Try D1 stored password first, fallback to env var
  let adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123'
  try {
    const stored = await dbGetConfig('admin_password', '')
    if (stored) adminPassword = stored
  } catch {}

  if (password !== adminPassword)
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  setSession()
  return NextResponse.json({ ok: true })
}
