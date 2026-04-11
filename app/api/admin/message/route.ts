import { NextResponse } from 'next/server'
import { getParentsMessage } from '@/lib/cloudinary'

export async function GET() {
  const message = await getParentsMessage()
  return NextResponse.json({ message })
}
