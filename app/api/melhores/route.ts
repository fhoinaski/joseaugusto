import { NextRequest, NextResponse } from 'next/server'
import { objectUrl } from '@/lib/r2'

export const dynamic = 'force-dynamic'

// ── D1 helper ─────────────────────────────────────────────────────────────────

interface D1Response<T> {
  result: Array<{ results: T[]; success: boolean }>
  success: boolean
  errors: Array<{ message: string }>
}

async function d1Query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const dbId = process.env.CLOUDFLARE_D1_DATABASE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN

  if (!accountId || !dbId || !token) throw new Error('Missing Cloudflare env vars')

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`D1 HTTP ${res.status}: ${await res.text()}`)

  const json = (await res.json()) as D1Response<T>
  if (!json.success || json.errors?.length) {
    throw new Error(json.errors?.[0]?.message ?? 'D1 query failed')
  }
  return json.result[0]?.results ?? []
}

// ── Row types ──────────────────────────────────────────────────────────────────

interface TopRow {
  id: string
  author: string
  caption: string | null
  total_reactions: number
}

// ── GET /api/melhores ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const mode = req.nextUrl.searchParams.get('mode')
    const idsParam = req.nextUrl.searchParams.get('ids')

    let rows: TopRow[] = []

    if (mode === 'top') {
      // Top 20 photos by total reaction count
      rows = await d1Query<TopRow>(
        `SELECT m.id, m.author, m.caption, COALESCE(SUM(r.count), 0) AS total_reactions
           FROM media m
           LEFT JOIN reactions r ON r.media_id = m.id
          WHERE m.status = 'approved' AND m.type = 'image'
          GROUP BY m.id, m.author, m.caption
          ORDER BY total_reactions DESC
          LIMIT 20`,
      )
    } else if (idsParam && idsParam.trim()) {
      const ids = idsParam
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 100)

      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',')
        rows = await d1Query<TopRow>(
          `SELECT m.id, m.author, m.caption, COALESCE(SUM(r.count), 0) AS total_reactions
             FROM media m
             LEFT JOIN reactions r ON r.media_id = m.id
            WHERE m.id IN (${placeholders}) AND m.status = 'approved'
            GROUP BY m.id, m.author, m.caption
            ORDER BY m.created_at DESC`,
          ids,
        )
      }
    } else {
      return NextResponse.json({ error: 'Parâmetro mode=top ou ids=... é obrigatório.' }, { status: 400 })
    }

    const photos = rows.map(row => ({
      id: row.id,
      thumbUrl: objectUrl(row.id),
      fullUrl: objectUrl(row.id),
      author: row.author,
      caption: row.caption ?? '',
      totalReactions: row.total_reactions,
    }))

    return NextResponse.json({ photos })
  } catch (err) {
    console.error('GET /api/melhores error:', err)
    return NextResponse.json({ error: 'Erro ao buscar melhores fotos.' }, { status: 500 })
  }
}
