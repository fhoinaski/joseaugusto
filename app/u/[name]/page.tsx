'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

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

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
  } catch {
    return iso
  }
}

interface LightboxProps {
  item: MediaItem
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
}

function Lightbox({ item, onClose, onPrev, onNext, hasPrev, hasNext }: LightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(10,4,0,.92)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,.12)', border: 'none',
          color: '#fff', fontSize: '1.4rem', borderRadius: '50%',
          width: 40, height: 40, cursor: 'pointer', zIndex: 10,
          display: 'grid', placeItems: 'center',
        }}
        aria-label="Fechar"
      >
        ✕
      </button>

      {/* Prev */}
      {hasPrev && (
        <button
          onClick={e => { e.stopPropagation(); onPrev() }}
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,.12)', border: 'none',
            color: '#fff', fontSize: '1.4rem', borderRadius: '50%',
            width: 44, height: 44, cursor: 'pointer', zIndex: 10,
            display: 'grid', placeItems: 'center',
          }}
          aria-label="Anterior"
        >
          ‹
        </button>
      )}

      {/* Next */}
      {hasNext && (
        <button
          onClick={e => { e.stopPropagation(); onNext() }}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,.12)', border: 'none',
            color: '#fff', fontSize: '1.4rem', borderRadius: '50%',
            width: 44, height: 44, cursor: 'pointer', zIndex: 10,
            display: 'grid', placeItems: 'center',
          }}
          aria-label="Próxima"
        >
          ›
        </button>
      )}

      {/* Media */}
      <div
        style={{ maxWidth: '90vw', maxHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={e => e.stopPropagation()}
      >
        {item.type === 'video' ? (
          <video
            src={item.fullUrl}
            controls
            autoPlay
            playsInline
            style={{ maxWidth: '90vw', maxHeight: '70vh', borderRadius: 12, background: '#000' }}
          />
        ) : (
          <img
            src={item.fullUrl}
            alt={item.caption ?? item.author}
            style={{ maxWidth: '90vw', maxHeight: '70vh', borderRadius: 12, objectFit: 'contain', display: 'block' }}
          />
        )}
      </div>

      {/* Caption area */}
      <div
        style={{
          marginTop: 16, padding: '12px 20px', textAlign: 'center',
          maxWidth: 480, color: '#f5dab6',
        }}
        onClick={e => e.stopPropagation()}
      >
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>
          {item.author}
        </p>
        {item.caption && (
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', color: 'rgba(245,218,182,.75)', fontStyle: 'italic' }}>
            {item.caption}
          </p>
        )}
        <p style={{ fontSize: '.78rem', color: 'rgba(245,218,182,.45)', marginTop: 6 }}>
          {formatDate(item.createdAt)}
        </p>
      </div>
    </div>
  )
}

