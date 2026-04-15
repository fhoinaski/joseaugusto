import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url') ?? `${new URL(req.url).origin}/`
  const size = Number(searchParams.get('size') ?? 300)
  try {
    const svg = await QRCode.toString(url, {
      type: 'svg',
      width: size,
      margin: 2,
      color: { dark: '#3e2408', light: '#fdf6ee' },
    })
    return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public,max-age=3600' } })
  } catch {
    return NextResponse.json({ error: 'QR generation failed' }, { status: 500 })
  }
}
