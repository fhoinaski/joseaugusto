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
}: {
  onClose: () => void
  onSuccess: (author: string, thumb: string) => void
  authorDefault: string
}) {
  const [author, setAuthor] = useState(authorDefault)
  const [askName, setAskName] = useState(!authorDefault.trim())
  const [authorError, setAuthorError] = useState('')
  const [mediaError, setMediaError] = useState('')
  const [caption, setCaption] = useState('')
  const [suggestingCaption, setSuggestingCaption] = useState(false)
  const [step, setStep] = useState<'source' | 'loading' | 'queue'>('source')
  const [queue, setQueue] = useState<QItem[]>([])
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
    if (!files || !files[0]) return
    const f0 = files[0]
    const isImageLike = f0.type.startsWith('image/') || isHeicFile(f0) || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f0.name)
    if (!isImageLike) {
      setMediaError('Selecione uma imagem valida para postar.')
      return
    }
    setMediaError('')

    // Show the raw file immediately so the user sees their photo right away
    // (no black screen while prepareImageBlob runs — can take 2-4 s on mobile)
    const immediateUrl = URL.createObjectURL(f0)
    setRawPreview(immediateUrl)
    setStep('loading')
    setCompPct(10)
    const pct = setInterval(() => setCompPct(p => Math.min(p + 16, 88)), 180)
    try {
      const { blob, previewUrl } = await prepareImageBlob(f0, 2000)
      clearInterval(pct)
      setCompPct(100)
      URL.revokeObjectURL(immediateUrl)
      setRawPreview('')
      setQueue([{ file: blob, name: renameWithExt(f0.name, 'webp'), preview: previewUrl, status: 'waiting', progress: 0, type: 'image', retries: 0, isOfflineError: false }])
      setTimeout(() => setStep('queue'), 120)
    } catch {
      clearInterval(pct)
      // Processing failed — use raw file as fallback (browser handles EXIF display)
      setRawPreview('')
      setQueue([{ file: f0, name: f0.name, preview: immediateUrl, status: 'waiting', progress: 0, type: 'image', retries: 0, isOfflineError: false }])
      setTimeout(() => setStep('queue'), 120)
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
            {/* ── Primary actions: Camera + Gallery ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              <button
                className="upload-primary-btn"
                onClick={() => camRef.current?.click()}
                disabled={askName}
              >
                <span style={{ fontSize: 28 }}>📷</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Tirar foto agora</p>
                  <p style={{ margin: 0, fontSize: '.8rem', opacity: .7 }}>Abre a câmera do celular</p>
                </div>
              </button>
              <button
                className="upload-primary-btn upload-primary-btn--secondary"
                onClick={() => fileRef.current?.click()}
                disabled={askName}
              >
                <span style={{ fontSize: 28 }}>🖼️</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Escolher da galeria</p>
                  <p style={{ margin: 0, fontSize: '.8rem', opacity: .7 }}>Foto ou imagem salva</p>
                </div>
              </button>
            </div>

            {/* ── Secondary actions: Video + Audio ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { icon: '🎥', label: 'Vídeo', sub: 'Gravar ou enviar', action: () => vidRef.current?.click() },
                { icon: '🎙️', label: 'Áudio', sub: 'Mensagem de voz', action: () => audioRef.current?.click() },
              ].map(({ icon, label, sub, action }) => (
                <button key={label} className="source-btn" onClick={action} disabled={askName}
                  style={askName ? { opacity: .55, cursor: 'not-allowed' } : undefined}>
                  <span className="source-btn-icon">{icon}</span>
                  <span className="source-btn-label">{label}</span>
                  <span className="source-btn-sub">{sub}</span>
                </button>
              ))}
            </div>
            <input ref={camRef} type="file" accept="image/*,.heic,.heif" capture="environment" style={{ display: 'none' }} onClick={e => { (e.target as HTMLInputElement).value = '' }} onChange={e => handleImgFiles(e.target.files)}/>
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif" style={{ display: 'none' }} onClick={e => { (e.target as HTMLInputElement).value = '' }} onChange={e => handleImgFiles(e.target.files)}/>
            <input
              ref={vidRef}
              type="file"
              accept="video/*"
              capture="environment"
              style={{ display: 'none' }}
              onClick={e => { (e.target as HTMLInputElement).value = '' }}
              onChange={e => {
                if (!persistAuthor()) return
                const f = e.target.files?.[0]
                if (!f) return
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
            <input ref={audioRef} type="file" accept="audio/*,.mp3,.webm,.ogg,.m4a,.wav,.aac" style={{ display: 'none' }} onClick={e => { (e.target as HTMLInputElement).value = '' }} onChange={e => handleAudioFiles(e.target.files)}/>
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
