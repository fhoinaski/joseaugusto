import { NextRequest, NextResponse } from 'next/server'
import { dbGetActiveEnquete, dbGetEnqueteResults, dbVoteEnquete } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body      = await req.json()
  const enqueteId = Number(body.enqueteId)
  const optionIdx = Number(body.optionIdx)
  const voterId   = body.voterId?.toString().trim().slice(0, 120) || 'anon'

  if (!enqueteId || optionIdx < 0) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const enquete = await dbGetActiveEnquete()
  if (!enquete || enquete.id !== enqueteId) return NextResponse.json({ error: 'Enquete não encontrada ou encerrada' }, { status: 404 })
  if (optionIdx >= enquete.options.length)  return NextResponse.json({ error: 'Opção inválida' }, { status: 400 })

  await dbVoteEnquete(enqueteId, optionIdx, voterId)
  const results = await dbGetEnqueteResults(enqueteId, enquete.options)
  return NextResponse.json({ ok: true, results })
}
