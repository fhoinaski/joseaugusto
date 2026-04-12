import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'

export const r2 = new S3Client({
  region:   'auto',
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

// ── File operations ───────────────────────────────────────────────────────────

export async function uploadBuffer(
  key: string,
  body: Buffer,
  contentType: string,
  metadata: Record<string, string> = {},
): Promise<void> {
  await r2.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        body,
    ContentType: contentType,
    CacheControl:'public, max-age=31536000, immutable',
    Metadata:    metadata,
  }))
}

export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

// ── Realtime ping (small JSON object for SSE new-photo events) ────────────────

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
