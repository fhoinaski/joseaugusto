'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'

const EnqueteCard = dynamic(() => import('../EnqueteCard'), { ssr: false })

interface LiveReaction { id: number; emoji: string; x: number }
interface MediaItem { id: string; thumbUrl: string; fullUrl: string; author: string; caption?: string; type: 'image' | 'video' | 'audio' }
interface TopAuthor { author: string; score: number }
interface LiveAnnounce { message: string; ts: number }

type Phase = 'visible' | 'fading-out'
type TvMode = 'slideshow' | 'mosaico'

const MAX_MOSAIC = 16

function AnnounceBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #c47a3a, #7a4e28)',
      color: '#fff', padding: '18px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      boxShadow: '0 4px 32px rgba(0,0,0,.5)',
      animation: 'announceSlide .4s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
        <span style={{ fontSize: '2rem', flexShrink: 0 }}>📣</span>
        <p style={{ margin: 0, fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '.02em' }}>
          {message}
        </p>
      </div>
      <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}>✕</button>
    </div>
  )
}

export default function TVClient() {
  const [tvMode, setTvMode] = useState<TvMode>('slideshow')
  const [photos, setPhotos] = useState<MediaItem[]>([])
  const [current, setCurrent] = useState(0)
  const [phase, setPhase] = useState<Phase>('visible')
  const [showAuthor, setShowAuthor] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [hideCursor, setHideCursor] = useState(false)
  const [isPresenting, setIsPresenting] = useState(false)
  const [liveReactions, setLiveReactions] = useState<LiveReaction[]>([])
  const [mosaicPhotos, setMosaicPhotos] = useState<MediaItem[]>([])
  const [newPhotoIds, setNewPhotoIds] = useState<Set<string>>(new Set())
  const [topAuthors, setTopAuthors] = useState<TopAuthor[]>([])
  const [liveAnnounce, setLiveAnnounce] = useState<LiveAnnounce | null>(null)

  const slideTimer = useRef<ReturnType<typeof setTimeout>>()
  const authorTimer = useRef<ReturnType<typeof setTimeout>>()
  const cursorTimer = useRef<ReturnType<typeof setTimeout>>()
  const announceTimer = useRef<ReturnType<typeof setTimeout>>()
  const touchStartX = useRef<number | null>(null)

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch('/api/photos?limit=20')
      const data = await res.json() as { media?: MediaItem[]; topAuthors?: TopAuthor[] }
      if (data.media?.length) {
        const nextIds = data.media.map(item => item.id).join(',')
        setPhotos(prev => prev.map(item => item.id).join(',') !== nextIds ? data.media! : prev)
        setMosaicPhotos(prev => prev.length === 0 ? data.media!.slice(0, MAX_MOSAIC) : prev)
      }
      if (data.topAuthors?.length) setTopAuthors(data.topAuthors)
    } catch {}
  }, [])

  useEffect(() => {
    fetchPhotos()
  }, [fetchPhotos])

  const addLiveReaction = useCallback((emoji: string) => {
    const id = Date.now() + Math.random()
    const x = 10 + Math.random() * 80
    setLiveReactions(prev => [...prev, { id, emoji, x }])
    setTimeout(() => setLiveReactions(prev => prev.filter(r => r.id !== id)), 3000)
  }, [])

  const triggerAnnounce = useCallback((data: LiveAnnounce) => {
    clearTimeout(announceTimer.current)
    setLiveAnnounce(data)
    announceTimer.current = setTimeout(() => setLiveAnnounce(null), 15000)
  }, [])

  // SSE
  useEffect(() => {
    let fallback: ReturnType<typeof setInterval> | null = null
    const startFallback = () => {
      if (fallback) return
      fallback = setInterval(fetchPhotos, 30_000)
    }

    if (typeof EventSource === 'undefined') {
      startFallback()
      return () => { if (fallback) clearInterval(fallback) }
    }

    const es = new EventSource('/api/stream')

    es.addEventListener('reaction-update', (e: Event) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as { emoji?: string }
        if (data.emoji) addLiveReaction(data.emoji)
      } catch {}
    })

    es.addEventListener('new-photo', (e: Event) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as Partial<MediaItem> & { ts?: number }
        if (!data.id) { fetchPhotos(); return }
        fetchPhotos()
        const newItem = data as MediaItem
        setMosaicPhotos(prev => [newItem, ...prev.filter(p => p.id !== newItem.id)].slice(0, MAX_MOSAIC))
        setNewPhotoIds(prev => new Set(Array.from(prev).concat(newItem.id)))
        setTimeout(() => setNewPhotoIds(prev => { const next = new Set(prev); next.delete(newItem.id!); return next }), 6000)
      } catch {}
    })

    es.addEventListener('announce', (e: Event) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as { message?: string; ts?: number }
        if (data.message) triggerAnnounce({ message: data.message, ts: data.ts ?? Date.now() })
        else setLiveAnnounce(null)
      } catch {}
    })

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.emoji || data.type === 'reaction') addLiveReaction(data.emoji ?? '❤️')
      } catch {}
    }

    es.onerror = () => startFallback()

    return () => {
      es.close()
      if (fallback) clearInterval(fallback)
    }
  }, [addLiveReaction, fetchPhotos, triggerAnnounce])

  useEffect(() => {
    const siteUrl = window.location.origin
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(siteUrl, { width: 140, margin: 1, color: { dark: '#ffffff', light: '#00000000' } }).then(setQrDataUrl)
    }).catch(() => {})
  }, [])

  const advance = useCallback(() => {
    setPhase('fading-out')
    setTimeout(() => {
      setCurrent(c => (c + 1) % Math.max(photos.length, 1))
      setPhase('visible')
      setShowAuthor(true)
      clearTimeout(authorTimer.current)
      authorTimer.current = setTimeout(() => setShowAuthor(false), 2000)
    }, 600)
  }, [photos.length])

  useEffect(() => {
    if (photos.length === 0 || tvMode !== 'slideshow') return
    clearTimeout(slideTimer.current)
    slideTimer.current = setTimeout(advance, 5000)
    return () => clearTimeout(slideTimer.current)
  }, [current, photos.length, advance, tvMode])

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

  const enterPresentation = useCallback(async () => {
    try { await document.documentElement.requestFullscreen() } catch {}
    setIsPresenting(true)
  }, [])

  const exitPresentation = useCallback(() => {
    setIsPresenting(false)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }, [])

  useEffect(() => {
    const onFsChange = () => { if (!document.fullscreenElement) setIsPresenting(false) }
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
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setCurrent(c => (c - 1 + Math.max(photos.length, 1)) % Math.max(photos.length, 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPresenting, exitPresentation, advance, photos.length])

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0]?.clientX ?? null }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    if (Math.abs(dx) > 40) { dx < 0 ? advance() : setCurrent(c => (c - 1 + Math.max(photos.length, 1)) % Math.max(photos.length, 1)) }
    touchStartX.current = null
  }

  const item = photos[current]

  // ── MOSAICO MODE ──────────────────────────────────────────────────────────
  if (tvMode === 'mosaico') {
    return (
      <>
        <div style={{ position: 'fixed', inset: 0, background: '#0a0400', display: 'flex', flexDirection: 'column', cursor: hideCursor ? 'none' : 'default' }}>
          {/* Header bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px', flexShrink: 0,
            background: 'rgba(62,36,8,.95)', borderBottom: '1px solid rgba(201,168,124,.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.6rem' }}>🧸</span>
              <div>
                <p style={{ margin: 0, color: '#f5dab6', fontFamily: "'Playfair Display',serif", fontSize: '1.05rem', fontWeight: 600 }}>Chá de Bebê · José Augusto</p>
                <p style={{ margin: 0, color: 'rgba(245,218,182,.45)', fontSize: '.72rem', letterSpacing: '.06em' }}>álbum ao vivo · {photos.length} fotos</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(192,57,43,.8)', borderRadius: 999, padding: '5px 12px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', animation: 'pulse 1.2s infinite', display: 'inline-block' }} />
                <span style={{ color: '#fff', fontSize: '.8rem', fontWeight: 700, letterSpacing: '.1em' }}>AO VIVO</span>
              </div>
              <button
                onClick={() => setTvMode('slideshow')}
                style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)', color: 'rgba(255,255,255,.8)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: '.8rem' }}
              >
                ▶ Slideshow
              </button>
            </div>
          </div>

          {/* Body: grid + sidebar */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* Photo mosaic grid */}
            <div style={{
              flex: 1, display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridTemplateRows: 'repeat(4, 1fr)',
              gap: 3, padding: 3, minWidth: 0,
            }}>
              {Array.from({ length: MAX_MOSAIC }, (_, i) => {
                const photo = mosaicPhotos[i]
                const isNew = !!photo && newPhotoIds.has(photo.id)
                return (
                  <div
                    key={photo?.id ?? `empty-${i}`}
                    style={{
                      position: 'relative', overflow: 'hidden', borderRadius: 6,
                      background: 'rgba(255,255,255,.04)',
                      animation: isNew ? 'mosaicIn .5s cubic-bezier(.34,1.56,.64,1)' : undefined,
                    }}
                  >
                    {photo ? (
                      <>
                        {photo.type === 'video' ? (
                          <video src={photo.thumbUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted playsInline loop autoPlay />
                        ) : (
                          <img
                            src={photo.thumbUrl}
                            alt={photo.author}
                            onError={e => { (e.currentTarget as HTMLImageElement).src = photo.fullUrl }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        )}
                        {/* Author strip */}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          padding: '12px 7px 5px',
                          background: 'linear-gradient(to top, rgba(0,0,0,.75), transparent)',
                          fontSize: '.68rem', color: '#fff', fontWeight: 600,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {isNew && <span style={{ color: '#c47a3a', marginRight: 3 }}>●</span>}
                          {photo.author}
                        </div>
                        {/* New photo highlight border */}
                        {isNew && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            border: '2.5px solid #c47a3a', borderRadius: 6,
                            pointerEvents: 'none',
                            animation: 'mosaicGlow 1s ease-in-out 4',
                          }} />
                        )}
                      </>
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', opacity: .08 }}>
                        <span style={{ fontSize: '1.8rem' }}>📷</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Sidebar: leaderboard + QR */}
            <div style={{
              width: 200, flexShrink: 0,
              background: 'rgba(30,14,4,.85)', borderLeft: '1px solid rgba(201,168,124,.1)',
              display: 'flex', flexDirection: 'column', padding: '16px 14px', gap: 10,
            }}>
              <p style={{ margin: '0 0 4px', color: 'rgba(245,218,182,.5)', fontSize: '.68rem', letterSpacing: '.14em', textTransform: 'uppercase' }}>🏆 Top Fotógrafos</p>
              {topAuthors.slice(0, 5).map((a, i) => (
                <div key={a.author} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1rem', minWidth: 22, textAlign: 'center' }}>
                    {['🥇','🥈','🥉','4️⃣','5️⃣'][i]}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: '#f5dab6', fontSize: '.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.author}</p>
                    <p style={{ margin: 0, color: 'rgba(245,218,182,.4)', fontSize: '.7rem' }}>{a.score} pts</p>
                  </div>
                </div>
              ))}
              {topAuthors.length === 0 && (
                <p style={{ color: 'rgba(245,218,182,.25)', fontSize: '.78rem', fontStyle: 'italic', margin: 0 }}>Aguardando fotos…</p>
              )}
              <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(201,168,124,.12)', paddingTop: 12 }}>
                <p style={{ margin: '0 0 2px', color: 'rgba(245,218,182,.35)', fontSize: '.7rem' }}>Total no álbum</p>
                <p style={{ margin: '0 0 2px', color: '#c47a3a', fontSize: '1.6rem', fontWeight: 700 }}>{photos.length}</p>
                <p style={{ margin: 0, color: 'rgba(245,218,182,.35)', fontSize: '.7rem' }}>fotos &amp; vídeos</p>
              </div>
              {qrDataUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <img src={qrDataUrl} alt="QR" width={76} height={76} style={{ borderRadius: 6 }} />
                  <p style={{ margin: 0, color: 'rgba(245,218,182,.35)', fontSize: '.62rem', textAlign: 'center' }}>Acesse o álbum</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live reactions */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
          {liveReactions.map(r => (
            <div key={r.id} style={{ position: 'absolute', bottom: '15%', left: `${r.x}%`, fontSize: '3.5rem', animation: 'tvReactionFloat 3s ease-out forwards', pointerEvents: 'none', lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.5))' }}>
              {r.emoji}
            </div>
          ))}
        </div>

        {liveAnnounce && <AnnounceBanner message={liveAnnounce.message} onClose={() => setLiveAnnounce(null)} />}
      </>
    )
  }

  // ── SLIDESHOW MODE (original, preserved) ────────────────────────────────
  return (
    <>
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
            <p style={{ color: 'rgba(255,255,255,.5)', marginTop: 24, fontFamily: 'serif', fontSize: '1.4rem', letterSpacing: '.1em' }}>Aguardando fotos…</p>
          </div>
        )}

        {item && <div className={`tv-author ${showAuthor ? 'tv-author-visible' : ''}`}>{item.type === 'video' ? '🎥' : item.type === 'audio' ? '🎙️' : '📷'} {item.author}</div>}

        {qrDataUrl && (
          <div className="tv-qr" onClick={e => e.stopPropagation()}>
            <img src={qrDataUrl} alt="QR Code" width={100} height={100} />
            <span className="tv-qr-label">Acesse o álbum</span>
          </div>
        )}

        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 80, left: 24, zIndex: 100, width: 'min(340px, calc(100vw - 48px))' }}>
          <EnqueteCard tv pollMs={8000} />
        </div>

        {photos.length > 0 && <div className="tv-counter">{current + 1} / {photos.length}</div>}

        {!isPresenting && (
          <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 200, display: 'flex', gap: 8 }}>
            <button
              onClick={e => { e.stopPropagation(); enterPresentation() }}
              style={{ background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.22)', color: '#fff', borderRadius: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'serif', fontSize: '.88rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '.03em' }}
            >
              ▶ Modo Apresentação
            </button>
            <button
              onClick={e => { e.stopPropagation(); setTvMode('mosaico') }}
              style={{ background: 'rgba(196,122,58,.3)', backdropFilter: 'blur(8px)', border: '1px solid rgba(196,122,58,.5)', color: '#f5dab6', borderRadius: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'serif', fontSize: '.88rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '.03em' }}
            >
              🔲 Mosaico
            </button>
          </div>
        )}
      </div>

      {isPresenting && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: hideCursor ? 'none' : 'default' }}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        >
          {item ? (
            <>
              <div key={`pres-${item.id}`} style={{ width: '100%', height: '100%', opacity: phase === 'fading-out' ? 0 : 1, transition: 'opacity .6s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.type === 'video' ? (
                  <video src={item.fullUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} autoPlay muted playsInline loop />
                ) : item.type === 'audio' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, color: '#fff' }}>
                    <div style={{ fontSize: '8rem' }}>🎙️</div>
                    <p style={{ fontFamily: 'serif', fontSize: '2rem' }}>{item.author}</p>
                    <audio src={item.fullUrl} autoPlay controls style={{ width: 320 }} />
                  </div>
                ) : (
                  <img src={item.fullUrl} alt={item.caption ?? item.author} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                )}
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 28px 24px', background: 'linear-gradient(to top, rgba(0,0,0,.72), transparent)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', color: '#f5dab6', fontWeight: 600, marginBottom: 4 }}>{item.type === 'video' ? '🎥 ' : item.type === 'audio' ? '🎙️ ' : ''}{item.author}</p>
                  {item.caption && <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'rgba(245,218,182,.75)', fontStyle: 'italic', maxWidth: 480 }}>{item.caption}</p>}
                </div>
                <p style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.4)', flexShrink: 0, paddingLeft: 16 }}>{current + 1} / {photos.length}</p>
              </div>
              <button onClick={() => setCurrent(c => (c - 1 + photos.length) % photos.length)} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', fontSize: '2rem', borderRadius: '50%', width: 52, height: 52, cursor: 'pointer', display: 'grid', placeItems: 'center' }} aria-label="Foto anterior">‹</button>
              <button onClick={advance} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', fontSize: '2rem', borderRadius: '50%', width: 52, height: 52, cursor: 'pointer', display: 'grid', placeItems: 'center' }} aria-label="Próxima foto">›</button>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>
              <div style={{ fontSize: '5rem', marginBottom: 20 }}>🧸</div>
              <p style={{ fontFamily: 'serif', fontSize: '1.4rem' }}>Aguardando fotos…</p>
            </div>
          )}
          <button onClick={exitPresentation} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', borderRadius: 12, padding: '8px 14px', fontFamily: 'serif', fontSize: '.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>✕ Sair</button>
        </div>
      )}

      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 200, background: 'rgba(192,57,43,.85)', color: '#fff', padding: '6px 14px', borderRadius: 999, fontSize: '0.85rem', fontWeight: 700, letterSpacing: '.1em', display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse 1.2s infinite', flexShrink: 0 }} />
        AO VIVO
      </div>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
        {liveReactions.map(r => (
          <div key={r.id} style={{ position: 'absolute', bottom: '15%', left: `${r.x}%`, fontSize: '3.5rem', animation: 'tvReactionFloat 3s ease-out forwards', pointerEvents: 'none', lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.5))' }}>
            {r.emoji}
          </div>
        ))}
      </div>

      {liveAnnounce && <AnnounceBanner message={liveAnnounce.message} onClose={() => setLiveAnnounce(null)} />}
    </>
  )
}
