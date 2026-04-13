'use client'

import { useEffect, useState } from 'react'

type ToastItem = {
  id: string
  text: string
  thumb?: string
}

type ToastPayload = {
  text?: string
  thumb?: string
  duration?: number
}

export default function UiFeedbackLayer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      pushToast({ text: 'Conexao restaurada. Sincronizando fila...' })
    }
    const onOffline = () => {
      setIsOnline(false)
      pushToast({ text: 'Voce esta offline. Acoes serao enfileiradas.' })
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail || {}
      if (!detail.text) return
      pushToast(detail)
    }

    window.addEventListener('cha:toast', onToast as EventListener)
    return () => window.removeEventListener('cha:toast', onToast as EventListener)
  }, [])

  const pushToast = (payload: ToastPayload) => {
    if (!payload.text) return
    const id = Math.random().toString(36).slice(2)
    const ttl = typeof payload.duration === 'number' ? payload.duration : 3200

    setToasts(prev => [...prev.slice(-2), { id, text: payload.text!, thumb: payload.thumb }])
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, ttl)
  }

  return (
    <>
      <div className={`connection-pill ${isOnline ? 'online' : 'offline'}`} role="status" aria-live="polite">
        <span className="connection-pill-dot" />
        <span>{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast-item">
            {t.thumb && <img src={t.thumb} alt="" className="toast-photo" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </>
  )
}
