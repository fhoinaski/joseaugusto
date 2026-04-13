import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbGetMediaPage } from '@/lib/db'
import { objectUrl } from '@/lib/r2'

function pickCacheHeaders(headers: Headers) {
  return {
    cfCacheStatus: headers.get('cf-cache-status') || '',
    age: headers.get('age') || '',
    cacheControl: headers.get('cache-control') || '',
    etag: headers.get('etag') || '',
    xCache: headers.get('x-cache') || '',
  }
}

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { items } = await dbGetMediaPage('approved', 1)
    const imageItem = items.find((m) => m.type === 'image')

    if (!imageItem) {
      return NextResponse.json({
        ok: true,
        cacheHitRate: null,
        sampleUrl: '',
        firstRequest: null,
        secondRequest: null,
        note: 'Sem imagem aprovada para monitorar cache.',
      })
    }

    const sampleUrl = objectUrl(imageItem.id)
    const first = await fetch(sampleUrl, { method: 'HEAD', cache: 'no-store' })
    const second = await fetch(sampleUrl, { method: 'HEAD', cache: 'no-store' })

    const firstHeaders = pickCacheHeaders(first.headers)
    const secondHeaders = pickCacheHeaders(second.headers)

    const statuses = [firstHeaders.cfCacheStatus, secondHeaders.cfCacheStatus].filter(Boolean)
    const hits = statuses.filter((s) => s.toUpperCase() === 'HIT').length
    const cacheHitRate = statuses.length > 0 ? Math.round((hits / statuses.length) * 100) : null

    return NextResponse.json({
      ok: true,
      sampleUrl,
      cacheHitRate,
      firstRequest: { status: first.status, ...firstHeaders },
      secondRequest: { status: second.status, ...secondHeaders },
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
