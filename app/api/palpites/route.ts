import { NextRequest, NextResponse } from 'next/server'
import { dbGetPalpites, dbUpsertPalpite } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const VALID_CABELO = new Set(['Sim', 'Pouco', 'Não'])

function validIntegerInRange(value: unknown, min: number, max: number): number | null {
  if (value == null || value === '') return null
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return NaN
  const rounded = Math.round(numberValue)
  return rounded >= min && rounded <= max ? rounded : NaN
}

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

    const peso_g = validIntegerInRange(body.peso_g, 500, 7000)
    if (Number.isNaN(peso_g)) {
      return NextResponse.json({ error: 'Informe um peso entre 0,5 kg e 7 kg.' }, { status: 400 })
    }

    const altura_cm = validIntegerInRange(body.altura_cm, 20, 70)
    if (Number.isNaN(altura_cm)) {
      return NextResponse.json({ error: 'Informe uma altura entre 20 cm e 70 cm.' }, { status: 400 })
    }

    const hora = body.hora ? String(body.hora).trim().slice(0, 5) : null
    if (hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
      return NextResponse.json({ error: 'Informe um horario valido.' }, { status: 400 })
    }

    const cabelo = body.cabelo ? String(body.cabelo).trim().slice(0, 10) : null
    if (cabelo && !VALID_CABELO.has(cabelo)) {
      return NextResponse.json({ error: 'Opcao de cabelo invalida.' }, { status: 400 })
    }

    await dbUpsertPalpite(author, peso_g, altura_cm, hora, cabelo)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[palpites POST]', err)
    return NextResponse.json({ error: 'Erro ao salvar palpite.' }, { status: 500 })
  }
}
