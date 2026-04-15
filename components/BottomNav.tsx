'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useUpload } from '@/components/UploadProvider'

// ── Types ────────────────────────────────────────────────────────────────────

interface AppNotification {
  id: number
  type: string
  actor: string
  media_id: string | null
  message: string | null
  read: number
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function urlBase64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

// ── Explore links ─────────────────────────────────────────────────────────────

const EXPLORE_LINKS = [
  { href: '/bingo',             emoji: '🎯', label: 'Bingo' },
  { href: '/desafios',          emoji: '📸', label: 'Desafios' },
  { href: '/musicas',           emoji: '🎵', label: 'Músicas' },
  { href: '/palpites',          emoji: '🎲', label: 'Palpites' },
  { href: '/carta',             emoji: '💌', label: 'Carta ao José' },
  { href: '/mural',             emoji: '🖼️', label: 'Mural' },
  { href: '/livro',             emoji: '📖', label: 'Livro' },
  { href: '/diario',            emoji: '🧸', label: 'Diário' },
  { href: '/mosaico',           emoji: '🎨', label: 'Mosaico' },
  { href: '/ranking',           emoji: '🏆', label: 'Ranking' },
  { href: '/timeline',          emoji: '⏱',  label: 'Timeline' },
  { href: '/convite',           emoji: '📩', label: 'Convite' },
  { href: '/rsvp',              emoji: '📋', label: 'RSVP' },
  { href: '/marcos',            emoji: '👣', label: 'Marcos' },
  { href: '/video-mensagens',   emoji: '🎬', label: 'Vídeos' },
]

const EXPLORE_PATHS = EXPLORE_LINKS.map(l => l.href)

// ── PushSubscribeInline ───────────────────────────────────────────────────────

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

// ── BottomNav ────────────────────────────────────────────────────────────────

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { openUpload, openBooth, closeUpload } = useUpload()

  const [exploreOpen, setExploreOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  // Notification state
  const [author, setAuthor] = useState('')
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Read author from localStorage and listen for upload success
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cha_author') ?? ''
      if (saved.trim()) setAuthor(saved.trim())
    } catch {}

