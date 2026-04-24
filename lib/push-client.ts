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
  const fingerprint = `${json.endpoint}|${json.keys?.auth}|${json.keys?.p256dh}`
  try {
    const cached = JSON.parse(localStorage.getItem('cha_push_subscription_synced') ?? 'null') as { fingerprint?: string; ts?: number } | null
    if (cached?.fingerprint === fingerprint && cached.ts && Date.now() - cached.ts < 10 * 60 * 1000) {
      return true
    }
  } catch {}

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
  if (res.ok) {
    try {
      localStorage.setItem('cha_push_subscription_synced', JSON.stringify({ fingerprint, ts: Date.now() }))
    } catch {}
  }
  return res.ok
}

export async function deletePushSubscription(endpoint: string): Promise<boolean> {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unsubscribe', endpoint }),
  })
  if (res.ok) {
    try { localStorage.removeItem('cha_push_subscription_synced') } catch {}
  }
  return res.ok
}

export async function ensurePushSubscription(): Promise<{ ok: true; subscription: PushSubscription } | { ok: false; reason: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, reason: 'Este navegador nao suporta push.' }
  }

  const publicKey = await fetchPushPublicKey()
  if (!publicKey) return { ok: false, reason: 'Chave publica VAPID ausente.' }

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()

  if (permission !== 'granted') {
    return { ok: false, reason: 'Permissao de notificacao nao concedida.' }
  }

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const subscription = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  const saved = await savePushSubscription(subscription)
  if (!saved) return { ok: false, reason: 'Nao foi possivel salvar a inscricao push.' }

  return { ok: true, subscription }
}
