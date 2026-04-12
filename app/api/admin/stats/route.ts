import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbGetStats } from '@/lib/db'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const stats = await dbGetStats()
    return NextResponse.json(stats)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
