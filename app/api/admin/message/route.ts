import { NextResponse } from 'next/server'
import { dbGetConfig } from '@/lib/db'
import { DEFAULT_PARENTS_MSG } from '@/lib/db'

export async function GET() {
  const message = await dbGetConfig('parents_message', DEFAULT_PARENTS_MSG)
  return NextResponse.json({ message })
}
