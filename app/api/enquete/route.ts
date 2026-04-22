export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { dbGetActiveEnquete, dbGetEnqueteResults } from '@/lib/db'

export async function GET() {
  try {
    const enquete = await dbGetActiveEnquete()
    if (!enquete) return NextResponse.json({ enquete: null, results: [] })

    const results = await dbGetEnqueteResults(enquete.id, enquete.options)
    return NextResponse.json({ enquete, results })
  } catch (err) {
    console.error('[enquete GET]', err)
    return NextResponse.json({ enquete: null, results: [], error: 'Enquete indisponivel no momento.' })
  }
}
