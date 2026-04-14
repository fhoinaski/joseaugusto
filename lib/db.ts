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
  caption?: string
  status: 'approved' | 'pending' | 'rejected'
  type: 'image' | 'video' | 'audio'
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

export function isD1AuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('D1 HTTP 401') || msg.includes('"code":10000') || /authentication error/i.test(msg)
}

function isMissingStoriesSeenTableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /no such table:\s*stories_seen/i.test(msg)
}

function isMissingCaptionColumnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /no such column:\s*(m\.)?caption/i.test(msg) || /has no column named\s+caption/i.test(msg)
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
  type: 'image' | 'video' | 'audio'; created_at: string
  caption: string | null
  emoji: string | null; count: number | null
}

interface MediaIdRow {
  id: string
  created_at: string
}

function collapseMediaRows(rows: MediaRow[]): Array<Omit<MediaItem, 'thumbUrl' | 'fullUrl'>> {
  const map = new Map<string, Omit<MediaItem, 'thumbUrl' | 'fullUrl'>>()
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        author: row.author,
        status: row.status,
        type: row.type,
        caption: row.caption ?? '',
        createdAt: row.created_at,
        reactions: {},
      })
    }
    if (row.emoji && row.count != null) {
      map.get(row.id)!.reactions[row.emoji] = row.count
    }
  }
  return Array.from(map.values())
}

async function dbGetMediaRowsByIds(ids: string[]): Promise<MediaRow[]> {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(',')
  try {
    return await d1Query<MediaRow>(
      `SELECT m.id, m.author, m.status, m.type, m.caption, m.created_at, r.emoji, r.count
         FROM media m
         LEFT JOIN reactions r ON r.media_id = m.id
        WHERE m.id IN (${placeholders})
        ORDER BY m.created_at DESC, m.id DESC`,
      ids,
    )
  } catch (err) {
    if (!isMissingCaptionColumnError(err)) throw err
    type LegacyMediaRow = Omit<MediaRow, 'caption'>
    const legacyRows = await d1Query<LegacyMediaRow>(
      `SELECT m.id, m.author, m.status, m.type, m.created_at, r.emoji, r.count
         FROM media m
         LEFT JOIN reactions r ON r.media_id = m.id
        WHERE m.id IN (${placeholders})
        ORDER BY m.created_at DESC, m.id DESC`,
      ids,
    )
    return legacyRows.map(row => ({ ...row, caption: '' }))
  }
}

/** Returns media rows with reactions collapsed into a map. */
export async function dbGetMedia(status: string): Promise<Array<Omit<MediaItem, 'thumbUrl' | 'fullUrl'>>> {
  let rows: MediaRow[] = []
  try {
    rows = await d1Query<MediaRow>(
      `SELECT m.id, m.author, m.status, m.type, m.caption, m.created_at, r.emoji, r.count
         FROM media m
         LEFT JOIN reactions r ON r.media_id = m.id
        WHERE m.status = ?
        ORDER BY m.created_at DESC`,
      [status],
    )
  } catch (err) {
    if (!isMissingCaptionColumnError(err)) throw err
    type LegacyMediaRow = Omit<MediaRow, 'caption'>
    const legacyRows = await d1Query<LegacyMediaRow>(
      `SELECT m.id, m.author, m.status, m.type, m.created_at, r.emoji, r.count
         FROM media m
         LEFT JOIN reactions r ON r.media_id = m.id
        WHERE m.status = ?
        ORDER BY m.created_at DESC`,
      [status],
    )
    rows = legacyRows.map(row => ({ ...row, caption: '' }))
  }

  return collapseMediaRows(rows)
}

export async function dbGetMediaPage(
  status: string,
  limit: number,
  cursorId?: string,
): Promise<{ items: Array<Omit<MediaItem, 'thumbUrl' | 'fullUrl'>>; nextCursor: string | null }> {
  const safeLimit = Math.max(1, Math.min(50, limit))
  let idRows: MediaIdRow[]

  if (cursorId) {
    const cursorRows = await d1Query<{ created_at: string }>(
      `SELECT created_at FROM media WHERE id = ? LIMIT 1`,
      [cursorId],
    )
    const cursorCreatedAt = cursorRows[0]?.created_at

    if (cursorCreatedAt) {
      idRows = await d1Query<MediaIdRow>(
        `SELECT id, created_at
           FROM media
          WHERE status = ?
            AND (created_at < ? OR (created_at = ? AND id < ?))
          ORDER BY created_at DESC, id DESC
          LIMIT ?`,
        [status, cursorCreatedAt, cursorCreatedAt, cursorId, safeLimit + 1],
      )
    } else {
      idRows = await d1Query<MediaIdRow>(
        `SELECT id, created_at
           FROM media
          WHERE status = ?
          ORDER BY created_at DESC, id DESC
          LIMIT ?`,
        [status, safeLimit + 1],
      )
    }
  } else {
    idRows = await d1Query<MediaIdRow>(
      `SELECT id, created_at
         FROM media
        WHERE status = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?`,
      [status, safeLimit + 1],
    )
  }

  const hasMore = idRows.length > safeLimit
  const pageIds = idRows.slice(0, safeLimit).map(r => r.id)
  const rows = await dbGetMediaRowsByIds(pageIds)

  return {
    items: collapseMediaRows(rows),
    nextCursor: hasMore && pageIds.length > 0 ? pageIds[pageIds.length - 1] : null,
  }
}

