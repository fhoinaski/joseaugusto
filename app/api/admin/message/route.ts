import { NextResponse } from 'next/server'
import { dbGetConfig } from '@/lib/db'
import { DEFAULT_PARENTS_MSG } from '@/lib/db'
import { isD1AuthError } from '@/lib/db'

export async function GET() {
  try {
    const message = await dbGetConfig('parents_message', DEFAULT_PARENTS_MSG)
    return NextResponse.json({ message })
  } catch (err) {
    if (isD1AuthError(err)) {
      console.warn('GET /api/admin/message degraded: D1 auth error')
      return NextResponse.json({ message: DEFAULT_PARENTS_MSG, degraded: true, reason: 'd1-auth' })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
