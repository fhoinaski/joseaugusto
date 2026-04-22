import { NextRequest, NextResponse } from 'next/server'
import { dbGetAvaliacaoStats, dbGetAvaliacoes, dbInsertAvaliacao } from '@/lib/db'
import { cleanText, jsonError, jsonServerError, readJsonBody, requireRateLimit } from '@/lib/api-helpers'

const POST_LIMIT = 10
const POST_WINDOW_MS = 60 * 60 * 1000

export async function GET() {
  try {
    const [stats, ratings] = await Promise.all([
      dbGetAvaliacaoStats(),
      dbGetAvaliacoes(50),
    ])
    return NextResponse.json({ stats, ratings }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (err) {
    console.error('[avaliacao GET]', err)
    return NextResponse.json(
      { stats: { avg: 0, total: 0, distribution: {} }, ratings: [], error: 'Erro ao carregar avaliacoes.' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function POST(req: NextRequest) {
  const limited = requireRateLimit(req, 'avaliacao-post', {
    limit: POST_LIMIT,
    windowMs: POST_WINDOW_MS,
    message: 'Muitas avaliacoes em pouco tempo. Tente novamente mais tarde.',
  })
  if (limited) return limited

  try {
    const body = await readJsonBody<Record<string, unknown>>(req)
    if (!body) return jsonError('Requisicao invalida.', 400)

    const author = cleanText(body.author, 80)
    const stars = Number(body.stars)
    const comment = cleanText(body.comment, 300) || null

    if (!author) return jsonError('Nome obrigatorio.', 400)
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return jsonError('Estrelas invalidas (1-5).', 400)
    }

    await dbInsertAvaliacao(author, stars, comment)
    const stats = await dbGetAvaliacaoStats()
    return NextResponse.json({ ok: true, stats })
  } catch (err) {
    return jsonServerError('[avaliacao POST]', err, 'Erro ao salvar avaliacao.')
  }
}
