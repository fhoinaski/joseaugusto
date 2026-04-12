import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbGetConfig, dbSetConfig, dbGetAccessKeys, dbInsertAccessKey, dbDeleteAccessKey } from '@/lib/db'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const geoGate = await dbGetConfig('geo_gate_enabled', '0')
  const keys = await dbGetAccessKeys()
  return NextResponse.json({ geoGateEnabled: geoGate === '1', keys })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()

  if ('geoGateEnabled' in body) {
    await dbSetConfig('geo_gate_enabled', body.geoGateEnabled ? '1' : '0')
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'change_password') {
    const pw = body.password?.toString().trim()
    if (!pw || pw.length < 6) return NextResponse.json({ error: 'Senha deve ter ao menos 6 caracteres' }, { status: 400 })
    await dbSetConfig('admin_password', pw)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'add_key') {
    const name = body.name?.toString().trim().slice(0, 80)
    const key  = body.key?.toString().trim().slice(0, 60)
    if (!name || !key) return NextResponse.json({ error: 'Nome e chave são obrigatórios' }, { status: 400 })
    await dbInsertAccessKey(name, key)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'delete_key') {
    await dbDeleteAccessKey(Number(body.id))
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
