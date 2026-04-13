'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useGeoAccess } from '@/components/GeoAccessProvider'
import { emitToast, vibrateSoft } from '@/lib/ui-feedback'

interface MediaItem {
  id: string
  thumbUrl: string
  fullUrl: string
  author: string
  caption?: string
  type: 'image' | 'video' | 'audio'
  createdAt: string
  reactions: Record<string, number>
}

interface CommentItem {
  id: number
  author: string
  text: string
  createdAt: string
}

const EMOJIS = ['❤️', '😍', '🎉', '👶', '😂', '👏']

function getReacted(id: string): string[] {
  try { return JSON.parse(localStorage.getItem(`cha_reacted_${id}`) ?? '[]') } catch { return [] }
}
function markReacted(id: string, emoji: string) {
  const r = getReacted(id)
  if (!r.includes(emoji)) localStorage.setItem(`cha_reacted_${id}`, JSON.stringify([...r, emoji]))
}
function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase() || '?'
}
function avatarBg(name: string): string {
  const colors = ['#c97a6e', '#6b9e7a', '#c47a3a', '#9b6ea8', '#4a7a9b', '#7a4e28']
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}
function totalReactions(reactions: Record<string, number>): number {
  return Object.values(reactions).reduce((a, b) => a + b, 0)
}

// ─── Individual Reel Item ───────────────────────────────────────────────────

