export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { dbGetDesafios } from '@/lib/db'

export async function GET() {
  const desafios = await dbGetDesafios(true)
  return NextResponse.json({ desafios })
}
