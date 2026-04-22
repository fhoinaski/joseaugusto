import { NextRequest, NextResponse } from 'next/server'
import { dbGetMemoriasSubscribers, dbCreateMemoriaSubscriber } from '@/lib/db'
import { cleanText, jsonError, jsonServerError, readJsonBody, requireRateLimit } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

const POST_LIMIT = 8
const POST_WINDOW_MS = 60 * 60 * 1000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET() {
  try {
    const subscribers = await dbGetMemoriasSubscribers()
    return NextResponse.json({ subscribers })
  } catch (err) {
    console.error('[memorias GET]', err)
    return NextResponse.json({ subscribers: [], error: 'Erro ao carregar inscritos.' })
  }
}

export async function POST(req: NextRequest) {
  const limited = requireRateLimit(req, 'memorias-post', {
    limit: POST_LIMIT,
    windowMs: POST_WINDOW_MS,
    message: 'Muitas inscricoes em pouco tempo. Tente novamente mais tarde.',
  })
  if (limited) return limited

  try {
    const body = await readJsonBody<Record<string, unknown>>(req)
    if (!body) return jsonError('Requisicao invalida.', 400)

    const author = cleanText(body.author, 60)
    const email = cleanText(body.email, 120).toLowerCase()

    if (!author || !email) return jsonError('Nome e e-mail sao obrigatorios.', 400)
    if (!EMAIL_RE.test(email)) return jsonError('E-mail invalido.', 400)

    await dbCreateMemoriaSubscriber({ author, email })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    return jsonServerError('[memorias POST]', err, 'Erro ao inscrever. Tente novamente.')
  }
}