export async function dbInsertMedia(
  id: string,
  author: string,
  type: 'image' | 'video' | 'audio',
  status: 'approved' | 'pending' | 'rejected' = 'approved',
  caption = '',
): Promise<void> {
  try {
    await d1Exec(
      `INSERT INTO media (id, author, status, type, caption, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(id) DO NOTHING`,
      [id, author, status, type, caption],
    )
  } catch (err) {
    if (!isMissingCaptionColumnError(err)) throw err
    await d1Exec(
      `INSERT INTO media (id, author, status, type, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(id) DO NOTHING`,
      [id, author, status, type],
    )
  }
}

export async function dbGetMediaAuthor(id: string): Promise<string | null> {
  const rows = await d1Query<{ author: string }>(`SELECT author FROM media WHERE id = ? LIMIT 1`, [id])
  return rows[0]?.author ?? null
}

export async function dbGetTopAuthors(limit = 3): Promise<Array<{ author: string; score: number }>> {
  const rows = await d1Query<{ author: string; score: number }>(
    `SELECT m.author AS author, COALESCE(SUM(r.count), 0) AS score
       FROM media m
  LEFT JOIN reactions r ON r.media_id = m.id
      WHERE m.status = 'approved'
   GROUP BY m.author
   ORDER BY score DESC, m.author ASC
      LIMIT ?`,
    [limit],
  )
  return rows.map(r => ({ author: r.author, score: r.score }))
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

// ── Stats ────────────────────────────────────────────────────────────────────

export interface StatsResult {
  total: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  peakHours: Array<{ hour: number; count: number }>
  capsuleCount: number
}

export async function dbGetStats(): Promise<StatsResult> {
  const [totals, hours, capsules] = await Promise.all([
    d1Query<{ type: string; status: string; n: number }>(
      `SELECT type, status, COUNT(*) AS n FROM media GROUP BY type, status`,
    ),
    d1Query<{ hour: number; count: number }>(
      `SELECT CAST(strftime('%H', created_at) AS INTEGER) AS hour, COUNT(*) AS count
         FROM media GROUP BY hour ORDER BY count DESC LIMIT 24`,
    ),
    d1Query<{ n: number }>(`SELECT COUNT(*) AS n FROM capsule_messages`),
  ])

  const byType: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  let total = 0
  for (const row of totals) {
    byType[row.type]     = (byType[row.type]     ?? 0) + row.n
    byStatus[row.status] = (byStatus[row.status] ?? 0) + row.n
    total += row.n
  }

  return {
    total,
    byType,
    byStatus,
    peakHours:    hours,
    capsuleCount: capsules[0]?.n ?? 0,
  }
}

export async function dbExportComments(): Promise<Array<{ mediaId: string; author: string; text: string; createdAt: string }>> {
  const rows = await d1Query<{ media_id: string; author: string; text: string; created_at: string }>(
    `SELECT media_id, author, text, created_at FROM comments ORDER BY created_at ASC`,
  )
  return rows.map(r => ({ mediaId: r.media_id, author: r.author, text: r.text, createdAt: r.created_at }))
}

export async function dbExportCapsules(): Promise<Array<{ author: string; message: string; imageUrl: string; createdAt: string }>> {
  const rows = await d1Query<{ author: string; message: string; image_url: string; created_at: string }>(
    `SELECT author, message, image_url, created_at FROM capsule_messages ORDER BY created_at ASC`,
  )
  return rows.map(r => ({ author: r.author, message: r.message, imageUrl: r.image_url, createdAt: r.created_at }))
}

// ── Comments ──────────────────────────────────────────────────────────────────

export interface CommentItem {
  id: number
  mediaId: string
  author: string
  text: string
  createdAt: string
}

export async function dbGetComments(mediaId: string): Promise<CommentItem[]> {
  const rows = await d1Query<{ id: number; media_id: string; author: string; text: string; created_at: string }>(
    `SELECT id, media_id, author, text, created_at
       FROM comments WHERE media_id = ? ORDER BY created_at ASC`,
    [mediaId],
  )
  return rows.map(r => ({ id: r.id, mediaId: r.media_id, author: r.author, text: r.text, createdAt: r.created_at }))
}

export async function dbInsertComment(
  mediaId: string,
  author: string,
  text: string,
): Promise<CommentItem> {
  // D1 doesn't return LAST_INSERT_ROWID via the HTTP API easily — use a workaround
  await d1Exec(
    `INSERT INTO comments (media_id, author, text, created_at) VALUES (?, ?, ?, datetime('now'))`,
    [mediaId, author, text],
  )
  // Fetch the last inserted row for this media_id + author + text
  const rows = await d1Query<{ id: number; created_at: string }>(
    `SELECT id, created_at FROM comments WHERE media_id = ? AND author = ? AND text = ? ORDER BY id DESC LIMIT 1`,
    [mediaId, author, text],
  )
  return { id: rows[0]?.id ?? 0, mediaId, author, text, createdAt: rows[0]?.created_at ?? new Date().toISOString() }
}

export async function dbGetCommentCount(mediaId: string): Promise<number> {
  const rows = await d1Query<{ n: number }>(`SELECT COUNT(*) AS n FROM comments WHERE media_id = ?`, [mediaId])
  return rows[0]?.n ?? 0
}

// ── Stories Seen ──────────────────────────────────────────────────────────────

export async function dbGetSeenStoryIds(userId: string): Promise<string[]> {
  try {
    const rows = await d1Query<{ media_id: string }>(
      `SELECT media_id FROM stories_seen WHERE user_id = ? ORDER BY seen_at DESC`,
      [userId],
    )
    return rows.map(r => r.media_id)
  } catch (err) {
    if (isMissingStoriesSeenTableError(err)) return []
    throw err
  }
}

export async function dbMarkStorySeen(userId: string, mediaId: string): Promise<void> {
  try {
    await d1Exec(
      `INSERT INTO stories_seen (user_id, media_id, seen_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(user_id, media_id) DO UPDATE SET seen_at = excluded.seen_at`,
      [userId, mediaId],
    )
  } catch (err) {
    if (isMissingStoriesSeenTableError(err)) return
    throw err
  }
}

// ── Access Keys ───────────────────────────────────────────────────────────────

export interface AccessKeyItem {
  id: number
  name: string
  key: string
  createdAt: string
}

export async function dbGetAccessKeys(): Promise<AccessKeyItem[]> {
  const rows = await d1Query<{ id: number; name: string; key: string; created_at: string }>(
    `SELECT id, name, key, created_at FROM access_keys ORDER BY created_at DESC`
  )
  return rows.map(r => ({ id: r.id, name: r.name, key: r.key, createdAt: r.created_at }))
}

export async function dbInsertAccessKey(name: string, key: string): Promise<void> {
  await d1Exec(
    `INSERT INTO access_keys (name, key, created_at) VALUES (?, ?, datetime('now'))`,
    [name, key]
  )
}

export async function dbDeleteAccessKey(id: number): Promise<void> {
  await d1Exec(`DELETE FROM access_keys WHERE id = ?`, [id])
}

export async function dbVerifyAccessKey(key: string): Promise<boolean> {
  const rows = await d1Query<{ id: number }>(
    `SELECT id FROM access_keys WHERE key = ? LIMIT 1`,
    [key]
  )
  return rows.length > 0
}

// ── Gamification / Leaderboard ────────────────────────────────────────────────

export interface LeaderboardEntry {
  author: string
  total_points: number
  uploads: number
  reactions_received: number
  comments_made: number
  badge: string
}

function scoreToBadge(pts: number): string {
  if (pts >= 200) return '🏆'
  if (pts >= 80)  return '⭐'
  if (pts >= 20)  return '🌸'
  return '🌱'
}

export async function dbGetLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  // Scoring: 10 pts/upload · 2 pts/reaction received · 3 pts/comment made
  const rows = await d1Query<{
    author: string
    total_points: number
    uploads: number
    reactions_received: number
    comments_made: number
  }>(
    `SELECT
       u.author,
       (COALESCE(m_agg.upload_pts, 0) + COALESCE(r_agg.reaction_pts, 0) + COALESCE(c_agg.comment_pts, 0)) AS total_points,
       COALESCE(m_agg.uploads, 0) AS uploads,
       COALESCE(r_agg.reactions_received, 0) AS reactions_received,
       COALESCE(c_agg.comments_made, 0) AS comments_made
     FROM (
       SELECT author FROM media WHERE status = 'approved'
       UNION
       SELECT author FROM comments
     ) u
     LEFT JOIN (
       SELECT author, COUNT(*) * 10 AS upload_pts, COUNT(*) AS uploads
       FROM media WHERE status = 'approved'
       GROUP BY author
     ) m_agg ON m_agg.author = u.author
     LEFT JOIN (
       SELECT m.author, SUM(r.count) * 2 AS reaction_pts, SUM(r.count) AS reactions_received
       FROM media m
       JOIN reactions r ON r.media_id = m.id
       WHERE m.status = 'approved'
       GROUP BY m.author
     ) r_agg ON r_agg.author = u.author
     LEFT JOIN (
       SELECT author, COUNT(*) * 3 AS comment_pts, COUNT(*) AS comments_made
       FROM comments
       GROUP BY author
     ) c_agg ON c_agg.author = u.author
     ORDER BY total_points DESC, u.author ASC
     LIMIT ?`,
    [limit],
  )
  return rows.map(r => ({ ...r, badge: scoreToBadge(r.total_points) }))
}

