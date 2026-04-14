import { NextRequest, NextResponse } from 'next/server'
import { dbGetAvaliacaoStats, dbGetAvaliacoes, dbInsertAvaliacao } from '@/lib/db'

export async function GET() {
  const [stats, ratings] = await Promise.all([
    dbGetAvaliacaoStats(),
    dbGetAvaliacoes(50),
  ])
  return NextResponse.json({ stats, ratings })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const author  = body.author?.toString().trim().slice(0, 80)
  const stars   = Number(body.stars)
  const comment = body.comment?.toString().trim().slice(0, 300) || null

  if (!author)                        return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  if (!stars || stars < 1 || stars > 5) return NextResponse.json({ error: 'Estrelas inválidas (1-5)' }, { status: 400 })

  await dbInsertAvaliacao(author, stars, comment)
  const stats = await dbGetAvaliacaoStats()
  return NextResponse.json({ ok: true, stats })
}
