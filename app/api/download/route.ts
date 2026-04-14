import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getAllowedOrigins(): string[] {
  const origins: string[] = []
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL?.trim().replace(/\/$/, '')
  const r2Url  = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, '')
  if (cdnUrl) origins.push(cdnUrl)
  if (r2Url && r2Url !== cdnUrl) origins.push(r2Url)
  return origins
}

function isAllowedUrl(url: string): boolean {
  const allowed = getAllowedOrigins()
  return allowed.some(origin => url.startsWith(origin + '/') || url === origin)
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Parâmetro url é obrigatório.' }, { status: 400 })
  }

  if (!isAllowedUrl(url)) {
    return NextResponse.json({ error: 'URL não permitida.' }, { status: 403 })
  }

  try {
    const upstream = await fetch(url, { cache: 'no-store' })
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Falha ao buscar arquivo.' }, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
    const buffer = await upstream.arrayBuffer()

    // Derive a filename from the URL path
    const urlPath = new URL(url).pathname
    const filename = urlPath.split('/').pop() ?? 'download'

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[download GET]', err)
    return NextResponse.json({ error: 'Erro ao baixar arquivo.' }, { status: 500 })
  }
}
