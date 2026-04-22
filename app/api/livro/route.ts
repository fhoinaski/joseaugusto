import { NextRequest, NextResponse } from 'next/server'
import { dbGetLivroMessages, dbInsertLivroMessage } from '@/lib/db'
import { cleanText, jsonError, jsonServerError, readJsonBody, requireRateLimit } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const messages = await dbGetLivroMessages(100)
    return NextResponse.json({ messages })
  } catch (err) {
    console.error('[livro GET]', err)
    return NextResponse.json({ messages: [], error: 'Erro ao carregar mensagens.' })
  }
}

export async function POST(req: NextRequest) {
  const limited = requireRateLimit(req, 'livro-post', {
    limit: 3,
    windowMs: 60 * 60 * 1000,
    message: 'Muitas mensagens enviadas. Aguarde um momento.',
  })
  if (limited) return limited

  try {
    const body = await readJsonBody<Record<string, unknown>>(req)
    if (!body) return jsonError('Requisicao invalida.', 400)

    const author = cleanText(body.author, 60)
    const message = cleanText(body.message, 500)

    if (!author || !message) {
      return jsonError('Nome e mensagem sao obrigatorios.', 400)
    }

    const inserted = await dbInsertLivroMessage(author, message)
    return NextResponse.json({ ok: true, message: inserted }, { status: 201 })
  } catch (err) {
    return jsonServerError('[livro POST]', err, 'Erro ao salvar mensagem.')
  }
}
