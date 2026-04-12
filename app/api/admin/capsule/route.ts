import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbGetCapsules, dbGetConfig, dbSetConfig, dbDeleteCapsule } from '@/lib/db'
import { deleteObject } from '@/lib/r2'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const [capsules, openDate] = await Promise.all([
    dbGetCapsules(),
    dbGetConfig('capsule_open_date', '18 anos'),
  ])
  return NextResponse.json({ capsules, openDate })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  if (body.action === 'set_open_date') {
    await dbSetConfig('capsule_open_date', body.openDate ?? '18 anos')
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'delete' && body.id) {
    // Delete capsule record from D1
    await dbDeleteCapsule(Number(body.id))

    // Also delete the associated R2 image if one exists
    if (body.imageUrl) {
      try {
        const url = new URL(body.imageUrl as string)
        // The R2 key is everything after the leading '/'
        const key = url.pathname.slice(1)
        if (key) await deleteObject(key)
      } catch {}
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
