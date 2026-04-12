import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbGetMedia, dbUpdateStatus, dbDeleteMedia, dbGetConfig, dbSetConfig } from '@/lib/db'
import { objectUrl, deleteObject } from '@/lib/r2'

export async function GET(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('type') ?? 'pending'
  const rows   = await dbGetMedia(status)
  const media  = rows.map(row => ({
    ...row,
    thumbUrl: objectUrl(row.id),
    fullUrl:  objectUrl(row.id),
  }))
  return NextResponse.json({ media })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  if (body.action === 'update_message') {
    await dbSetConfig('parents_message', body.message)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'get_message') {
    const message = await dbGetConfig('parents_message')
    return NextResponse.json({ message })
  }

  if (body.action === 'approve' || body.action === 'reject') {
    await dbUpdateStatus(body.id, body.action === 'approve' ? 'approved' : 'rejected')
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'delete') {
    // Remove from D1 first (cascades reactions)
    await dbDeleteMedia(body.id)
    // Then delete the R2 object
    await deleteObject(body.id).catch(() => {})
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
