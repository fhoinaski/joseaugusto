'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { REACTION_EMOJIS } from '@/lib/config'

interface MediaItem {
  id: string
  thumbUrl: string
  fullUrl: string
  imageSources?: {
    w320?: string
    w640?: string
    w1080?: string
  }
  author: string
  type: 'image' | 'video' | 'audio'
  reactions: Record<string, number>
}

// REACTION_EMOJIS imported from @/lib/config

function ReactionBar({ item, onReact }: { item: MediaItem; onReact: (id: string, emoji: string) => void }) {
  const hasAny = REACTION_EMOJIS.some(e => (item.reactions[e] ?? 0) > 0)
  if (!hasAny) return null

  return (
    <div className="reaction-bar" onClick={e => e.stopPropagation()}>
      {REACTION_EMOJIS.filter(e => (item.reactions[e] ?? 0) > 0).map(emoji => (
        <button key={emoji} className="reaction-pill" onClick={() => onReact(item.id, emoji)}>
          {emoji} <span>{item.reactions[emoji]}</span>
        </button>
      ))}
    </div>
  )
}

function Carousel3D({ items, onOpenLightbox }: { items: MediaItem[]; onOpenLightbox: (idx: number) => void }) {
  const [current, setCurrent] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const dragStart = useRef<number | null>(null)
  const touchStart = useRef<number | null>(null)
  const total = items.length

  useEffect(() => {
    if (!autoplay || total < 2) return
    const t = setInterval(() => setCurrent(c => (c + 1) % total), 3200)
    return () => clearInterval(t)
  }, [autoplay, total])

  const go = (n: number) => {
    setCurrent(c => (c + n + total) % total)
    setAutoplay(false)
    setTimeout(() => setAutoplay(true), 8000)
  }

  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return
    const diff = touchStart.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) go(diff > 0 ? 1 : -1)
    touchStart.current = null
  }

  const onMouseDown = (e: React.MouseEvent) => { dragStart.current = e.clientX }
  const onMouseUp = (e: React.MouseEvent) => {
    if (dragStart.current === null) return
    const diff = dragStart.current - e.clientX
    if (Math.abs(diff) > 40) go(diff > 0 ? 1 : -1)
    dragStart.current = null
  }

  if (total === 0) return null

  const getTransform = (i: number) => {
    const offset = ((i - current) + total) % total
    const norm = offset <= total / 2 ? offset : offset - total
    const angle = norm * (360 / Math.max(total, 5))
    const radius = Math.min(320, Math.max(180, total * 55))
    return `rotateY(${angle}deg) translateZ(${radius}px)`
  }

  const getZIndex = (i: number) => {
    const offset = ((i - current) + total) % total
    const norm = offset <= total / 2 ? offset : offset - total
    return 100 - Math.abs(norm) * 10
  }

  const getOpacity = (i: number) => {
    const offset = ((i - current) + total) % total
    const norm = Math.abs(offset <= total / 2 ? offset : offset - total)
    return norm === 0 ? 1 : norm === 1 ? 0.85 : norm === 2 ? 0.55 : 0.25
  }

  const maxDots = Math.min(total, 7)
  const dotStart = Math.max(0, Math.min(current - 3, total - maxDots))

  return (
    <div>
      <div className="carousel-wrap" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onMouseDown={onMouseDown} onMouseUp={onMouseUp}>
        <div className="carousel-stage">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`c-card${i === current ? ' active-card' : ''}`}
              style={{ transform: getTransform(i), zIndex: getZIndex(i), opacity: getOpacity(i) }}
              onClick={() => {
                if (i === current) onOpenLightbox(i)
                else go(((i - current) + total) % total <= total / 2 ? 1 : -1)
              }}
            >
              {item.type === 'audio'
                ? <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#f5ede0,#e8d4b8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 }}>
                    <span style={{ fontSize: '2.5rem' }}>🎙️</span>
                    <audio src={item.fullUrl} controls style={{ width: '90%', maxWidth: 200 }}/>
                  </div>
                : <img src={item.thumbUrl || item.imageSources?.w640 || item.fullUrl} alt={item.author} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = item.fullUrl }} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
              }
              {item.type === 'video' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', boxShadow: '0 4px 16px rgba(0,0,0,.3)' }}>▶</div>
                </div>
              )}
              <div className="c-card-overlay">
                <p className="c-card-author">{item.type === 'video' ? '🎥' : item.type === 'audio' ? '🎙️' : '📷'} {item.author}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="carousel-controls">
        <button className="c-nav" onClick={() => go(-1)} aria-label="Anterior">‹</button>
        <div className="c-dots">
          {Array.from({ length: maxDots }, (_, i) => dotStart + i).map(i => (
            <button key={i} className={`c-dot${i === current ? ' active' : ''}`} onClick={() => { setCurrent(i); setAutoplay(false); setTimeout(() => setAutoplay(true), 8000) }}/>
          ))}
        </div>
        <button className="c-nav" onClick={() => go(1)} aria-label="Proximo">›</button>
      </div>
      <p className="c-counter" style={{ textAlign: 'center', marginTop: 8 }}>{current + 1} / {total}</p>
    </div>
  )
}

