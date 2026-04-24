export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbGetBingoItems, dbInsertBingoItem, dbCallBingoItem, dbDeleteBingoItem, dbResetBingo } from '@/lib/db'

const DEFAULT_ITEMS = [
  { emoji: '👶', label: 'Fralda' }, { emoji: '🧴', label: 'Shampoo' }, { emoji: '🎀', label: 'Laço' },
  { emoji: '🧸', label: 'Pelúcia' }, { emoji: '👕', label: 'Body' }, { emoji: '🍼', label: 'Mamadeira' },
  { emoji: '🛁', label: 'Banheira' }, { emoji: '🪆', label: 'Móbile' }, { emoji: '📚', label: 'Livro' },
  { emoji: '🧦', label: 'Meinha' }, { emoji: '🛏', label: 'Roupa de cama' }, { emoji: '🎵', label: 'Brinquedo musical' },
  { emoji: '💊', label: 'Kit saúde' }, { emoji: '🎁', label: 'Presente surpresa' }, { emoji: '👒', label: 'Chapéu' },
  { emoji: '🧼', label: 'Sabonete' }, { emoji: '🛒', label: 'Carrinho' }, { emoji: '🪑', label: 'Cadeirinha' },
  { emoji: '🌡', label: 'Termômetro' }, { emoji: '🎽', label: 'Conjunto' }, { emoji: '🧺', label: 'Cesto roupas' },
  { emoji: '🍭', label: 'Chupeta' }, { emoji: '🪣', label: 'Balde de banho' }, { emoji: '🌙', label: 'Abajur' },
  { emoji: '🏆', label: 'Kit maternidade' }, { emoji: '🌟', label: 'Cobertor' }, { emoji: '🦷', label: 'Mordedor' },
  { emoji: '🧩', label: 'Brinquedo educativo' }, { emoji: '📷', label: 'Porta-retrato' }, { emoji: '🍀', label: 'Mimo' },
]

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const items = await dbGetBingoItems()
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()

  if (body.action === 'seed') {
    const existing = await dbGetBingoItems()
    const existingLabels = new Set(existing.map(item => item.label.trim().toLowerCase()))
    let inserted = 0

    for (let i = 0; i < DEFAULT_ITEMS.length; i++) {
      const item = DEFAULT_ITEMS[i]
      if (existingLabels.has(item.label.trim().toLowerCase())) continue
      await dbInsertBingoItem(item.label, item.emoji, existing.length + i)
      inserted++
    }
    return NextResponse.json({ ok: true, inserted })
  }
  if (body.action === 'add') {
    const label = body.label?.toString().trim().slice(0, 60)
    const emoji = body.emoji?.toString().trim() || '🎁'
    if (!label) return NextResponse.json({ error: 'Rótulo obrigatório' }, { status: 400 })
    await dbInsertBingoItem(label, emoji, Number(body.sortOrder) || 0)
    return NextResponse.json({ ok: true })
  }
  if (body.action === 'call' || body.action === 'uncall' || body.action === 'delete') {
    const id = Number(body.id)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Item invalido' }, { status: 400 })
    }
    if (body.action === 'delete') await dbDeleteBingoItem(id)
    else await dbCallBingoItem(id, body.action === 'call')
    return NextResponse.json({ ok: true })
  }
  if (body.action === 'reset') { await dbResetBingo(); return NextResponse.json({ ok: true }) }
  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
