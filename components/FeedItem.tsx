'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { emitToast, vibrateSoft } from '@/lib/ui-feedback'
import { REACTION_EMOJIS } from '@/lib/config'

function getStarred(id: string): boolean {
  try {
    const f = JSON.parse(localStorage.getItem('cha_favorites') ?? '[]') as string[]
    return f.includes(id)
  } catch { return false }
}

function toggleFavorite(id: string, starred: boolean): void {
  try {
    const f = JSON.parse(localStorage.getItem('cha_favorites') ?? '[]') as string[]
    const next = starred ? f.filter(x => x !== id) : [...f, id]
    localStorage.setItem('cha_favorites', JSON.stringify(next))
  } catch {}
}

const ShareStories = dynamic(() => import('./ShareStories'), { ssr: false })

export interface FeedMediaItem {
  id: string
  thumbUrl: string
  fullUrl: string
  imageSources?: { w320?: string; w640?: string; w1080?: string }
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

const REACTION_OPTIONS = REACTION_EMOJIS

export default function FeedItem({
  item,
  canWrite,
  onLike,
  viewportHeight,
}: {
  item: FeedMediaItem
  canWrite: boolean
  onLike: (id: string, emoji?: string) => Promise<void> | void
  viewportHeight: string
}) {
  const [showHeart, setShowHeart] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [videoMuted, setVideoMuted] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [showShareStories, setShowShareStories] = useState(false)
  const [starred, setStarred] = useState(false)
  const [tags, setTags] = useState<{ tagged_name: string; tagged_by: string }[]>([])
  const [showTagInput, setShowTagInput] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagging, setTagging] = useState(false)

