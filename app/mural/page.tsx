'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Photo {
  id: string
  fullUrl: string
  thumbUrl: string
  author: string
  caption?: string
  type: string
}

interface MuralCard {
  id: number
  author: string
  text: string
  color: string
  created_at: string
}

const CARD_COLORS = [
  { value: '#fdf6ee', label: 'Creme' },
  { value: '#fce4ec', label: 'Rosa' },
  { value: '#e8f5e9', label: 'Verde' },
  { value: '#e3f2fd', label: 'Azul' },
  { value: '#fff8e1', label: 'Amarelo' },
  { value: '#f3e5f5', label: 'Lilás' },
]

function cardRotation(id: number): number {
  // Deterministic rotation based on id: -3 to +3 degrees
  const seed = id * 2654435761
  return ((seed % 600) - 300) / 100
}

function formatDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(iso))
  } catch {
    return ''
  }
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

  // Mural cards state
  const [cards, setCards]             = useState<MuralCard[]>([])
  const [loadingCards, setLoadingCards] = useState(true)
  const [cardAuthor, setCardAuthor]   = useState('')
  const [cardText, setCardText]       = useState('')
  const [cardColor, setCardColor]     = useState('#fdf6ee')
  const [sendingCard, setSendingCard] = useState(false)
  const [cardError, setCardError]     = useState('')
  const [cardToast, setCardToast]     = useState('')

  const showCardToast = (msg: string) => {
    setCardToast(msg)
    setTimeout(() => setCardToast(''), 3000)
  }

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

  useEffect(() => {
    async function fetchCards() {
      try {
        const res  = await fetch('/api/mural-cards')
        const data = await res.json() as { cards?: MuralCard[] }
        setCards(Array.isArray(data.cards) ? data.cards : [])
      } catch {
        setCards([])
      } finally {
        setLoadingCards(false)
      }
    }
    fetchCards()

    try {
      const saved = localStorage.getItem('cha_author')
      if (saved) setCardAuthor(saved)
    } catch {}
  }, [])

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCardError('')
    if (!cardAuthor.trim()) { setCardError('Informe seu nome.'); return }
    if (!cardText.trim())   { setCardError('Escreva seu recado.'); return }

    setSendingCard(true)
    try {
      const res  = await fetch('/api/mural-cards', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ author: cardAuthor.trim(), text: cardText.trim(), color: cardColor }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setCardError(data.error ?? 'Erro ao enviar recado.')
        return
      }
      try { localStorage.setItem('cha_author', cardAuthor.trim()) } catch {}
      setCardText('')
      showCardToast('📌 Recado fixado no mural!')
      // Refresh cards
      const refreshRes  = await fetch('/api/mural-cards')
      const refreshData = await refreshRes.json() as { cards?: MuralCard[] }
      setCards(Array.isArray(refreshData.cards) ? refreshData.cards : [])
    } catch {
      setCardError('Sem conexão. Tente novamente.')
    } finally {
      setSendingCard(false)
    }
  }

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
          <Link href="/" style={{ fontSize: '.85rem', color: 'var(--bl)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            ← voltar
          </Link>
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

        {/* ── Mural Cards Section ───────────────────────────────────────── */}
        <div style={{ maxWidth: 1200, margin: '0 auto 40px', padding: '0 20px' }}>

          {/* Form: deixe seu recado */}
          <div style={{
            background: '#faf6ef',
            border: '1px solid rgba(201,168,124,.3)',
            borderRadius: 20,
            padding: '24px 22px',
            marginBottom: 28,
            boxShadow: '0 4px 18px rgba(62,36,8,.07)',
          }}>
            <p style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: '1.2rem', color: '#3e2408',
              marginBottom: 18, fontWeight: 600,
            }}>
              📌 Deixe seu recado
            </p>

            <form onSubmit={handleCardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                value={cardAuthor}
                onChange={e => { setCardAuthor(e.target.value); setCardError('') }}
                placeholder="Seu nome"
                maxLength={60}
                style={{
                  border: '1px solid #e8d4b8', borderRadius: 12,
                  padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif",
                  fontSize: '1rem', color: '#3e2408', background: 'var(--warm,#fdf6ee)',
                  outline: 'none',
                }}
              />
              <textarea
                value={cardText}
                onChange={e => { setCardText(e.target.value.slice(0, 200)); setCardError('') }}
                placeholder="Seu recado para o mural... (máx 200 caracteres)"
                rows={3}
                style={{
                  border: '1px solid #e8d4b8', borderRadius: 12,
                  padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif",
                  fontSize: '1rem', color: '#3e2408', background: 'var(--warm,#fdf6ee)',
                  outline: 'none', resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '.8rem', color: 'rgba(62,36,8,.6)', fontWeight: 600 }}>Cor:</span>
                {CARD_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setCardColor(c.value)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: c.value,
                      border: cardColor === c.value ? '3px solid #7a4e28' : '2px solid #e8d4b8',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '.75rem', color: 'rgba(62,36,8,.45)' }}>
                  {200 - cardText.length} restantes
                </span>
              </div>

              {cardError && (
                <p style={{ color: '#c0392b', fontSize: '.85rem', fontStyle: 'italic' }}>{cardError}</p>
              )}

              <button
                type="submit"
                disabled={sendingCard}
                style={{
                  background: sendingCard ? '#e8d4b8' : 'linear-gradient(135deg,#c47a3a,#7a4e28)',
                  color: sendingCard ? '#7a4e28' : '#fdf6ee',
                  border: 'none', borderRadius: 14, padding: '11px 24px',
                  fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem',
                  fontWeight: 600, cursor: sendingCard ? 'not-allowed' : 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                {sendingCard ? 'Enviando...' : '📌 Fixar no mural'}
              </button>
            </form>
          </div>

          {/* Grid of mural cards */}
          {!loadingCards && cards.length > 0 && (
            <>
              <p style={{
                fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase',
                color: 'rgba(62,36,8,.5)', fontWeight: 600, marginBottom: 16,
              }}>
                {cards.length} {cards.length === 1 ? 'recado' : 'recados'} no mural
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 20,
                paddingBottom: 8,
              }}>
                {cards.map(card => (
                  <div
                    key={card.id}
                    style={{
                      background: card.color,
                      borderRadius: 4,
                      padding: '16px 16px 14px',
                      boxShadow: '2px 4px 16px rgba(62,36,8,.14), 0 1px 4px rgba(62,36,8,.08)',
                      transform: `rotate(${cardRotation(card.id)}deg)`,
                      transition: 'transform .2s ease, box-shadow .2s ease',
                    }}
                  >
                    <p style={{
                      fontFamily: "'Cormorant Garamond',serif",
                      fontSize: '.95rem',
                      fontStyle: 'italic',
                      color: '#3e2408',
                      lineHeight: 1.55,
                      marginBottom: 10,
                      wordBreak: 'break-word',
                    }}>
                      {card.text}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{
                        fontFamily: "'Cormorant Garamond',serif",
                        fontSize: '.82rem',
                        fontWeight: 700,
                        color: '#5a3e28',
                      }}>
                        — {card.author}
                      </p>
                      <p style={{ fontSize: '.7rem', color: 'rgba(62,36,8,.4)' }}>
                        {formatDateShort(card.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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

      {/* Card toast */}
      {cardToast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: '#3e2408', color: '#f5dab6',
          padding: '12px 22px', borderRadius: 999,
          fontSize: '.92rem', fontWeight: 600, zIndex: 4000,
          whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,.3)',
          fontFamily: "'Cormorant Garamond',serif",
        }}>
          {cardToast}
        </div>
      )}
    </>
  )
}
