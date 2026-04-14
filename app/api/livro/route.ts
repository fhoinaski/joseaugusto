import { NextRequest, NextResponse } from 'next/server'
import { dbGetLivroMessages, dbInsertLivroMessage } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

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
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`livro-post:${ip}`, { limit: 3, windowMs: 60 * 60 * 1000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Muitas mensagens enviadas. Aguarde um momento.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const author  = (body.author  ?? '').toString().trim().slice(0, 60)
    const message = (body.message ?? '').toString().trim().slice(0, 500)

    if (!author || !message) {
      return NextResponse.json({ error: 'Nome e mensagem são obrigatórios.' }, { status: 400 })
    }

    const inserted = await dbInsertLivroMessage(author, message)
    return NextResponse.json({ ok: true, message: inserted }, { status: 201 })
  } catch (err) {
    console.error('[livro POST]', err)
    return NextResponse.json({ error: 'Erro ao salvar mensagem.' }, { status: 500 })
  }
}