export default function GuestProfilePage() {
  const params = useParams()
  const rawName = params?.name
  const name = decodeURIComponent(Array.isArray(rawName) ? rawName[0] : rawName ?? '')

  const [photos, setPhotos] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)

  const fetchPhotos = useCallback(async () => {
    try {
      // Try fetching all approved and filter client-side (photos API doesn't support author filter)
      const res = await fetch('/api/photos?limit=50')
      const data = await res.json() as { media?: MediaItem[]; nextCursor?: string | null }
      let all: MediaItem[] = Array.isArray(data.media) ? data.media : []

      // If there's more, keep paginating
      let cursor = data.nextCursor
      while (cursor) {
        const r2 = await fetch(`/api/photos?limit=50&cursor=${cursor}`)
        const d2 = await r2.json() as { media?: MediaItem[]; nextCursor?: string | null }
        const batch = Array.isArray(d2.media) ? d2.media : []
        all = [...all, ...batch]
        cursor = d2.nextCursor ?? null
      }

      setPhotos(all.filter(m => m.author === name && m.type !== 'audio'))
    } catch {
      setPhotos([])
    } finally {
      setLoading(false)
    }
  }, [name])

  useEffect(() => { fetchPhotos() }, [fetchPhotos])

  const reactions = photos.reduce((acc, p) => acc + totalReactions(p.reactions), 0)

  const downloadMyPhotos = async () => {
    if (downloading || !name) return
    setDownloading(true)
    try {
      const res = await fetch(`/api/download/minhas-fotos?author=${encodeURIComponent(name)}`)
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        alert(err.error ?? 'Erro ao baixar fotos.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'minhas-fotos-cha-jose-augusto.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch {
      alert('Não foi possível baixar. Tente novamente.')
    } finally {
      setDownloading(false)
    }
  }

  const openLightbox = (i: number) => setLightboxIndex(i)
  const closeLightbox = () => setLightboxIndex(null)
  const prevPhoto = () => setLightboxIndex(i => (i !== null && i > 0 ? i - 1 : i))
  const nextPhoto = () => setLightboxIndex(i => (i !== null && i < photos.length - 1 ? i + 1 : i))

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--warm)', paddingBottom: 100 }}>
      {/* Back link */}
      <div style={{ padding: '16px 16px 0' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--bl)', textDecoration: 'none',
            fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem',
          }}
        >
          ← Voltar
        </Link>
      </div>

      {/* Profile header */}
      <div style={{ padding: '24px 20px 20px', textAlign: 'center' }}>
        {/* Avatar */}
        <div
          style={{
            width: 88, height: 88, borderRadius: '50%',
            background: name ? avatarBg(name) : '#c9a87c',
            display: 'grid', placeItems: 'center',
            margin: '0 auto 14px',
            fontSize: '2rem', fontWeight: 700, color: '#fff',
            fontFamily: "'Cormorant Garamond',serif",
            border: '3px solid var(--beige)',
            boxShadow: '0 4px 20px rgba(62,36,8,.15)',
          }}
        >
          {getInitials(name)}
        </div>

        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', color: 'var(--bd)', margin: '0 0 4px' }}>
          {name || 'Convidado'}
        </h1>
        <p style={{ fontFamily: "'Dancing Script',cursive", color: 'var(--sand)', fontSize: '.95rem', marginBottom: 14 }}>
          ✦ Álbum do chá de bebê ✦
        </p>

        {/* Stats row */}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 700, color: 'var(--bd)' }}>
                {photos.length}
              </p>
              <p style={{ fontSize: '.75rem', color: 'var(--text-lo)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                {photos.length === 1 ? 'foto' : 'fotos'}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 700, color: 'var(--bd)' }}>
                {reactions}
              </p>
              <p style={{ fontSize: '.75rem', color: 'var(--text-lo)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                {reactions === 1 ? 'reação' : 'reações'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Download button */}
      {!loading && photos.filter(p => p.type === 'image').length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={downloadMyPhotos}
            disabled={downloading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: downloading ? 'rgba(62,36,8,.08)' : 'linear-gradient(135deg,#c47a3a,#7a4e28)',
              color: downloading ? 'var(--bd)' : '#fdf6ee',
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: '1rem', fontWeight: 600,
              border: downloading ? '1.5px solid var(--sand)' : 'none',
              borderRadius: 999,
              padding: '12px 24px',
              cursor: downloading ? 'wait' : 'pointer',
              boxShadow: downloading ? 'none' : '0 4px 14px rgba(196,122,58,.3)',
              transition: 'all .2s',
            }}
          >
            {downloading ? '⏳ Preparando ZIP...' : '⬇️ Baixar minhas fotos'}
          </button>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--beige)', margin: '16px 16px 20px' }} />

      {/* Loading skeleton */}
      {loading && (
        <div style={{ padding: '0 16px', maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '1', borderRadius: 4,
                  background: 'linear-gradient(120deg,var(--beige),var(--cream),var(--beige))',
                  animation: 'pulse 1.4s ease-in-out infinite',
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && photos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 14 }}>📷</div>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', color: 'var(--bd)', marginBottom: 6 }}>
            Nenhuma foto ainda
          </p>
          <p style={{ fontSize: '.9rem', color: 'var(--text-lo)', fontStyle: 'italic' }}>
            {name} ainda não compartilhou fotos aprovadas.
          </p>
        </div>
      )}

      {/* Photo grid */}
      {!loading && photos.length > 0 && (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 2px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => openLightbox(i)}
                style={{
                  aspectRatio: '1', border: 'none', padding: 0,
                  cursor: 'pointer', borderRadius: 4, overflow: 'hidden',
                  position: 'relative', background: 'var(--beige)',
                }}
                aria-label={`Ver foto de ${photo.author}`}
              >
                {photo.type === 'video' ? (
                  <>
                    <video
                      src={photo.thumbUrl}
                      muted
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(0,0,0,.55)', color: '#fff',
                      fontSize: '.65rem', padding: '2px 6px', borderRadius: 99,
                    }}>
                      ▶
                    </div>
                  </>
                ) : (
                  <img
                    src={photo.thumbUrl}
                    alt={photo.caption ?? photo.author}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
                {/* Reaction overlay */}
                {totalReactions(photo.reactions) > 0 && (
                  <div style={{
                    position: 'absolute', bottom: 4, left: 4,
                    background: 'rgba(0,0,0,.5)', color: '#fff',
                    fontSize: '.68rem', padding: '2px 6px', borderRadius: 99,
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    ♥ {totalReactions(photo.reactions)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <Lightbox
          item={photos[lightboxIndex]}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < photos.length - 1}
        />
      )}
    </div>
  )
}
