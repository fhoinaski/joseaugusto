'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface MediaItem {
  id: string; thumbUrl: string; fullUrl: string; author: string
  type: 'image' | 'video' | 'audio'; createdAt: string
  reactions: Record<string, number>
}
interface Comment { id: number; author: string; text: string; createdAt: string }

const EMOJIS = ['♥', '😍', '🎉', '👶']

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function getReacted(id: string): string[] {
  try { return JSON.parse(localStorage.getItem(`cha_reacted_${id}`) ?? '[]') } catch { return [] }
}
function markReacted(id: string, emoji: string) {
  const r = getReacted(id)
  if (!r.includes(emoji)) localStorage.setItem(`cha_reacted_${id}`, JSON.stringify([...r, emoji]))
}

// ── Comment section per card ──────────────────────────────────────────────────
function CommentSection({ mediaId, defaultAuthor }: { mediaId: string; defaultAuthor: string }) {
  const [comments,    setComments]    = useState<Comment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showAll,     setShowAll]     = useState(false)
  const [text,        setText]        = useState('')
  const [commenter,   setCommenter]   = useState(defaultAuthor)
  const [submitting,  setSubmitting]  = useState(false)

  useEffect(() => {
    fetch(`/api/comments?media_id=${encodeURIComponent(mediaId)}`)
      .then(r => r.json())
      .then(d => setComments(d.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mediaId])

  const submit = async () => {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: mediaId, author: commenter || 'Convidado', text: text.trim() }),
      })
      if (res.ok) {
        const { comment } = await res.json()
        setComments(prev => [...prev, comment])
        setText('')
        try { localStorage.setItem('cha_author', commenter) } catch {}
      }
    } finally { setSubmitting(false) }
  }

  const visible = showAll ? comments : comments.slice(-3)

  return (
    <div style={{ padding: '10px 16px 0', borderTop: '1px solid #f0e8dc' }}>
      {loading && <p style={{ fontSize: '.82rem', color: '#999', padding: '4px 0' }}>…</p>}

      {!loading && comments.length > 3 && !showAll && (
        <button onClick={() => setShowAll(true)}
          style={{ fontSize: '.82rem', color: '#a0713e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 6px', fontFamily: 'inherit' }}>
          Ver todos os {comments.length} comentários
        </button>
      )}

      {visible.map(c => (
        <div key={c.id} style={{ fontSize: '.9rem', marginBottom: 5, lineHeight: 1.4, color: '#2a1400' }}>
          <strong style={{ marginRight: 5, color: '#7a4e28' }}>{c.author}</strong>
          <span>{c.text}</span>
          <span style={{ marginLeft: 6, fontSize: '.72rem', color: '#b0907a' }}>{timeAgo(c.createdAt)}</span>
        </div>
      ))}

      {/* Author name input (only if not set) */}
      {!defaultAuthor && !commenter && (
        <input
          value={commenter}
          onChange={e => setCommenter(e.target.value)}
          placeholder="Seu nome…"
          style={{ width: '100%', border: 'none', borderBottom: '1px solid #e8d4b8', padding: '6px 0', marginBottom: 4, fontSize: '.9rem', fontFamily: 'inherit', background: 'transparent', outline: 'none', color: '#2a1400' }}
        />
      )}

      <div style={{ display: 'flex', gap: 8, paddingBottom: 12, paddingTop: 4 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
          placeholder="Adicionar comentário…"
          maxLength={300}
          style={{ flex: 1, border: 'none', borderBottom: '1px solid #e8d4b8', padding: '6px 0', fontSize: '.9rem', fontFamily: 'inherit', background: 'transparent', outline: 'none', color: '#2a1400' }}
        />
        {text.trim() && (
          <button onClick={submit} disabled={submitting}
            style={{ border: 'none', background: 'none', color: '#c9a87c', fontWeight: 700, fontSize: '.92rem', cursor: 'pointer', fontFamily: 'inherit', padding: '0 4px' }}>
            {submitting ? '…' : 'Enviar'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Feed card ─────────────────────────────────────────────────────────────────
function FeedCard({ item, onReact, savedAuthor }: { item: MediaItem; onReact: (id: string, emoji: string) => void; savedAuthor: string }) {
  const [expanded, setExpanded] = useState(false)
  const [showComments, setShowComments] = useState(false)

  const reacted = typeof window !== 'undefined' ? getReacted(item.id) : []
  const totalReactions = Object.values(item.reactions).reduce((a, b) => a + b, 0)

  return (
    <article style={{ background: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(60,20,0,.07)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 10px' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#f5ede0,#c9a87c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
          {item.type === 'video' ? '🎥' : item.type === 'audio' ? '🎙️' : '📷'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '.95rem', color: '#2a1400', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.author}</p>
          <p style={{ fontSize: '.78rem', color: '#b0907a', margin: 0 }}>{timeAgo(item.createdAt)}</p>
        </div>
      </div>

      {/* Media */}
      {item.type === 'audio' ? (
        <div style={{ background: 'linear-gradient(135deg,#f5ede0,#e8d4b8)', padding: '28px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎙️</div>
          <p style={{ fontSize: '.9rem', color: '#5c3410', marginBottom: 12 }}>Mensagem de voz de <strong>{item.author}</strong></p>
          <audio src={item.fullUrl} controls style={{ width: '100%', maxWidth: 320, display: 'block', margin: '0 auto' }} />
        </div>
      ) : item.type === 'video' ? (
        <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
          {expanded
            ? <video src={item.fullUrl} controls autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            : <>
                <img src={item.thumbUrl} alt={item.author} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setExpanded(true)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>▶</div>
                </button>
              </>
          }
        </div>
      ) : (
        <img src={item.fullUrl} alt={item.author}
          style={{ width: '100%', maxHeight: 600, objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
      )}

      {/* Reactions */}
      <div style={{ padding: '10px 16px 6px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {EMOJIS.map(emoji => {
          const count  = item.reactions[emoji] ?? 0
          const active = reacted.includes(emoji)
          return (
            <button key={emoji} onClick={() => onReact(item.id, emoji)}
              style={{ border: `1.5px solid ${active ? '#c9a87c' : '#f0e8dc'}`, borderRadius: 50, padding: '4px 10px', background: active ? '#fdf6ee' : '#fff', cursor: active ? 'default' : 'pointer', fontSize: '.92rem', display: 'flex', alignItems: 'center', gap: 4, color: '#2a1400', fontFamily: 'inherit', transition: 'transform .15s', transform: active ? 'scale(1.05)' : 'scale(1)' }}>
              {emoji}{count > 0 && <span style={{ fontSize: '.8rem', color: '#7a4e28' }}>{count}</span>}
            </button>
          )
        })}
      </div>

      {totalReactions > 0 && (
        <p style={{ padding: '0 16px 6px', fontSize: '.8rem', color: '#b0907a', margin: 0 }}>
          {totalReactions} reação{totalReactions !== 1 ? 'ões' : ''}
        </p>
      )}

      {/* Toggle comments */}
      <button onClick={() => setShowComments(v => !v)}
        style={{ width: '100%', textAlign: 'left', padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '.85rem', color: '#a0713e', fontFamily: 'inherit', borderTop: '1px solid #f0e8dc' }}>
        💬 {showComments ? 'Ocultar comentários' : 'Comentários'}
      </button>

      {showComments && <CommentSection mediaId={item.id} defaultAuthor={savedAuthor} />}
    </article>
  )
}

// ── Feed page ─────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const [media,       setMedia]       = useState<MediaItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [nextCursor,  setNextCursor]  = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [savedAuthor, setSavedAuthor] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try { setSavedAuthor(localStorage.getItem('cha_author') ?? '') } catch {}
  }, [])

  const fetchPage = useCallback(async (cursor?: string) => {
    if (!cursor) setLoading(true)
    else setLoadingMore(true)
    try {
      const url = cursor ? `/api/photos?cursor=${encodeURIComponent(cursor)}` : '/api/photos'
      const res = await fetch(url)
      const data = await res.json()
      setMedia(prev => cursor ? [...prev, ...(data.media ?? [])] : (data.media ?? []))
      setNextCursor(data.nextCursor ?? null)
    } catch {}
    finally { setLoading(false); setLoadingMore(false) }
  }, [])

  useEffect(() => { fetchPage() }, [fetchPage])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !nextCursor) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && nextCursor) fetchPage(nextCursor)
    }, { rootMargin: '300px' })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [nextCursor, fetchPage])

  // Poll for new photos every 15s
  useEffect(() => {
    const t = setInterval(() => fetchPage(), 15_000)
    return () => clearInterval(t)
  }, [fetchPage])

  const handleReact = useCallback(async (id: string, emoji: string) => {
    if (getReacted(id).includes(emoji)) return
    markReacted(id, emoji)
    setMedia(prev => prev.map(m => m.id === id
      ? { ...m, reactions: { ...m.reactions, [emoji]: (m.reactions[emoji] ?? 0) + 1 } }
      : m,
    ))
    try {
      await fetch('/api/react', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, emoji }) })
    } catch {}
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#f9f3eb', fontFamily: "'Cormorant Garamond', serif" }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(249,243,235,.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e8d4b8', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="/" style={{ textDecoration: 'none', color: '#7a4e28', fontSize: '1.1rem' }}>←</a>
        <span style={{ fontSize: '1.5rem' }}>🐻</span>
        <div>
          <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '1.4rem', color: '#2a1400', margin: 0, lineHeight: 1 }}>José Augusto</h1>
          <p style={{ fontSize: '.75rem', color: '#8a5e35', margin: 0, letterSpacing: '.08em' }}>✦ álbum ao vivo ✦</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {media.length > 0 && (
            <span style={{ fontSize: '.78rem', color: '#a0713e', background: '#f5ede0', padding: '3px 10px', borderRadius: 50, border: '1px solid #e8d4b8' }}>
              {media.length} {media.length === 1 ? 'foto' : 'fotos'}
            </span>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 480, margin: '0 auto', padding: '16px 12px 80px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(60,20,0,.07)' }}>
                <div style={{ height: 56, background: '#f5ede0' }} />
                <div style={{ height: 300, background: '#e8d4b8', animation: 'pulse 1.5s ease infinite' }} />
                <div style={{ height: 48, background: '#f5ede0' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && media.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: '#8a5e35' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>📷</div>
            <p style={{ fontStyle: 'italic' }}>Nenhuma foto ainda. Seja o primeiro!</p>
            <a href="/" style={{ display: 'inline-block', marginTop: 20, color: '#7a4e28', fontWeight: 700 }}>← Voltar ao álbum</a>
          </div>
        )}

        {media.map(item => (
          <FeedCard key={item.id} item={item} onReact={handleReact} savedAuthor={savedAuthor} />
        ))}

        <div ref={sentinelRef} style={{ height: 8 }} />

        {loadingMore && (
          <p style={{ textAlign: 'center', color: '#b0907a', fontSize: '.9rem', padding: '16px 0', fontStyle: 'italic' }}>
            Carregando mais…
          </p>
        )}
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
      `}</style>
    </div>
  )
}
