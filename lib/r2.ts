import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'

const R2_ENDPOINT = (process.env.R2_ENDPOINT ?? '').trim()
const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID ?? '').trim()
const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY ?? '').trim()
const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME ?? '').trim()

export const r2 = new S3Client({
  region:   'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId:     R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

export const BUCKET = R2_BUCKET_NAME
const PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '')

export function objectUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`
}

export function imageVariantKey(key: string, width: number): string {
  const dot = key.lastIndexOf('.')
  if (dot <= 0) return `${key}_w${width}`
  const base = key.slice(0, dot)
  return `${base}_w${width}.webp`
}

export function imageThumb400Key(key: string): string {
  const dot = key.lastIndexOf('.')
  if (dot <= 0) return `${key}_thumb400`
  const base = key.slice(0, dot)
  return `${base}_thumb400.webp`
}

// ── File operations ───────────────────────────────────────────────────────────

export async function uploadBuffer(
  key: string,
  body: Buffer,
  contentType: string,
  metadata: Record<string, string> = {},
): Promise<void> {
  // R2/S3 metadata is carried in HTTP headers; keep it ASCII-safe to avoid 400 InvalidArgument.
  const safeMetadata = Object.fromEntries(
    Object.entries(metadata)
      .map(([k, v]) => {
        const safeKey = k.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64)
        const safeVal = (v ?? '')
          .normalize('NFKD')
          .replace(/[^\x20-\x7E]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 256)
        return [safeKey, safeVal] as const
      })
      .filter(([k, v]) => Boolean(k) && Boolean(v)),
  )

  await r2.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        body,
    ContentType: contentType,
    CacheControl:'public, max-age=31536000, immutable',
    Metadata:    safeMetadata,
  }))
}

export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

// ── Realtime ping (small JSON object for SSE new-photo events) ────────────────

const RT_KEY = 'cha-jose-augusto/config/realtime.json'
const REACTION_RT_KEY = 'cha-jose-augusto/config/reaction.json'
const COMMENT_RT_KEY = 'cha-jose-augusto/config/comment.json'

export async function pingRealtimeR2(author: string, thumbUrl: string): Promise<void> {
  await r2.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         RT_KEY,
    Body:        JSON.stringify({ author, thumbUrl, ts: Date.now() }),
    ContentType: 'application/json',
    CacheControl:'no-store',
  }))
}

export async function getRealtimeDataR2(): Promise<{ author: string; thumbUrl: string; ts: number } | null> {
  try {
    const res  = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: RT_KEY }))
    const text = await res.Body?.transformToString()
    if (!text) return null
    return JSON.parse(text)
  } catch { return null }
}

export async function pingReactionR2(mediaId: string, emoji: string): Promise<void> {
  await r2.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         REACTION_RT_KEY,
    Body:        JSON.stringify({ mediaId, emoji, ts: Date.now() }),
    ContentType: 'application/json',
    CacheControl:'no-store',
  }))
}

export async function getReactionDataR2(): Promise<{ mediaId: string; emoji: string; ts: number } | null> {
  try {
    const res  = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: REACTION_RT_KEY }))
    const text = await res.Body?.transformToString()
    if (!text) return null
    return JSON.parse(text)
  } catch { return null }
}

export async function pingCommentR2(mediaId: string, author: string): Promise<void> {
  await r2.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         COMMENT_RT_KEY,
    Body:        JSON.stringify({ mediaId, author, ts: Date.now() }),
    ContentType: 'application/json',
    CacheControl:'no-store',
  }))
}

export async function getCommentDataR2(): Promise<{ mediaId: string; author: string; ts: number } | null> {
  try {
    const res  = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: COMMENT_RT_KEY }))
    const text = await res.Body?.transformToString()
    if (!text) return null
    return JSON.parse(text)
  } catch { return null }
}

export async function listObjectsByPrefix(prefix: string): Promise<string[]> {
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const res = await r2.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    }))

    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key)
    }

    continuationToken = res.NextContinuationToken
  } while (continuationToken)

  return keys
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const bytes = await res.Body?.transformToByteArray()
  return Buffer.from(bytes ?? [])
}
