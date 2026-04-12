/**
 * Cloudflare D1 client via HTTP API.
 * Works from any Node.js runtime (Vercel, local dev, etc.).
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_D1_DATABASE_ID
 *   CLOUDFLARE_API_TOKEN       (with D1 read+write permission)
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string
  thumbUrl: string
  fullUrl: string
  author: string
  status: 'approved' | 'pending' | 'rejected'
  type: 'image' | 'video'
  createdAt: string
  reactions: Record<string, number>
}

export interface CapsuleItem {
  id: number
  author: string
  message: string
  imageUrl: string
  createdAt: string
}

// ── D1 HTTP client ────────────────────────────────────────────────────────────

interface D1Response<T> {
  result: Array<{ results: T[]; success: boolean }>
  success: boolean
  errors: Array<{ message: string }>
}

function endpoint() {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID
  const db   = process.env.CLOUDFLARE_D1_DATABASE_ID
  if (!acct || !db) throw new Error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_D1_DATABASE_ID')
  return `https://api.cloudflare.com/client/v4/accounts/${acct}/d1/database/${db}/query`
}

async function d1Query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!token) throw new Error('Missing CLOUDFLARE_API_TOKEN')

  const res = await fetch(endpoint(), {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ sql, params }),
    // Prevent Next.js from caching D1 responses
    cache:   'no-store',
  })

  if (!res.ok) throw new Error(`D1 HTTP ${res.status}: ${await res.text()}`)

  const json = await res.json() as D1Response<T>
  if (!json.success || json.errors?.length) {
    throw new Error(json.errors?.[0]?.message ?? 'D1 query failed')
  }
  return json.result[0]?.results ?? []
}

// Fire-and-forget helper (no return value needed)
async function d1Exec(sql: string, params: unknown[] = []): Promise<void> {
  await d1Query(sql, params)
}

// ── Media ────────────────────────────────────────────────────────────────────

interface MediaRow {
  id: string; author: string
  status: 'approved' | 'pending' | 'rejected'
  type: 'image' | 'video'; created_at: string
  emoji: string | null; count: number | null
}

/** Returns media rows with reactions collapsed into a map. */
export async function dbGetMedia(status: string): Promise<Array<Omit<MediaItem, 'thumbUrl' | 'fullUrl'>>> {
  const rows = await d1Query<MediaRow>(
    `SELECT m.id, m.author, m.status, m.type, m.created_at, r.emoji, r.count
       FROM media m
       LEFT JOIN reactions r ON r.media_id = m.id
      WHERE m.status = ?
      ORDER BY m.created_at DESC`,
    [status],
  )

  const map = new Map<string, Omit<MediaItem, 'thumbUrl' | 'fullUrl'>>()
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id, author: row.author, status: row.status,
        type: row.type, createdAt: row.created_at, reactions: {},
      })
    }
    if (row.emoji && row.count != null) {
      map.get(row.id)!.reactions[row.emoji] = row.count
    }
  }
  return Array.from(map.values())
}

export async function dbInsertMedia(id: string, author: string, type: 'image' | 'video'): Promise<void> {
  await d1Exec(
    `INSERT INTO media (id, author, status, type, created_at)
       VALUES (?, ?, 'approved', ?, datetime('now'))
         ON CONFLICT(id) DO NOTHING`,
    [id, author, type],
  )
}

export async function dbUpdateStatus(id: string, status: string): Promise<void> {
  await d1Exec(`UPDATE media SET status = ? WHERE id = ?`, [status, id])
}

export async function dbDeleteMedia(id: string): Promise<void> {
  await d1Exec(`DELETE FROM media WHERE id = ?`, [id])
}

// ── Reactions ────────────────────────────────────────────────────────────────

export async function dbIncrementReaction(
  mediaId: string,
  emoji: string,
): Promise<Record<string, number>> {
  await d1Exec(
    `INSERT INTO reactions (media_id, emoji, count) VALUES (?, ?, 1)
       ON CONFLICT(media_id, emoji) DO UPDATE SET count = count + 1`,
    [mediaId, emoji],
  )
  const rows = await d1Query<{ emoji: string; count: number }>(
    `SELECT emoji, count FROM reactions WHERE media_id = ?`,
    [mediaId],
  )
  return Object.fromEntries(rows.map(r => [r.emoji, r.count]))
}

// ── Config ───────────────────────────────────────────────────────────────────

export const DEFAULT_PARENTS_MSG =
  'Antes mesmo de você chegar, já existia um amor que não cabia no mundo. ' +
  'Cada foto aqui é um pedaço do dia em que o nosso mundo ficou maior, mais barulhento e infinitamente mais bonito. ' +
  'Você ainda não sabe, mas já é o amor mais bonito das nossas vidas. ' +
  'Bem-vindo, José Augusto — a festa foi só o começo.'

export async function dbGetConfig(key: string, fallback = ''): Promise<string> {
  const rows = await d1Query<{ value: string }>(`SELECT value FROM config WHERE key = ?`, [key])
  return rows[0]?.value ?? fallback
}

export async function dbSetConfig(key: string, value: string): Promise<void> {
  await d1Exec(
    `INSERT INTO config (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  )
}

// ── Capsule messages ─────────────────────────────────────────────────────────

export async function dbGetCapsules(): Promise<CapsuleItem[]> {
  const rows = await d1Query<{ id: number; author: string; message: string; image_url: string; created_at: string }>(
    `SELECT id, author, message, image_url, created_at
       FROM capsule_messages
      ORDER BY created_at DESC`,
  )
  return rows.map(r => ({
    id:        r.id,
    author:    r.author,
    message:   r.message,
    imageUrl:  r.image_url,
    createdAt: r.created_at,
  }))
}

export async function dbGetCapsuleCount(): Promise<number> {
  const rows = await d1Query<{ n: number }>(`SELECT COUNT(*) AS n FROM capsule_messages`)
  return rows[0]?.n ?? 0
}

export async function dbInsertCapsule(author: string, message: string, imageUrl: string): Promise<void> {
  await d1Exec(
    `INSERT INTO capsule_messages (author, message, image_url, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
    [author, message, imageUrl],
  )
}

export async function dbDeleteCapsule(id: number): Promise<void> {
  await d1Exec(`DELETE FROM capsule_messages WHERE id = ?`, [id])
}
