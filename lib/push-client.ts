export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export async function fetchPushPublicKey(): Promise<string | null> {
  const res = await fetch('/api/push/subscribe')
  if (!res.ok) return null
  const data = await res.json() as { publicKey?: string | null }
  return data.publicKey ?? null
}

export async function savePushSubscription(sub: PushSubscription): Promise<boolean> {
  const json = sub.toJSON()
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: {
        auth: json.keys?.auth,
        p256dh: json.keys?.p256dh,
      },
    }),
  })
  return res.ok
}

export async function deletePushSubscription(endpoint: string): Promise<boolean> {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unsubscribe', endpoint }),
  })
  return res.ok
}
