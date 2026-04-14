'use client'

import { useEffect, useState } from 'react'

type PushStatus = 'idle' | 'unsupported' | 'denied' | 'subscribed' | 'subscribing'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<PushStatus>('idle')
  const [vapidKey, setVapidKey] = useState('')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    // Fetch VAPID public key
    fetch('/api/push/subscribe', { method: 'GET' })
      .then(r => r.json())
      .then((data: { publicKey?: string }) => {
        if (data.publicKey) setVapidKey(data.publicKey)
        else setStatus('unsupported') // VAPID keys not configured
      })
      .catch(() => setStatus('unsupported'))

    // Check existing permission
    const perm = Notification.permission
    if (perm === 'denied') { setStatus('denied'); return }
    if (perm === 'granted') {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setStatus(sub ? 'subscribed' : 'idle')
        }).catch(() => {})
      })
    }
  }, [])

  const subscribe = async () => {
    if (!vapidKey) return
    setStatus('subscribing')
    try {
      const reg = await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setStatus('denied'); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { auth: json.keys?.auth, p256dh: json.keys?.p256dh },
        }),
      })

      setStatus('subscribed')
    } catch {
      setStatus('idle')
    }
  }

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unsubscribe', endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('idle')
    } catch {}
  }

  if (status === 'unsupported') return null

  if (status === 'denied') {
    return (
      <div style={{ fontSize: '.8rem', color: 'rgba(245,218,182,.45)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
        🔕 Notificações bloqueadas no navegador
      </div>
    )
  }

  if (status === 'subscribed') {
    return (
      <button
        onClick={unsubscribe}
        style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 12, color: 'rgba(245,218,182,.7)', padding: '10px 0', cursor: 'pointer', fontSize: '.85rem', fontFamily: "'Cormorant Garamond',serif" }}
      >
        🔔 Notificações ativas · Desativar
      </button>
    )
  }

  return (
    <button
      onClick={subscribe}
      disabled={status === 'subscribing' || !vapidKey}
      style={{ width: '100%', background: 'linear-gradient(135deg,rgba(212,160,86,.22),rgba(122,78,40,.22))', border: '1px solid rgba(212,160,86,.45)', borderRadius: 12, color: '#f5dab6', padding: '10px 0', cursor: status === 'subscribing' ? 'wait' : 'pointer', fontSize: '.88rem', fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, transition: 'all .2s' }}
    >
      {status === 'subscribing' ? '⏳ Ativando...' : '🔔 Ativar notificações de novas fotos'}
    </button>
  )
}
