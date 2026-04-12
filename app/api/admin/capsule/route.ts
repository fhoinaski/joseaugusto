import { NextRequest, NextResponse } from 'next/server'
import cloudinary, { getCapsules, getCapsuleOpenDate, setCapsuleOpenDate } from '@/lib/cloudinary'
import { isAuthenticated } from '@/lib/auth'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const [capsules, openDate] = await Promise.all([getCapsules(), getCapsuleOpenDate()])
  return NextResponse.json({ capsules, openDate })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()

  if (body.action === 'set_open_date') {
    await setCapsuleOpenDate(body.openDate ?? '18 anos')
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'delete' && body.id) {
    await (cloudinary.uploader as any).destroy(body.id, { invalidate: true })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
