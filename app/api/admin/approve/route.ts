import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin-guard'
import { dbGetMedia, dbUpdateStatus, dbDeleteMedia, dbGetConfig, dbSetConfig, dbApproveAllPending } from '@/lib/db'
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
  const blocked = requireAdmin(req)
  if (blocked) return blocked

  const body = await req.json()

  if (body.action === 'update_message') {
    await dbSetConfig('parents_message', body.message)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'get_message') {
    const message = await dbGetConfig('parents_message')
    return NextResponse.json({ message })
  }

  if (body.action === 'update_pinned_text') {
    await dbSetConfig('pinned_text', body.text ?? '')
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'get_pinned_text') {
    const pinnedText = await dbGetConfig('pinned_text', '')
    return NextResponse.json({ pinnedText })
  }

  if (body.action === 'pin_media') {
    const id = (body.id ?? '').toString().trim()
    const current = await dbGetConfig('pinned_media_id', '')
    const next = current === id ? '' : id
    await dbSetConfig('pinned_media_id', next)
    return NextResponse.json({ ok: true, pinnedMediaId: next })
  }

  if (body.action === 'get_pinned_media') {
    const pinnedMediaId = await dbGetConfig('pinned_media_id', '')
    return NextResponse.json({ pinnedMediaId })
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

  if (body.action === 'approve_all') {
    const count = await dbApproveAllPending()
    return NextResponse.json({ ok: true, count })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