function ReelItem({
  item,
  isActive,
  canWrite,
  onLike,
}: {
  item: MediaItem
  isActive: boolean
  canWrite: boolean
  onLike: (id: string, emoji: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [showHeart, setShowHeart] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reactions, setReactions] = useState(item.reactions)
  const [liked, setLiked] = useState(() => getReacted(item.id).includes('❤️'))
  const lastTap = useRef(0)
  const commentInputRef = useRef<HTMLInputElement>(null)

  // Sync reactions when parent prop changes
  useEffect(() => { setReactions(item.reactions) }, [item.reactions])

  // Play / pause video based on active state
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isActive) {
      video.currentTime = 0
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [isActive])

  // Load comments when panel opens
  useEffect(() => {
    if (!showComments) return
    fetch(`/api/comments?media_id=${encodeURIComponent(item.id)}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray((data as { comments?: CommentItem[] }).comments)) setComments((data as { comments: CommentItem[] }).comments) })
      .catch(() => {})
  }, [showComments, item.id])

  // Focus comment input when panel opens
  useEffect(() => {
    if (showComments && canWrite) {
      setTimeout(() => commentInputRef.current?.focus(), 200)
    }
  }, [showComments, canWrite])

  const handleTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 280) {
      vibrateSoft([10, 20, 10])
      triggerLike('❤️')
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 820)
    }
    lastTap.current = now
  }

  const triggerLike = (emoji: string) => {
    if (getReacted(item.id).includes(emoji)) return
    markReacted(item.id, emoji)
    vibrateSoft(18)
    setReactions(prev => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }))
    if (emoji === '❤️') setLiked(true)
    onLike(item.id, emoji)
    emitToast(`Voce reagiu com ${emoji}`)
  }

  const submitComment = async () => {
    if (!canWrite || submitting || !commentText.trim()) return
    setSubmitting(true)
    try {
      const author = localStorage.getItem('cha_author') || 'Convidado'
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: item.id, author, text: commentText.trim() }),
      })
      if (res.ok) {
        const data = await res.json() as { comment?: CommentItem }
        if (data.comment) setComments(prev => [...prev, data.comment!])
        setCommentText('')
        vibrateSoft(20)
        emitToast('Comentario publicado')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const totalR = totalReactions(reactions)
  const topEmojis = Object.entries(reactions).sort((a, b) => b[1] - a[1]).slice(0, 2)

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100dvh',
        scrollSnapAlign: 'start',
        overflow: 'hidden',
        background: '#000',
        flexShrink: 0,
      }}
    >
      {/* ── Media layer ─────────────────────────────── */}
      <div
        onClick={handleTap}
        style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
      >
        {item.type === 'video' ? (
          <video
            ref={videoRef}
            src={item.fullUrl}
            muted={muted}
            playsInline
            loop
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : item.type === 'audio' ? (
          <div
            style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #120a04 0%, #3d1f08 40%, #1a0e04 100%)',
              display: 'grid', placeItems: 'center',
            }}
          >
            <div style={{ textAlign: 'center', color: '#fff', padding: 24 }}>
              <div
                style={{
                  fontSize: 88, marginBottom: 24,
                  animation: isActive ? 'reelSpin 4s linear infinite' : 'none',
                  display: 'inline-block',
                }}
              >
                🎵
              </div>
              <audio src={item.fullUrl} autoPlay={isActive} controls style={{ width: 280, maxWidth: '88vw' }} />
            </div>
          </div>
        ) : (
          <img
            src={item.fullUrl}
            alt={item.author}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading={isActive ? 'eager' : 'lazy'}
            decoding="async"
          />
        )}

        {/* Gradients */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,.88) 0%, rgba(0,0,0,.18) 45%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 140,
            background: 'linear-gradient(to bottom, rgba(0,0,0,.55), transparent)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ── Double-tap heart ────────────────────────── */}
      {showHeart && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'grid', placeItems: 'center',
            pointerEvents: 'none', zIndex: 20,
          }}
        >
          <span style={{ fontSize: 110, animation: 'reelHeart .7s ease forwards' }}>❤️</span>
        </div>
      )}

      {/* ── Top bar ─────────────────────────────────── */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: 'max(48px, calc(40px + env(safe-area-inset-top))) 16px 12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          zIndex: 10,
        }}
      >
        <span
          style={{
            color: '#fff', fontSize: 20, fontWeight: 800,
            fontFamily: "'Cormorant Garamond', serif",
            letterSpacing: 3, textShadow: '0 2px 8px rgba(0,0,0,.7)',
          }}
        >
          Reels ✨
        </span>
        {item.type === 'video' && (
          <button
            onClick={e => { e.stopPropagation(); setMuted(v => !v) }}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,.45)',
              background: 'rgba(0,0,0,.45)', color: '#fff',
              cursor: 'pointer', display: 'grid', placeItems: 'center',
              fontSize: 18, backdropFilter: 'blur(6px)',
            }}
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        )}
      </div>

      {/* ── Bottom info ─────────────────────────────── */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 72,
          padding: `12px 16px max(${showComments || showEmojis ? 230 : 96}px, calc(${showComments || showEmojis ? 210 : 80}px + env(safe-area-inset-bottom)))`,
          zIndex: 10, transition: 'padding .25s ease',
        }}
      >
        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: avatarBg(item.author),
              display: 'grid', placeItems: 'center',
              color: '#fff', fontWeight: 700, fontSize: 15,
              flexShrink: 0, border: '2px solid rgba(255,255,255,.75)',
              boxShadow: '0 2px 10px rgba(0,0,0,.5)',
              fontFamily: "'Cormorant Garamond', serif",
            }}
          >
            {getInitials(item.author)}
          </div>
          <span
            style={{
              color: '#fff', fontWeight: 700, fontSize: 15,
              textShadow: '0 2px 6px rgba(0,0,0,.75)',
            }}
          >
            @{item.author}
          </span>
        </div>

        {/* Caption */}
        {item.caption && (
          <p
            style={{
              color: 'rgba(255,255,255,.95)', fontSize: 14,
              margin: '0 0 12px', lineHeight: 1.5,
              textShadow: '0 1px 5px rgba(0,0,0,.6)',
            }}
          >
            {item.caption}
          </p>
        )}

        {/* Emoji picker */}
        {showEmojis && (
          <div
            style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12,
              animation: 'reelSlideUp .2s ease',
            }}
          >
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => { triggerLike(emoji); setShowEmojis(false) }}
                style={{
                  fontSize: 28, background: 'rgba(0,0,0,.55)',
                  border: '1.5px solid rgba(255,255,255,.3)',
                  borderRadius: 999, width: 52, height: 52,
                  cursor: 'pointer', backdropFilter: 'blur(8px)',
                  transition: 'transform .12s',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Comments panel */}
        {showComments && (
          <div
            style={{
              background: 'rgba(0,0,0,.7)', borderRadius: 16,
              padding: '12px 14px', backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,.12)',
              marginBottom: 12, animation: 'reelSlideUp .2s ease',
            }}
          >
            {comments.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, margin: 0, fontStyle: 'italic' }}>
                Seja o primeiro a comentar...
              </p>
            ) : (
              comments.slice(-5).map(c => (
                <div key={c.id} style={{ marginBottom: 6 }}>
                  <span style={{ color: '#f5c78f', fontWeight: 700, fontSize: 13 }}>{c.author}</span>
                  <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 13 }}> {c.text}</span>
                </div>
              ))
            )}
            {canWrite && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  ref={commentInputRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitComment() }}
                  placeholder="Adicionar comentário..."
                  style={{
                    flex: 1, background: 'rgba(255,255,255,.1)',
                    border: '1px solid rgba(255,255,255,.2)',
                    borderRadius: 999, color: '#fff', padding: '8px 14px',
                    fontSize: 13, outline: 'none',
                  }}
                />
                <button
                  onClick={submitComment}
                  disabled={submitting || !commentText.trim()}
                  style={{
                    background: '#c47a3a', border: 'none', borderRadius: 999,
                    color: '#fff', padding: '8px 16px', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700,
                    opacity: submitting || !commentText.trim() ? 0.5 : 1,
                    transition: 'opacity .15s',
                  }}
                >
                  Enviar
                </button>
              </div>
            )}
            {!canWrite && (
              <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 12, margin: '8px 0 0', fontStyle: 'italic' }}>
                Comentários disponíveis apenas no evento
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Right sidebar ────────────────────────────── */}
      <div
        style={{
          position: 'absolute', right: 12, bottom: 0,
          paddingBottom: 'max(100px, calc(88px + env(safe-area-inset-bottom)))',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 16, zIndex: 10,
        }}
      >
        {/* Heart / Like */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <button
            onClick={() => triggerLike('❤️')}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              border: `1.5px solid ${liked ? 'rgba(255,80,80,.7)' : 'rgba(255,255,255,.4)'}`,
              background: liked ? 'rgba(255,60,60,.25)' : 'rgba(0,0,0,.45)',
              color: '#fff', fontSize: 22, cursor: 'pointer',
              display: 'grid', placeItems: 'center',
              backdropFilter: 'blur(4px)',
              transition: 'transform .12s, background .2s, border-color .2s',
            }}
            aria-label="Curtir"
          >
            {liked ? '❤️' : '🤍'}
          </button>
          {totalR > 0 && (
            <span
              style={{
                color: '#fff', fontSize: 11, fontWeight: 700,
                textShadow: '0 1px 4px rgba(0,0,0,.9)',
              }}
            >
              {totalR}
            </span>
          )}
        </div>

        {/* Comment */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <button
            onClick={() => { setShowComments(v => !v); setShowEmojis(false) }}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              border: `1.5px solid rgba(255,255,255,${showComments ? '.8' : '.4'})`,
              background: showComments ? 'rgba(196,122,58,.45)' : 'rgba(0,0,0,.45)',
              color: '#fff', fontSize: 22, cursor: 'pointer',
              display: 'grid', placeItems: 'center',
              backdropFilter: 'blur(4px)',
              transition: 'background .2s, border-color .2s',
            }}
            aria-label="Comentários"
          >
            💬
          </button>
          {comments.length > 0 && (
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,.9)' }}>
              {comments.length}
            </span>
          )}
        </div>

        {/* Emoji reactions */}
        <button
          onClick={() => { setShowEmojis(v => !v); setShowComments(false) }}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            border: `1.5px solid rgba(255,255,255,${showEmojis ? '.8' : '.4'})`,
            background: showEmojis ? 'rgba(196,122,58,.45)' : 'rgba(0,0,0,.45)',
            color: '#fff', fontSize: 22, cursor: 'pointer',
            display: 'grid', placeItems: 'center',
            backdropFilter: 'blur(4px)',
            transition: 'background .2s, border-color .2s',
          }}
          aria-label="Reagir"
        >
          😍
        </button>

        {/* Top 2 emoji counts */}
        {topEmojis.map(([emoji, count]) => (
          <div
            key={emoji}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
          >
            <span style={{ fontSize: 20 }}>{emoji}</span>
            <span
              style={{
                color: '#fff', fontSize: 10, fontWeight: 700,
                textShadow: '0 1px 4px rgba(0,0,0,.9)',
              }}
            >
              {count}
            </span>
          </div>
        ))}
      </div>

      {/* ── Keyframes (scoped per item) ──────────────── */}
      <style>{`
        @keyframes reelHeart {
          0%   { transform: scale(.28) translateY(8px); opacity: 0; filter: blur(1px); }
          35%  { transform: scale(1.14) translateY(-2px); opacity: 1; filter: blur(0); }
          70%  { transform: scale(1.06) translateY(-8px); opacity: .95; }
          100% { transform: scale(1.25) translateY(-20px); opacity: 0; }
        }
        @keyframes reelSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes reelSlideUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ReelsPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIdx, setActiveIdx] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { canWrite } = useGeoAccess()

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch('/api/photos')
      const data = await res.json() as { media?: MediaItem[] }
      const items = Array.isArray(data.media) ? data.media : []
      // "For You" feel: sort most-reacted first, recent as tiebreaker
      items.sort((a, b) => {
        const ta = Object.values(a.reactions).reduce((x, y) => x + y, 0)
        const tb = Object.values(b.reactions).reduce((x, y) => x + y, 0)
        if (tb !== ta) return tb - ta
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      setMedia(items)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMedia()

    if (typeof EventSource === 'undefined') return
    const es = new EventSource('/api/stream')

    es.addEventListener('new-photo', () => fetchMedia())
    es.addEventListener('reaction-update', (e: Event) => {
      try {
        const p = JSON.parse((e as MessageEvent).data) as { mediaId?: string; emoji?: string }
        if (p.mediaId && p.emoji) {
          setMedia(prev => prev.map(item =>
            item.id === p.mediaId
              ? { ...item, reactions: { ...item.reactions, [p.emoji!]: (item.reactions[p.emoji!] ?? 0) + 1 } }
              : item,
          ))
        }
      } catch {}
    })

    es.onerror = () => es.close()
    return () => es.close()
  }, [fetchMedia])

  // Track active index via scroll position
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const onScroll = () => {
      const h = window.innerHeight
      if (h === 0) return
      const idx = Math.round(container.scrollTop / h)
      setActiveIdx(idx)
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  const handleLike = useCallback(async (id: string, emoji: string) => {
    try {
      await fetch('/api/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, emoji }),
      })
    } catch {}
  }, [])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100dvh', background: '#000',
          display: 'grid', placeItems: 'center',
          color: '#fff', fontFamily: "'Cormorant Garamond', serif",
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 14, animation: 'reelSpin 1.2s linear infinite', display: 'inline-block' }}>🎬</div>
          <p style={{ fontSize: 18, opacity: .8, letterSpacing: 2 }}>Carregando Reels...</p>
        </div>
        <style>{`@keyframes reelSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (media.length === 0) {
    return (
      <div
        style={{
          minHeight: '100dvh', background: '#000',
          display: 'grid', placeItems: 'center',
          color: '#fff', fontFamily: "'Cormorant Garamond', serif",
          textAlign: 'center', padding: 24,
        }}
      >
        <div>
          <p style={{ fontSize: 72, margin: 0 }}>🎬</p>
          <p style={{ fontSize: 22, marginTop: 16, opacity: .9 }}>Nenhum Reel ainda</p>
          <p style={{ fontSize: 15, marginTop: 8, opacity: .5 }}>Poste uma foto ou vídeo para começar!</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 0 }}>
      <div
        ref={scrollRef}
        style={{
          height: '100dvh',
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {media.map((item, idx) => (
          <ReelItem
            key={item.id}
            item={item}
            isActive={idx === activeIdx}
            canWrite={canWrite}
            onLike={handleLike}
          />
        ))}
      </div>
    </div>
  )
}
