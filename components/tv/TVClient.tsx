'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface MediaItem {
  id: string
  thumbUrl: string
  fullUrl: string
  author: string
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.location.href = '/'
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const item = photos[current]

  return (
    <div className="tv-root" style={{ cursor: hideCursor ? 'none' : 'default' }} onClick={() => { window.location.href = '/' }}>
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
    </div>
  )
}
