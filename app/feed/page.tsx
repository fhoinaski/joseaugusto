'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, useRouter } from 'next/navigation'
import FeedItem, { FeedMediaItem } from '@/components/FeedItem'
import Stories from '@/components/Stories'
import { useGeoAccess } from '@/components/GeoAccessProvider'

type MediaItem = FeedMediaItem

async function fetchJsonSafe<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url)
    const text = await res.text()
    if (!text) return fallback
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

function getReacted(id: string): string[] {
  try { return JSON.parse(localStorage.getItem(`cha_reacted_${id}`) ?? '[]') } catch { return [] }
}
function markReacted(id: string, emoji: string) {
  const reacted = getReacted(id)
  if (!reacted.includes(emoji)) localStorage.setItem(`cha_reacted_${id}`, JSON.stringify([...reacted, emoji]))
}

function FeedPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const authorFilter = searchParams.get('author') ?? ''
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [manualKey, setManualKey] = useState('')
  const [keyError, setKeyError] = useState('')
  const [headerHeight, setHeaderHeight] = useState(132)
  const [isDesktop, setIsDesktop] = useState(false)
  const [newCount, setNewCount] = useState(0)           // ← pill counter
  const headerRef = useRef<HTMLElement | null>(null)
  const mainRef = useRef<HTMLElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingMoreRef = useRef(false)
  const { canWrite, geoStatus, unlockWithKey } = useGeoAccess()
  const bottomNavInset = 'max(96px, calc(84px + env(safe-area-inset-bottom)))'

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const sync = () => { const h = Math.ceil(el.getBoundingClientRect().height); if (h > 0) setHeaderHeight(h) }
    sync()
    const obs = new ResizeObserver(sync)
    obs.observe(el)
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    return () => { obs.disconnect(); window.removeEventListener('resize', sync); window.removeEventListener('orientationchange', sync) }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const fetchMedia = useCallback(async (cursor?: string) => {
    if (cursor) {
      if (loadingMoreRef.current) return
      loadingMoreRef.current = true
      setLoadingMore(true)
    }
    const url = cursor
      ? `/api/photos?cursor=${encodeURIComponent(cursor)}&limit=20`
      : '/api/photos?limit=20'
    const data = await fetchJsonSafe<{ media?: MediaItem[]; nextCursor?: string | null }>(url, {})
    const incoming = Array.isArray(data.media) ? data.media : []
    if (cursor) {
      setMedia(prev => { const map = new Map(prev.map(i => [i.id, i])); for (const i of incoming) map.set(i.id, i); return Array.from(map.values()) })
    } else {
      setMedia(incoming)
      setLoading(false)
    }
    setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null)
    if (cursor) { setLoadingMore(false); loadingMoreRef.current = false }
  }, [])

  // Load and also reset the new-content counter
  const loadFresh = useCallback(() => {
    setNewCount(0)
    fetchMedia()
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [fetchMedia])

  useEffect(() => {
    fetchMedia()
    let fallback: ReturnType<typeof setInterval> | null = null
    const startFallback = () => {
      if (fallback) return
      fallback = setInterval(() => { if (document.visibilityState === 'visible') setNewCount(n => n + 1) }, 45000)
    }

    if (typeof EventSource === 'undefined') {
      startFallback()
      return () => { if (fallback) clearInterval(fallback) }
    }

    const es = new EventSource('/api/stream')

    // New photo → increment pill instead of auto-reload
    es.addEventListener('new-photo', () => {
      if (document.visibilityState === 'visible') setNewCount(n => n + 1)
    })

    // Reactions → update in place (no reload needed)
    es.addEventListener('reaction-update', (e: Event) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as { mediaId?: string; emoji?: string }
        if (!payload.mediaId || !payload.emoji) return
        setMedia(prev => prev.map(item => item.id === payload.mediaId
          ? { ...item, reactions: { ...item.reactions, [payload.emoji!]: (item.reactions[payload.emoji!] ?? 0) + 1 } }
          : item,
        ))
      } catch {}
    })

    es.onerror = () => startFallback()

    const onVisibility = () => { if (document.visibilityState === 'visible') setNewCount(n => n + 1) }
    document.addEventListener('visibilitychange', onVisibility)

    return () => { es.close(); document.removeEventListener('visibilitychange', onVisibility); if (fallback) clearInterval(fallback) }
  }, [fetchMedia])

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = mainRef.current
    if (!sentinel || !root || !nextCursor) return
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) fetchMedia(nextCursor) },
      { root, rootMargin: '300px 0px', threshold: 0.01 },
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [fetchMedia, nextCursor])

  const filteredMedia = useMemo(() => {
    let result = authorFilter ? media.filter(m => m.author === authorFilter) : media
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(m =>
        m.author.toLowerCase().includes(q) ||
        (m.caption ?? '').toLowerCase().includes(q)
      )
    }
    return result
  }, [media, authorFilter, searchQuery])
  const storiesItems = useMemo(() => media.slice(0, 30), [media])

  const unlock = async () => {
    if (!manualKey.trim()) return
    const valid = await unlockWithKey(manualKey)
    if (valid) { setKeyError(''); setManualKey('') } else setKeyError('Chave inválida')
  }

  const like = useCallback(async (id: string, selectedEmoji?: string) => {
    const emoji = selectedEmoji ?? '♥'
    if (getReacted(id).includes(emoji)) return
    markReacted(id, emoji)
    setMedia(prev => prev.map(item => item.id === id
      ? { ...item, reactions: { ...item.reactions, [emoji]: (item.reactions[emoji] ?? 0) + 1 } }
      : item,
    ))
    try {
      await fetch('/api/react', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, emoji }) })
    } catch {}
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0f0d0b', color: '#e8d9c4', display: 'grid', placeItems: 'center', fontFamily: "'Cormorant Garamond', serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>📷</div>
          <p>Carregando feed...</p>
        </div>
      </div>
    )
  }

  if (media.length === 0) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0f0d0b', color: '#e8d9c4', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, fontFamily: "'Cormorant Garamond', serif" }}>
        <div><p style={{ fontSize: 54, margin: 0 }}>📷</p><p>Nenhum conteúdo no feed ainda.</p></div>
      </div>
    )
  }

  const feedTopPadding = headerHeight + 14
  const feedViewportHeight = isDesktop ? 'min(74dvh, 760px)' : `calc(100dvh - ${feedTopPadding}px - ${bottomNavInset})`

  return (
    <div style={{ minHeight: '100dvh', background: '#0f0d0b', color: '#fff' }}>
      <header ref={headerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 120, background: '#f9f3eb' }}>
        <Stories items={storiesItems} />
      </header>

      {/* ── New-content pill ─────────────────────────────────────────── */}
      <AnimatePresence>
        {newCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -16, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            onClick={loadFresh}
            style={{
              position: 'fixed',
              top: headerHeight + 14,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 200,
              background: 'linear-gradient(135deg, #3e2408, #7a4e28)',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '9px 20px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0,0,0,.55)',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontFamily: "'Cormorant Garamond', serif",
              letterSpacing: '.04em',
              whiteSpace: 'nowrap',
            }}
            aria-label={`Ver ${newCount} nova${newCount !== 1 ? 's' : ''} foto${newCount !== 1 ? 's' : ''}`}
          >
            <span style={{ fontSize: 15 }}>▲</span>
            {newCount === 1 ? '1 nova foto' : `${newCount} novas fotos`}
          </motion.button>
        )}
      </AnimatePresence>

      <main
        ref={mainRef}
        className="feed-scroll-shell"
        style={{
          height: '100dvh',
          overflowY: 'auto',
          scrollSnapType: isDesktop ? 'none' : 'y mandatory',
          scrollPaddingTop: feedTopPadding,
          WebkitOverflowScrolling: 'touch',
          paddingTop: feedTopPadding,
          paddingBottom: bottomNavInset,
        }}
      >
        {/* Author filter chip */}
        {authorFilter && (
          <div style={{ margin: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'rgba(212,160,86,.25)', border: '1px solid rgba(212,160,86,.5)', borderRadius: 999, padding: '6px 14px', fontSize: 13, color: '#f5c78f', display: 'flex', alignItems: 'center', gap: 8 }}>
              📷 Fotos de <strong>{authorFilter}</strong>
              <button
                onClick={() => router.push('/feed')}
                style={{ background: 'none', border: 'none', color: '#f5c78f', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
                aria-label="Limpar filtro"
              >×</button>
            </span>
            {filteredMedia.length === 0 && !loading && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', fontStyle: 'italic' }}>Nenhuma foto encontrada</span>
            )}
          </div>
        )}

        {/* Search bar */}
        <div style={{ padding: '8px 12px 4px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 14, fontSize: '1rem', pointerEvents: 'none', color: 'rgba(255,255,255,.4)' }}>🔍</span>
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou legenda…"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 999,
                padding: '10px 16px 10px 40px',
                color: '#f5dab6',
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: '1rem',
                outline: 'none',
                caretColor: '#d59056',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1, padding: 4 }}
                aria-label="Limpar busca"
              >×</button>
            )}
          </div>
          {searchQuery.trim() && (
            <p style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.35)', margin: '6px 4px 0', fontStyle: 'italic' }}>
              {filteredMedia.length === 0
                ? 'Nenhuma foto encontrada'
                : `${filteredMedia.length} foto${filteredMedia.length !== 1 ? 's' : ''} encontrada${filteredMedia.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>

        {!canWrite && (
          <section style={{ margin: '10px 12px', padding: 12, borderRadius: 12, border: '1px solid rgba(245,199,143,.45)', background: 'rgba(18,15,12,.75)', color: '#f5dab6' }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              {geoStatus === 'observer'
                ? '📍 Modo observador — comentários bloqueados fora do evento.'
                : '🔑 Use uma chave de acesso para comentar.'}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                value={manualKey}
                onChange={e => setManualKey(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') unlock() }}
                placeholder="Chave de acesso"
                style={{ flex: 1, borderRadius: 999, border: '1px solid rgba(245,199,143,.4)', background: 'rgba(255,255,255,.08)', color: '#fff', padding: '8px 12px', outline: 'none' }}
              />
              <button onClick={unlock} style={{ borderRadius: 999, border: '1px solid rgba(245,199,143,.55)', background: 'rgba(245,199,143,.18)', color: '#fff', padding: '8px 14px', cursor: 'pointer' }}>
                Liberar
              </button>
            </div>
            {keyError && <p style={{ margin: '6px 2px 0', fontSize: 12, color: '#ffb6a7' }}>{keyError}</p>}
          </section>
        )}

        {filteredMedia.map(item => (
          <FeedItem key={item.id} item={item} onLike={like} canWrite={canWrite} viewportHeight={feedViewportHeight} />
        ))}

        <div ref={sentinelRef} style={{ height: 12 }} />
        {loadingMore && (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)', fontSize: 12, padding: '10px 0 14px' }}>
            Carregando mais fotos...
          </p>
        )}
      </main>
    </div>
  )
}

export default function FeedPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', background: '#0f0d0b', color: '#e8d9c4', display: 'grid', placeItems: 'center', fontFamily: "'Cormorant Garamond', serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>📷</div>
          <p>Carregando feed...</p>
        </div>
      </div>
    }>
      <FeedPageInner />
    </Suspense>
  )
}
