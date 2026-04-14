import { NextResponse } from 'next/server'
import { dbGetEventStats } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export async function GET() {
  try {
    const stats = await dbGetEventStats()
    return NextResponse.json(stats)
  } catch (err) {
    console.error('[stats GET]', err)
    return NextResponse.json({ photos: 0, reactions: 0, comments: 0, authors: 0 })
  }
}
