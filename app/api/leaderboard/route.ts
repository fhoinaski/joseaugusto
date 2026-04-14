import { NextResponse } from 'next/server'
import { dbGetLeaderboard } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const entries = await dbGetLeaderboard(30)
    return NextResponse.json({ entries })
  } catch (err) {
    console.error('[leaderboard]', err)
    return NextResponse.json({ entries: [] })
  }
}
