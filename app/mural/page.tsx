'use client'

import { useEffect, useState, useCallback } from 'react'

interface Photo {
  id: string
  fullUrl: string
  thumbUrl: string
  author: string
  caption?: string
  type: string
}

function polaroidStyle(id: string) {
  let h = 0
  for (const c of id) h = (h << 5) - h + c.charCodeAt(0)
  const rot = ((Math.abs(h) % 160) - 80) / 10  // -8 to +8 deg
  const offsetY = (Math.abs(h >> 4) % 12) - 6   // -6 to +6 px
  return { rot, offsetY }
}

export default function MuralPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPhotos() {
      try {
        const res = await fetch('/api/photos?limit=100')
        const data = await res.json() as { media?: Photo[] }
        const items = Array.isArray(data.media) ? data.media : []
        setPhotos(items.filter(p => p.type === 'image'))
      } catch {
        setPhotos([])
      } finally {
        setLoading(false)
      }
    }
    fetchPhotos()
  }, [])

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  const prevPhoto = useCallback(() => {
    setLightboxIndex(i => (i == null ? null : (i - 1 + photos.length) % photos.length))
  }, [photos.length])

  const nextPhoto = useCallback(() => {
    setLightboxIndex(i => (i == null ? null : (i + 1) % photos.length))
  }, [photos.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prevPhoto()
      if (e.key === 'ArrowRight') nextPhoto()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxIndex, closeLightbox, prevPhoto, nextPhoto])

  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600&display=swap');

        .polaroid-card {
          cursor: pointer;
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .polaroid-card:hover {
          transform: rotate(0deg) scale(1.06) translateY(-8px) !important;
          box-shadow: 0 16px 40px rgba(62,36,8,.25) !important;
          z-index: 10;
          position: relative;
        }
        @media (max-width: 640px) {
          .polaroid-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>

      <div style={{
        minHeight: '100dvh',
        background: 'var(--warm)',
        paddingTop: 80,
        paddingBottom: 120,
      }}>
        {/* Back link */}
        <div style={{ padding: '0 20px 0' }}>
          <a href="/" style={{ fontSize: '.85rem', color: 'var(--bl)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            ← voltar
          </a>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', padding: '16px 20px 32px', color: 'var(--bd)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📸</div>
          <p style={{
            fontFamily: "'Dancing Script',cursive",
            color: 'var(--accent)',
            fontSize: '1.05rem',
            marginBottom: 4,
          }}>
            ✦ Memórias do Chá ✦
          </p>
          <h1 style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: '2rem',
            margin: '0 0 8px',
            color: 'var(--bd)',
          }}>
            Mural de <em>Memórias</em>
          </h1>
          <p style={{
            fontSize: '.9rem',
            color: 'var(--bl)',
            fontStyle: 'italic',
            maxWidth: 320,
            margin: '0 auto',
          }}>
            Todos os momentos especiais do nosso chá
          </p>
        </div>

        {/* Cork board area */}
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '32px 20px',
          backgroundColor: '#f0e0c8',
          backgroundImage: `
            radial-gradient(ellipse at 20% 30%, rgba(196,122,58,.15) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 70%, rgba(160,113,62,.12) 0%, transparent 50%)
          `,
          borderRadius: 24,
          minHeight: 400,
          border: '1px solid rgba(160,113,62,.2)',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(90,62,40,.7)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem' }}>Carregando memórias...</p>
            </div>
          ) : photos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(90,62,40,.7)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🖼️</div>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem' }}>Nenhuma foto ainda</p>
              <p style={{ fontSize: '.9rem', marginTop: 6 }}>As fotos aprovadas aparecerão aqui</p>
            </div>
          ) : (
            <div
              className="polaroid-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 32,
                alignItems: 'start',
              }}
            >
              {photos.map((photo, index) => {
                const { rot, offsetY } = polaroidStyle(photo.id)
                const isHovered = hoveredId === photo.id
                return (
                  <div
                    key={photo.id}
                    className="polaroid-card"
                    onClick={() => setLightboxIndex(index)}
                    onMouseEnter={() => setHoveredId(photo.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      background: '#faf6ef',
                      padding: '10px 10px 40px 10px',
                      boxShadow: isHovered
                        ? '0 16px 40px rgba(62,36,8,.25)'
                        : '0 4px 18px rgba(62,36,8,.18), 0 1px 4px rgba(62,36,8,.1)',
                      borderRadius: 2,
                      transform: isHovered
                        ? 'rotate(0deg) scale(1.06) translateY(-8px)'
                        : `rotate(${rot}deg) translateY(${offsetY}px)`,
                      transition: 'transform .2s ease, box-shadow .2s ease',
                      userSelect: 'none',
                    }}
                  >
                    {/* Photo */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbUrl}
                      alt={photo.caption ?? `Foto de ${photo.author}`}
                      loading="lazy"
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    {/* Author label */}
                    <p style={{
                      fontFamily: "'Dancing Script',cursive",
                      fontSize: '.95rem',
                      color: '#5a3e28',
                      textAlign: 'center',
                      paddingTop: 10,
                      fontWeight: 500,
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {photo.author}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Photo count */}
        {photos.length > 0 && (
          <p style={{
            textAlign: 'center',
            color: 'var(--bl)',
            fontSize: '.85rem',
            marginTop: 24,
            fontStyle: 'italic',
          }}>
            {photos.length} {photos.length === 1 ? 'foto' : 'fotos'} no mural
          </p>
        )}
      </div>

      {/* Lightbox */}
      {currentPhoto && (
        <div
          onClick={closeLightbox}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.92)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255,255,255,.15)',
              border: 'none',
              color: '#fff',
              width: 44,
              height: 44,
              borderRadius: '50%',
              fontSize: '1.3rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Fechar"
          >
            ✕
          </button>

          {/* Prev button */}
          {photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); prevPhoto() }}
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,.15)',
                border: 'none',
                color: '#fff',
                width: 48,
                height: 48,
                borderRadius: '50%',
                fontSize: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Foto anterior"
            >
              ‹
            </button>
          )}

          {/* Image */}
          <div
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', position: 'relative' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPhoto.fullUrl}
              alt={currentPhoto.caption ?? `Foto de ${currentPhoto.author}`}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 8px 40px rgba(0,0,0,.6)',
                display: 'block',
              }}
            />
            {/* Caption */}
            <div style={{
              textAlign: 'center',
              marginTop: 12,
              color: 'rgba(255,255,255,.8)',
            }}>
              <p style={{
                fontFamily: "'Dancing Script',cursive",
                fontSize: '1.1rem',
                margin: 0,
                color: '#c47a3a',
              }}>
                {currentPhoto.author}
              </p>
              {currentPhoto.caption && (
                <p style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: '.95rem',
                  margin: '4px 0 0',
                  color: 'rgba(255,255,255,.6)',
                  fontStyle: 'italic',
                }}>
                  {currentPhoto.caption}
                </p>
              )}
              <p style={{
                fontSize: '.8rem',
                color: 'rgba(255,255,255,.35)',
                margin: '6px 0 0',
              }}>
                {lightboxIndex !== null ? `${lightboxIndex + 1} / ${photos.length}` : ''}
              </p>
            </div>
          </div>

          {/* Next button */}
          {photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); nextPhoto() }}
              style={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,.15)',
                border: 'none',
                color: '#fff',
                width: 48,
                height: 48,
                borderRadius: '50%',
                fontSize: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Próxima foto"
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  )
}
