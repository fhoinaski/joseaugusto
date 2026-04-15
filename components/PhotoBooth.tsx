'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface PlacedSticker {
  id: string
  emoji: string
  x: number
  y: number
}

interface PhotoBoothProps {
  onCapture: (file: File) => void
  onClose: () => void
}

const STICKER_PALETTE = ['🧸', '🍼', '👶', '🌸', '⭐', '🎀', '🌙', '☁️', '💛', '🎊', '🩵', '🌈', '✨', '💕', '🎈', '🌟']

const FILTERS = [
  { id: 'none',    label: 'Original', css: 'none' },
  { id: 'quente',  label: 'Quente',   css: 'sepia(0.3) saturate(1.3) brightness(1.05)' },
  { id: 'suave',   label: 'Suave',    css: 'contrast(0.9) brightness(1.08) saturate(0.9)' },
  { id: 'vintage', label: 'Vintage',  css: 'sepia(0.5) contrast(0.85) brightness(0.95)' },
  { id: 'pb',      label: 'P&B',      css: 'grayscale(1) contrast(1.05)' },
  { id: 'vivo',    label: 'Vivo',     css: 'saturate(1.6) contrast(1.08)' },
]

const iconBtn: React.CSSProperties = {
  width: 44, height: 44, borderRadius: '50%', border: 'none',
  background: 'rgba(0,0,0,.45)', color: '#fff', fontSize: '1.15rem',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', flexShrink: 0,
}

type BoomerangState = 'idle' | 'recording' | 'preview'

