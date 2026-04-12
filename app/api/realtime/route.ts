import { NextResponse } from 'next/server'
import { getRealtimeDataR2 } from '@/lib/r2'

export const revalidate = 0

export async function GET() {
  try {
    const data = await getRealtimeDataR2()
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ data: null })
  }
}
