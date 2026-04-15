'use client'

import { useEffect, useRef, useState } from 'react'
import { isHeicFile, prepareImageBlob, renameWithExt, validateShortVideo } from '@/lib/media-processor'
import { emitToast } from '@/lib/ui-feedback'

declare global {
  interface Window {
    __chaQueueUpload?: (blob: Blob, name: string, author?: string) => Promise<boolean>
  }
}

interface QItem {
  file: Blob
  name: string
  preview: string
  status: 'waiting' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
  type: 'image' | 'video' | 'audio'
  retries: number
  isOfflineError: boolean
}

const MAX_LS_SIZE = 5 * 1024 * 1024
const LS_KEY = 'cha_upload_queue'

const FILTERS = [
  { id: 'none',    label: 'Original', css: 'none' },
  { id: 'quente',  label: 'Quente',   css: 'sepia(0.3) saturate(1.3) brightness(1.05)' },
  { id: 'suave',   label: 'Suave',    css: 'contrast(0.9) brightness(1.08) saturate(0.9)' },
  { id: 'vintage', label: 'Vintage',  css: 'sepia(0.5) contrast(0.85) brightness(0.95)' },
  { id: 'pb',      label: 'P&B',      css: 'grayscale(1) contrast(1.05)' },
  { id: 'vivo',    label: 'Vivo',     css: 'saturate(1.6) contrast(1.08)' },
]

const FRAMES = [
  { id: 'none',    label: 'Sem moldura' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'gold',    label: 'Dourada' },
  { id: 'cha',     label: 'Chá JA' },
]

async function saveToLS(item: QItem) {
  if (item.file.size > MAX_LS_SIZE) return
  try {
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = rej
      r.readAsDataURL(item.file)
    })
    const stored: any[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
    const updated = [...stored.filter((e: any) => e.name !== item.name), { name: item.name, type: item.type, dataUrl, retries: item.retries, ts: Date.now() }]
    localStorage.setItem(LS_KEY, JSON.stringify(updated))
  } catch {}
}

function loadFromLS(): QItem[] {
  try {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const stored: any[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]').filter((e: any) => !e.ts || e.ts > cutoff)
    if (!stored.length) return []
    return stored.map((s: any) => {
      const arr = s.dataUrl.split(',')
      const mime = arr[0].match(/:(.*?);/)![1]
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8 = new Uint8Array(n)
      while (n--) u8[n] = bstr.charCodeAt(n)
      const blob = new Blob([u8], { type: mime })
      return { file: blob, name: s.name, preview: s.dataUrl, status: 'waiting' as const, progress: 0, type: s.type, retries: s.retries ?? 0, isOfflineError: false }
    })
  } catch {
    return []
  }
}

