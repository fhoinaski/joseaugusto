import { NextRequest, NextResponse } from 'next/server'
import { setSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  setSession()
  return NextResponse.json({ ok: true })
}