    const onUpload = (e: Event) => {
      const detail = (e as CustomEvent<{ author: string }>).detail
      if (detail?.author && detail.author !== 'Convidado') {
        setAuthor(detail.author)
        try { localStorage.setItem('cha_author', detail.author) } catch {}
      }
    }
    window.addEventListener('cha:upload-success', onUpload)
    return () => window.removeEventListener('cha:upload-success', onUpload)
  }, [])

  // Poll notifications
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
    intervalRef.current = setInterval(() => fetchNotifications(author), 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [author])

  // Mark read
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

  const handleNotifOpen = () => {
    const opening = !notifOpen
    setNotifOpen(opening)
    setExploreOpen(false)
    if (opening) { closeUpload(); if (unread > 0) markRead() }
  }

  const handleExploreOpen = () => {
    const opening = !exploreOpen
    setExploreOpen(opening)
    setNotifOpen(false)
    if (opening) closeUpload()
  }

  // Prefetch main routes for instant tab switching
  useEffect(() => {
    router.prefetch('/')
    router.prefetch('/feed')
    // Prefetch explore routes after a short idle delay (don't block first paint)
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(() => { EXPLORE_LINKS.forEach(l => router.prefetch(l.href)) })
      : window.setTimeout(() => { EXPLORE_LINKS.forEach(l => router.prefetch(l.href)) }, 2000)
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(id as number)
      else window.clearTimeout(id as number)
    }
  }, [router])

  // PWA tracking
  useEffect(() => {
    const trackPwa = (event: string) => {
      const authorVal = (() => { try { return localStorage.getItem('cha_author') ?? null } catch { return null } })()
      fetch('/api/pwa-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, userAgent: navigator.userAgent, author: authorVal, installedAt: new Date().toISOString() }),
      }).catch(() => {})
    }

    // Check if already running as installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true

    if (isStandalone) {
      trackPwa('session')
    }

    const onInstall = () => trackPwa('installed')
    window.addEventListener('appinstalled', onInstall)
    return () => window.removeEventListener('appinstalled', onInstall)
  }, [])

  // Active states
  const isHome    = pathname === '/'
  const isFeed    = pathname === '/feed'
  const isExploreActive = exploreOpen || EXPLORE_PATHS.filter(p => p !== '/feed').includes(pathname)

  // Colors
  const ACCENT = '#c47a3a'
  const MUTED = 'rgba(62,36,8,.45)'

  const tabBase: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    padding: '6px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  }

  // className helper — add to every nav button for tap feedback via CSS
  const tabCls = 'bottom-nav-btn'

  return (
    <>
      {/* Explore overlay */}
      {exploreOpen && (
        <div
          onClick={() => setExploreOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 1960,
          }}
        />
      )}

      {/* Explore sheet — z-index above nav (1900) so it isn't cut off */}
      {exploreOpen && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1980,
          background: '#fdf6ee',
          borderRadius: '24px 24px 0 0',
          maxHeight: '82vh',
          overflowY: 'auto',
          paddingBottom: 'calc(72px + env(safe-area-inset-bottom))',
        }}>
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(62,36,8,.15)' }} />
          </div>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 700, color: '#3e2408', textAlign: 'center', marginBottom: 16 }}>
            Explorar o Evento
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, paddingBottom: 8 }}>
            {EXPLORE_LINKS.map(({ href, emoji, label }) => (
              <button
                key={href}
                onClick={() => { closeUpload(); setExploreOpen(false); router.push(href) }}
                style={{
                  background: '#fff',
                  border: '1.5px solid #e8d4b8',
                  borderRadius: 14,
                  padding: '14px 8px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{emoji}</span>
                <span style={{ fontSize: '0.72rem', fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, color: '#3e2408', lineHeight: 1.2 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notification overlay */}
      {notifOpen && (
        <div
          onClick={() => setNotifOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 1960,
          }}
        />
      )}

      {/* Notification sheet — z-index above nav (1900) so it isn't cut off */}
      {notifOpen && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1980,
          background: '#fdf6ee',
          borderRadius: '24px 24px 0 0',
          maxHeight: '82vh',
          overflowY: 'auto',
          paddingBottom: 'calc(72px + env(safe-area-inset-bottom))',
        }}>
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(62,36,8,.15)' }} />
          </div>

          {/* Header */}
          <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(122,78,40,.1)' }}>
            <p style={{ margin: 0, fontFamily: "'Playfair Display',serif", fontSize: '1rem', fontWeight: 600, color: '#3e2408' }}>
              {author ? `Oi, ${author.split(' ')[0]} 👋` : 'Bem-vindo 🌸'}
            </p>
            {notifications.length > 0 && (
              <button onClick={markRead} style={{ background: 'none', border: 'none', fontSize: '.72rem', color: 'rgba(62,36,8,.5)', cursor: 'pointer', fontFamily: "'Cormorant Garamond',serif" }}>
                Marcar lidas
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {!author ? (
              <div style={{ padding: '18px 16px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: '.88rem', color: '#7a4e28', fontFamily: "'Playfair Display',serif" }}>Bem-vindo! 🌸</p>
                <p style={{ margin: 0, fontSize: '.8rem', color: 'rgba(62,36,8,.5)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  Envie uma foto com seu nome para receber notificações quando alguém reagir.
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <p style={{ margin: 0, padding: '20px 16px', textAlign: 'center', fontSize: '.84rem', fontStyle: 'italic', color: 'rgba(62,36,8,.4)' }}>
                Nenhuma notificação ainda 🌸
              </p>
            ) : notifications.map(n => (
              <div
                key={n.id}
                style={{
                  padding: '10px 16px',
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

          <PushSubscribeInline />
        </div>
      )}

      {/* Nav bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1900,
        height: 'calc(62px + env(safe-area-inset-bottom))',
        background: 'rgba(253,246,238,.97)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(201,168,124,.25)',
        boxShadow: '0 -4px 24px rgba(62,36,8,.08)',
        display: 'flex',
        alignItems: 'flex-start',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Tab 1 — Início */}
        <button className={tabCls} style={tabBase} onClick={() => { closeUpload(); setExploreOpen(false); setNotifOpen(false); router.push('/') }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isHome ? ACCENT : 'none'} stroke={isHome ? ACCENT : MUTED} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span style={{ fontSize: '10px', fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, color: isHome ? ACCENT : MUTED, lineHeight: 1 }}>Início</span>
        </button>

        {/* Tab 2 — Feed */}
        <button className={tabCls} style={tabBase} onClick={() => { closeUpload(); setExploreOpen(false); setNotifOpen(false); router.push('/feed') }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isFeed ? ACCENT : 'none'} stroke={isFeed ? ACCENT : MUTED} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span style={{ fontSize: '10px', fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, color: isFeed ? ACCENT : MUTED, lineHeight: 1 }}>Feed</span>
        </button>

        {/* Tab 3 — Postar (upload, raised center) */}
        <button
          className={tabCls}
          style={{ ...tabBase, paddingTop: 0, justifyContent: 'center' }}
          onClick={() => { setExploreOpen(false); setNotifOpen(false); openUpload() }}
        >
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#c47a3a,#7a4e28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(196,122,58,.40)',
            marginTop: -10,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="5" width="22" height="15" rx="2" ry="2" />
              <circle cx="12" cy="12" r="4" />
              <path d="M8.5 5l1.5-2h4l1.5 2" />
            </svg>
          </div>
          <span style={{ fontSize: '10px', fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, color: MUTED, lineHeight: 1, marginTop: 2 }}>Postar</span>
        </button>

        {/* Tab 4 — Explorar */}
        <button className={tabCls} style={tabBase} onClick={handleExploreOpen}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isExploreActive ? ACCENT : 'none'} stroke={isExploreActive ? ACCENT : MUTED} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <span style={{ fontSize: '10px', fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, color: isExploreActive ? ACCENT : MUTED, lineHeight: 1 }}>Explorar</span>
        </button>

        {/* Tab 5 — Notificações */}
        <button className={tabCls} style={{ ...tabBase, position: 'relative' }} onClick={handleNotifOpen}>
          <div style={{ position: 'relative' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={notifOpen ? ACCENT : 'none'} stroke={notifOpen ? ACCENT : MUTED} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unread > 0 && (
              <span style={{
                position: 'absolute',
                top: -4,
                right: -6,
                background: '#c0392b',
                color: '#fff',
                fontSize: '.58rem',
                fontWeight: 700,
                minWidth: 14,
                height: 14,
                borderRadius: 99,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                lineHeight: 1,
                border: '1.5px solid rgba(253,246,238,.97)',
              }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          <span style={{ fontSize: '10px', fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, color: notifOpen ? ACCENT : MUTED, lineHeight: 1 }}>Notifs</span>
        </button>
      </nav>
    </>
  )
}
