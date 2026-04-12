import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import type { MediaItem } from './cloudinary'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const BUCKET = process.env.R2_BUCKET_NAME!
const PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '')

export function objectUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`
}

// ── Reactions helpers (base64-encode to stay ASCII-safe in S3 metadata) ──────
export function encodeReactions(r: Record<string, number>): string {
  return Buffer.from(JSON.stringify(r)).toString('base64')
}

export function decodeReactions(raw: string | undefined): Record<string, number> {
  if (!raw) return {}
  try { return JSON.parse(Buffer.from(raw, 'base64').toString()) } catch { return {} }
}

// ── Update object metadata (S3/R2 requires copy-to-self with MetadataDirective=REPLACE) ──
export async function updateObjectMetadata(
  key: string,
  patchMeta: Record<string, string>,
  contentType: string,
) {
  const head = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
  const merged = { ...(head.Metadata ?? {}), ...patchMeta }
  await r2.send(new CopyObjectCommand({
    Bucket:           BUCKET,
    CopySource:       `${BUCKET}/${key}`,
    Key:              key,
    Metadata:         merged,
    MetadataDirective:'REPLACE',
    ContentType:      contentType,
    CacheControl:     'public, max-age=31536000, immutable',
  }))
  return merged
}

// ── List approved media ───────────────────────────────────────────────────────
export async function listMedia(
  status = 'approved',
  continuationToken?: string,
): Promise<{ media: MediaItem[]; nextCursor: string | null }> {
  const result = await r2.send(new ListObjectsV2Command({
    Bucket:            BUCKET,
    Prefix:            'cha-jose-augusto/',
    MaxKeys:           50,
    ContinuationToken: continuationToken,
  }))

  const objects = (result.Contents ?? []).filter(o => {
    const k = o.Key ?? ''
    return k && !k.endsWith('/') && !k.includes('/config/')
  })

  // fetch per-object metadata in parallel
  const settled = await Promise.allSettled(
    objects.map(async (o): Promise<MediaItem | null> => {
      const head = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: o.Key! }))
      const meta = head.Metadata ?? {}
      const itemStatus = meta.status ?? 'approved'
      if (itemStatus !== status) return null

      const isVideo = (head.ContentType ?? '').startsWith('video/')
      const url = objectUrl(o.Key!)
      return {
        id:        o.Key!,
        thumbUrl:  url,
        fullUrl:   url,
        author:    meta.author ?? 'Convidado',
        status:    itemStatus as MediaItem['status'],
        type:      isVideo ? 'video' : 'image',
        createdAt: o.LastModified?.toISOString() ?? new Date().toISOString(),
        reactions: decodeReactions(meta.reactions),
      }
    })
  )

  const media = settled
    .filter((r): r is PromiseFulfilledResult<MediaItem | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((m): m is MediaItem => m !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return { media, nextCursor: result.NextContinuationToken ?? null }
}

// ── Realtime ping stored as a small JSON object in R2 ────────────────────────
const RT_KEY = 'cha-jose-augusto/config/realtime.json'

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
