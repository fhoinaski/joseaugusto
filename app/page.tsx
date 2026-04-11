'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

interface MediaItem { id: string; thumbUrl: string; fullUrl: string; author: string; type: 'image'|'video'; createdAt: string }
interface ToastMsg  { id: string; text: string; thumb?: string }
interface FilterDef { id: string; label: string; css: string }

const FILTERS: FilterDef[] = [
  { id:'normal',   label:'Original',  css:'none' },
  { id:'vivid',    label:'Vívido',    css:'saturate(1.6) contrast(1.1)' },
  { id:'warm',     label:'Quente',    css:'sepia(0.3) saturate(1.4) brightness(1.05)' },
  { id:'cool',     label:'Frio',      css:'hue-rotate(20deg) saturate(1.2) brightness(1.05)' },
  { id:'vintage',  label:'Vintage',   css:'sepia(0.5) contrast(0.9) brightness(0.95) saturate(0.8)' },
  { id:'dramatic', label:'Dramático', css:'contrast(1.3) saturate(1.3) brightness(0.9)' },
  { id:'soft',     label:'Suave',     css:'brightness(1.08) contrast(0.92) saturate(0.9)' },
  { id:'bw',       label:'P&B',       css:'grayscale(1) contrast(1.1)' },
  { id:'fade',     label:'Desbotado', css:'brightness(1.15) contrast(0.85) saturate(0.7)' },
  { id:'golden',   label:'Dourado',   css:'sepia(0.6) brightness(1.1) saturate(1.3)' },
]

// ── Onboarding ────────────────────────────────────────────────────────────
function Onboarding({ onDone }: { onDone: () => void }) {
  const [hiding, setHiding] = useState(false)
  const finish = () => { setHiding(true); setTimeout(onDone, 600) }
  return (
    <div className={`onboard-overlay${hiding ? ' hiding' : ''}`}>
      <span className="onboard-bear">🐻</span>
      <h1 className="onboard-name">José Augusto</h1>
      <p className="onboard-sub">25 de Abril · Chá de Bebê</p>
      <div className="onboard-steps">
        <div className="onboard-step"><span className="onboard-step-icon">📷</span><p className="onboard-step-text">Veja as fotos em tempo real</p></div>
        <div className="onboard-step"><span className="onboard-step-icon">✨</span><p className="onboard-step-text">Edite e compartilhe as suas</p></div>
        <div className="onboard-step"><span className="onboard-step-icon">🎉</span><p className="onboard-step-text">Acompanhe o evento ao vivo</p></div>
      </div>
      <button className="onboard-btn" onClick={finish}>Entrar no álbum</button>
      <p className="onboard-pwa">📲 Adicione à tela inicial para acesso rápido</p>
    </div>
  )
}

// ── Compress image before upload ──────────────────────────────────────────
async function compressImage(file: File, maxPx = 1800, quality = 0.88): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', quality)
    }
    img.onerror = () => resolve(file)
    img.src = url
  })
}

