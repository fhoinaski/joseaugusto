import { NextRequest, NextResponse } from 'next/server'
import { dbGetMuralCards, dbCreateMuralCard, dbDeleteMuralCard } from '@/lib/db'

export const dynamic = 'force-dynamic'

const ALLOWED_COLORS = ['#fdf6ee', '#fce4ec', '#e8f5e9', '#e3f2fd', '#fff8e1', '#f3e5f5']

export async function GET() {
  try {
    const cards = await dbGetMuralCards()
    return NextResponse.json({ cards })
  } catch (err) {
    console.error('[mural-cards GET]', err)
    return NextResponse.json({ cards: [], error: 'Erro ao carregar cards.' })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { author?: string; text?: string; color?: string }
    const author = (body.author ?? '').toString().trim().slice(0, 60)
    const text   = (body.text   ?? '').toString().trim().slice(0, 200)
    const color  = ALLOWED_COLORS.includes(body.color ?? '') ? (body.color ?? '#fdf6ee') : '#fdf6ee'

    if (!author || !text) {
      return NextResponse.json({ error: 'Nome e texto são obrigatórios.' }, { status: 400 })
    }

    await dbCreateMuralCard({ author, text, color })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('[mural-cards POST]', err)
    return NextResponse.json({ error: 'Erro ao criar card.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get('id') ?? '', 10)
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
    }
    await dbDeleteMuralCard(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mural-cards DELETE]', err)
    return NextResponse.json({ error: 'Erro ao deletar card.' }, { status: 500 })
  }
}
