/**
 * Web Push notification sender using the `web-push` library.
 *
 * Required env vars:
 *   VAPID_PUBLIC_KEY   — base64url VAPID public key
 *   VAPID_PRIVATE_KEY  — base64url VAPID private key
 *   VAPID_SUBJECT      — "mailto:you@example.com" or your site URL
 *
 * Generate keys once with:  npx web-push generate-vapid-keys
 */

import { dbGetPushSubscriptions, dbDeletePushSubscription } from '@/lib/db'

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY ?? ''
}

export async function sendPushToAll(payload: {
  title: string
  body: string
  icon?: string
  url?: string
}): Promise<void> {
  const publicKey  = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject    = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com'

  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys not set — skipping push notifications')
    return
  }

  let webpush: typeof import('web-push')
  try {
    webpush = await import('web-push')
  } catch {
    console.warn('[push] web-push not installed — run: npm install web-push')
    return
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  const subscriptions = await dbGetPushSubscriptions()
  if (!subscriptions.length) return

  const notification = JSON.stringify(payload)

  await Promise.all(
    subscriptions.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
          notification,
        )
      } catch (err: unknown) {
        // 410 Gone = subscription expired/revoked → remove it
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
          await dbDeletePushSubscription(sub.endpoint).catch(() => {})
        } else {
          console.warn('[push] Failed to send to', sub.endpoint, err)
        }
      }
    }),
  )
}
