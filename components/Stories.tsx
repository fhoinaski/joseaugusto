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
  if (item.type === 'video') return 8
  if (item.type === 'audio') return 6
  return 4
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
  const [userId, setUserId] = useState('')
  const timerRef = useRef<number | null>(null)

  const activeGroup = groups[authorIdx]
  const activeStory = activeGroup?.items[storyIdx]

  useEffect(() => {
    const id = getOrCreateUserId()
    setUserId(id)
    fetch(`/api/stories/seen?user_id=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(data => {
        const raw = Array.isArray(data.seen) ? data.seen : []
        setSeen(new Set(raw.map((v: unknown) => String(v))))
      })
      .catch(() => {})
  }, [])

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
      setProgress(prev => {
        if (prev + step >= 100) {
          nextStory()
          return 100
        }
        return prev + step
      })
    }, 100)

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [open, activeStory?.id, userId])

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

  if (groups.length === 0) return null

  return (
    <>
      <div style={{ padding: '10px 12px 12px', overflowX: 'auto', display: 'flex', gap: 12, borderBottom: '1px solid #eadcc7', background: '#f9f3eb' }}>
        {groups.map((group, idx) => {
          const hasUnseen = group.items.some(item => !seen.has(item.id))
          return (
            <button
              key={group.author}
              onClick={() => openAuthor(idx)}
              style={{ border: 'none', background: 'transparent', minWidth: 74, cursor: 'pointer', padding: 0 }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  padding: 2,
                  margin: '0 auto 6px',
                  background: hasUnseen ? 'linear-gradient(135deg,#d59056,#f4c78f)' : '#d6c9ba',
                }}
              >
                <img
                  src={group.items[group.items.length - 1]?.thumbUrl || group.items[group.items.length - 1]?.fullUrl}
                  alt={group.author}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff4e6' }}
                />
              </div>
              <span style={{ fontSize: 12, color: '#5c3410', maxWidth: 74, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {group.author}
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {open && activeGroup && activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.96)' }}
          >
            <motion.div
              initial={{ y: 20, opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ padding: '14px 12px 10px' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {activeGroup.items.map((item, idx) => (
                    <div key={item.id} style={{ flex: 1, height: 3, background: 'rgba(255,255,255,.28)', borderRadius: 99, overflow: 'hidden' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
                  <strong>{activeGroup.author}</strong>
                  <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 0, color: '#fff', fontSize: 24, cursor: 'pointer' }}>×</button>
                </div>
              </div>

              <div style={{ position: 'relative', flex: 1, display: 'grid', placeItems: 'center', padding: '0 10px 14px' }}>
                {activeStory.type === 'video' ? (
                  <div style={{ width: 'min(96vw, 920px)', height: 'min(76vh, 920px)', display: 'grid', placeItems: 'center' }}>
                    <video src={activeStory.fullUrl} autoPlay muted playsInline controls style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', borderRadius: 14, objectFit: 'contain' }} />
                  </div>
                ) : activeStory.type === 'audio' ? (
                  <div style={{ textAlign: 'center', color: '#fff', width: 'min(92vw, 460px)', maxWidth: '100%' }}>
                    <div style={{ fontSize: 56, marginBottom: 14 }}>🎙️</div>
                    <audio src={activeStory.fullUrl} autoPlay controls style={{ width: '100%' }} />
                  </div>
                ) : (
                  <div style={{ width: 'min(96vw, 920px)', height: 'min(76vh, 920px)', display: 'grid', placeItems: 'center' }}>
                    <img
                      src={activeStory.fullUrl}
                      srcSet={`${activeStory.thumbUrl} 720w, ${activeStory.fullUrl} 1600w`}
                      sizes="(max-width: 768px) 96vw, (max-width: 1280px) 82vw, 920px"
                      alt={activeStory.author}
                      loading="eager"
                      decoding="async"
                      style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', borderRadius: 14, objectFit: 'contain', background: '#111' }}
                    />
                  </div>
                )}

                {activeStory.caption && (
                  <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,.6)', fontSize: 15 }}>
                    {activeStory.caption}
                  </div>
                )}

                <button onClick={prevStory} style={{ position: 'absolute', left: 0, top: 0, width: '32%', height: '100%', border: 0, background: 'transparent', cursor: 'pointer' }} aria-label="Story anterior" />
                <button onClick={nextStory} style={{ position: 'absolute', right: 0, top: 0, width: '32%', height: '100%', border: 0, background: 'transparent', cursor: 'pointer' }} aria-label="Próximo story" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
