'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface StoryMediaItem {
  id: string
  author: string
  type: 'image' | 'video' | 'audio'
  thumbUrl: string
  fullUrl: string
  createdAt: string
  caption?: string
}

interface StoryGroup {
  author: string
  items: StoryMediaItem[]
}

function getDuration(item: StoryMediaItem): number {
  if (item.type === 'video') return 10
  if (item.type === 'audio') return 6
  return 5
}

function getOrCreateUserId(): string {
  const key = 'cha_user_id'
  try {
    const current = localStorage.getItem(key)
    if (current) return current
    const generated = `guest_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(key, generated)
    return generated
  } catch {
    return 'guest_fallback'
  }
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

export default function Stories({ items }: { items: StoryMediaItem[] }) {
  const groups = useMemo<StoryGroup[]>(() => {
    const map = new Map<string, StoryMediaItem[]>()
    for (const item of items) {
      map.set(item.author, [...(map.get(item.author) ?? []), item])
    }
    return Array.from(map.entries()).map(([author, grouped]) => ({
      author,
      items: grouped.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    }))
  }, [items])

  const [seen, setSeen] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const [authorIdx, setAuthorIdx] = useState(0)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [userId, setUserId] = useState('')
  const timerRef = useRef<number | null>(null)

  // Touch swipe tracking
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)

  const activeGroup = groups[authorIdx]
  const activeStory = activeGroup?.items[storyIdx]

  useEffect(() => {
    const id = getOrCreateUserId()
    setUserId(id)
    fetch(`/api/stories/seen?user_id=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(data => {
        const raw = Array.isArray((data as { seen?: unknown[] }).seen) ? (data as { seen: unknown[] }).seen : []
        setSeen(new Set(raw.map((v: unknown) => String(v))))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    document.body.classList.toggle('stories-open', open)
    return () => { document.body.classList.remove('stories-open') }
  }, [open])

  // Progress timer — respects paused state
  useEffect(() => {
    if (!open || !activeStory || !userId) return

    fetch('/api/stories/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, media_id: activeStory.id }),
    }).catch(() => {})

    setSeen(prev => new Set([...Array.from(prev), activeStory.id]))
    setProgress(0)

    const duration = getDuration(activeStory)
    const step = 100 / (duration * 10)

    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      if (paused) return
      setProgress(prev => {
        if (prev + step >= 100) {
          nextStory()
          return 100
        }
        return prev + step
      })
    }, 100)

    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeStory?.id, userId])

  // Pause when flag changes — restart interval logic
  useEffect(() => {
    if (!timerRef.current) return
    // The interval reads `paused` via closure on each tick
  }, [paused])

  const nextStory = () => {
    if (!activeGroup) return
    if (storyIdx < activeGroup.items.length - 1) {
      setStoryIdx(v => v + 1)
      return
    }
    if (authorIdx < groups.length - 1) {
      setAuthorIdx(v => v + 1)
      setStoryIdx(0)
      return
    }
    setOpen(false)
  }

  const prevStory = () => {
    if (!activeGroup) return
    if (storyIdx > 0) {
      setStoryIdx(v => v - 1)
      return
    }
    if (authorIdx > 0) {
      const prevAuthorIdx = authorIdx - 1
      const prevAuthor = groups[prevAuthorIdx]
      setAuthorIdx(prevAuthorIdx)
      setStoryIdx(Math.max(0, prevAuthor.items.length - 1))
    }
  }

  const openAuthor = (idx: number) => {
    const group = groups[idx]
    if (!group) return
    const firstUnseen = group.items.findIndex(item => !seen.has(item.id))
    setAuthorIdx(idx)
    setStoryIdx(firstUnseen >= 0 ? firstUnseen : 0)
    setOpen(true)
  }

  const togglePause = () => {
    setPaused(prev => !prev)
  }

  // ── Touch handlers for swipe navigation ─────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    setPaused(true) // hold to pause
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setPaused(false)
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const dt = Date.now() - touchStartTime.current

    // Swipe down → close
    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
      setOpen(false)
      return
    }

    // Short tap (no significant movement)
    if (dt < 300 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      // Handled by the left/right tap zones
      return
    }

    // Horizontal swipe → navigate authors
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        // swipe left → next author
        if (authorIdx < groups.length - 1) {
          setAuthorIdx(v => v + 1)
          setStoryIdx(0)
        } else {
          setOpen(false)
        }
      } else {
        // swipe right → prev author
        if (authorIdx > 0) {
          setAuthorIdx(v => v - 1)
          setStoryIdx(0)
        }
      }
    }
  }

  if (groups.length === 0) return null

  return (
    <>
      {/* ── Stories strip ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 12px 12px',
          overflowX: 'auto',
          display: 'flex',
          gap: 12,
          borderBottom: '1px solid #eadcc7',
          background: '#f9f3eb',
        }}
      >
        {groups.map((group, idx) => {
          const hasUnseen = group.items.some(item => !seen.has(item.id))
          return (
            <button
              key={group.author}
              onClick={() => openAuthor(idx)}
              style={{ border: 'none', background: 'transparent', minWidth: 72, cursor: 'pointer', padding: 0 }}
            >
              {/* Ring */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  padding: 2,
                  margin: '0 auto 6px',
                  background: hasUnseen
                    ? 'linear-gradient(135deg,#d59056,#f4c78f,#c97a6e)'
                    : '#d6c9ba',
                  transition: 'background .3s',
                }}
              >
                {/* Avatar: try thumbnail, fallback to initials */}
                {group.items[group.items.length - 1]?.thumbUrl ? (
                  <img
                    src={group.items[group.items.length - 1].thumbUrl}
                    alt={group.author}
                    style={{
                      width: '100%', height: '100%',
                      borderRadius: '50%', objectFit: 'cover',
                      border: '2px solid #fff4e6',
                      background: avatarBg(group.author),
                    }}
                    onError={e => {
                      // fallback to initials on broken image
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                      const parent = e.currentTarget.parentElement
                      if (parent && !parent.querySelector('.story-initials')) {
                        const el = document.createElement('div')
                        el.className = 'story-initials'
                        el.textContent = getInitials(group.author)
                        el.style.cssText = `
                          width:100%;height:100%;border-radius:50%;
                          background:${avatarBg(group.author)};
                          display:grid;place-items:center;
                          color:#fff;font-weight:700;font-size:18px;
                          border:2px solid #fff4e6;
                        `
                        parent.appendChild(el)
                      }
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%', height: '100%',
                      borderRadius: '50%',
                      background: avatarBg(group.author),
                      display: 'grid', placeItems: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 18,
                      border: '2px solid #fff4e6',
                      fontFamily: "'Cormorant Garamond', serif",
                    }}
                  >
                    {getInitials(group.author)}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: hasUnseen ? '#5c3410' : '#8a6642',
                  fontWeight: hasUnseen ? 700 : 400,
                  maxWidth: 72,
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}
              >
                {group.author}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Fullscreen viewer ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && activeGroup && activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: 'rgba(0,0,0,.97)',
            }}
          >
            <motion.div
              key={`${authorIdx}-${storyIdx}`}
              initial={{ opacity: 0, scale: .97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Progress bars */}
              <div style={{ padding: '14px 12px 0' }}>
                <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
                  {activeGroup.items.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        flex: 1, height: 2.5,
                        background: 'rgba(255,255,255,.25)',
                        borderRadius: 99, overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${idx < storyIdx ? 100 : idx === storyIdx ? progress : 0}%`,
                          height: '100%',
                          background: '#fff',
                          transition: idx === storyIdx ? 'width .1s linear' : 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Header row */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', color: '#fff',
                    paddingBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Inline avatar */}
                    <div
                      style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: avatarBg(activeGroup.author),
                        display: 'grid', placeItems: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 13,
                        border: '1.5px solid rgba(255,255,255,.6)',
                        flexShrink: 0,
                        fontFamily: "'Cormorant Garamond', serif",
                      }}
                    >
                      {getInitials(activeGroup.author)}
                    </div>
                    <div>
                      <strong style={{ fontSize: 14 }}>{activeGroup.author}</strong>
                      {paused && (
                        <span
                          style={{
                            marginLeft: 8, fontSize: 11,
                            color: 'rgba(255,255,255,.6)',
                            fontStyle: 'italic',
                          }}
                        >
                          pausado
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      background: 'rgba(255,255,255,.12)',
                      border: '1px solid rgba(255,255,255,.2)',
                      borderRadius: '50%',
                      color: '#fff', fontSize: 18,
                      width: 36, height: 36,
                      cursor: 'pointer', display: 'grid', placeItems: 'center',
                    }}
                    aria-label="Fechar"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Media area */}
              <div
                style={{
                  position: 'relative', flex: 1,
                  display: 'grid', placeItems: 'center',
                  padding: '0 8px 8px',
                  overflow: 'hidden',
                }}
              >
                {activeStory.type === 'video' ? (
                  <video
                    key={activeStory.id}
                    src={activeStory.fullUrl}
                    autoPlay
                    muted
                    playsInline
                    controls
                    style={{
                      width: 'min(96vw, 920px)',
                      height: 'min(72dvh, 920px)',
                      maxHeight: 'calc(100dvh - 180px)',
                      borderRadius: 16, objectFit: 'contain',
                    }}
                  />
                ) : activeStory.type === 'audio' ? (
                  <div
                    style={{
                      textAlign: 'center', color: '#fff',
                      width: 'min(92vw, 460px)', maxWidth: '100%',
                    }}
                  >
                    <div style={{ fontSize: 64, marginBottom: 16 }}>🎙️</div>
                    <audio
                      key={activeStory.id}
                      src={activeStory.fullUrl}
                      autoPlay
                      controls
                      style={{ width: '100%' }}
                    />
                  </div>
                ) : (
                  <img
                    key={activeStory.id}
                    src={activeStory.fullUrl}
                    srcSet={`${activeStory.thumbUrl} 720w, ${activeStory.fullUrl} 1600w`}
                    sizes="(max-width: 768px) 96vw, (max-width: 1280px) 82vw, 920px"
                    alt={activeStory.author}
                    loading="eager"
                    decoding="async"
                    style={{
                      width: 'min(96vw, 920px)',
                      height: 'min(72dvh, 920px)',
                      maxHeight: 'calc(100dvh - 180px)',
                      borderRadius: 16, objectFit: 'contain',
                      background: '#111',
                    }}
                  />
                )}

                {/* Caption overlay */}
                {activeStory.caption && (
                  <div
                    style={{
                      position: 'absolute', left: 16, right: 16, bottom: 16,
                      color: '#fff',
                      textShadow: '0 2px 10px rgba(0,0,0,.7)',
                      fontSize: 15, lineHeight: 1.45,
                      background: 'rgba(0,0,0,.35)',
                      backdropFilter: 'blur(4px)',
                      borderRadius: 10, padding: '8px 12px',
                    }}
                  >
                    {activeStory.caption}
                  </div>
                )}

                {/* Tap zones (left / right) */}
                <button
                  onClick={prevStory}
                  style={{
                    position: 'absolute', left: 0, top: 0,
                    width: '30%', height: '100%',
                    border: 0, background: 'transparent', cursor: 'pointer',
                  }}
                  aria-label="Story anterior"
                />
                <button
                  onClick={togglePause}
                  style={{
                    position: 'absolute', left: '30%', top: 0,
                    width: '40%', height: '100%',
                    border: 0, background: 'transparent', cursor: 'pointer',
                  }}
                  aria-label={paused ? 'Retomar story' : 'Pausar story'}
                />
                <button
                  onClick={nextStory}
                  style={{
                    position: 'absolute', right: 0, top: 0,
                    width: '30%', height: '100%',
                    border: 0, background: 'transparent', cursor: 'pointer',
                  }}
                  aria-label="Próximo story"
                />
              </div>

              {/* Swipe hint (first open only) */}
              <div
                style={{
                  textAlign: 'center', color: 'rgba(255,255,255,.3)',
                  fontSize: 11, paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
                  letterSpacing: 1,
                }}
              >
                ← deslize para navegar · segure para pausar →
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
