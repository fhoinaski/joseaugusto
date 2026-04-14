import { NextResponse } from 'next/server'
import { dbGetCartas, dbInsertCarta } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Simple in-memory rate limiter
const ipMap = new Map<string, number[]>()
function rateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const timestamps = (ipMap.get(ip) ?? []).filter(t => now - t < windowMs)
  if (timestamps.length >= max) return false
  ipMap.set(ip, [...timestamps, now])
  return true
}

export async function GET() {
  try {
    const cartas = await dbGetCartas(100)
    return NextResponse.json({ cartas })
  } catch (err) {
    console.error('[carta GET]', err)
    return NextResponse.json({ error: 'Erro ao buscar cartas' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(ip, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Muitas cartas. Tente novamente em 1 hora.' }, { status: 429 })
  }

  try {
    const body = await req.json() as { author?: string; message?: string }
    const author = (body.author ?? '').trim().slice(0, 80)
    const message = (body.message ?? '').trim().slice(0, 2000)

    if (!author) return NextResponse.json({ error: 'Nome obrigatório.' }, { status: 400 })
    if (!message || message.length < 10) return NextResponse.json({ error: 'A carta precisa ter pelo menos 10 caracteres.' }, { status: 400 })

    await dbInsertCarta(author, message)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[carta POST]', err)
    return NextResponse.json({ error: 'Erro ao salvar carta.' }, { status: 500 })
  }
}