// ── Store / Gift Registry ──────────────────────────────────────────────────────

export interface StoreItem {
  id: number
  name: string
  description: string
  image_url: string
  link: string
  price_brl: number | null
  claimed_by: string | null
  claimed_at: string | null
  sort_order: number
  created_at: string
}

function isMissingTableError(err: unknown, table: string): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return new RegExp(`no such table:\\s*${table}`, 'i').test(msg)
}

export async function dbEnsureStoreTables(): Promise<void> {
  await d1Exec(`CREATE TABLE IF NOT EXISTS store_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_url   TEXT NOT NULL DEFAULT '',
    link        TEXT NOT NULL DEFAULT '',
    price_brl   INTEGER,
    claimed_by  TEXT,
    claimed_at  TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`)
}

export async function dbGetStoreItems(): Promise<StoreItem[]> {
  try {
    return await d1Query<StoreItem>(
      `SELECT id, name, description, image_url, link, price_brl, claimed_by, claimed_at, sort_order, created_at
         FROM store_items ORDER BY sort_order ASC, id ASC`,
    )
  } catch (err) {
    if (isMissingTableError(err, 'store_items')) {
      await dbEnsureStoreTables()
      return []
    }
    throw err
  }
}

export async function dbInsertStoreItem(
  name: string, description: string, imageUrl: string, link: string, priceBrl: number | null, sortOrder = 0,
): Promise<void> {
  await dbEnsureStoreTables()
  await d1Exec(
    `INSERT INTO store_items (name, description, image_url, link, price_brl, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description, imageUrl, link, priceBrl, sortOrder],
  )
}

export async function dbUpdateStoreItem(
  id: number, fields: Partial<{ name: string; description: string; image_url: string; link: string; price_brl: number | null; sort_order: number }>,
): Promise<void> {
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ')
  const vals = [...Object.values(fields), id]
  if (!sets) return
  await d1Exec(`UPDATE store_items SET ${sets} WHERE id = ?`, vals)
}

export async function dbDeleteStoreItem(id: number): Promise<void> {
  await d1Exec(`DELETE FROM store_items WHERE id = ?`, [id])
}

export async function dbClaimStoreItem(id: number, claimedBy: string): Promise<boolean> {
  // Only claim if not already claimed
  const rows = await d1Query<{ claimed_by: string | null }>(`SELECT claimed_by FROM store_items WHERE id = ?`, [id])
  if (!rows[0] || rows[0].claimed_by) return false
  await d1Exec(
    `UPDATE store_items SET claimed_by = ?, claimed_at = datetime('now') WHERE id = ? AND claimed_by IS NULL`,
    [claimedBy, id],
  )
  return true
}

export async function dbUnclaimStoreItem(id: number): Promise<void> {
  await d1Exec(`UPDATE store_items SET claimed_by = NULL, claimed_at = NULL WHERE id = ?`, [id])
}

// ── Push Subscriptions ────────────────────────────────────────────────────────

export interface PushSubscriptionRow {
  endpoint: string
  auth: string
  p256dh: string
}

export async function dbEnsurePushTable(): Promise<void> {
  await d1Exec(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint  TEXT PRIMARY KEY,
    auth      TEXT NOT NULL,
    p256dh    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)
}

export async function dbSavePushSubscription(endpoint: string, auth: string, p256dh: string): Promise<void> {
  await dbEnsurePushTable()
  await d1Exec(
    `INSERT INTO push_subscriptions (endpoint, auth, p256dh)
       VALUES (?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET auth = excluded.auth, p256dh = excluded.p256dh`,
    [endpoint, auth, p256dh],
  )
}

export async function dbDeletePushSubscription(endpoint: string): Promise<void> {
  try {
    await d1Exec(`DELETE FROM push_subscriptions WHERE endpoint = ?`, [endpoint])
  } catch (err) {
    if (isMissingTableError(err, 'push_subscriptions')) return
    throw err
  }
}

export async function dbGetPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  try {
    return await d1Query<PushSubscriptionRow>(
      `SELECT endpoint, auth, p256dh FROM push_subscriptions`,
    )
  } catch (err) {
    if (isMissingTableError(err, 'push_subscriptions')) return []
    throw err
  }
}
