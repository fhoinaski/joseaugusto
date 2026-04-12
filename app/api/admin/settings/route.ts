import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbGetConfig, dbSetConfig } from '@/lib/db'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const geoGate = await dbGetConfig('geo_gate_enabled', '0')
  return NextResponse.json({ geoGateEnabled: geoGate === '1' })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { geoGateEnabled } = await req.json()
  await dbSetConfig('geo_gate_enabled', geoGateEnabled ? '1' : '0')
  return NextResponse.json({ ok: true })
}
