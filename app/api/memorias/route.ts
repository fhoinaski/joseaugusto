import { NextRequest, NextResponse } from 'next/server'
import { dbGetMemoriasSubscribers, dbCreateMemoriaSubscriber } from '@/lib/db'

export const dynamic = 'force-dynamic'

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
  try {
    const body = await req.json() as { author?: string; email?: string }
    const author = (body.author ?? '').toString().trim().slice(0, 60)
    const email  = (body.email  ?? '').toString().trim().toLowerCase().slice(0, 120)

    if (!author || !email) {
      return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 })
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
    }

    await dbCreateMemoriaSubscriber({ author, email })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('[memorias POST]', err)
    return NextResponse.json({ error: 'Erro ao inscrever. Tente novamente.' }, { status: 500 })
  }
}
