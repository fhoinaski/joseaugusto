import { NextResponse } from 'next/server'
import { dbGetBingoItems } from '@/lib/db'

export async function GET() {
  const items = await dbGetBingoItems()
  return NextResponse.json({ items })
}
