import { NextResponse } from 'next/server'
import { dbGetConfig } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const raw = await dbGetConfig('live_announce', '')
    if (!raw) return NextResponse.json({ message: '', ts: 0 })

    const parsed = JSON.parse(raw) as { message?: unknown; ts?: unknown }
    return NextResponse.json({
      message: typeof parsed.message === 'string' ? parsed.message : '',
      ts: typeof parsed.ts === 'number' ? parsed.ts : 0,
    })
  } catch {
    return NextResponse.json({ message: '', ts: 0 })
  }
}
