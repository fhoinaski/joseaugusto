import { NextResponse } from 'next/server'
import { dbGetDiario } from '@/lib/db'

export async function GET() {
  const entries = await dbGetDiario(true)
  return NextResponse.json({ entries })
}
