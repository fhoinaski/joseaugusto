export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { dbGetActiveEnquete, dbGetEnqueteResults, dbVoteEnquete } from '@/lib/db'
import { getClientIp, rateLimit } from '@/lib/rate-limit'

const VOTE_LIMIT = 30
const VOTE_WINDOW_MS = 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed, resetAt } = rateLimit(`enquete-vote:${ip}`, { limit: VOTE_LIMIT, windowMs: VOTE_WINDOW_MS })
  if (!allowed) {
    const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Muitos votos em pouco tempo. Tente novamente mais tarde.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    )
  }

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
