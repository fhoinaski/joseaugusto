import { NextResponse } from 'next/server'
import { dbGetConfig } from '@/lib/db'

/** Public endpoint — returns settings the client needs without auth */
export async function GET() {
  try {
    const geoGate = await dbGetConfig('geo_gate_enabled', '0')
    return NextResponse.json({ geoGateEnabled: geoGate === '1' })
  } catch {
    // Fail open: if D1 is unavailable, don't block uploads
    return NextResponse.json({ geoGateEnabled: false })
  }
}