export default function MediaGallery({
  loading,
  media,
  showAll,
  setShowAll,
  setLbIdx,
  handleReact,
  sentinelRef,
}: {
  loading: boolean
  media: MediaItem[]
  showAll: boolean
  setShowAll: (value: boolean) => void
  setLbIdx: (index: number) => void
  handleReact: (id: string, emoji: string) => void
  sentinelRef: React.RefObject<HTMLDivElement>
}) {
  const carouselItems = useMemo(() => media.slice(0, 12), [media])

  return (
    <section className="carousel-section reveal" id="galeria">
      <div className="carousel-header">
        <p className="section-label">✦ Album ao vivo ✦</p>
        <h2 className="section-title">Momentos <em>especiais</em></h2>
      </div>

      {loading && (
        <div style={{ padding: '0 16px' }}>
          <div className="skel-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skel-item"/>)}</div>
        </div>
      )}

      {!loading && media.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-md)', fontStyle: 'italic' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📷</div>
          <p style={{ fontWeight: 600 }}>As fotos aparecerao aqui assim que forem enviadas.</p>
        </div>
      )}

      {!loading && media.length > 0 && !showAll && (
        <>
          <Carousel3D items={carouselItems} onOpenLightbox={setLbIdx}/>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button className="view-all-btn" onClick={() => setShowAll(true)}>
              ⊞ Ver todas as {media.length} fotos
            </button>
          </div>
        </>
      )}

      {!loading && media.length > 0 && showAll && (
        <div className="grid-section">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <button className="view-all-btn" onClick={() => setShowAll(false)}>
              ↩ Voltar ao carrossel
            </button>
          </div>
          <div className="gallery-grid">
            {media.map((item, i) => (
              <div
                key={item.id}
                className="gallery-card"
                style={{ animationDelay: `${Math.min(i, 7) * 35}ms` }}
                onClick={() => setLbIdx(i)}
              >
                <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
                  <img src={item.thumbUrl || item.imageSources?.w640 || item.fullUrl} alt={item.author} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = item.fullUrl }} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                  {item.type === 'video' && (
                    <>
                      <div className="gallery-card-type">▶ Video</div>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>▶</div>
                      </div>
                    </>
                  )}
                  {item.type === 'audio' && <div className="gallery-card-type">🎙 Audio</div>}
                </div>
                <div className="gallery-card-footer"><span className="gallery-card-author">{item.type === 'video' ? '🎥' : item.type === 'audio' ? '🎙️' : '📷'} {item.author}</span></div>
                <div className="gallery-inline-actions" onClick={e => e.stopPropagation()}>
                  <button className="gallery-inline-btn" onClick={() => handleReact(item.id, '♥')}>👍 Curtir</button>
                  <Link className="gallery-inline-btn" href="/feed">💬 Comentar</Link>
                </div>
                <ReactionBar item={item} onReact={handleReact}/>
              </div>
            ))}
          </div>
          <div ref={sentinelRef} style={{ height: 40 }}/>
        </div>
      )}
    </section>
  )
}
