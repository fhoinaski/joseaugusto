export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbGetDiario, dbInsertDiario, dbUpdateDiario, dbDeleteDiario } from '@/lib/db'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const entries = await dbGetDiario(false)
  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()

  if (body.action === 'create') {
    const title = body.title?.toString().trim().slice(0, 120)
    const content = body.content?.toString().trim().slice(0, 2000)
    if (!title || !content) return NextResponse.json({ error: 'Título e conteúdo obrigatórios' }, { status: 400 })
    await dbInsertDiario(title, content, body.imageUrl?.toString().trim() || null, body.milestoneDate?.toString().trim() || null)
    return NextResponse.json({ ok: true })
  }
  if (body.action === 'update') {
    await dbUpdateDiario(Number(body.id), { title: body.title, content: body.content, image_url: body.imageUrl ?? null, milestone_date: body.milestoneDate ?? null, published: body.published ? 1 : 0 })
    return NextResponse.json({ ok: true })
  }
  if (body.action === 'delete') { await dbDeleteDiario(Number(body.id)); return NextResponse.json({ ok: true }) }
  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
