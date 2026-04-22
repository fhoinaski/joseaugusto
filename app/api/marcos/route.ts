import { NextResponse } from 'next/server'
import { dbGetMarcos, dbCreateMarco, dbDeleteMarco } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const marcos = await dbGetMarcos()
    return NextResponse.json({ marcos })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (!isAuthenticated()) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    const body = await req.json() as {
      title?: unknown; emoji?: unknown; description?: unknown; marco_date?: unknown; photo_url?: unknown
    }
    const title = String(body.title ?? '').trim().slice(0, 120)
    const emoji = String(body.emoji ?? '⭐').trim().slice(0, 8)
    const description = body.description ? String(body.description).trim().slice(0, 500) : undefined
    const marco_date = String(body.marco_date ?? '').trim()
    const photo_url = body.photo_url ? String(body.photo_url).trim().slice(0, 500) : undefined

    if (!title) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })
    if (!marco_date) return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 })

    await dbCreateMarco({ title, emoji, description, marco_date, photo_url })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    if (!isAuthenticated()) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    const body = await req.json() as { id?: unknown }
    const id = Number(body.id)
    if (!id || isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    await dbDeleteMarco(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