// ── Photo Editor ──────────────────────────────────────────────────────────
function PhotoEditor({ file, onConfirm, onCancel }: { file: File; onConfirm: (blob: Blob) => void; onCancel: () => void }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const imgRef      = useRef<HTMLImageElement | null>(null)
  const previews    = useRef<HTMLCanvasElement[]>([])
  const [filter,     setFilter]     = useState('normal')
  const [brightness, setBrightness] = useState(100)
  const [contrast,   setContrast]   = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [ready,      setReady]      = useState(false)

  const filterCSS = useCallback((f: string, b: number, c: number, s: number) => {
    const base = FILTERS.find(x => x.id === f)?.css ?? 'none'
    return `${base} brightness(${b}%) contrast(${c}%) saturate(${s}%)`
  }, [])

  const draw = useCallback(() => {
    const cv = canvasRef.current; const img = imgRef.current
    if (!cv || !img) return
    const ctx = cv.getContext('2d')!
    cv.width = img.naturalWidth; cv.height = img.naturalHeight
    ctx.filter = filterCSS(filter, brightness, contrast, saturation)
    ctx.drawImage(img, 0, 0)
  }, [filter, brightness, contrast, saturation, filterCSS])

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setReady(true)
      draw()
      // Draw filter previews
      FILTERS.forEach((f, i) => {
        const c = previews.current[i]
        if (!c) return
        const ctx = c.getContext('2d')!
        c.width = 80; c.height = 80
        ctx.filter = f.css
        ctx.drawImage(img, 0, 0, 80, 80)
      })
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => { if (ready) draw() }, [draw, ready])

  const confirm = () => {
    canvasRef.current?.toBlob(blob => { if (blob) onConfirm(blob) }, 'image/jpeg', 0.92)
  }

  return (
    <div className="editor-wrap">
      <div className="editor-canvas-wrap">
        {!ready && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><div className="preview-spinner" /></div>}
        <canvas ref={canvasRef} style={{ opacity: ready ? 1 : 0, transition: 'opacity .3s' }} />
      </div>
      <div className="filters-row">
        {FILTERS.map((f, i) => (
          <button key={f.id} className={`filter-btn${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>
            <canvas ref={el => { if (el) previews.current[i] = el }} className="filter-preview" />
            <span className="filter-name">{f.label}</span>
          </button>
        ))}
      </div>
      <div className="adjust-row">
        {[
          { label:'Brilho',    val:brightness, set:setBrightness, min:50, max:150 },
          { label:'Contraste', val:contrast,   set:setContrast,   min:50, max:150 },
          { label:'Saturação', val:saturation, set:setSaturation, min:0,  max:200 },
        ].map(({ label, val, set, min, max }) => (
          <div key={label} className="adjust-item">
            <label><span>{label}</span><span>{val}%</span></label>
            <input type="range" min={min} max={max} value={val} step={1}
              onChange={e => set(Number(e.target.value))} />
          </div>
        ))}
      </div>
      <div className="editor-actions">
        <button className="btn-secondary" onClick={onCancel} style={{ fontSize:'.9rem', padding:'10px 16px' }}>← Voltar</button>
        <button className="btn-primary" onClick={confirm} style={{ fontSize:'.9rem', padding:'10px 20px', flex:2, justifyContent:'center' }}>✓ Usar esta foto</button>
      </div>
    </div>
  )
}

// ── Upload Modal ──────────────────────────────────────────────────────────
interface QItem { file: Blob; name: string; preview: string; status:'waiting'|'uploading'|'done'|'error'; progress:number; error?:string; type:'image'|'video' }

function UploadModal({ onClose, onSuccess, authorDefault }: { onClose:()=>void; onSuccess:(a:string,t:string)=>void; authorDefault:string }) {
  const [author,    setAuthor]    = useState(authorDefault)
  const [step,      setStep]      = useState<'source'|'loading'|'edit'|'queue'>('source')
  const [editFile,  setEditFile]  = useState<File | null>(null)
  const [queue,     setQueue]     = useState<QItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [compPct,   setCompPct]   = useState(0)
  const fileRef   = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const videoRef  = useRef<HTMLInputElement>(null)
  const allDone = queue.length > 0 && queue.every(q => q.status === 'done' || q.status === 'error')

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || !files[0]) return
    if (files.length === 1 && files[0].type.startsWith('image/')) {
      // Show loading immediately with thumbnail
      setStep('loading')
      const file = files[0]
      // Show compressed preview fast
      setCompPct(0)
      const interval = setInterval(() => setCompPct(p => Math.min(p + 20, 90)), 80)
      await new Promise(r => setTimeout(r, 50)) // let UI render
      setEditFile(file)
      clearInterval(interval)
      setCompPct(100)
      setTimeout(() => setStep('edit'), 150)
    } else {
      // Multiple files — compress all then queue
      setStep('loading')
      const items: QItem[] = []
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        setCompPct(Math.round(((i + 1) / files.length) * 100))
        const isImg = f.type.startsWith('image/')
        const blob = isImg ? await compressImage(f, 1800) : f
        items.push({ file: blob, name: f.name, preview: URL.createObjectURL(blob), status:'waiting', progress:0, type: isImg ? 'image' : 'video' })
      }
      setQueue(items)
      setStep('queue')
    }
  }

  const handleEditorConfirm = async (blob: Blob) => {
    setStep('loading')
    setCompPct(0)
    // Compress editor output
    const interval = setInterval(() => setCompPct(p => Math.min(p + 25, 90)), 80)
    await new Promise(r => setTimeout(r, 50))
    clearInterval(interval); setCompPct(100)
    const item: QItem = { file: blob, name: editFile?.name ?? 'foto.jpg', preview: URL.createObjectURL(blob), status:'waiting', progress:0, type:'image' }
    setQueue([item])
    setTimeout(() => setStep('queue'), 100)
  }

  const uploadAll = async () => {
    if (uploading) return
    setUploading(true)
    let lastThumb = ''
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === 'done') continue
      setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status:'uploading', progress:10 } : q))
      try {
        const fd = new FormData()
        fd.append('media', queue[i].file, queue[i].name)
        fd.append('author', author || 'Convidado')
        const timer = setInterval(() =>
          setQueue(prev => prev.map((q, idx) => idx === i && q.progress < 85 ? { ...q, progress: q.progress + 15 } : q)), 250)
        const res  = await fetch('/api/upload', { method:'POST', body:fd })
        clearInterval(timer)
        const data = await res.json()
        if (res.ok) {
          lastThumb = queue[i].preview
          setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status:'done', progress:100 } : q))
        } else {
          setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status:'error', error: data.error } : q))
        }
      } catch {
        setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status:'error', error:'Erro de conexão' } : q))
      }
    }
    setUploading(false)
    if (lastThumb) onSuccess(author || 'Convidado', lastThumb)
  }

  return (
    <div className="modal-overlay" onClick={step === 'source' ? onClose : undefined}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />

        {step === 'source' && (
          <>
            <p className="modal-label">✦ Compartilhe suas fotos ✦</p>
            <h2 className="modal-title">Adicionar ao álbum</h2>
            <p className="modal-hint">Sua foto aparece no mural imediatamente 🌸</p>
            <input className="name-input" placeholder="Seu nome (opcional — aparece na foto)"
              value={author} onChange={e => setAuthor(e.target.value)} maxLength={60} />
            <div className="source-grid">
              <button className="source-btn" onClick={() => cameraRef.current?.click()}>
                <span className="source-btn-icon">📷</span>
                <span className="source-btn-label">Câmera</span>
                <span className="source-btn-sub">Tirar foto agora</span>
              </button>
              <button className="source-btn" onClick={() => { if(fileRef.current){fileRef.current.multiple=false; fileRef.current.click()} }}>
                <span className="source-btn-icon">🖼️</span>
                <span className="source-btn-label">Galeria</span>
                <span className="source-btn-sub">Editar e enviar</span>
              </button>
              <button className="source-btn" onClick={() => videoRef.current?.click()}>
                <span className="source-btn-icon">🎥</span>
                <span className="source-btn-label">Vídeo</span>
                <span className="source-btn-sub">Compartilhar vídeo</span>
              </button>
              <button className="source-btn" onClick={() => { if(fileRef.current){fileRef.current.multiple=true; fileRef.current.click()} }}>
                <span className="source-btn-icon">📚</span>
                <span className="source-btn-label">Várias fotos</span>
                <span className="source-btn-sub">Enviar de uma vez</span>
              </button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e => handleImageFiles(e.target.files)} />
            <input ref={fileRef}   type="file" accept="image/*" style={{display:'none'}} onChange={e => handleImageFiles(e.target.files)} />
            <input ref={videoRef}  type="file" accept="video/*" style={{display:'none'}} onChange={e => {
              if (!e.target.files) return
              const items: QItem[] = Array.from(e.target.files).map(f => ({ file:f, name:f.name, preview:URL.createObjectURL(f), status:'waiting', progress:0, type:'video' }))
              setQueue(items); setStep('queue')
            }} />
          </>
        )}

        {step === 'loading' && (
          <div className="preview-loading" style={{ minHeight:220 }}>
            <div className="preview-spinner" />
            <div style={{ width:'100%', padding:'0 20px' }}>
              <div className="compress-bar-wrap"><div className="compress-bar" style={{ width:`${compPct}%` }} /></div>
              <p className="compress-label" style={{ textAlign:'center' }}>
                {compPct < 100 ? `Otimizando… ${compPct}%` : 'Pronto!'}
              </p>
            </div>
          </div>
        )}

        {step === 'edit' && editFile && (
          <>
            <p className="modal-label">✦ Editar foto ✦</p>
            <h2 className="modal-title" style={{ marginBottom:16 }}>Personalize</h2>
            <PhotoEditor file={editFile} onConfirm={handleEditorConfirm} onCancel={() => setStep('source')} />
          </>
        )}

        {step === 'queue' && (
          <>
            <p className="modal-label">✦ {allDone ? 'Concluído' : 'Enviando'} ✦</p>
            <h2 className="modal-title" style={{ marginBottom:16 }}>
              {allDone ? '🌸 Tudo enviado!' : `${queue.length} arquivo${queue.length > 1 ? 's' : ''}`}
            </h2>
            <div className="queue-list">
              {queue.map((q, i) => (
                <div key={i} className="queue-item">
                  {q.type === 'image'
                    ? <img src={q.preview} alt="" className="queue-thumb" />
                    : <div className="queue-thumb" style={{ background:'var(--beige)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem' }}>🎥</div>
                  }
                  <div className="queue-info">
                    <p className="queue-name">{q.name}</p>
                    <div className="queue-bar-wrap"><div className="queue-bar" style={{ width:`${q.progress}%` }} /></div>
                    <p className={`queue-status ${q.status}`}>
                      {q.status === 'waiting'   && 'Aguardando…'}
                      {q.status === 'uploading' && 'Enviando…'}
                      {q.status === 'done'      && '✓ No mural!'}
                      {q.status === 'error'     && `✗ ${q.error}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {!uploading && !allDone && (
              <button className="btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={uploadAll}>
                📤 Enviar {queue.length > 1 ? `${queue.length} arquivos` : 'agora'}
              </button>
            )}
            {uploading && <p style={{ textAlign:'center', color:'var(--bl)', fontStyle:'italic', fontSize:'.92rem' }}>Não feche enquanto envia…</p>}
            {allDone && (
              <div style={{ display:'flex', gap:10 }}>
                {queue.some(q => q.status === 'error') && (
                  <button className="btn-secondary" style={{ flex:1 }}
                    onClick={() => { setQueue(prev => prev.map(q => q.status === 'error' ? { ...q, status:'waiting', progress:0 } : q)); setUploading(false) }}>
                    🔄 Tentar novamente
                  </button>
                )}
                <button className="btn-primary" style={{ flex:2, justifyContent:'center' }} onClick={onClose}>✓ Fechar</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Lightbox ──────────────────────────────────────────────────────────────
function Lightbox({ items, index, onClose, onNav }: { items:MediaItem[]; index:number; onClose:()=>void; onNav:(n:number)=>void }) {
  const item = items[index]
  const touchStart = useRef<number | null>(null)

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowRight')  onNav(1)
      if (e.key === 'ArrowLeft')   onNav(-1)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose, onNav])

  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX }
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (touchStart.current === null) return
    const diff = touchStart.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) onNav(diff > 0 ? 1 : -1)
    touchStart.current = null
  }

  // Show max 5 dots around current
  const dotRange = Math.min(items.length, 7)
  const start = Math.max(0, Math.min(index - 3, items.length - dotRange))
  const dots = Array.from({ length: dotRange }, (_, i) => start + i)

  return (
    <div className="lightbox" onClick={onClose} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <button className="lightbox-close" onClick={onClose}>✕</button>

      {/* Always rendered, disabled when at edge */}
      <button className="lightbox-nav lightbox-prev" disabled={index === 0}
        onClick={e => { e.stopPropagation(); onNav(-1) }}>‹</button>
      <button className="lightbox-nav lightbox-next" disabled={index === items.length - 1}
        onClick={e => { e.stopPropagation(); onNav(1) }}>›</button>

      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        {item.type === 'video'
          ? <video src={item.fullUrl} className="lightbox-media" controls autoPlay />
          : <img src={item.fullUrl} alt={item.author} className="lightbox-media" />
        }
        <p className="lightbox-caption">
          📷 {item.author} · {new Date(item.createdAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'long' })}
        </p>
      </div>

      {items.length > 1 && (
        <div className="lightbox-counter">
          {dots.map(i => <div key={i} className={`lightbox-dot${i === index ? ' active' : ''}`} />)}
        </div>
      )}
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────
function ToastManager({ toasts, onRemove }: { toasts:ToastMsg[]; onRemove:(id:string)=>void }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className="toast-item" onClick={() => onRemove(t.id)}>
          {t.thumb && <img src={t.thumb} alt="" className="toast-photo" />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}

// ── PWA Banner ────────────────────────────────────────────────────────────
function PWABanner() {
  const [prompt, setPrompt] = useState<any>(null)
  const [show,   setShow]   = useState(false)
  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); setPrompt(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  if (!show) return null
  return (
    <div className="pwa-banner">
      <span className="pwa-banner-icon">📱</span>
      <div className="pwa-banner-text">
        <p className="pwa-banner-title">Instalar o app</p>
        <p className="pwa-banner-sub">Acesse rápido direto da tela inicial</p>
      </div>
      <button className="pwa-banner-btn" onClick={() => { prompt?.prompt(); setShow(false) }}>Instalar</button>
      <button className="pwa-dismiss" onClick={() => setShow(false)}>✕</button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function Home() {
  const [showOnboard,  setShowOnboard]  = useState(false)
  const [media,        setMedia]        = useState<MediaItem[]>([])
  const [loading,      setLoading]      = useState(true)
  const [nextCursor,   setNextCursor]   = useState<string | null>(null)
  const [lbIdx,        setLbIdx]        = useState<number | null>(null)
  const [showUpload,   setShowUpload]   = useState(false)
  const [toasts,       setToasts]       = useState<ToastMsg[]>([])
  const [parentsMsg,   setParentsMsg]   = useState('')
  const [savedAuthor,  setSavedAuthor]  = useState('')
  const [viewMode,     setViewMode]     = useState<'grid'|'masonry'>('grid')
  const lastRtTs   = useRef<number>(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const obsRef      = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('cha_visited')) setShowOnboard(true)
    setSavedAuthor(localStorage.getItem('cha_author') ?? '')
  }, [])

  const fetchMedia = useCallback(async (cursor?: string) => {
    const res  = await fetch(cursor ? `/api/photos?cursor=${cursor}` : '/api/photos')
    const data = await res.json()
    setMedia(prev => cursor ? [...prev, ...(data.media ?? [])] : (data.media ?? []))
    setNextCursor(data.nextCursor ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !nextCursor) return
    obsRef.current?.disconnect()
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fetchMedia(nextCursor!)
    }, { rootMargin: '400px' })
    obs.observe(sentinelRef.current)
    obsRef.current = obs
    return () => obs.disconnect()
  }, [nextCursor, fetchMedia])

  // Parents message
  useEffect(() => {
    fetch('/api/admin/message').then(r => r.json()).then(d => setParentsMsg(d.message ?? ''))
    const t = setInterval(() => fetch('/api/admin/message').then(r => r.json()).then(d => setParentsMsg(d.message ?? '')), 30000)
    return () => clearInterval(t)
  }, [])

  // Realtime
  useEffect(() => {
    fetch('/api/realtime').then(r => r.json()).then(({ data }) => { if (data?.ts) lastRtTs.current = data.ts })
    const poll = async () => {
      try {
        const { data } = await (await fetch('/api/realtime')).json()
        if (data?.ts && data.ts > lastRtTs.current && data.ts > Date.now() - 30000) {
          lastRtTs.current = data.ts
          const id = Math.random().toString(36).slice(2)
          const text = data.author !== 'Convidado' ? `${data.author} adicionou uma foto! 📷` : 'Nova foto adicionada! 📷'
          setToasts(prev => [...prev.slice(-2), { id, text, thumb: data.thumbUrl }])
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
          setTimeout(() => fetchMedia(), 2000)
        }
      } catch {}
    }
    const t = setInterval(poll, 10000)
    return () => clearInterval(t)
  }, [fetchMedia])

  // Reveal on scroll
  useEffect(() => {
    if (loading) return
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }), { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [loading])

  const addToast = (text: string, thumb?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-2), { id, text, thumb }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  const handleUploadSuccess = (author: string, thumb: string) => {
    if (author && author !== 'Convidado') { localStorage.setItem('cha_author', author); setSavedAuthor(author) }
    addToast('Foto enviada ao álbum! 🌸', thumb)
    setTimeout(() => fetchMedia(), 2500)
  }

  return (
    <>
      {[['5%','18s','0s'],['88%','22s','7s'],['48%','20s','13s']].map(([l,d,delay],i) => (
        <div key={i} className="balloon" style={{ left:l, animationDuration:d, animationDelay:delay }}>🎈</div>
      ))}

      {showOnboard && <Onboarding onDone={() => { localStorage.setItem('cha_visited','1'); setShowOnboard(false) }} />}

      {/* Hero */}
      <section className="hero">
        <p className="hero-tag">✦ Chá de Bebê ✦</p>
        <span className="hero-bear">🐻</span>
        <h1 className="hero-name">José Augusto</h1>
        <div className="hero-divider" />
        <p className="hero-date">25 de Abril · 2026</p>
        <p className="hero-sub">Sábado, às 17 horas</p>
        <div className="hero-cta">
          <a href="#galeria" className="btn-primary">📷 Ver o álbum</a>
          <button className="btn-secondary" onClick={() => setShowUpload(true)}>🌿 Compartilhar</button>
        </div>
        {media.length > 0 && (
          <div className="online-badge" style={{ marginTop:20 }}>
            <span className="online-dot" />
            {media.length} {media.length === 1 ? 'foto' : 'fotos'} no álbum
          </div>
        )}
      </section>

      <div className="leaves">🌿 🌸 🌿 🌸 🌿</div>

      {/* Parents message */}
      {parentsMsg && (
        <div className="parents-section reveal">
          <p className="section-label">✦ Uma mensagem de amor ✦</p>
          <div className="parents-card">
            <p className="parents-quote">{parentsMsg}</p>
            <p className="parents-sig">— papai e mamãe</p>
          </div>
        </div>
      )}

      <div className="leaves" style={{ opacity:.3, marginTop:8 }}>· · · ✦ · · ·</div>

      {/* Gallery */}
      <section className="gallery-section reveal" id="galeria">
        <div className="section-header">
          <p className="section-label">✦ Álbum ao vivo ✦</p>
          <h2 className="section-title">Momentos <em>especiais</em></h2>
          {!loading && media.length > 0 && (
            <div className="view-toggle">
              <button className={`view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')}>⊞ Grade</button>
              <button className={`view-btn${viewMode === 'masonry' ? ' active' : ''}`} onClick={() => setViewMode('masonry')}>▤ Mosaico</button>
            </div>
          )}
        </div>

        {loading && (
          <div className={viewMode === 'masonry' ? 'skel-masonry' : 'gallery-grid'}>
            {[200,160,220,140,180,200,160,140,200].map((h,i) => (
              <div key={i} className="skel-item" style={{ height: viewMode === 'masonry' ? h : undefined, aspectRatio: viewMode === 'grid' ? '1' : undefined }} />
            ))}
          </div>
        )}

        {!loading && media.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 24px', color:'var(--bl)', fontStyle:'italic' }}>
            <div style={{ fontSize:'3rem', marginBottom:16 }}>📷</div>
            <p>As fotos aparecerão aqui assim que forem enviadas.</p>
            <button className="btn-secondary" style={{ marginTop:24 }} onClick={() => setShowUpload(true)}>🌸 Seja o primeiro a compartilhar</button>
          </div>
        )}

        {!loading && media.length > 0 && viewMode === 'grid' && (
          <div className="gallery-grid">
            {media.map((item, i) => (
              <div key={item.id} className="gallery-card" style={{ animationDelay:`${(i % 8) * 0.055}s` }} onClick={() => setLbIdx(i)}>
                {item.type === 'video'
                  ? <video src={item.thumbUrl} muted playsInline />
                  : <img src={item.thumbUrl} alt={item.author} loading="lazy" />
                }
                {item.type === 'video' && <div className="gallery-card-type">▶ Vídeo</div>}
                <div className="gallery-card-footer">
                  <span className="gallery-card-author">📷 {item.author}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && media.length > 0 && viewMode === 'masonry' && (
          <div className="masonry">
            {media.map((item, i) => (
              <div key={item.id} className="masonry-item" style={{ animationDelay:`${(i % 8) * 0.055}s` }} onClick={() => setLbIdx(i)}>
                {item.type === 'video' ? <video src={item.thumbUrl} muted playsInline style={{ width:'100%', display:'block' }} /> : <img src={item.thumbUrl} alt={item.author} loading="lazy" />}
                {item.type === 'video' && <div className="masonry-type-badge">▶ Vídeo</div>}
                <div className="masonry-overlay"><span className="masonry-author">📷 {item.author}</span></div>
              </div>
            ))}
          </div>
        )}

        <div ref={sentinelRef} style={{ height:40 }} />
      </section>

      {/* Info — removed gift card */}
      <div className="info-strip reveal">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-icon">📅</span>
            <p className="info-lbl">Data</p>
            <p className="info-val">25 de Abril<br /><small style={{ fontSize:'.82rem', color:'var(--bl)' }}>Sábado, 17h</small></p>
          </div>
          <div className="info-item">
            <span className="info-icon">📍</span>
            <p className="info-lbl">Local</p>
            <p className="info-val" style={{ fontSize:'.92rem' }}>Salão Alto dos Ingleses<br /><small style={{ fontSize:'.8rem', color:'var(--bl)' }}>Rod. João Gualberto, 1836 · Floripa</small></p>
          </div>
        </div>
      </div>

      <footer className="reveal">
        <span className="footer-bear">🐻</span>
        <p className="footer-text">Bem-vindo ao mundo, José Augusto</p>
        <div style={{ width:80, height:1, background:'linear-gradient(to right,transparent,var(--sand),transparent)', margin:'16px auto' }} />
        <p className="footer-sub">com muito amor · papai e mamãe</p>
        <a href="/admin" style={{ display:'block', marginTop:24, fontSize:'.72rem', color:'var(--sand)', textDecoration:'none', letterSpacing:'.12em', opacity:.45 }}>⚙ admin</a>
      </footer>

      <button className="fab" onClick={() => setShowUpload(true)} aria-label="Enviar foto">
        📤<span className="fab-tooltip">Enviar foto ou vídeo</span>
      </button>

      {lbIdx !== null && (
        <Lightbox items={media} index={lbIdx} onClose={() => setLbIdx(null)}
          onNav={d => setLbIdx(prev => prev !== null ? Math.max(0, Math.min(media.length - 1, prev + d)) : null)} />
      )}

      {showUpload && (
        <UploadModal authorDefault={savedAuthor} onClose={() => setShowUpload(false)} onSuccess={handleUploadSuccess} />
      )}

      <ToastManager toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
      <PWABanner />
    </>
  )
}
