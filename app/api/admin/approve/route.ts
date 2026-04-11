import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { getMedia, updateStatus, getParentsMessage, setParentsMessage } from '@/lib/cloudinary'

export async function GET(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const type = req.nextUrl.searchParams.get('type') ?? 'pending'
  const { media } = await getMedia(type)
  return NextResponse.json({ media })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()

  if (body.action === 'update_message') {
    await setParentsMessage(body.message)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'get_message') {
    const message = await getParentsMessage()
    return NextResponse.json({ message })
  }

  if (['approve', 'reject'].includes(body.action)) {
    await updateStatus(body.id, body.action === 'approve' ? 'approved' : 'rejected', body.resourceType ?? 'image')
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
