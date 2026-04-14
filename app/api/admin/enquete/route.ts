export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbCreateEnquete, dbCloseEnquete, dbGetActiveEnquete, dbGetEnqueteResults } from '@/lib/db'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const enquete = await dbGetActiveEnquete()
  if (!enquete) return NextResponse.json({ enquete: null, results: [] })
  const results = await dbGetEnqueteResults(enquete.id, enquete.options)
  return NextResponse.json({ enquete, results })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()

  if (body.action === 'create') {
    const question = body.question?.toString().trim().slice(0, 200)
    const options  = (body.options as string[])
      ?.map((o: string) => o.toString().trim().slice(0, 100))
      .filter(Boolean)
    if (!question)              return NextResponse.json({ error: 'Pergunta obrigatória' }, { status: 400 })
    if (!options || options.length < 2) return NextResponse.json({ error: 'Mínimo 2 opções' }, { status: 400 })
    const id = await dbCreateEnquete(question, options)
    return NextResponse.json({ ok: true, id })
  }

  if (body.action === 'close') {
    await dbCloseEnquete(Number(body.id))
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
