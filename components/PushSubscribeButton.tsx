'use client'

import { useEffect, useState } from 'react'
import { fetchPushPublicKey, savePushSubscription, urlBase64ToUint8Array } from '@/lib/push-client'

type PushStatus = 'idle' | 'unsupported' | 'denied' | 'subscribed' | 'subscribing'

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<PushStatus>('idle')
  const [vapidKey, setVapidKey] = useState('')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported')
      return
    }

    fetchPushPublicKey()
      .then(key => {
        if (key) setVapidKey(key)
        else setStatus('unsupported')
      })
      .catch(() => setStatus('unsupported'))

    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }

    if (Notification.permission === 'granted') {
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
      if (perm !== 'granted') {
        setStatus('denied')
        return
      }

      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      setStatus(await savePushSubscription(sub) ? 'subscribed' : 'idle')
    } catch {
      setStatus('idle')
    }
  }

  if (status === 'unsupported') return null

  if (status === 'denied') {
    return (
      <div style={{ fontSize: '.8rem', color: 'rgba(245,218,182,.45)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
        Notificacoes bloqueadas neste aparelho
      </div>
    )
  }

  if (status === 'subscribed') {
    return (
      <button
        disabled
        style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 12, color: 'rgba(245,218,182,.7)', padding: '10px 0', cursor: 'default', fontSize: '.85rem', fontFamily: "'Cormorant Garamond',serif" }}
      >
        Notificacoes ativas
      </button>
    )
  }

  return (
    <button
      onClick={subscribe}
      disabled={status === 'subscribing' || !vapidKey}
      style={{ width: '100%', background: 'linear-gradient(135deg,rgba(212,160,86,.22),rgba(122,78,40,.22))', border: '1px solid rgba(212,160,86,.45)', borderRadius: 12, color: '#f5dab6', padding: '10px 0', cursor: status === 'subscribing' ? 'wait' : 'pointer', fontSize: '.88rem', fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, transition: 'all .2s' }}
    >
      {status === 'subscribing' ? 'Ativando...' : 'Ativar notificacoes'}
    </button>
  )
}
