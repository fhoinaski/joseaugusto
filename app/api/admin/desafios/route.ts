import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbGetDesafios, dbInsertDesafio, dbDeleteDesafio } from '@/lib/db'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const desafios = await dbGetDesafios(false)
  return NextResponse.json({ desafios })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()
  if (body.action === 'create') {
    const emoji = body.emoji?.toString().trim() || '📸'
    const title = body.title?.toString().trim().slice(0, 100)
    const description = body.description?.toString().trim().slice(0, 300)
    if (!title || !description) return NextResponse.json({ error: 'Título e descrição obrigatórios' }, { status: 400 })
    await dbInsertDesafio(emoji, title, description, Number(body.sortOrder) || 0)
    return NextResponse.json({ ok: true })
  }
  if (body.action === 'delete') { await dbDeleteDesafio(Number(body.id)); return NextResponse.json({ ok: true }) }
  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