  // Initialise starred from localStorage (after mount, client-only)
  useEffect(() => { setStarred(getStarred(item.id)) }, [item.id])
  const lastTapRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const commentListRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/comments?media_id=${encodeURIComponent(item.id)}`)
      const data = await res.json() as { comments?: CommentItem[] }
      setComments(Array.isArray(data.comments) ? data.comments : [])
      setCommentsLoaded(true)
    } catch {
      // Non-critical — keep whatever comments are already loaded
      console.warn('[FeedItem] Could not load comments for', item.id)
    }
  }

  useEffect(() => { loadComments() }, [item.id])

  const loadTags = async () => {
    try {
      const res = await fetch(`/api/tags?media_id=${encodeURIComponent(item.id)}`)
      const data = await res.json() as { tags?: { tagged_name: string; tagged_by: string }[] }
      setTags(data.tags ?? [])
    } catch {
      // Non-critical — ignore tag load errors
    }
  }

  useEffect(() => { loadTags() }, [item.id])

  // Real-time comment updates when panel is open
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

  // Auto-scroll to bottom when comments expand
  useEffect(() => {
    if (commentsOpen && commentListRef.current) {
      setTimeout(() => {
        commentListRef.current?.scrollTo({ top: commentListRef.current.scrollHeight, behavior: 'smooth' })
      }, 80)
    }
  }, [commentsOpen, comments.length])

  // Focus input when panel opens
  useEffect(() => {
    if (commentsOpen && canWrite) {
      setTimeout(() => commentInputRef.current?.focus(), 150)
    }
  }, [commentsOpen, canWrite])

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
          el.play().catch(err => {
            // Autoplay blocked before user gesture — expected on mobile, silent
            if ((err as Error).name !== 'NotAllowedError') {
              console.warn('[FeedItem] Video play failed:', (err as Error).message)
            }
          })
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
      vibrateSoft([10, 18, 10])
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 760)
      await onLike(item.id)
      emitToast('Reação enviada com sucesso')
    }
    lastTapRef.current = now
  }

  const submitComment = async () => {
    if (!canWrite || isSubmitting || !commentText.trim()) return
    const text = commentText.trim()
    const author = (() => { try { return localStorage.getItem('cha_author') || 'Convidado' } catch { return 'Convidado' } })()

    // Optimistic update — add immediately with a temp id
    const tempId = -(Date.now())
    const optimistic: CommentItem = { id: tempId, author, text, createdAt: new Date().toISOString() }
    setComments(prev => [...prev, optimistic])
    setCommentText('')
    setReplyTo(null)
    setIsSubmitting(true)

    // Scroll to bottom to show new comment
    setTimeout(() => {
      commentListRef.current?.scrollTo({ top: commentListRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: item.id, author, text }),
      })
      if (!res.ok) {
        // Roll back optimistic on error
        setComments(prev => prev.filter(c => c.id !== tempId))
        setCommentText(text)
        return
      }
      const data = await res.json() as { comment?: CommentItem }
      if (data.comment) {
        // Replace temp entry with real one from server
        setComments(prev => prev.map(c => c.id === tempId ? data.comment! : c))
        vibrateSoft(20)
        emitToast('Comentário publicado')
      }
      setCommentsOpen(true)
    } catch {
      setComments(prev => prev.filter(c => c.id !== tempId))
      setCommentText(text)
    } finally {
      setIsSubmitting(false)
    }
  }

  const downloadMedia = async () => {
    // Detect extension from the actual URL (files are stored as .webp, .mp4, etc.)
    const rawPath = item.fullUrl.split('?')[0]
    const rawExt  = rawPath.split('.').pop()?.toLowerCase() ?? ''
    const ext = item.type === 'video' ? 'mp4'
      : ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(rawExt) ? rawExt
      : 'webp'
    const filename = `cha-jose-${item.author.replace(/\s+/g, '-')}.${ext}`

    // iOS Safari: a.download on blob URLs is not supported and can't display WebP
    // blobs — open the CDN URL directly so user can long-press → "Salvar foto"
    const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent)
    if (isIOS) {
      window.open(item.fullUrl, '_blank')
      emitToast('Toque e segure na imagem → "Salvar foto" 📲')
      return
    }

    try {
      emitToast('Baixando...')
      const res = await fetch(`/api/download?url=${encodeURIComponent(item.fullUrl)}&filename=${encodeURIComponent(filename)}`)
      if (!res.ok) throw new Error()
      // Ensure the blob carries the right MIME so the browser opens it correctly
      const rawBlob = await res.blob()
      const mimeMap: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', mp4: 'video/mp4' }
      const mime = mimeMap[ext] ?? rawBlob.type
      const blob = new Blob([rawBlob], { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 8000)
      emitToast('Download concluído! ✓')
    } catch {
      emitToast('Não foi possível baixar')
    }
  }

  const sharePost = async () => {
    const shareData = {
      title: `Foto de ${item.author} — Chá do José Augusto`,
      text: item.caption?.trim() || `Confira esta foto de ${item.author} no chá do José Augusto!`,
      url: `${window.location.origin}/?foto=${item.id}`,
    }
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.url)
        emitToast('Link copiado!')
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') emitToast('Não foi possível compartilhar')
    }
  }

  const shareWhatsApp = () => {
    // /foto/<slug> is a server-rendered page with OG tags so WhatsApp
    // shows the photo preview in the chat before the recipient clicks.
    const slugPath = item.id.split('/').map(encodeURIComponent).join('/')
    const url  = `${window.location.origin}/foto/${slugPath}`
    const text = item.caption?.trim() || 'Confira essa foto do Chá do José Augusto! 🧸'
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`
    window.open(waUrl, '_blank')
  }

  const handleStarToggle = () => {
    const next = !starred
    toggleFavorite(item.id, starred)
    setStarred(next)
    emitToast(next ? 'Foto adicionada aos favoritos ⭐' : 'Foto removida dos favoritos')
  }

  const handleTag = async () => {
    if (!tagInput.trim()) return
    setTagging(true)
    try {
      const authorName = (() => { try { return localStorage.getItem('cha_author') ?? 'Convidado' } catch { return 'Convidado' } })()
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: item.id, tagged_name: tagInput.trim(), tagged_by: authorName }),
      })
      if (res.ok) {
        setTags(prev => [...prev, { tagged_name: tagInput.trim(), tagged_by: authorName }])
        setTagInput('')
        setShowTagInput(false)
        emitToast(`👤 ${tagInput.trim()} marcado(a) na foto!`)
      } else {
        const d = await res.json() as { error?: string }
        emitToast(d.error ?? 'Erro ao marcar')
      }
    } finally {
      setTagging(false)
    }
  }

  const topReactions = useMemo(() => {
    return Object.entries(item.reactions).sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [item.reactions])

  const commentCount = comments.length

  return (
    <article
      ref={rootRef}
      style={{
        width: '100%', height: viewportHeight,
        scrollSnapAlign: 'start', position: 'relative',
        background: '#0f0d0b', display: 'flex', justifyContent: 'center',
        padding: isDesktop ? '16px 18px 20px' : '10px 8px 16px',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: isDesktop ? 980 : '100%',
          height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', gap: 10,
        }}
      >
        {/* ── Media ─────────────────────────────── */}
        <div
          onClick={handleTap}
          style={{
            flex: 1, minHeight: isDesktop ? 360 : 260, position: 'relative',
            borderRadius: isDesktop ? 22 : 16, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,.14)',
            boxShadow: '0 18px 54px rgba(0,0,0,.38)',
            background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {item.type === 'video' ? (
            <video ref={videoRef} src={item.fullUrl} muted={videoMuted} playsInline loop controls={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
          ) : item.type === 'audio' ? (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a1a1a,#3d2c1e)', display: 'grid', placeItems: 'center', color: '#fff', padding: 24 }}>
              <div style={{ textAlign: 'center', width: '100%', maxWidth: 380 }}>
                <div style={{ fontSize: 62, marginBottom: 20 }}>🎙️</div>
                <audio src={item.fullUrl} controls style={{ width: '100%' }} />
              </div>
            </div>
          ) : (
            <img
              src={item.imageSources?.w640 || item.thumbUrl || item.fullUrl}
              srcSet={[
                `${item.imageSources?.w320 || item.fullUrl} 320w`,
                `${item.imageSources?.w640 || item.fullUrl} 640w`,
                `${item.imageSources?.w1080 || item.fullUrl} 1080w`,
              ].join(', ')}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 980px"
              alt={item.author}
              loading="lazy"
              decoding="async"
              onError={e => { const img = e.currentTarget; img.srcset = ''; img.src = item.fullUrl }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#0f0d0b' }}
            />
          )}

          {showHeart && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 86, animation: 'feed-heart-pop .56s ease forwards', textShadow: '0 10px 20px rgba(0,0,0,.45)' }}>❤</div>
            </div>
          )}

          {item.type === 'video' && (
            <button
              onClick={e => { e.stopPropagation(); setVideoMuted(v => !v) }}
              style={{ position: 'absolute', right: 14, top: 14, border: '1px solid rgba(255,255,255,.35)', borderRadius: 999, color: '#fff', background: 'rgba(0,0,0,.4)', width: 42, height: 42, cursor: 'pointer' }}
              aria-label={videoMuted ? 'Ativar som' : 'Silenciar vídeo'}
            >
              {videoMuted ? '🔇' : '🔊'}
            </button>
          )}
        </div>

        {/* ── Info bar ─────────────────────────── */}
        <div style={{ flexShrink: 0, padding: isDesktop ? '2px 4px 0' : '0 2px', color: '#fff' }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
            <a href={`/u/${encodeURIComponent(item.author)}`} style={{ color: '#f5c78f', fontWeight: 700, fontSize: 17, textDecoration: 'none' }}>
              @{item.author}
            </a>
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 14, opacity: 0.95 }}>{item.caption?.trim() || 'Sem legenda'}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.55 }}>{timeAgo(item.createdAt)}</p>

          {topReactions.length > 0 && (
            <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.9 }}>
              {topReactions.map(([emoji, count]) => `${emoji} ${count}`).join(' · ')}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map(t => (
                <span key={t.tagged_name} style={{
                  background: 'rgba(196,122,58,.15)', color: '#f5c78f',
                  border: '1px solid rgba(196,122,58,.3)',
                  borderRadius: 999, padding: '3px 10px',
                  fontSize: '.75rem', fontWeight: 600,
                }}>
                  👤 {t.tagged_name}
                </span>
              ))}
            </div>
          )}

          {/* Action row */}
          <div style={{ marginTop: 10, display: 'flex', gap: 8, position: 'relative', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setShowEmojiPicker(v => !v)}
              style={{ border: '1px solid rgba(255,255,255,.5)', borderRadius: 999, background: showEmojiPicker ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.12)', color: '#fff', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              Reagir
            </button>
            <button
              onClick={() => {
                setCommentsOpen(v => !v)
                if (!commentsLoaded) loadComments()
              }}
              style={{
                border: '1px solid rgba(255,255,255,.5)', borderRadius: 999,
                background: commentsOpen ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.12)',
                color: '#fff', padding: '8px 14px', cursor: 'pointer', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              }}
            >
              💬
              {commentCount > 0
                ? <span>{commentCount} {commentCount === 1 ? 'comentário' : 'comentários'}</span>
                : <span>Comentar</span>
              }
            </button>

            {/* WhatsApp */}
            <button
              onClick={shareWhatsApp}
              style={{ border: '1px solid rgba(255,255,255,.5)', borderRadius: 999, background: 'rgba(255,255,255,.12)', color: '#fff', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              aria-label="Compartilhar no WhatsApp"
            >
              📲 WhatsApp
            </button>

            {/* Favorite */}
            <button
              onClick={handleStarToggle}
              style={{
                border: starred ? '1px solid rgba(255,215,0,.6)' : '1px solid rgba(255,255,255,.5)',
                borderRadius: 999,
                background: starred ? 'rgba(255,215,0,.25)' : 'rgba(255,255,255,.12)',
                color: starred ? '#ffd700' : '#fff',
                padding: '8px 12px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 15,
                lineHeight: 1,
              }}
              aria-label={starred ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              title={starred ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              {starred ? '⭐' : '☆'}
            </button>

            {/* Stories */}
            {item.type === 'image' && (
              <button
                onClick={() => setShowShareStories(true)}
                style={{ border: '1px solid rgba(255,255,255,.5)', borderRadius: 999, background: 'rgba(255,255,255,.12)', color: '#fff', padding: '8px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, lineHeight: 1 }}
                aria-label="Compartilhar para Stories"
                title="Compartilhar para Stories"
              >
                📤 Stories
              </button>
            )}

            {showEmojiPicker && (
              <div style={{ width: '100%', marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, background: 'rgba(0,0,0,.55)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 14, padding: 10 }}>
                {REACTION_OPTIONS.map(emoji => (
                  <button
                    key={`${item.id}-${emoji}`}
                    onClick={() => {
                      vibrateSoft(18)
                      onLike(item.id, emoji)
                      setShowEmojiPicker(false)
                      emitToast(`Você reagiu com ${emoji}`)
                    }}
                    style={{ border: '1px solid rgba(255,255,255,.3)', borderRadius: 999, background: 'rgba(255,255,255,.12)', color: '#fff', padding: '8px 12px', cursor: 'pointer', fontSize: 18, transition: 'transform .1s' }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comments panel */}
          {commentsOpen && (
            <div style={{ marginTop: 10 }}>
              {/* Scrollable comments list */}
              {comments.length > 0 && (
                <div
                  ref={commentListRef}
                  style={{
                    maxHeight: 160, overflowY: 'auto',
                    display: 'flex', flexDirection: 'column', gap: 6,
                    marginBottom: 8, paddingRight: 4,
                    scrollbarWidth: 'none',
                  }}
                >
                  {comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'rgba(255,255,255,.4)',
                          marginTop: 6, flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, opacity: c.id < 0 ? 0.6 : 1, transition: 'opacity .3s' }}>
                          <strong style={{ color: '#f5c78f' }}>{c.author}</strong>
                          {' '}
                          <span style={{ color: 'rgba(255,255,255,.9)' }}>{c.text}</span>
                        </p>
                        {canWrite && c.id >= 0 && (
                          <button
                            onClick={() => {
                              setReplyTo(c.author)
                              setCommentText(`@${c.author} `)
                              setTimeout(() => {
                                commentInputRef.current?.focus()
                              }, 50)
                            }}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.45)', fontSize: 11, cursor: 'pointer', padding: '2px 0', marginTop: 2 }}
                          >
                            Responder
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {commentsLoaded && comments.length === 0 && (
                <p style={{ margin: '0 0 8px', fontSize: 12, opacity: 0.45, fontStyle: 'italic' }}>
                  Nenhum comentário ainda. Seja o primeiro!
                </p>
              )}

              {/* Reply chip */}
              {replyTo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, background: 'rgba(255,255,255,.1)', borderRadius: 999, padding: '4px 10px', width: 'fit-content' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>Respondendo <strong style={{ color: '#f5c78f' }}>@{replyTo}</strong></span>
                  <button
                    onClick={() => { setReplyTo(null); setCommentText('') }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.55)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
                    aria-label="Cancelar resposta"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Input row */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={commentInputRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitComment() }}
                  disabled={!canWrite}
                  placeholder={canWrite ? 'Adicionar comentário...' : 'Comentários disponíveis no evento'}
                  style={{
                    flex: 1, border: '1px solid rgba(255,255,255,.32)',
                    borderRadius: 999, background: 'rgba(255,255,255,.1)',
                    color: '#fff', padding: '8px 14px', outline: 'none',
                    fontSize: 13, opacity: canWrite ? 1 : 0.5,
                  }}
                />
                <button
                  onClick={submitComment}
                  disabled={!canWrite || isSubmitting || !commentText.trim()}
                  style={{
                    border: '1px solid rgba(255,255,255,.45)', borderRadius: 999,
                    background: canWrite && commentText.trim() ? 'rgba(196,122,58,.7)' : 'rgba(255,255,255,.06)',
                    color: '#fff', minWidth: 70, cursor: canWrite ? 'pointer' : 'not-allowed',
                    fontSize: 13, fontWeight: 600, transition: 'background .2s',
                  }}
                >
                  {isSubmitting ? '...' : 'Enviar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes feed-heart-pop { 0% { transform: scale(.34) translateY(10px); opacity: 0; filter: blur(1px); } 30% { transform: scale(1.12) translateY(-2px); opacity: 1; filter: blur(0); } 62% { transform: scale(1.04) translateY(-8px); opacity: .96; } 100% { transform: scale(1.24) translateY(-20px); opacity: 0; } }`}</style>

      {showShareStories && item.type === 'image' && (
        <ShareStories
          imageUrl={item.fullUrl}
          author={item.author}
          onClose={() => setShowShareStories(false)}
        />
      )}
    </article>
  )
}
