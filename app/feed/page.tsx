'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  try {
    return JSON.parse(localStorage.getItem(`cha_reacted_${id}`) ?? '[]')
  } catch {
    return []
  }
}

function markReacted(id: string, emoji: string) {
  const reacted = getReacted(id)
  if (!reacted.includes(emoji)) {
    localStorage.setItem(`cha_reacted_${id}`, JSON.stringify([...reacted, emoji]))
  }
}

export default function FeedPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [manualKey, setManualKey] = useState('')
  const [keyError, setKeyError] = useState('')
  const { canWrite, geoStatus, unlockWithKey } = useGeoAccess()

  const fetchMedia = useCallback(async () => {
    const data = await fetchJsonSafe<{ media?: MediaItem[] }>('/api/photos', {})
    setMedia(Array.isArray(data.media) ? data.media : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMedia()
    let fallback: ReturnType<typeof setInterval> | null = null

    const startFallback = () => {
      if (fallback) return
      fallback = setInterval(() => {
        if (document.visibilityState === 'visible') fetchMedia()
      }, 45000)
    }

    if (typeof EventSource === 'undefined') {
      startFallback()
      return () => { if (fallback) clearInterval(fallback) }
    }

    const es = new EventSource('/api/stream')
    const onChange = () => {
      if (document.visibilityState === 'visible') fetchMedia()
    }
    const onReaction = (e: Event) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as { mediaId?: string; emoji?: string }
        if (!payload.mediaId || !payload.emoji) return
        setMedia(prev => prev.map(item => item.id === payload.mediaId
          ? {
              ...item,
              reactions: {
                ...item.reactions,
                [payload.emoji!]: (item.reactions[payload.emoji!] ?? 0) + 1,
              },
            }
          : item,
        ))
      } catch {}
    }

    es.addEventListener('new-photo', onChange)
    es.addEventListener('reaction-update', onReaction)
    es.addEventListener('comment-update', onChange)
    es.onerror = () => startFallback()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchMedia()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      es.close()
      document.removeEventListener('visibilitychange', onVisibility)
      if (fallback) clearInterval(fallback)
    }
  }, [fetchMedia])

  const storiesItems = useMemo(() => media.slice(0, 30), [media])

  const unlock = async () => {
    if (!manualKey.trim()) return
    const valid = await unlockWithKey(manualKey)
    if (valid) {
      setKeyError('')
      setManualKey('')
      return
    }
    setKeyError('Chave invalida')
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
      await fetch('/api/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, emoji }),
      })
    } catch {}
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0f0d0b', color: '#e8d9c4', display: 'grid', placeItems: 'center', fontFamily: "'Cormorant Garamond', serif" }}>
        Carregando feed...
      </div>
    )
  }

  if (media.length === 0) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0f0d0b', color: '#e8d9c4', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, fontFamily: "'Cormorant Garamond', serif" }}>
        <div>
          <p style={{ fontSize: 54, margin: 0 }}>📷</p>
          <p>Nenhum conteudo no feed ainda.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0f0d0b', color: '#fff' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 120, backdropFilter: 'blur(10px)', background: 'rgba(15,13,11,.55)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 6px' }}>
          <strong style={{ letterSpacing: '.08em', fontFamily: "'Playfair Display', serif" }}>FEED AO VIVO</strong>
        </div>
        <Stories items={storiesItems} />
      </header>

      <main style={{ height: '100dvh', overflowY: 'auto', scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', paddingTop: 124, paddingBottom: 'max(96px, calc(84px + env(safe-area-inset-bottom)))' }}>
        {!canWrite && (
          <section style={{ margin: '10px 12px', padding: 12, borderRadius: 12, border: '1px solid rgba(245,199,143,.45)', background: 'rgba(18,15,12,.75)', color: '#f5dab6' }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              {geoStatus === 'observer' ? 'Modo observador: comentarios e posts bloqueados fora da area do evento.' : 'Ative acesso por chave para comentar.'}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') unlock() }}
                placeholder="Chave de acesso"
                style={{ flex: 1, borderRadius: 999, border: '1px solid rgba(245,199,143,.4)', background: 'rgba(255,255,255,.08)', color: '#fff', padding: '8px 12px' }}
              />
              <button onClick={unlock} style={{ borderRadius: 999, border: '1px solid rgba(245,199,143,.55)', background: 'rgba(245,199,143,.18)', color: '#fff', padding: '8px 14px', cursor: 'pointer' }}>
                Liberar
              </button>
            </div>
            {keyError && <p style={{ margin: '6px 2px 0', fontSize: 12, color: '#ffb6a7' }}>{keyError}</p>}
          </section>
        )}
        {media.map(item => (
          <FeedItem key={item.id} item={item} onLike={like} canWrite={canWrite} />
        ))}
      </main>
    </div>
  )
}
