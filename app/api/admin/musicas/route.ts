import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbGetMusicas, dbApproveMusica, dbDeleteMusica } from '@/lib/db'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const musicas = await dbGetMusicas(false)
  return NextResponse.json({ musicas })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()
  if (body.action === 'approve') { await dbApproveMusica(Number(body.id), true); return NextResponse.json({ ok: true }) }
  if (body.action === 'reject')  { await dbApproveMusica(Number(body.id), false); return NextResponse.json({ ok: true }) }
  if (body.action === 'delete')  { await dbDeleteMusica(Number(body.id)); return NextResponse.json({ ok: true }) }
  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
