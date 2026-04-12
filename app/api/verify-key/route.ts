import { NextRequest, NextResponse } from 'next/server'
import { dbVerifyAccessKey } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json()
    if (!key?.trim()) return NextResponse.json({ valid: false })
    const valid = await dbVerifyAccessKey(key.trim())
    return NextResponse.json({ valid })
  } catch {
    return NextResponse.json({ valid: false })
  }
}
