'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface MediaItem {
  id: string
  thumbUrl: string
  fullUrl: string
  author: string
  caption?: string
  type: 'image' | 'video' | 'audio'
}

type Phase = 'visible' | 'fading-out'

export default function TVClient() {
  const [photos, setPhotos] = useState<MediaItem[]>([])
  const [current, setCurrent] = useState(0)
  const [phase, setPhase] = useState<Phase>('visible')
  const [showAuthor, setShowAuthor] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [hideCursor, setHideCursor] = useState(false)
  const [isPresenting, setIsPresenting] = useState(false)

  const slideTimer = useRef<ReturnType<typeof setTimeout>>()
  const authorTimer = useRef<ReturnType<typeof setTimeout>>()
  const cursorTimer = useRef<ReturnType<typeof setTimeout>>()

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch('/api/photos')
      const data = await res.json()
      if (data.media?.length > 0) {
        setPhotos((prev) => {
          if (prev.length !== data.media.length) return data.media
          return prev
        })
      }
    } catch (err) {
      console.warn('[TV] Fetch photos failed:', err)
    }
  }, [])

  useEffect(() => {
    fetchPhotos()
    const t = setInterval(fetchPhotos, 10_000)
    return () => clearInterval(t)
  }, [fetchPhotos])

  useEffect(() => {
    const siteUrl = window.location.origin
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(siteUrl, {
        width: 140,
        margin: 1,
        color: { dark: '#ffffff', light: '#00000000' },
      }).then(setQrDataUrl)
    }).catch(() => {})
  }, [])

  const advance = useCallback(() => {
    setPhase('fading-out')
    setTimeout(() => {
      setCurrent((c) => (c + 1) % Math.max(photos.length, 1))
      setPhase('visible')
      setShowAuthor(true)
      clearTimeout(authorTimer.current)
      authorTimer.current = setTimeout(() => setShowAuthor(false), 2000)
    }, 600)
  }, [photos.length])

  useEffect(() => {
    if (photos.length === 0) return
    clearTimeout(slideTimer.current)
    slideTimer.current = setTimeout(advance, 5000)
    return () => clearTimeout(slideTimer.current)
  }, [current, photos.length, advance])

  useEffect(() => {
    if (photos.length === 0) return
    setShowAuthor(true)
    clearTimeout(authorTimer.current)
    authorTimer.current = setTimeout(() => setShowAuthor(false), 2000)
  }, [current, photos.length])

  const resetCursor = useCallback(() => {
    setHideCursor(false)
    clearTimeout(cursorTimer.current)
    cursorTimer.current = setTimeout(() => setHideCursor(true), 3000)
  }, [])

  useEffect(() => {
    resetCursor()
    window.addEventListener('mousemove', resetCursor)
    window.addEventListener('touchstart', resetCursor)
    return () => {
      window.removeEventListener('mousemove', resetCursor)
      window.removeEventListener('touchstart', resetCursor)
      clearTimeout(cursorTimer.current)
    }
  }, [resetCursor])

  // Presentation mode helpers
  const enterPresentation = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // Fullscreen may be blocked — continue anyway
    }
    setIsPresenting(true)
  }, [])

  const exitPresentation = useCallback(() => {
    setIsPresenting(false)
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  // Sync isPresenting with actual fullscreen state
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setIsPresenting(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPresenting) { exitPresentation(); return }
        window.location.href = '/'
      }
      if (isPresenting) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') advance()
        if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   setCurrent(c => (c - 1 + Math.max(photos.length, 1)) % Math.max(photos.length, 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPresenting, exitPresentation, advance, photos.length])

  const item = photos[current]

  // Touch swipe support for presentation mode
  const touchStartX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0]?.clientX ?? null }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    if (Math.abs(dx) > 40) {
      if (dx < 0) advance()
      else setCurrent(c => (c - 1 + Math.max(photos.length, 1)) % Math.max(photos.length, 1))
    }
    touchStartX.current = null
  }

  return (
    <>
      {/* Normal TV view */}
      <div className="tv-root" style={{ cursor: hideCursor ? 'none' : 'default' }} onClick={() => { if (!isPresenting) window.location.href = '/' }}>
        {item ? (
          <div key={item.id} className={`tv-media-wrap ${phase === 'fading-out' ? 'tv-fade-out' : 'tv-fade-in'}`}>
            {item.type === 'video' ? (
              <video src={item.fullUrl} className="tv-media" autoPlay muted playsInline loop />
            ) : item.type === 'audio' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a0a00,#3e2408)', gap: 32 }}>
                <div style={{ fontSize: '8rem' }}>🎙️</div>
                <p style={{ color: 'rgba(255,255,255,.8)', fontFamily: 'serif', fontSize: '2rem', letterSpacing: '.1em' }}>{item.author}</p>
                <audio src={item.fullUrl} autoPlay style={{ width: '320px' }} />
              </div>
            ) : (
              <img src={item.fullUrl} alt={item.author} className="tv-media tv-ken-burns" />
            )}
          </div>
        ) : (
          <div className="tv-empty">
            <span style={{ fontSize: '5rem' }}>🧸</span>
            <p style={{ color: 'rgba(255,255,255,.5)', marginTop: 24, fontFamily: 'serif', fontSize: '1.4rem', letterSpacing: '.1em' }}>
              Aguardando fotos…
            </p>
          </div>
        )}

        {item && (
          <div className={`tv-author ${showAuthor ? 'tv-author-visible' : ''}`}>
            {item.type === 'video' ? '🎥' : item.type === 'audio' ? '🎙️' : '📷'} {item.author}
          </div>
        )}

        {qrDataUrl && (
          <div className="tv-qr" onClick={(e) => e.stopPropagation()}>
            <img src={qrDataUrl} alt="QR Code" width={100} height={100} />
            <span className="tv-qr-label">Acesse o álbum</span>
          </div>
        )}

        {photos.length > 0 && (
          <div className="tv-counter">
            {current + 1} / {photos.length}
          </div>
        )}

        {/* Presentation mode button — top-left, always visible */}
        {!isPresenting && (
          <button
            onClick={e => { e.stopPropagation(); enterPresentation() }}
            title="Modo Apresentação (tela cheia)"
            style={{
              position: 'absolute', top: 16, left: 16, zIndex: 200,
              background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,.22)', color: '#fff',
              borderRadius: 12, padding: '8px 14px',
              display: 'flex', alignItems: 'center', gap: 7,
              fontFamily: 'serif', fontSize: '.88rem', fontWeight: 600,
              cursor: 'pointer', letterSpacing: '.03em',
              transition: 'background .2s',
            }}
          >
            ▶ Modo Apresentação
          </button>
        )}
      </div>

      {/* Fullscreen presentation overlay */}
      {isPresenting && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: hideCursor ? 'none' : 'default',
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {item ? (
            <>
              {/* Media */}
              <div
                key={`pres-${item.id}`}
                style={{
                  width: '100%', height: '100%',
                  opacity: phase === 'fading-out' ? 0 : 1,
                  transition: 'opacity .6s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {item.type === 'video' ? (
                  <video
                    src={item.fullUrl}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    autoPlay muted playsInline loop
                  />
                ) : item.type === 'audio' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, color: '#fff' }}>
                    <div style={{ fontSize: '8rem' }}>🎙️</div>
                    <p style={{ fontFamily: 'serif', fontSize: '2rem' }}>{item.author}</p>
                    <audio src={item.fullUrl} autoPlay controls style={{ width: 320 }} />
                  </div>
                ) : (
                  <img
                    src={item.fullUrl}
                    alt={item.caption ?? item.author}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                )}
              </div>

              {/* Bottom info bar */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '32px 28px 24px',
                background: 'linear-gradient(to top, rgba(0,0,0,.72) 0%, transparent 100%)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{
                    fontFamily: "'Playfair Display',serif",
                    fontSize: '1.3rem', color: '#f5dab6', fontWeight: 600, marginBottom: 4,
                  }}>
                    {item.type === 'video' ? '🎥 ' : item.type === 'audio' ? '🎙️ ' : ''}{item.author}
                  </p>
                  {item.caption && (
                    <p style={{
                      fontFamily: "'Cormorant Garamond',serif",
                      fontSize: '1rem', color: 'rgba(245,218,182,.75)',
                      fontStyle: 'italic', maxWidth: 480,
                    }}>
                      {item.caption}
                    </p>
                  )}
                </div>
                <p style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.4)', flexShrink: 0, paddingLeft: 16 }}>
                  {current + 1} / {photos.length}
                </p>
              </div>

              {/* Prev / Next arrows */}
              <button
                onClick={() => setCurrent(c => (c - 1 + photos.length) % photos.length)}
                style={{
                  position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,.12)', border: 'none',
                  color: '#fff', fontSize: '2rem', borderRadius: '50%',
                  width: 52, height: 52, cursor: 'pointer', display: 'grid', placeItems: 'center',
                }}
                aria-label="Foto anterior"
              >
                ‹
              </button>
              <button
                onClick={advance}
                style={{
                  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,.12)', border: 'none',
                  color: '#fff', fontSize: '2rem', borderRadius: '50%',
                  width: 52, height: 52, cursor: 'pointer', display: 'grid', placeItems: 'center',
                }}
                aria-label="Próxima foto"
              >
                ›
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>
              <div style={{ fontSize: '5rem', marginBottom: 20 }}>🧸</div>
              <p style={{ fontFamily: 'serif', fontSize: '1.4rem' }}>Aguardando fotos…</p>
            </div>
          )}

          {/* Close presentation button */}
          <button
            onClick={exitPresentation}
            title="Sair da apresentação (ESC)"
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
              color: '#fff', borderRadius: 12, padding: '8px 14px',
              fontFamily: 'serif', fontSize: '.88rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            ✕ Sair
          </button>
        </div>
      )}
    </>
  )
}
