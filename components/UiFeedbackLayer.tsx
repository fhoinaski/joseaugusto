'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const NotificationBell = dynamic(() => import('@/components/NotificationBell'), { ssr: false })
const PWAInstallPrompt = dynamic(() => import('@/components/PWAInstallPrompt'), { ssr: false })
const ReactionStorm    = dynamic(() => import('@/components/ReactionStorm'),    { ssr: false })

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

const LS_KEY = 'cha_upload_queue'

function getPendingCount(): number {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
    return Array.isArray(stored) ? stored.length : 0
  } catch {
    return 0
  }
}

export default function UiFeedbackLayer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [pendingUploads, setPendingUploads] = useState(0)

  // Read pending count on mount and after each upload-related event
  useEffect(() => {
    const refresh = () => setPendingUploads(getPendingCount())
    refresh()

    window.addEventListener('cha:upload-success', refresh)
    window.addEventListener('online', refresh)
    window.addEventListener('offline', refresh)
    // Re-check every 30 s in case SW processes the queue in background
    const interval = window.setInterval(refresh, 30_000)

    return () => {
      window.removeEventListener('cha:upload-success', refresh)
      window.removeEventListener('online', refresh)
      window.removeEventListener('offline', refresh)
      window.clearInterval(interval)
    }
  }, [])

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
      {/* Top-right cluster: connection pill + notification bell */}
      <div style={{
        position: 'fixed',
        top: 'max(10px, calc(8px + env(safe-area-inset-top)))',
        right: 12,
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <NotificationBell />
        <div
          className={`connection-pill ${isOnline ? 'online' : 'offline'}`}
          role="status"
          aria-live="polite"
          style={{ position: 'static', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span className="connection-pill-dot" />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
          {pendingUploads > 0 && (
            <span
              title={`${pendingUploads} upload${pendingUploads > 1 ? 's' : ''} na fila offline`}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 18, height: 18, borderRadius: 99,
                background: isOnline ? '#e8a44a' : '#c0392b',
                color: '#fff', fontSize: 11, fontWeight: 700,
                padding: '0 5px', lineHeight: 1,
              }}
            >
              {pendingUploads}
            </span>
          )}
        </div>
      </div>

      <PWAInstallPrompt />
      <ReactionStorm />

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
