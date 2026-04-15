export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { dbRecordPwaSession } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await dbRecordPwaSession(
      body.event ?? 'session',
      body.userAgent ?? '',
      body.author ?? null,
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // never block the client
  }
}

export async function GET() {
  try {
    const { dbGetPwaStats } = await import('@/lib/db')
    const stats = await dbGetPwaStats()
    return NextResponse.json(stats)
  } catch {
    return NextResponse.json({ installs: 0, sessions: 0, devices: [] })
  }
}