export default function PhotoBooth({ onCapture, onClose }: PhotoBoothProps) {
  const [status, setStatus] = useState<'loading' | 'live' | 'countdown' | 'preview' | 'error'>('loading')
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const [filter, setFilter] = useState('none')
  const [panel, setPanel] = useState<'filter' | 'sticker' | 'clip'>('filter')
  const [stickers, setStickers] = useState<PlacedSticker[]>([])
  const [countdown, setCountdown] = useState(3)
  const [capturedUrl, setCapturedUrl] = useState('')
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [errMsg, setErrMsg] = useState('')

  // Clip / Boomerang state
  const [boomerangState, setBoomerangState] = useState<BoomerangState>('idle')
  const [clipUrl, setClipUrl] = useState('')
  const [clipBlob, setClipBlob] = useState<Blob | null>(null)
  const [clipCountdown, setClipCountdown] = useState(3)

  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const dragRef     = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const clipUrlRef = useRef<string>('')

  /* ── Camera ─────────────────────────────────────────────────────── */
  const startCamera = useCallback(async (facingMode: 'user' | 'environment') => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setStatus('loading')
    setErrMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('live')
    } catch {
      setErrMsg('Não foi possível acessar a câmera.\nVerifique as permissões do navegador.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    startCamera('environment')
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current)
    }
  }, [startCamera])

  const flipCamera = () => {
    const next = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    startCamera(next)
  }

  /* ── Clip / Boomerang ────────────────────────────────────────────── */
  const startBoomerang = () => {
    if (!streamRef.current) return
    if (clipUrlRef.current) {
      URL.revokeObjectURL(clipUrlRef.current)
      clipUrlRef.current = ''
    }
    chunksRef.current = []
    // Pick the best supported codec — always include opus for audio
    const mimeType = typeof MediaRecorder !== 'undefined'
      ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
            ? 'video/webm;codecs=vp8,opus'
            : 'video/webm')
      : 'video/webm'
    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      clipUrlRef.current = url
      setClipBlob(blob)
      setClipUrl(url)
      setBoomerangState('preview')
    }
    mediaRecorderRef.current = recorder
    recorder.start()
    setBoomerangState('recording')
    setClipCountdown(3)

    // Visual countdown: 3 → 2 → 1
    let c = 3
    const tick = setInterval(() => {
      c -= 1
      setClipCountdown(c)
      if (c <= 0) clearInterval(tick)
    }, 1000)

    setTimeout(() => {
      clearInterval(tick)
      recorder.stop()
    }, 3000)
  }

  const rerecordClip = () => {
    if (clipUrlRef.current) {
      URL.revokeObjectURL(clipUrlRef.current)
      clipUrlRef.current = ''
    }
    setClipUrl('')
    setClipBlob(null)
    setBoomerangState('idle')
  }

  const downloadClip = () => {
    if (!clipUrl) return
    const a = document.createElement('a')
    a.href = clipUrl
    a.download = 'boomerang-cha-jose.webm'
    a.click()
  }

  const sendClipToFeed = () => {
    if (!clipBlob) return
    const file = new File([clipBlob], `clipe-${Date.now()}.webm`, { type: clipBlob.type || 'video/webm' })
    onCapture(file)
  }

  /* ── Stickers ────────────────────────────────────────────────────── */
  const addSticker = (emoji: string) => {
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    // Place in camera area (above the bottom overlay ~160px)
    setStickers(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      emoji,
      x: width * 0.15 + Math.random() * width * 0.7,
      y: height * 0.08 + Math.random() * (height * 0.55),
    }])
  }

  const onStickerPointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault(); e.stopPropagation()
    const s = stickers.find(s => s.id === id)
    if (!s) return
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: s.x, origY: s.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const { id, startX, startY, origX, origY } = dragRef.current
    setStickers(prev => prev.map(s =>
      s.id === id ? { ...s, x: origX + e.clientX - startX, y: origY + e.clientY - startY } : s,
    ))
  }

  /* ── Capture ─────────────────────────────────────────────────────── */
  const capture = useCallback(() => {
    const video     = videoRef.current
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!video || !canvas || !container) return

    const vw = video.videoWidth  || 1280
    const vh = video.videoHeight || 720
    canvas.width  = vw
    canvas.height = vh
    const ctx = canvas.getContext('2d')!

    const filterCss = FILTERS.find(f => f.id === filter)?.css ?? 'none'
    if (filterCss !== 'none') ctx.filter = filterCss

    if (facing === 'user') {
      ctx.save(); ctx.scale(-1, 1); ctx.drawImage(video, -vw, 0, vw, vh); ctx.restore()
    } else {
      ctx.drawImage(video, 0, 0, vw, vh)
    }
    ctx.filter = 'none'

    // Stickers — scale from display coords to video resolution
    const rect = container.getBoundingClientRect()
    const sx = vw / rect.width
    const sy = vh / rect.height
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    for (const s of stickers) {
      ctx.font = `${Math.round(56 * Math.min(sx, sy))}px serif`
      ctx.fillText(s.emoji, s.x * sx, s.y * sy)
    }

    // Watermark
    ctx.font      = `${Math.round(18 * sx)}px serif`
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.textAlign    = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText('Chá · José Augusto 🧸', vw - 14 * sx, vh - 10 * sy)

    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], `booth-${Date.now()}.webp`, { type: 'image/webp' })
      setCapturedFile(file)
      setCapturedUrl(URL.createObjectURL(blob))
      streamRef.current?.getTracks().forEach(t => t.stop())
      setStatus('preview')
    }, 'image/webp', 0.92)
  }, [filter, facing, stickers])

  // Dispara direto — sem countdown
  const startCountdown = () => {
    if (status !== 'live') return
    capture()
  }

  const retake = () => {
    setCapturedUrl(''); setCapturedFile(null); setStickers([])
    setBoomerangState('idle'); setClipUrl('')
    startCamera(facing)
  }

  const filterCss = FILTERS.find(f => f.id === filter)?.css ?? 'none'
  const isLive    = status === 'live' || status === 'countdown'

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2500, background: '#000' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ── Full-screen camera container — controls overlay on top ── */}
      <div
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerUp={() => { dragRef.current = null }}
        onPointerLeave={() => { dragRef.current = null }}
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Live video */}
        <video
          ref={videoRef} playsInline muted autoPlay
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
            display: status === 'preview' ? 'none' : 'block',
            filter: filterCss,
            transform: facing === 'user' ? 'scaleX(-1)' : 'none',
          }}
        />

        {/* Captured preview */}
        {status === 'preview' && capturedUrl && (
          <img
            src={capturedUrl} alt="Capturado"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}

        {/* Loading */}
        {status === 'loading' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div className="preview-spinner" style={{ borderColor: 'rgba(255,255,255,.15)', borderTopColor: '#c9a87c' }} />
            <p style={{ color: 'rgba(255,255,255,.55)', margin: 0, fontSize: '.85rem', fontFamily: 'sans-serif' }}>Iniciando câmera…</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }}>
            <span style={{ fontSize: '3rem' }}>🚫</span>
            <p style={{ color: '#fff', margin: 0, textAlign: 'center', whiteSpace: 'pre-line', fontFamily: 'sans-serif', fontSize: '.9rem', lineHeight: 1.6 }}>{errMsg}</p>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 10, color: '#fff', padding: '10px 28px', cursor: 'pointer', fontFamily: 'sans-serif', fontSize: '.9rem' }}>Fechar</button>
          </div>
        )}

        {/* Countdown */}
        {status === 'countdown' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span
              key={countdown}
              style={{ fontSize: '9rem', color: '#fff', fontWeight: 900, textShadow: '0 4px 32px rgba(0,0,0,.7)', fontFamily: "'Playfair Display',serif", animation: 'boothPop .4s cubic-bezier(.175,.885,.32,1.275)', lineHeight: 1 }}
            >
              {countdown > 0 ? countdown : '📸'}
            </span>
          </div>
        )}

        {/* Placed stickers */}
        {isLive && stickers.map(s => (
          <div
            key={s.id}
            onPointerDown={e => onStickerPointerDown(e, s.id)}
            onDoubleClick={() => setStickers(prev => prev.filter(x => x.id !== s.id))}
            style={{
              position: 'absolute', left: s.x, top: s.y,
              transform: 'translate(-50%,-50%)',
              fontSize: '3rem', cursor: 'grab',
              userSelect: 'none', touchAction: 'none',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.5))',
              lineHeight: 1,
            }}
          >
            {s.emoji}
          </div>
        ))}

        {/* ── Clip preview overlay ── */}
        {panel === 'clip' && boomerangState === 'preview' && clipUrl && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <video
              src={clipUrl}
              autoPlay
              loop
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Clip action buttons */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,.92) 80%, transparent)',
              padding: '20px 16px',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
              display: 'flex', gap: 10,
            }}>
              <button
                onClick={rerecordClip}
                style={{
                  flex: 1, padding: '12px', borderRadius: 14,
                  border: '1.5px solid rgba(255,255,255,.2)',
                  background: 'rgba(255,255,255,.07)',
                  color: '#fff', fontSize: '.88rem',
                  fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, cursor: 'pointer',
                }}
              >
                🔄 Regravar
              </button>
              <button
                onClick={downloadClip}
                style={{
                  flex: 1, padding: '12px', borderRadius: 14,
                  border: '1.5px solid rgba(255,255,255,.25)',
                  background: 'rgba(255,255,255,.12)',
                  color: '#fff', fontSize: '.88rem',
                  fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, cursor: 'pointer',
                }}
              >
                ⬇ Baixar
              </button>
              <button
                onClick={sendClipToFeed}
                style={{
                  flex: 1.4, padding: '12px', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #c47a3a, #7a4e28)',
                  color: '#fff', fontSize: '.95rem',
                  fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(196,122,58,.45)',
                }}
              >
                📤 Enviar ao feed
              </button>
            </div>
          </div>
        )}

        {/* ── TOP BAR (overlaid) ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: 'max(14px, env(safe-area-inset-top)) 14px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, rgba(0,0,0,.6) 0%, transparent 100%)',
          pointerEvents: status === 'error' ? 'none' : 'auto',
        }}>
          <button onClick={onClose} style={iconBtn}>✕</button>
          <p style={{ margin: 0, color: '#fff', fontFamily: "'Playfair Display',serif", fontSize: '.95rem', fontWeight: 600, textShadow: '0 1px 8px rgba(0,0,0,.7)', letterSpacing: '.03em' }}>
            📸 Photo Booth
          </p>
          <div style={{ width: 44 }} />
        </div>

        {/* ── LIVE CONTROLS (overlaid at bottom) ── */}
        {isLive && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,.9) 70%, transparent 100%)',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          }}>

            {/* ── Tab selector: Filtros | Stickers | Clipe ── */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '10px 16px 6px' }}>
              {(['filter', 'sticker', 'clip'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPanel(p)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                    border: panel === p ? '1.5px solid #c9a87c' : '1.5px solid rgba(255,255,255,.2)',
                    background: panel === p ? 'rgba(201,168,124,.22)' : 'rgba(255,255,255,.07)',
                    color: panel === p ? '#f5dab6' : 'rgba(255,255,255,.55)',
                    fontSize: '.72rem', fontWeight: 700, letterSpacing: '.06em',
                    fontFamily: "'Cormorant Garamond',serif",
                    transition: 'all .15s',
                  }}
                >
                  {p === 'filter' ? '🎨 Filtros' : p === 'sticker' ? '🎭 Stickers' : '🎥 Clipe'}
                </button>
              ))}
            </div>

            {/* ── Filter strip ── */}
            {panel === 'filter' && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '2px 14px 8px', scrollbarWidth: 'none' } as React.CSSProperties}>
                {FILTERS.map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id)} style={{
                    flexShrink: 0, borderRadius: 8, cursor: 'pointer',
                    border: filter === f.id ? '2px solid #c9a87c' : '2px solid transparent',
                    background: filter === f.id ? 'rgba(201,168,124,.28)' : 'rgba(255,255,255,.1)',
                    color: filter === f.id ? '#f5dab6' : 'rgba(255,255,255,.75)',
                    fontSize: '.72rem', padding: '6px 14px',
                    fontFamily: "'Cormorant Garamond',serif", fontWeight: 700,
                  }}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Sticker palette ── */}
            {panel === 'sticker' && (
              <div style={{ display: 'flex', gap: 5, overflowX: 'auto', padding: '2px 14px 8px', scrollbarWidth: 'none' } as React.CSSProperties}>
                {STICKER_PALETTE.map(emoji => (
                  <button key={emoji} onClick={() => addSticker(emoji)} style={{
                    flexShrink: 0, width: 42, height: 42, borderRadius: 10, fontSize: '1.4rem',
                    background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {emoji}
                  </button>
                ))}
                {stickers.length > 0 && (
                  <button onClick={() => setStickers([])} title="Limpar todos" style={{
                    flexShrink: 0, width: 42, height: 42, borderRadius: 10,
                    background: 'rgba(192,57,43,.38)', border: '1px solid rgba(192,57,43,.5)',
                    color: '#fff', cursor: 'pointer', fontSize: '1rem',
                  }}>🗑️</button>
                )}
              </div>
            )}

            {/* ── Clip panel placeholder strip (keeps height consistent) ── */}
            {panel === 'clip' && (
              <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,.35)', fontSize: '.7rem', fontStyle: 'italic', fontFamily: "'Cormorant Garamond',serif" }}>
                  Grava 3 segundos de vídeo
                </p>
              </div>
            )}

            {/* ── Capture row ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 20px 2px', gap: 28 }}>

              {/* Flip camera */}
              <button onClick={flipCamera} title="Virar câmera" style={iconBtn}>🔄</button>

              {/* Clip mode: record button */}
              {panel === 'clip' ? (
                <button
                  onClick={boomerangState === 'idle' ? startBoomerang : undefined}
                  disabled={boomerangState === 'recording'}
                  aria-label="Gravar clipe"
                  style={{
                    width: 72, height: 72, borderRadius: '50%',
                    border: boomerangState === 'recording' ? '4px solid #e74c3c' : '4px solid #fff',
                    background: boomerangState === 'recording'
                      ? 'rgba(231,76,60,.25)'
                      : 'linear-gradient(135deg, #e74c3c, #922b21)',
                    cursor: boomerangState === 'recording' ? 'wait' : 'pointer',
                    boxShadow: boomerangState === 'recording'
                      ? '0 0 0 4px rgba(231,76,60,.5), 0 4px 22px rgba(0,0,0,.55)'
                      : '0 4px 22px rgba(0,0,0,.55)',
                    fontSize: boomerangState === 'recording' ? '1.1rem' : '1.75rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 2,
                    animation: boomerangState === 'recording' ? 'boothRecordPulse 1s ease-in-out infinite' : 'none',
                    transition: 'all .2s',
                  }}
                >
                  {boomerangState === 'recording' ? (
                    <>
                      <span style={{ fontSize: '1.5rem' }}>🔴</span>
                      <span style={{ fontSize: '.55rem', fontFamily: 'sans-serif', fontWeight: 700, lineHeight: 1 }}>{clipCountdown > 0 ? clipCountdown : '…'}</span>
                    </>
                  ) : '⏺'}
                </button>
              ) : (
                /* Shutter button */
                <button
                  onClick={startCountdown}
                  disabled={status === 'countdown'}
                  aria-label="Tirar foto"
                  style={{
                    width: 72, height: 72, borderRadius: '50%',
                    border: '4px solid #fff',
                    background: status === 'countdown'
                      ? 'rgba(255,255,255,.18)'
                      : 'linear-gradient(135deg, #c47a3a, #7a4e28)',
                    cursor: status === 'countdown' ? 'wait' : 'pointer',
                    boxShadow: '0 4px 22px rgba(0,0,0,.55), 0 0 0 2px rgba(196,122,58,.4)',
                    fontSize: '1.75rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform .12s',
                  }}
                >
                  {status === 'countdown' ? '⏳' : '📷'}
                </button>
              )}

              {/* Clear stickers OR placeholder */}
              {stickers.length > 0 && panel !== 'clip'
                ? <button onClick={() => setStickers([])} title="Limpar stickers" style={{ ...iconBtn, background: 'rgba(192,57,43,.4)' }}>🗑️</button>
                : <div style={{ width: 44 }} />
              }
            </div>

            {/* Hint */}
            {panel === 'sticker' && stickers.length > 0 && (
              <p style={{ margin: '4px 0 0', textAlign: 'center', color: 'rgba(255,255,255,.38)', fontSize: '.62rem', fontStyle: 'italic', lineHeight: 1 }}>
                Arraste · 2× toque para remover
              </p>
            )}

            {/* Clip recording label */}
            {panel === 'clip' && boomerangState === 'recording' && (
              <p style={{ margin: '4px 0 0', textAlign: 'center', color: '#e74c3c', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.05em', lineHeight: 1, fontFamily: 'sans-serif' }}>
                Gravando...
              </p>
            )}
          </div>
        )}

        {/* ── PREVIEW CONTROLS (overlaid at bottom) ── */}
        {status === 'preview' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,.92) 80%, transparent)',
            padding: '20px 16px',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            display: 'flex', gap: 10,
          }}>
            <button onClick={retake} style={{
              flex: 1, padding: '14px', borderRadius: 14,
              border: '1.5px solid rgba(255,255,255,.2)',
              background: 'rgba(255,255,255,.07)',
              color: '#fff', fontSize: '.92rem',
              fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, cursor: 'pointer',
            }}>🔄 Tirar novamente</button>
            <button onClick={() => capturedFile && onCapture(capturedFile)} style={{
              flex: 1.4, padding: '14px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #c47a3a, #7a4e28)',
              color: '#fff', fontSize: '.95rem',
              fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(196,122,58,.45)',
            }}>✅ Usar esta foto</button>
          </div>
        )}
      </div>
    </div>
  )
}
