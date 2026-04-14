import { NextRequest, NextResponse } from 'next/server'
import { dbGetStoreItems, dbClaimStoreItem } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const items = await dbGetStoreItems()
    return NextResponse.json({ items })
  } catch (err) {
    console.error('[store GET]', err)
    return NextResponse.json({ items: [], error: 'Erro ao carregar lista de presentes.' })
  }
}

// POST /api/store — claim an item
export async function POST(req: NextRequest) {
  // Rate-limit: 5 claims per hour per IP (prevent abuse)
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`store-claim:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 })
  if (!allowed) return NextResponse.json({ error: 'Muitas tentativas. Aguarde um pouco.' }, { status: 429 })

  try {
    const { id, claimed_by } = await req.json()
    if (!id || !claimed_by?.trim()) {
      return NextResponse.json({ error: 'Informe seu nome para reservar o presente.' }, { status: 400 })
    }
    const ok = await dbClaimStoreItem(Number(id), claimed_by.trim().slice(0, 60))
    if (!ok) return NextResponse.json({ error: 'Este presente já foi reservado por outra pessoa.' }, { status: 409 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[store POST]', err)
    return NextResponse.json({ error: 'Erro ao reservar presente.' }, { status: 500 })
  }
}
