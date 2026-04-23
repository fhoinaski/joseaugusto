'use client'

import { useEffect, useState } from 'react'
import { fetchPushPublicKey, savePushSubscription, deletePushSubscription, urlBase64ToUint8Array } from '@/lib/push-client'

type PushStatus = 'idle' | 'unsupported' | 'denied' | 'subscribed' | 'subscribing'

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<PushStatus>('idle')
  const [vapidKey, setVapidKey] = useState('')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    // Fetch VAPID public key
    fetchPushPublicKey()
      .then(key => {
        if (key) setVapidKey(key)
        else setStatus('unsupported')
      })
      .catch(() => setStatus('unsupported'))

    // Check existing permission
    const perm = Notification.permission
    if (perm === 'denied') { setStatus('denied'); return }
    if (perm === 'granted') {
      navigator.serviceWorker.ready.then(async reg => {
        try {
          const sub = await reg.pushManager.getSubscription()
          if (!sub) {
            setStatus('idle')
            return
          }
          setStatus(await savePushSubscription(sub) ? 'subscribed' : 'idle')
        } catch {}
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

      setStatus(await savePushSubscription(sub) ? 'subscribed' : 'idle')
    } catch {
      setStatus('idle')
    }
  }

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await deletePushSubscription(sub.endpoint)
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
