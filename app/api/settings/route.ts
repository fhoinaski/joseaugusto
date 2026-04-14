import { NextResponse } from 'next/server'
import { dbGetConfig } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [geoGate, babyBorn, babyDueDate, babyBornWeight, babyBornHora, babyBornCabelo] = await Promise.all([
      dbGetConfig('geo_gate_enabled', '0'),
      dbGetConfig('baby_born', '0'),
      dbGetConfig('baby_due_date', ''),
      dbGetConfig('baby_born_weight_g', ''),
      dbGetConfig('baby_born_hora', ''),
      dbGetConfig('baby_born_cabelo', ''),
    ])
    return NextResponse.json({
      geoGateEnabled: geoGate === '1',
      babyBorn: babyBorn === '1',
      babyDueDate: babyDueDate || null,
      babyBornWeight: babyBornWeight ? parseInt(babyBornWeight, 10) : null,
      babyBornHora: babyBornHora || null,
      babyBornCabelo: babyBornCabelo || null,
    })
  } catch {
    return NextResponse.json({ geoGateEnabled: false, babyBorn: false, babyDueDate: null, babyBornWeight: null, babyBornHora: null, babyBornCabelo: null })
  }
}
