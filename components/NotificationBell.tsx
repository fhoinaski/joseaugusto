'use client'

import { useEffect, useRef, useState } from 'react'

interface AppNotification {
  id: number
  type: string
  actor: string
  media_id: string | null
  message: string | null
  read: number
  created_at: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function typeLabel(type: string, actor: string): string {
  if (type === 'comment') return `${actor} comentou na sua foto`
  if (type === 'reaction') return `${actor} reagiu à sua foto`
  if (type === 'new_photo') return `${actor} postou uma nova foto`
  return `${actor} interagiu com você`
}

export default function NotificationBell() {
  const [author, setAuthor] = useState('')
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cha_author') ?? ''
      if (saved.trim()) setAuthor(saved.trim())
    } catch {}
  }, [])

  const fetchNotifications = async (name: string) => {
    try {
      const res = await fetch(`/api/notifications?author=${encodeURIComponent(name)}`)
      if (!res.ok) return
      const data = await res.json() as { notifications?: AppNotification[]; unread?: number }
      setNotifications(data.notifications ?? [])
      setUnread(data.unread ?? 0)
    } catch {}
  }

  useEffect(() => {
    if (!author) return
    fetchNotifications(author)
    // Poll every 30s
    intervalRef.current = setInterval(() => fetchNotifications(author), 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [author])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markRead = async () => {
    if (!author) return
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', author }),
      })
      setUnread(0)
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })))
    } catch {}
  }

  const handleOpen = () => {
    setOpen(v => !v)
    if (!open && unread > 0) markRead()
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label={`Notificações${unread > 0 ? ` (${unread} novas)` : ''}`}
        style={{
          position: 'relative',
          background: 'rgba(250,244,236,.92)',
          border: '1px solid rgba(122,78,40,.2)',
          borderRadius: 999,
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 8px rgba(39,18,0,.1)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={open ? '#3e2408' : 'none'} stroke="#3e2408" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            background: '#c0392b',
            color: '#fff',
            fontSize: '.6rem',
            fontWeight: 700,
            minWidth: 16,
            height: 16,
            borderRadius: 99,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            lineHeight: 1,
            border: '1.5px solid #faf3ea',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 'min(88vw, 320px)',
          background: 'rgba(250,244,236,.98)',
          border: '1px solid rgba(122,78,40,.2)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(39,18,0,.18)',
          backdropFilter: 'blur(12px)',
          zIndex: 2200,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(122,78,40,.1)' }}>
            <p style={{ margin: 0, fontFamily: "'Playfair Display',serif", fontSize: '.9rem', fontWeight: 600, color: '#3e2408' }}>
              {author ? `Oi, ${author.split(' ')[0]} 👋` : 'Notificações'}
            </p>
            {notifications.length > 0 && (
              <button onClick={markRead} style={{ background: 'none', border: 'none', fontSize: '.72rem', color: 'rgba(62,36,8,.5)', cursor: 'pointer', fontFamily: "'Cormorant Garamond',serif" }}>
                Marcar lidas
              </button>
            )}
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {!author ? (
              <div style={{ padding: '18px 14px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: '.88rem', color: '#7a4e28', fontFamily: "'Playfair Display',serif" }}>Bem-vindo! 🌸</p>
                <p style={{ margin: 0, fontSize: '.8rem', color: 'rgba(62,36,8,.5)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  Envie uma foto com seu nome para receber notificações quando alguém reagir.
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <p style={{ margin: 0, padding: '20px 14px', textAlign: 'center', fontSize: '.84rem', fontStyle: 'italic', color: 'rgba(62,36,8,.4)' }}>
                Nenhuma notificação ainda 🌸
              </p>
            ) : notifications.map(n => (
              <div
                key={n.id}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid rgba(122,78,40,.07)',
                  background: n.read ? 'transparent' : 'rgba(201,144,86,.08)',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#c9902a,#7a4e28)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '.8rem', fontWeight: 700, flexShrink: 0 }}>
                  {n.actor.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '.82rem', color: '#3e2408', lineHeight: 1.4 }}>
                    {typeLabel(n.type, n.actor)}
                  </p>
                  {n.message && (
                    <p style={{ margin: '2px 0 0', fontSize: '.76rem', color: 'rgba(62,36,8,.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                      "{n.message}"
                    </p>
                  )}
                  <p style={{ margin: '2px 0 0', fontSize: '.7rem', color: 'rgba(62,36,8,.35)' }}>
                    {timeAgo(n.created_at)}
                  </p>
                </div>
                {!n.read && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#c9902a', flexShrink: 0, marginTop: 4 }} />
                )}
              </div>
            ))}
          </div>
          {/* Push subscribe — integrated at the bottom */}
          <PushSubscribeInline />
        </div>
      )}
    </div>
  )
}

function PushSubscribeInline() {
  const [status, setStatus] = useState<'loading' | 'idle' | 'subscribed' | 'denied' | 'unsupported'>('loading')
  const [vapidKey, setVapidKey] = useState('')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setStatus('unsupported'); return }
    fetch('/api/push/subscribe')
      .then(r => r.json())
      .then((d: { publicKey?: string }) => {
        if (!d.publicKey) { setStatus('unsupported'); return }
        setVapidKey(d.publicKey)
        if (Notification.permission === 'denied') { setStatus('denied'); return }
        navigator.serviceWorker.ready
          .then(reg => reg.pushManager.getSubscription().then(sub => setStatus(sub ? 'subscribed' : 'idle')))
          .catch(() => setStatus('idle'))
      }).catch(() => setStatus('unsupported'))
  }, [])

  const subscribe = async () => {
    if (!vapidKey) return
    setStatus('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      if (await Notification.requestPermission() !== 'granted') { setStatus('denied'); return }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: { auth: json.keys?.auth, p256dh: json.keys?.p256dh } }),
      })
      setStatus('subscribed')
    } catch { setStatus('idle') }
  }

  const unsubscribe = async () => {
    setStatus('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unsubscribe', endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('idle')
    } catch { setStatus('idle') }
  }

  if (status === 'unsupported') return null

  return (
    <div style={{ borderTop: '1px solid rgba(122,78,40,.1)', padding: '10px 14px 14px' }}>
      {status === 'denied' ? (
        <p style={{ margin: 0, fontSize: '.74rem', color: 'rgba(62,36,8,.4)', fontStyle: 'italic', textAlign: 'center' }}>
          🔕 Notificações bloqueadas no navegador
        </p>
      ) : (
        <button
          onClick={status === 'subscribed' ? unsubscribe : subscribe}
          disabled={status === 'loading'}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 10,
            border: status === 'subscribed' ? '1px solid rgba(122,78,40,.25)' : '1px solid #c9a87c',
            background: status === 'subscribed' ? 'rgba(122,78,40,.06)' : 'linear-gradient(135deg,rgba(196,122,58,.12),rgba(122,78,40,.06))',
            color: '#3e2408', fontSize: '.82rem', fontFamily: "'Cormorant Garamond',serif", fontWeight: 600,
            cursor: status === 'loading' ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          {status === 'loading' ? '⏳ Aguarde...'
            : status === 'subscribed' ? '🔔 Notificações ativas · Desativar'
            : '🔔 Ativar notificações de novas fotos'}
        </button>
      )}
    </div>
  )
}

function urlBase64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}
