import { NextRequest, NextResponse } from 'next/server'
import { dbGetPalpites, dbUpsertPalpite } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const palpites = await dbGetPalpites()
    return NextResponse.json({ palpites })
  } catch (err) {
    console.error('[palpites GET]', err)
    return NextResponse.json({ palpites: [], error: 'Erro ao carregar palpites.' })
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`palpites-post:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde um momento.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const author = (body.author ?? '').toString().trim().slice(0, 60)

    if (!author) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
    }

    const peso_g    = body.peso_g    != null ? Number(body.peso_g)    : null
    const altura_cm = body.altura_cm != null ? Number(body.altura_cm) : null
    const hora      = body.hora      ? String(body.hora).trim().slice(0, 5)  : null
    const cabelo    = body.cabelo    ? String(body.cabelo).trim().slice(0, 10) : null

    await dbUpsertPalpite(author, peso_g, altura_cm, hora, cabelo)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[palpites POST]', err)
    return NextResponse.json({ error: 'Erro ao salvar palpite.' }, { status: 500 })
  }
}
