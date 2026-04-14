import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbGetStoreItems, dbInsertStoreItem, dbUpdateStoreItem, dbDeleteStoreItem, dbUnclaimStoreItem } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const items = await dbGetStoreItems()
    return NextResponse.json({ items })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const body = await req.json()
    const { action } = body as { action: string }

    if (action === 'add') {
      const { name, description = '', image_url = '', link = '', price_brl = null, sort_order = 0 } = body
      if (!name?.trim()) return NextResponse.json({ error: 'Nome do presente é obrigatório' }, { status: 400 })
      await dbInsertStoreItem(name.trim(), description.trim(), image_url.trim(), link.trim(), price_brl ? Number(price_brl) : null, Number(sort_order))
      return NextResponse.json({ ok: true })
    }

    if (action === 'update') {
      const { id, ...fields } = body
      if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
      const allowed = ['name', 'description', 'image_url', 'link', 'price_brl', 'sort_order'] as const
      const update: Record<string, unknown> = {}
      for (const k of allowed) {
        if (k in fields) update[k] = fields[k]
      }
      await dbUpdateStoreItem(Number(id), update)
      return NextResponse.json({ ok: true })
    }

    if (action === 'delete') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
      await dbDeleteStoreItem(Number(id))
      return NextResponse.json({ ok: true })
    }

    if (action === 'unclaim') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
      await dbUnclaimStoreItem(Number(id))
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
