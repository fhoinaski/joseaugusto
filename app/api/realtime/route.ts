import { NextResponse } from 'next/server'
import { getRealtimeData } from '@/lib/cloudinary'

export async function GET() {
  try {
    const data = await getRealtimeData()
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ data: null })
  }
}

export const revalidate = 0
