// Simple in-memory rate limiter — works per-process (Cloudflare Workers / Node edge)
// Keys are IP addresses. Each window resets after `windowMs`.

interface Bucket {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()

/** Periodically prune expired entries so the Map doesn't grow unbounded */
function prune() {
  const now = Date.now()
  store.forEach((b, key) => {
    if (now > b.resetAt) store.delete(key)
  })
}
if (typeof setInterval !== 'undefined') setInterval(prune, 60_000)

export interface RateLimitOptions {
  /** Max requests allowed within the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check and increment the rate-limit counter for a given key (typically IP).
 * Returns `allowed: false` once the limit is exceeded within the current window.
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || now > bucket.resetAt) {
    const resetAt = now + opts.windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: opts.limit - 1, resetAt }
  }

  bucket.count += 1
  const remaining = Math.max(0, opts.limit - bucket.count)
  return { allowed: bucket.count <= opts.limit, remaining, resetAt: bucket.resetAt }
}

/** Helper: extract the real client IP from a Next.js request */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  )
}
