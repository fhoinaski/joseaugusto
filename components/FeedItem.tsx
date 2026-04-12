'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export interface FeedMediaItem {
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export default function FeedItem({
  item,
  canWrite,
  onLike,
}: {
  item: FeedMediaItem
  canWrite: boolean
  onLike: (id: string, emoji?: string) => Promise<void> | void
}) {
  const [showHeart, setShowHeart] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [videoMuted, setVideoMuted] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const lastTapRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/comments?media_id=${encodeURIComponent(item.id)}`)
      const data = await res.json() as { comments?: CommentItem[] }
      setComments(Array.isArray(data.comments) ? data.comments : [])
    } catch {}
  }

  useEffect(() => { loadComments() }, [item.id])

  useEffect(() => {
    if (!commentsOpen || typeof EventSource === 'undefined') return
    const es = new EventSource('/api/stream')
    const onComment = (e: Event) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as { mediaId?: string }
        if (payload.mediaId === item.id) loadComments()
      } catch {}
    }
    es.addEventListener('comment-update', onComment)
    return () => es.close()
  }, [commentsOpen, item.id])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (item.type !== 'video' || !videoRef.current || !rootRef.current) return

    const el = videoRef.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {})
        } else {
          el.pause()
        }
      },
      { threshold: 0.65 },
    )

    observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [item.type])

  const handleTap = async () => {
    const now = Date.now()
    if (now - lastTapRef.current < 280) {
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 560)
      await onLike(item.id)
    }
    lastTapRef.current = now
  }

  const REACTION_OPTIONS = ['👍', '♥', '😍', '🎉', '👶', '😂']

  const submitComment = async () => {
    if (!canWrite || isSubmitting || !commentText.trim()) return
    setIsSubmitting(true)
    try {
      const author = localStorage.getItem('cha_author') || 'Convidado'
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: item.id, author, text: commentText.trim() }),
      })
      if (!res.ok) return
      const data = await res.json() as { comment?: CommentItem }
      if (data.comment) {
        const incoming = data.comment
        setComments(prev => [...prev.slice(-2), incoming])
      }
      setCommentsOpen(true)
      setCommentText('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const topReactions = useMemo(() => {
    return Object.entries(item.reactions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [item.reactions])

  return (
    <article ref={rootRef} style={{ height: '100dvh', width: '100%', scrollSnapAlign: 'start', position: 'relative', background: '#000', display: 'flex', justifyContent: 'center' }}>
      <div onClick={handleTap} style={{ width: '100%', height: '100%', maxWidth: isDesktop ? 760 : '100%', position: 'relative' }}>
        {item.type === 'video' ? (
          <video ref={videoRef} src={item.fullUrl} muted={videoMuted} playsInline loop controls={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : item.type === 'audio' ? (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a1a1a,#3d2c1e)', display: 'grid', placeItems: 'center', color: '#fff', padding: 24 }}>
            <div style={{ textAlign: 'center', width: '100%', maxWidth: 380 }}>
              <div style={{ fontSize: 62, marginBottom: 20 }}>🎙️</div>
              <audio src={item.fullUrl} controls style={{ width: '100%' }} />
            </div>
          </div>
        ) : (
          <img
            src={item.fullUrl}
            srcSet={`${item.thumbUrl} 720w, ${item.fullUrl} 1600w`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 980px"
            alt={item.author}
            loading="lazy"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: isDesktop ? 'contain' : 'cover', background: '#0f0d0b' }}
          />
        )}

        {showHeart && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 86, animation: 'feed-heart-pop .56s ease forwards', textShadow: '0 10px 20px rgba(0,0,0,.45)' }}>❤</div>
          </div>
        )}

        {item.type === 'video' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setVideoMuted(v => !v)
            }}
            style={{ position: 'absolute', right: 14, top: 14, border: '1px solid rgba(255,255,255,.35)', borderRadius: 999, color: '#fff', background: 'rgba(0,0,0,.4)', width: 42, height: 42, cursor: 'pointer' }}
            aria-label={videoMuted ? 'Ativar som' : 'Silenciar vídeo'}
          >
            {videoMuted ? '🔇' : '🔊'}
          </button>
        )}

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '24px 14px calc(112px + env(safe-area-inset-bottom))', background: 'linear-gradient(180deg,rgba(0,0,0,0) 0%, rgba(0,0,0,.72) 35%, rgba(0,0,0,.88) 100%)', color: '#fff' }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>@{item.author}</p>
          <p style={{ margin: '6px 0 0', fontSize: 14, opacity: 0.95 }}>{item.caption?.trim() || 'Sem legenda'}</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.75 }}>{timeAgo(item.createdAt)}</p>

          {topReactions.length > 0 && (
            <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.9 }}>
              {topReactions.map(([emoji, count]) => `${emoji} ${count}`).join(' · ')}
            </p>
          )}

          <div style={{ marginTop: 10, display: 'flex', gap: 8, position: 'relative', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowEmojiPicker(v => !v)}
              style={{ border: '1px solid rgba(255,255,255,.5)', borderRadius: 999, background: 'rgba(255,255,255,.12)', color: '#fff', padding: '8px 14px', cursor: 'pointer', fontWeight: 600 }}
            >
              Reagir
            </button>
            <button
              onClick={() => {
                setCommentsOpen(v => !v)
                if (!commentsOpen) loadComments()
              }}
              style={{ border: '1px solid rgba(255,255,255,.5)', borderRadius: 999, background: 'rgba(255,255,255,.12)', color: '#fff', padding: '8px 14px', cursor: 'pointer', fontWeight: 600 }}
            >
              💬 Comentar
            </button>

            {showEmojiPicker && (
              <div style={{ width: '100%', marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, background: 'rgba(0,0,0,.45)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 12, padding: 10 }}>
                {REACTION_OPTIONS.map(emoji => (
                  <button
                    key={`${item.id}-${emoji}`}
                    onClick={() => {
                      onLike(item.id, emoji)
                      setShowEmojiPicker(false)
                    }}
                    style={{ border: '1px solid rgba(255,255,255,.3)', borderRadius: 999, background: 'rgba(255,255,255,.12)', color: '#fff', padding: '6px 10px', cursor: 'pointer', fontSize: 16 }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 10, display: commentsOpen ? 'flex' : 'none', gap: 8 }}>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitComment()
              }}
              disabled={!canWrite}
              placeholder={canWrite ? 'Comentário rápido...' : 'Bloqueado fora da área do evento'}
              style={{ flex: 1, border: '1px solid rgba(255,255,255,.38)', borderRadius: 999, background: 'rgba(255,255,255,.14)', color: '#fff', padding: '8px 12px', outline: 'none' }}
            />
            <button
              onClick={submitComment}
              disabled={!canWrite || isSubmitting || !commentText.trim()}
              style={{ border: '1px solid rgba(255,255,255,.5)', borderRadius: 999, background: canWrite ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.06)', color: '#fff', minWidth: 72, cursor: canWrite ? 'pointer' : 'not-allowed' }}
            >
              Enviar
            </button>
          </div>

          {commentsOpen && comments.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {comments.slice(-2).map(c => (
                <p key={c.id} style={{ margin: 0, fontSize: 12 }}>
                  <strong>{c.author}</strong> {c.text}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes feed-heart-pop { 0% { transform: scale(.4); opacity: 0; } 30% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1.2); opacity: 0; } }`}</style>
    </article>
  )
}
