import { dbDeletePushSubscription, dbGetPushSubscriptions } from '@/lib/db'

export interface PushSendResult {
  configured: boolean
  total: number
  sent: number
  failed: number
  removed: number
}

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY ?? ''
}

export async function sendPushToAll(payload: {
  title: string
  body: string
  icon?: string
  url?: string
}): Promise<PushSendResult> {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com'

  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys not set; skipping push notifications')
    return { configured: false, total: 0, sent: 0, failed: 0, removed: 0 }
  }

  let webpush: typeof import('web-push')
  try {
    webpush = await import('web-push')
  } catch {
    console.warn('[push] web-push not installed')
    return { configured: false, total: 0, sent: 0, failed: 0, removed: 0 }
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  const subscriptions = await dbGetPushSubscriptions()
  if (!subscriptions.length) {
    return { configured: true, total: 0, sent: 0, failed: 0, removed: 0 }
  }

  const result: PushSendResult = {
    configured: true,
    total: subscriptions.length,
    sent: 0,
    failed: 0,
    removed: 0,
  }

  const notification = JSON.stringify(payload)

  await Promise.all(
    subscriptions.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
          notification,
        )
        result.sent += 1
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
          await dbDeletePushSubscription(sub.endpoint).catch(() => {})
          result.removed += 1
        } else {
          console.warn('[push] Failed to send to', sub.endpoint, err)
        }
        result.failed += 1
      }
    }),
  )

  return result
}