function removeFromLS(name: string) {
  try {
    const stored: any[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
    localStorage.setItem(LS_KEY, JSON.stringify(stored.filter((e: any) => e.name !== name)))
  } catch {}
}

export default function UploadModal({
  onClose,
  onSuccess,
  authorDefault,
  initialFile,
  onOpenBooth,
}: {
  onClose: () => void
  onSuccess: (author: string, thumb: string) => void
  authorDefault: string
  initialFile?: File
  onOpenBooth?: () => void
}) {
  const [author, setAuthor] = useState(authorDefault)
  const [askName, setAskName] = useState(!authorDefault.trim())
  const [authorError, setAuthorError] = useState('')
  const [mediaError, setMediaError] = useState('')
  const [caption, setCaption] = useState('')
  const [suggestingCaption, setSuggestingCaption] = useState(false)
  const [step, setStep] = useState<'source' | 'loading' | 'filter' | 'frames' | 'queue'>('source')
  const [queue, setQueue] = useState<QItem[]>([])
  const [selectedFilter, setSelectedFilter] = useState<string>('none')
  const [selectedFrame, setSelectedFrame] = useState('none')
  const [uploading, setUploading] = useState(false)
  const [compPct, setCompPct] = useState(0)
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)
  // Immediate local preview shown in the loading step before processing completes
  const [rawPreview, setRawPreview] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const vidRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)
  const uploadingRef = useRef(false)
  const uploadAllRef = useRef<() => Promise<void>>(async () => {})
  const allDone = queue.length > 0 && queue.every(q => q.status === 'done' || q.status === 'error')

  useEffect(() => {
    if (authorDefault.trim()) {
      setAskName(false)
      return
    }
    try {
      const saved = localStorage.getItem('cha_author') ?? ''
      if (saved.trim()) {
        setAuthor(saved.trim())
        setAskName(false)
      }
    } catch {}
  }, [authorDefault])

  const persistAuthor = () => {
    const safe = author.trim().slice(0, 60)
    if (!safe) {
      setAuthorError('Informe seu nome para continuar.')
      return ''
    }
    try { localStorage.setItem('cha_author', safe) } catch {}
    if (author !== safe) setAuthor(safe)
    setAuthorError('')
    setAskName(false)
    return safe
  }

  useEffect(() => {
    const pending = loadFromLS()
    if (pending.length > 0) {
      setQueue(pending)
      setStep('queue')
    }
  }, [])

  useEffect(() => {
    const goOffline = () => setIsOnline(false)
    const goOnline = () => {
      setIsOnline(true)
      setTimeout(() => {
        setQueue(prev => prev.map(q =>
          q.isOfflineError && q.retries < 3
            ? { ...q, status: 'waiting' as const, progress: 0, error: undefined, isOfflineError: false }
            : q,
        ))
        setTimeout(() => uploadAllRef.current(), 200)
      }, 2000)
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  const handleImgFiles = async (files: FileList | null) => {
    if (!persistAuthor()) return
    if (!files || files.length === 0) return

    const imageFiles = Array.from(files).filter(f =>
      f.type.startsWith('image/') || isHeicFile(f) || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f.name)
    )
    if (imageFiles.length === 0) { setMediaError('Selecione imagens válidas.'); return }
    setMediaError('')

    // Show immediate preview of first file
    const immediateUrl = URL.createObjectURL(imageFiles[0])
    setRawPreview(immediateUrl)
    setStep('loading')
    setCompPct(10)
    const pct = setInterval(() => setCompPct(p => Math.min(p + 12, 88)), 200)

    try {
      const processed = await Promise.all(imageFiles.map(async (f) => {
        try {
          const { blob, previewUrl } = await prepareImageBlob(f, 2000)
          return { file: blob, name: renameWithExt(f.name, 'webp'), preview: previewUrl, status: 'waiting' as const, progress: 0, type: 'image' as const, retries: 0, isOfflineError: false }
        } catch {
          const url = URL.createObjectURL(f)
          return { file: f, name: f.name, preview: url, status: 'waiting' as const, progress: 0, type: 'image' as const, retries: 0, isOfflineError: false }
        }
      }))
      clearInterval(pct)
      setCompPct(100)
      URL.revokeObjectURL(immediateUrl)
      setRawPreview('')
      setQueue(processed)
      setSelectedFilter('none')
      setSelectedFrame('none')
      setTimeout(() => setStep('filter'), 120)
    } catch {
      clearInterval(pct)
      setRawPreview('')
      URL.revokeObjectURL(immediateUrl)
      setMediaError('Erro ao processar imagens.')
    }
  }

  const handleAudioFiles = (files: FileList | null) => {
    if (!persistAuthor()) return
    if (!files || !files[0]) return
    setMediaError('')
    const f = files[0]
    setQueue([{ file: f, name: f.name, preview: '', status: 'waiting', progress: 0, type: 'audio', retries: 0, isOfflineError: false }])
    setStep('queue')
  }

  // Process initialFile if provided (coming from Photo Booth)
  const handleImgFilesRef = useRef(handleImgFiles)
  handleImgFilesRef.current = handleImgFiles

  useEffect(() => {
    if (!initialFile) return
    if (initialFile.type.startsWith('video/')) {
      // Video clips (e.g. WebM from Photo Booth) bypass handleImgFiles which
      // only accepts image/* types — add directly to queue as a video item.
      setMediaError('')
      setQueue([{
        file: initialFile,
        name: initialFile.name,
        preview: URL.createObjectURL(initialFile),
        status: 'waiting',
        progress: 0,
        type: 'video',
        retries: 0,
        isOfflineError: false,
      }])
      setStep('queue')
    } else {
      const dt = new DataTransfer()
      dt.items.add(initialFile)
      handleImgFilesRef.current(dt.files)
    }
  }, [initialFile]) // eslint-disable-line react-hooks/exhaustive-deps

  const uploadAll = async () => {
    if (queue.length === 0) {
      setMediaError('Escolha uma foto, video ou audio antes de enviar.')
      return
    }
    const safeAuthor = persistAuthor()
    if (!safeAuthor) {
      setAuthorError('Informe seu nome antes de enviar.')
      return
    }
    if (uploadingRef.current) return
    uploadingRef.current = true
    setUploading(true)
    let lastThumb = ''

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      let queuedCount = 0
      for (let i = 0; i < queue.length; i++) {
        const qi = queue[i]
        if (qi.status === 'done') continue
        const registrationQueueOk = typeof window.__chaQueueUpload === 'function'
          ? await window.__chaQueueUpload(qi.file, qi.name, safeAuthor)
          : false
        const retries = qi.retries + 1
        if (registrationQueueOk) queuedCount += 1
        if (qi.file.size <= MAX_LS_SIZE) saveToLS({ ...qi, retries, isOfflineError: true, status: 'error' })
        setQueue(p => p.map((q, idx) => idx === i
          ? {
              ...q,
              status: 'error',
              progress: 100,
              retries,
              error: registrationQueueOk ? 'Na fila offline' : `Sem conexao (${retries}/3)`,
              isOfflineError: true,
            }
          : q,
        ))
      }
      setMediaError('Sem conexao. Seus arquivos foram colocados na fila offline.')
      emitToast(queuedCount > 0
        ? `${queuedCount} arquivo${queuedCount > 1 ? 's' : ''} na fila offline`
        : 'Sem conexao. Tentaremos enviar automaticamente.')
      uploadingRef.current = false
      setUploading(false)
      return
    }

    for (let i = 0; i < queue.length; i++) {
      const qi = queue[i]
      if (qi.status === 'done') continue
      if (qi.status === 'error' && !qi.isOfflineError) continue
      setQueue(p => p.map((q, idx) => idx === i ? { ...q, status: 'uploading', progress: 10 } : q))

      try {
        const fd = new FormData()
        fd.append('media', qi.file, qi.name)
        fd.append('author', safeAuthor)
        if (caption.trim()) fd.append('caption', caption.trim())

        const timer = setInterval(() => setQueue(p => p.map((q, idx) => idx === i && q.progress < 85 ? { ...q, progress: q.progress + 15 } : q)), 250)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        clearInterval(timer)
        const data = await res.json()

        if (res.ok) {
          setMediaError('')
          lastThumb = qi.preview
          setQueue(p => p.map((q, idx) => idx === i ? { ...q, status: 'done', progress: 100 } : q))
          removeFromLS(qi.name)
        } else {
          setMediaError(data.error ?? 'Erro no servidor ao enviar midia.')
          setQueue(p => p.map((q, idx) => idx === i ? { ...q, status: 'error', error: data.error ?? 'Erro no servidor', isOfflineError: false } : q))
        }
      } catch {
        setMediaError('Falha de conexao ao enviar. Tente novamente.')
        const nr = qi.retries + 1
        const queuedInSw = typeof window.__chaQueueUpload === 'function'
          ? await window.__chaQueueUpload(qi.file, qi.name, safeAuthor)
          : false
        setQueue(p => p.map((q, idx) => idx === i ? {
          ...q,
          status: 'error',
          error: queuedInSw ? 'Na fila offline' : `Sem conexao (${nr}/3)`,
          progress: queuedInSw ? 100 : q.progress,
          isOfflineError: true,
          retries: nr,
        } : q))
        if (qi.file.size <= MAX_LS_SIZE) saveToLS({ ...qi, retries: nr, isOfflineError: true, status: 'error' })
        emitToast(queuedInSw ? `Sem conexao. ${qi.name} ficou na fila offline.` : 'Sem conexao. Tentaremos novamente.')
        break
      }
    }

    uploadingRef.current = false
    setUploading(false)
    if (lastThumb) onSuccess(safeAuthor, lastThumb)
  }
  uploadAllRef.current = uploadAll

  const applyFrameToCanvas = (sourceCanvas: HTMLCanvasElement, frameId: string): HTMLCanvasElement => {
    if (frameId === 'none') return sourceCanvas

    const out = document.createElement('canvas')
    const ctx = out.getContext('2d')!

    if (frameId === 'polaroid') {
      // Polaroid: white border, more bottom space, subtle shadow
      const pad = Math.floor(sourceCanvas.width * 0.06)
      const bottomPad = Math.floor(sourceCanvas.width * 0.18)
      out.width  = sourceCanvas.width + pad * 2
      out.height = sourceCanvas.height + pad + bottomPad
      ctx.fillStyle = '#faf6ef'
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.drawImage(sourceCanvas, pad, pad)
      // Dancing Script-style text placeholder
      ctx.font = `${Math.floor(out.width * 0.055)}px serif`
      ctx.fillStyle = '#8a6040'
      ctx.textAlign = 'center'
      ctx.fillText('José Augusto 🧸', out.width / 2, out.height - Math.floor(bottomPad * 0.28))
    } else if (frameId === 'gold') {
      // Gold gradient border
      out.width  = sourceCanvas.width
      out.height = sourceCanvas.height
      ctx.drawImage(sourceCanvas, 0, 0)
      const bw = Math.floor(sourceCanvas.width * 0.025)
      const grad = ctx.createLinearGradient(0, 0, out.width, out.height)
      grad.addColorStop(0, 'rgba(212,160,86,.9)')
      grad.addColorStop(0.5, 'rgba(245,218,182,.7)')
      grad.addColorStop(1, 'rgba(162,110,36,.9)')
      ctx.strokeStyle = grad
      ctx.lineWidth = bw * 2
      ctx.strokeRect(bw, bw, out.width - bw * 2, out.height - bw * 2)
      // Inner thin border
      ctx.strokeStyle = 'rgba(245,218,182,.4)'
      ctx.lineWidth = 1
      ctx.strokeRect(bw * 2.5, bw * 2.5, out.width - bw * 5, out.height - bw * 5)
    } else if (frameId === 'cha') {
      // Chá JA branded: dark overlay at bottom with event info
      out.width  = sourceCanvas.width
      out.height = sourceCanvas.height
      ctx.drawImage(sourceCanvas, 0, 0)
      const barH = Math.floor(out.height * 0.15)
      const grd = ctx.createLinearGradient(0, out.height - barH, 0, out.height)
      grd.addColorStop(0, 'rgba(15,6,0,0)')
      grd.addColorStop(1, 'rgba(15,6,0,0.85)')
      ctx.fillStyle = grd
      ctx.fillRect(0, out.height - barH, out.width, barH)
      const fontSize = Math.floor(out.width * 0.045)
      ctx.font = `${fontSize}px serif`
      ctx.fillStyle = '#f5dab6'
      ctx.textAlign = 'center'
      ctx.fillText('Chá · José Augusto', out.width / 2, out.height - Math.floor(barH * 0.3))
      ctx.font = `${Math.floor(fontSize * 0.75)}px serif`
      ctx.fillStyle = 'rgba(245,218,182,.6)'
      ctx.fillText('25 de Abril · 2026', out.width / 2, out.height - Math.floor(fontSize * 0.7))
    }

    return out
  }

  return (
    <div className="modal-overlay" onClick={step === 'source' ? onClose : undefined}>
      <div className={`modal-sheet${step === 'source' ? ' modal-sheet-source' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-handle"/>
        {step === 'source' && (
          <>
            <p className="modal-label">✦ Compartilhe no album ✦</p>
            <h2 className="modal-title">Novo post</h2>
            <p className="modal-hint">Imagem, video ou audio com legenda opcional.</p>
            {askName ? (
              <>
                <input className="name-input" placeholder="Seu nome" value={author} onChange={e => { setAuthor(e.target.value); if (e.target.value.trim()) setAuthorError('') }} maxLength={60}/>
                {!!authorError && <p style={{ margin: '4px 2px 10px', fontSize: '.82rem', color: '#c0392b', fontStyle: 'italic' }}>{authorError}</p>}
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }} onClick={persistAuthor}>Continuar</button>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 8px', fontSize: '.86rem', color: 'var(--text-lo)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span>Postando como <strong>{author}</strong></span>
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '.82rem' }} onClick={() => setAskName(true)}>Editar nome</button>
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="name-input" style={{ flex: 1, margin: 0 }} placeholder="Legenda opcional" value={caption} onChange={e => setCaption(e.target.value)} maxLength={180}/>
                  <button
                    className="btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '.82rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                    disabled={suggestingCaption || queue.length === 0 || queue[0]?.type !== 'image'}
                    title={queue.length === 0 || queue[0]?.type !== 'image' ? 'Selecione uma imagem primeiro' : 'Sugerir legenda com IA'}
                    onClick={async () => {
                      const img = queue[0]
                      if (!img || img.type !== 'image') return
                      setSuggestingCaption(true)
                      try {
                        const fd = new FormData()
                        fd.append('image', img.file, img.name)
                        const res = await fetch('/api/suggest-caption', { method: 'POST', body: fd })
                        const { caption: suggested } = await res.json()
                        if (suggested) setCaption(suggested)
                      } catch {} finally {
                        setSuggestingCaption(false)
                      }
                    }}
                  >
                    {suggestingCaption ? '⏳' : '✨'}
                  </button>
                </div>
                {!!mediaError && <p style={{ margin: '0 2px 10px', fontSize: '.82rem', color: '#c0392b', fontStyle: 'italic' }}>{mediaError}</p>}
              </>
            )}
            {/* ── Primary actions: Camera + Gallery ──
                IMPORTANT: uses <label htmlFor> instead of button+.click()
                so the browser treats it as a native gesture — required for
                Android WebView, Samsung Internet, iOS Safari PWA mode, etc.
                Programmatic input.click() is silently blocked on many mobile
                browsers when the input is display:none.                    */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              {/* ── Photo Booth button ── */}
              <button
                className="upload-primary-btn"
                style={{
                  cursor: askName ? 'not-allowed' : 'pointer',
                  opacity: askName ? .55 : 1,
                  border: '2px solid #c9a87c',
                  background: 'linear-gradient(135deg, rgba(196,122,58,.1), rgba(122,78,40,.06))',
                  marginBottom: 4,
                  width: '100%',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 14,
                  fontFamily: 'inherit',
                }}
                disabled={askName}
                onClick={() => { if (!askName && onOpenBooth) onOpenBooth() }}
              >
                <span style={{ fontSize: 28 }}>🎭</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', lineHeight: 1.2, color: '#3e2408' }}>Photo Booth ao vivo</p>
                  <p style={{ margin: 0, fontSize: '.8rem', opacity: .7, color: '#7a4e28' }}>Câmera com filtros e stickers</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '.7rem', fontWeight: 700, color: '#c47a3a', background: 'rgba(196,122,58,.12)', border: '1px solid #c9a87c', borderRadius: 99, padding: '2px 8px' }}>NOVO</span>
              </button>
              <label
                htmlFor="cha-input-cam"
                className="upload-primary-btn"
                style={{ cursor: askName ? 'not-allowed' : 'pointer', opacity: askName ? .55 : 1, userSelect: 'none', pointerEvents: askName ? 'none' : undefined }}
              >
                <span style={{ fontSize: 28 }}>📷</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Tirar foto agora</p>
                  <p style={{ margin: 0, fontSize: '.8rem', opacity: .7 }}>Abre a câmera do celular</p>
                </div>
              </label>
              <label
                htmlFor="cha-input-gallery"
                className="upload-primary-btn upload-primary-btn--secondary"
                style={{ cursor: askName ? 'not-allowed' : 'pointer', opacity: askName ? .55 : 1, userSelect: 'none', pointerEvents: askName ? 'none' : undefined }}
              >
                <span style={{ fontSize: 28 }}>🖼️</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Escolher da galeria</p>
                  <p style={{ margin: 0, fontSize: '.8rem', opacity: .7 }}>Foto ou imagem salva</p>
                </div>
              </label>
            </div>

            {/* ── Secondary actions: Video + Audio ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                { icon: '🎥', label: 'Vídeo', sub: 'Gravar ou enviar', id: 'cha-input-video' },
                { icon: '🎙️', label: 'Áudio', sub: 'Mensagem de voz', id: 'cha-input-audio' },
              ] as const).map(({ icon, label, sub, id }) => (
                <label
                  key={label}
                  htmlFor={id}
                  className="source-btn"
                  style={{ cursor: askName ? 'not-allowed' : 'pointer', opacity: askName ? .55 : 1, userSelect: 'none', pointerEvents: askName ? 'none' : undefined }}
                >
                  <span className="source-btn-icon">{icon}</span>
                  <span className="source-btn-label">{label}</span>
                  <span className="source-btn-sub">{sub}</span>
                </label>
              ))}
            </div>

            {/* Hidden file inputs — positioned off-screen (not display:none) so
                label-click works on every browser, including restrictive WebViews */}
            <input
              id="cha-input-cam"
              ref={camRef}
              type="file"
              accept="image/*,.heic,.heif"
              capture="environment"
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}
              onChange={e => { handleImgFiles(e.target.files); e.target.value = '' }}
            />
            <input
              id="cha-input-gallery"
              ref={fileRef}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}
              onChange={e => { handleImgFiles(e.target.files); e.target.value = '' }}
            />
            <input
              id="cha-input-video"
              ref={vidRef}
              type="file"
              accept="video/*,video/mp4,video/quicktime,video/webm"
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                if (!persistAuthor()) return
                validateShortVideo(f).then(check => {
                  if (!check.ok) {
                    setMediaError(check.error ?? 'Video invalido para envio.')
                    setQueue([{ file: f, name: f.name, preview: URL.createObjectURL(f), status: 'error', progress: 0, type: 'video', error: check.error, retries: 0, isOfflineError: false }])
                  } else {
                    setMediaError('')
                    setQueue([{ file: f, name: f.name, preview: URL.createObjectURL(f), status: 'waiting', progress: 0, type: 'video', retries: 0, isOfflineError: false }])
                  }
                  setStep('queue')
                })
              }}
            />
            <input
              id="cha-input-audio"
              ref={audioRef}
              type="file"
              accept="audio/*,.mp3,.webm,.ogg,.m4a,.wav,.aac"
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}
              onChange={e => { handleAudioFiles(e.target.files); e.target.value = '' }}
            />
          </>
        )}
        {step === 'loading' && (
          <div className="preview-loading">
            {rawPreview && (
              <div style={{ position: 'relative', width: '100%', maxWidth: 260, margin: '0 auto 12px', borderRadius: 12, overflow: 'hidden', aspectRatio: '1', background: '#f5ede0' }}>
                <img
                  src={rawPreview}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="preview-spinner" style={{ margin: 0 }}/>
                </div>
              </div>
            )}
            {!rawPreview && <div className="preview-spinner"/>}
            <div className="compress-bar-wrap">
              <div className="compress-bar-inner"><div className="compress-bar-fill" style={{ width: `${compPct}%` }}/></div>
              <p className="compress-label">{compPct < 100 ? `Otimizando... ${compPct}%` : 'Pronto!'}</p>
            </div>
          </div>
        )}
        {step === 'filter' && queue.length > 0 && (
          <>
            <p className="modal-label">✦ Escolha um filtro ✦</p>
            <h2 className="modal-title" style={{ marginBottom: 12 }}>
              {queue.length > 1 ? `${queue.length} fotos` : '1 foto'}
            </h2>

            {/* Preview da primeira imagem com filtro */}
            <div style={{ width: '100%', maxWidth: 280, margin: '0 auto 16px', borderRadius: 14, overflow: 'hidden', aspectRatio: '1', background: '#f5ede0' }}>
              <img
                src={queue[0].preview}
                alt="Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: FILTERS.find(f => f.id === selectedFilter)?.css || 'none', transition: 'filter .3s' }}
              />
            </div>

            {/* Strip de filtros */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16, scrollbarWidth: 'none' }}>
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', border: selectedFilter === f.id ? '2.5px solid var(--bd)' : '2px solid transparent' }}>
                    <img src={queue[0].preview} alt={f.label} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.css }} />
                  </div>
                  <span style={{ fontSize: '.68rem', fontWeight: selectedFilter === f.id ? 700 : 500, color: selectedFilter === f.id ? 'var(--bd)' : 'var(--bl)', fontFamily: "'Cormorant Garamond',serif" }}>{f.label}</span>
                </button>
              ))}
            </div>

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={async () => {
              // Apply filter to canvas if not 'none'
              if (selectedFilter !== 'none') {
                const filterCss = FILTERS.find(f => f.id === selectedFilter)?.css || 'none'
                const newQueue = await Promise.all(queue.map(async (qi) => {
                  if (qi.type !== 'image') return qi
                  try {
                    const img = new Image()
                    img.src = qi.preview
                    await new Promise((res, rej) => { img.onload = res; img.onerror = rej })
                    const canvas = document.createElement('canvas')
                    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
                    const ctx = canvas.getContext('2d')!
                    ctx.filter = filterCss
                    ctx.drawImage(img, 0, 0)
                    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => b ? res(b) : rej(), 'image/webp', 0.88))
                    const preview = URL.createObjectURL(blob)
                    return { ...qi, file: blob, preview }
                  } catch { return qi }
                }))
                setQueue(newQueue)
              }
              setStep('frames')
            }}>
              Continuar →
            </button>
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => setStep('frames')}>
              Pular
            </button>
          </>
        )}
        {step === 'frames' && queue.length > 0 && (() => {
          const currentItem = queue[0]
          return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f0d0b' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                <button onClick={() => setStep('filter')} style={{ background: 'none', border: 'none', color: '#f5dab6', fontSize: '1rem', cursor: 'pointer', padding: '4px 8px' }}>‹ Filtros</button>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', color: '#f5dab6', fontWeight: 600 }}>Moldura</p>
                <div style={{ width: 70 }} />
              </div>

              {/* Preview */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'hidden' }}>
                <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '55vh' }}>
                  <img
                    src={currentItem.preview}
                    alt="preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '55vh',
                      objectFit: 'contain',
                      display: 'block',
                      borderRadius: selectedFrame === 'polaroid' ? 4 : 8,
                      background: selectedFrame === 'polaroid' ? '#faf6ef' : 'transparent',
                      padding: selectedFrame === 'polaroid' ? '8px 8px 28px' : 0,
                      boxShadow: selectedFrame === 'polaroid' ? '0 8px 28px rgba(0,0,0,.5)' : selectedFrame !== 'none' ? '0 4px 20px rgba(212,160,86,.3)' : 'none',
                      outline: selectedFrame === 'gold' ? '3px solid #d4a056' : selectedFrame === 'cha' ? '2px solid rgba(245,218,182,.3)' : 'none',
                    }}
                  />
                  {selectedFrame === 'polaroid' && (
                    <p style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontFamily: 'serif', fontSize: '.7rem', color: '#8a6040' }}>
                      José Augusto 🧸
                    </p>
                  )}
                  {selectedFrame === 'cha' && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(15,6,0,.85))', borderRadius: '0 0 8px 8px', padding: '20px 12px 10px', textAlign: 'center' }}>
                      <p style={{ color: '#f5dab6', fontFamily: 'serif', fontSize: '.75rem', marginBottom: 2 }}>Chá · José Augusto</p>
                      <p style={{ color: 'rgba(245,218,182,.6)', fontFamily: 'serif', fontSize: '.65rem' }}>25 de Abril · 2025</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Frame thumbnails */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {FRAMES.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFrame(f.id)}
                    style={{
                      flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                  >
                    <div style={{
                      width: 64, height: 64,
                      borderRadius: 10,
                      border: selectedFrame === f.id ? '2.5px solid #d59056' : '2px solid rgba(255,255,255,.15)',
                      background: f.id === 'polaroid' ? '#faf6ef' : f.id === 'gold' ? 'linear-gradient(135deg,#3a2800,#7a5800)' : f.id === 'cha' ? '#0f0d0b' : 'rgba(255,255,255,.06)',
                      display: 'grid', placeItems: 'center',
                      fontSize: f.id === 'none' ? '1.5rem' : '1.2rem',
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                      {f.id === 'none' && '🚫'}
                      {f.id === 'polaroid' && <span style={{ fontSize: '.65rem', color: '#8a6040', fontFamily: 'serif', padding: 4, textAlign: 'center' }}>📸<br/>Polaroid</span>}
                      {f.id === 'gold' && <span style={{ fontSize: '.65rem', color: '#d59056', fontFamily: 'serif' }}>✦ Gold ✦</span>}
                      {f.id === 'cha' && <span style={{ fontSize: '.6rem', color: '#f5dab6', fontFamily: 'serif', textAlign: 'center', padding: 4 }}>Chá<br/>JA</span>}
                    </div>
                    <span style={{ fontSize: '.68rem', color: selectedFrame === f.id ? '#d59056' : 'rgba(255,255,255,.5)', fontFamily: "'Cormorant Garamond',serif" }}>
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Continuar */}
              <div style={{ padding: '12px 16px 20px' }}>
                <button
                  onClick={async () => {
                    // Apply frame via canvas to all queue items
                    if (selectedFrame !== 'none') {
                      const newQueue = await Promise.all(queue.map(async (qi) => {
                        if (qi.type !== 'image') return qi
                        try {
                          const img = new Image()
                          img.src = qi.preview
                          await new Promise((res, rej) => { img.onload = res; img.onerror = rej })
                          const canvas = document.createElement('canvas')
                          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
                          const ctx = canvas.getContext('2d')!
                          ctx.drawImage(img, 0, 0)
                          const framedCanvas = applyFrameToCanvas(canvas, selectedFrame)
                          const blob = await new Promise<Blob>((res, rej) => framedCanvas.toBlob(b => b ? res(b) : rej(), 'image/webp', 0.88))
                          const preview = URL.createObjectURL(blob)
                          return { ...qi, file: blob, preview }
                        } catch { return qi }
                      }))
                      setQueue(newQueue)
                    }
                    setStep('queue')
                  }}
                  style={{
                    width: '100%', padding: '14px 20px',
                    background: 'linear-gradient(135deg,#c9920a,#7a5c00)',
                    color: '#f5dab6', border: 'none', borderRadius: 14,
                    cursor: 'pointer', fontFamily: "'Playfair Display',serif",
                    fontSize: '1rem', fontWeight: 600, letterSpacing: '.03em',
                  }}
                >
                  Continuar →
                </button>
              </div>
            </div>
          )
        })()}
        {step === 'queue' && (
          <>
            <p className="modal-label">✦ {allDone ? 'Concluido' : 'Enviando'} ✦</p>
            <h2 className="modal-title" style={{ marginBottom: 16 }}>{allDone ? '🌸 Tudo enviado!' : `${queue.length} arquivo${queue.length > 1 ? 's' : ''}`}</h2>

            {!isOnline && (
              <div className="offline-banner">
                <span className="offline-banner-icon">📶</span>
                <div className="offline-banner-text">
                  <p className="offline-banner-title">Sem conexao</p>
                  <p className="offline-banner-sub">Retomando automaticamente quando voltar</p>
                </div>
              </div>
            )}

            <div className="queue-list">
              {queue.map((q, i) => (
                <div key={i} className="queue-item">
                  {q.type === 'image'
                    ? <img src={q.preview} alt="" className="queue-thumb"/>
                    : q.type === 'audio'
                      ? <div className="queue-thumb" style={{ background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🎙️</div>
                      : <div className="queue-thumb" style={{ background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🎥</div>
                  }
                  <div className="queue-info">
                    <p className="queue-name">{q.name}</p>
                    <div className="queue-bar-wrap"><div className="queue-bar" style={{ width: `${q.progress}%` }}/></div>
                    <p className={`queue-status ${q.status === 'error' && q.isOfflineError ? 'offline' : q.status}`}>
                      {q.status === 'waiting' && 'Aguardando...'}
                      {q.status === 'uploading' && 'Enviando...'}
                      {q.status === 'done' && '✓ No mural!'}
                      {q.status === 'error' && !q.isOfflineError && `✗ ${q.error}`}
                      {q.status === 'error' && q.isOfflineError && (q.retries >= 3 ? `📶 ${q.error} - clique em tentar novamente` : `📶 ${q.error} - aguardando conexao`)}
                    </p>
                    {q.status === 'error' && !q.isOfflineError && q.file.size > MAX_LS_SIZE && (
                      <p style={{ fontSize: '.7rem', color: 'var(--text-lo)', fontStyle: 'italic' }}>arquivo grande - nao salvo localmente</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="queue-actions">
              {!uploading && !allDone && <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={uploadAll}>📤 Enviar {queue.length > 1 ? `${queue.length} arquivos` : 'agora'}</button>}
              {uploading && <p style={{ textAlign: 'center', color: 'var(--text-md)', fontStyle: 'italic', fontSize: '.92rem' }}>Nao feche enquanto envia...</p>}
              {allDone && (
                <div style={{ display: 'flex', gap: 10 }}>
                  {queue.some(q => q.status === 'error') && <button className="btn-secondary" style={{ flex: 1 }} onClick={() => {
                    setQueue(p => p.map(q => q.status === 'error' ? { ...q, status: 'waiting', progress: 0, error: undefined, isOfflineError: false, retries: 0 } : q))
                    uploadingRef.current = false
                    setUploading(false)
                  }}>🔄 Tentar novamente</button>}
                  <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={onClose}>✓ Fechar</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
