'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface VideoMensagem {
  id: number
  author: string
  video_url: string
  thumb_url: string | null
  duration_s: number | null
  message: string | null
  approved: number
  created_at: string
}

const MAX_VIDEO_SIZE = 100 * 1024 * 1024

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function VideoMensagensPage() {
  const authorDraftKey                = 'cha_video_author_draft'
  const messageDraftKey               = 'cha_video_message_draft'
  const [items, setItems]           = useState<VideoMensagem[]>([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [author, setAuthor]         = useState('')
  const [message, setMessage]       = useState('')
  const [file, setFile]             = useState<File | null>(null)
  const [sending, setSending]       = useState(false)
  const [progress, setProgress]     = useState(0)
  const [sent, setSent]             = useState(false)
  const [error, setError]           = useState('')
  const recordInputRef              = useRef<HTMLInputElement>(null)
  const uploadInputRef              = useRef<HTMLInputElement>(null)
  const canSubmit                   = !!author.trim() && !!file && !sending

  useEffect(() => {
    try {
      setAuthor(localStorage.getItem(authorDraftKey) ?? localStorage.getItem('cha_author') ?? '')
      setMessage(localStorage.getItem(messageDraftKey) ?? '')
    } catch {}
  }, [])

  useEffect(() => {
    try {
      if (author.trim()) localStorage.setItem(authorDraftKey, author)
      else localStorage.removeItem(authorDraftKey)
    } catch {}
  }, [author, authorDraftKey])

  useEffect(() => {
    try {
      if (message.trim()) localStorage.setItem(messageDraftKey, message)
      else localStorage.removeItem(messageDraftKey)
    } catch {}
  }, [message, messageDraftKey])

  const loadItems = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res  = await fetch('/api/video-mensagens')
      if (!res.ok) throw new Error('load_failed')
      const data = await res.json() as { items?: VideoMensagem[] }
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setItems([])
      setLoadError('Nao foi possivel carregar as mensagens em video agora.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadItems() }, [])

  const handleVideoSelected = (selected: File | null, input?: HTMLInputElement | null) => {
    if (selected && selected.size > MAX_VIDEO_SIZE) {
      setFile(null)
      setError('O video precisa ter no maximo 100 MB.')
      if (input) input.value = ''
      return
    }
    setError('')
    setFile(selected)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!author.trim()) { setError('Informe seu nome.'); return }
    if (!file)          { setError('Selecione um arquivo de vídeo.'); return }
    if (file.size > MAX_VIDEO_SIZE) {
      setError('O vídeo precisa ter no máximo 100 MB.')
      return
    }

    setSending(true)
    setProgress(10)

    try {
      const fd = new FormData()
      fd.append('video',   file)
      fd.append('author',  author.trim())
      fd.append('message', message.trim())

      // Simulate progress since fetch doesn't natively support upload progress
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 8, 85))
      }, 300)

      const res  = await fetch('/api/video-mensagens', { method: 'POST', body: fd })
      clearInterval(progressInterval)
      setProgress(100)

      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Erro ao enviar vídeo.')
        setSending(false)
        setProgress(0)
        return
      }

      try {
        localStorage.setItem('cha_author', author.trim())
        localStorage.removeItem(authorDraftKey)
        localStorage.removeItem(messageDraftKey)
      } catch {}
      setSent(true)
      setFile(null)
      setMessage('')
    } catch {
      setError('Sem conexão. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  const closeModal = () => {
    setModalOpen(false)
    setSent(false)
    setError('')
    setProgress(0)
    setFile(null)
    if (recordInputRef.current) recordInputRef.current.value = ''
    if (uploadInputRef.current) uploadInputRef.current.value = ''
  }

  const resetFormForAnother = () => {
    setSent(false)
    setError('')
    setProgress(0)
    setFile(null)
    setMessage('')
    if (recordInputRef.current) recordInputRef.current.value = ''
    if (uploadInputRef.current) uploadInputRef.current.value = ''
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Playfair+Display:ital,wght@0,700;1,700&family=Dancing+Script:wght@500&display=swap');

        .video-card video {
          width: 100%;
          border-radius: 12px;
          display: block;
          background: #000;
          max-height: 280px;
        }
        @media (max-width: 640px) {
          .video-grid {
            grid-template-columns: 1fr !important;
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
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>💌</div>
          <p style={{ fontFamily: "'Dancing Script',cursive", color: '#c47a3a', fontSize: '1.05rem', marginBottom: 4 }}>
            ✦ Mensagens Especiais ✦
          </p>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', margin: '0 0 8px', color: 'var(--bd)' }}>
            Mensagens em <em>Vídeo</em>
          </h1>
          <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', maxWidth: 320, margin: '0 auto 20px' }}>
            Mensagens especiais para o José Augusto
          </p>

          {/* Send button */}
          <button
            onClick={() => setModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg,#c47a3a,#7a4e28)',
              color: '#fdf6ee',
              border: 'none',
              borderRadius: 50,
              padding: '12px 28px',
              fontSize: '.95rem',
              fontFamily: "'Cormorant Garamond',serif",
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(196,122,58,.3)',
              letterSpacing: '.04em',
            }}
          >
            🎬 Enviar mensagem em vídeo
          </button>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(90,62,40,.7)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem' }}>Carregando vídeos...</p>
            </div>
          ) : loadError ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(90,62,40,.78)', maxWidth: 420, margin: '0 auto' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', marginBottom: 8 }}>
                Mensagens indisponiveis no momento
              </p>
              <p style={{ fontSize: '.92rem', fontStyle: 'italic', marginBottom: 18 }}>
                {loadError}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={loadItems}
                  style={{
                    background: 'linear-gradient(135deg,#c47a3a,#7a4e28)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 999,
                    padding: '11px 22px',
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: '.98rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Tentar novamente
                </button>
                <button
                  onClick={() => setModalOpen(true)}
                  style={{
                    background: '#fffaf3',
                    color: '#3e2408',
                    border: '1.5px solid #c9a87c',
                    borderRadius: 999,
                    padding: '11px 22px',
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: '.98rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Enviar mensagem
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(90,62,40,.7)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎬</div>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', marginBottom: 8 }}>
                Nenhuma mensagem ainda...
              </p>
              <p style={{ fontSize: '.9rem', fontStyle: 'italic' }}>Seja o primeiro! 🎬</p>
            </div>
          ) : (
            <div
              className="video-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 24,
              }}
            >
              {items.map(item => (
                <div
                  key={item.id}
                  className="video-card"
                  style={{
                    background: '#faf6ef',
                    borderRadius: 18,
                    overflow: 'hidden',
                    boxShadow: '0 4px 18px rgba(62,36,8,.1)',
                    border: '1px solid rgba(201,168,124,.2)',
                  }}
                >
                  <div style={{ padding: '12px 12px 0' }}>
                    <video controls preload="metadata">
                      <source src={item.video_url} />
                      Seu navegador não suporta vídeos.
                    </video>
                  </div>
                  <div style={{ padding: '12px 16px 16px' }}>
                    <p style={{
                      fontFamily: "'Cormorant Garamond',serif",
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      color: '#3e2408',
                      marginBottom: 4,
                    }}>
                      {item.author}
                    </p>
                    {item.message && (
                      <p style={{
                        fontFamily: "'Cormorant Garamond',serif",
                        fontSize: '.9rem',
                        fontStyle: 'italic',
                        color: '#7a4e28',
                        lineHeight: 1.5,
                        marginBottom: 4,
                      }}>
                        "{item.message}"
                      </p>
                    )}
                    <p style={{ fontSize: '.75rem', color: 'rgba(62,36,8,.4)', marginTop: 6 }}>
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <>
          <div
            onClick={closeModal}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 2000,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fdf6ee',
            borderRadius: 24,
            padding: '32px 28px',
            width: 'min(480px, 94vw)',
            maxHeight: '90vh',
            overflowY: 'auto',
            zIndex: 2001,
            boxShadow: '0 24px 64px rgba(0,0,0,.3)',
          }}>
            <button
              onClick={closeModal}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'rgba(62,36,8,.08)', border: 'none',
                borderRadius: '50%', width: 36, height: 36,
                cursor: 'pointer', fontSize: '1rem', color: '#3e2408',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>

            <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: 8 }}>🎬</div>
            <h2 style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: '1.4rem', color: '#3e2408',
              textAlign: 'center', marginBottom: 24,
            }}>
              Enviar Mensagem em Vídeo
            </h2>

            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', color: '#3e2408', marginBottom: 8 }}>
                  Enviado com sucesso!
                </p>
                <p style={{ fontSize: '.9rem', color: '#7a4e28', fontStyle: 'italic' }}>
                  Aguarda aprovação para aparecer na página.
                </p>
                <button
                  type="button"
                  onClick={resetFormForAnother}
                  style={{
                    marginTop: 10,
                    background: '#fffaf3',
                    color: '#3e2408',
                    border: '1.5px solid #c9a87c',
                    borderRadius: 14,
                    padding: '11px 24px',
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: '1rem',
                    cursor: 'pointer',
                    marginRight: 10,
                  }}
                >
                  Enviar outra mensagem
                </button>
                <button
                  onClick={closeModal}
                  style={{
                    marginTop: 20,
                    background: 'var(--bd, #3e2408)', color: '#f5dab6',
                    border: 'none', borderRadius: 14, padding: '11px 24px',
                    fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'block' }}>
                  <span style={{ fontSize: '.8rem', color: 'rgba(62,36,8,.6)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Seu nome *
                  </span>
                  <input
                    type="text"
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    placeholder="Como quer ser identificado?"
                    maxLength={60}
                    style={{
                      width: '100%', border: '1px solid #e8d4b8', borderRadius: 12,
                      padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif",
                      fontSize: '1rem', color: '#3e2408', background: '#faf6ef',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ fontSize: '.8rem', color: 'rgba(62,36,8,.6)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Arquivo de vídeo * (máx 100 MB)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <button
                      type="button"
                      onClick={() => recordInputRef.current?.click()}
                      style={{
                        border: 'none',
                        borderRadius: 12,
                        padding: '13px 10px',
                        background: 'linear-gradient(135deg,#c47a3a,#7a4e28)',
                        color: '#fff',
                        fontFamily: "'Cormorant Garamond',serif",
                        fontSize: '.95rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Gravar agora
                    </button>
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      style={{
                        border: '1.5px solid #c9a87c',
                        borderRadius: 12,
                        padding: '13px 10px',
                        background: '#fffaf3',
                        color: '#3e2408',
                        fontFamily: "'Cormorant Garamond',serif",
                        fontSize: '.95rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Escolher video
                    </button>
                  </div>
                  <p style={{ fontSize: '.78rem', color: 'rgba(62,36,8,.55)', lineHeight: 1.4, margin: '0 0 10px', textAlign: 'center' }}>
                    No celular, "Gravar agora" abre a camera quando o navegador permitir.
                  </p>
                  <div
                    onClick={() => uploadInputRef.current?.click()}
                    style={{
                      border: '2px dashed #c9a87c', borderRadius: 12,
                      padding: '20px', textAlign: 'center', cursor: 'pointer',
                      background: file ? 'rgba(196,122,58,.06)' : '#faf6ef',
                    }}
                  >
                    <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🎥</div>
                    <p style={{ fontSize: '.88rem', color: '#7a4e28', fontStyle: 'italic' }}>
                      {file ? file.name : 'Clique para selecionar vídeo'}
                    </p>
                    {file && (
                      <p style={{ fontSize: '.75rem', color: 'rgba(62,36,8,.45)', marginTop: 4 }}>
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    )}
                  </div>
                  {file && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null)
                          setError('')
                          if (recordInputRef.current) recordInputRef.current.value = ''
                          if (uploadInputRef.current) uploadInputRef.current.value = ''
                        }}
                        style={{
                          background: 'transparent',
                          color: '#7a4e28',
                          border: '1px solid #c9a87c',
                          borderRadius: 999,
                          padding: '8px 14px',
                          fontFamily: "'Cormorant Garamond',serif",
                          fontSize: '.92rem',
                          cursor: 'pointer',
                        }}
                      >
                        Trocar video
                      </button>
                    </div>
                  )}
                  <input
                    ref={recordInputRef}
                    type="file"
                    accept="video/*"
                    capture="user"
                    style={{ display: 'none' }}
                    onChange={e => handleVideoSelected(e.target.files?.[0] ?? null, e.currentTarget)}
                  />
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const selected = e.target.files?.[0] ?? null
                      if (selected && selected.size > MAX_VIDEO_SIZE) {
                        setFile(null)
                        setError('O vídeo precisa ter no máximo 100 MB.')
                        e.target.value = ''
                        return
                      }
                      setError('')
                      setFile(selected)
                    }}
                  />
                </label>

                <label style={{ display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: '.8rem', color: 'rgba(62,36,8,.6)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                      Mensagem de texto (opcional)
                    </span>
                    <span style={{ fontSize: '.76rem', color: 'rgba(62,36,8,.45)' }}>
                      {message.length}/500
                    </span>
                  </div>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value.slice(0, 500))}
                    placeholder="Um recado complementar..."
                    rows={3}
                    style={{
                      width: '100%', border: '1px solid #e8d4b8', borderRadius: 12,
                      padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif",
                      fontSize: '1rem', color: '#3e2408', background: '#faf6ef',
                      outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                </label>
                {(author.trim().length > 0 || message.trim().length > 0) && (
                  <p style={{ margin: '-4px 0 0', fontSize: '.76rem', color: 'rgba(62,36,8,.55)', fontStyle: 'italic', textAlign: 'center' }}>
                    Seu nome e recado ficam salvos neste aparelho ate o envio.
                  </p>
                )}

                {error && (
                  <p style={{ color: '#c0392b', fontSize: '.88rem', fontStyle: 'italic' }}>{error}</p>
                )}

                {!error && file && (
                  <p style={{ color: '#7a4e28', fontSize: '.82rem', fontStyle: 'italic', margin: '-4px 0 0' }}>
                    Arquivo pronto para envio: {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}

                {sending && (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '.8rem', color: '#7a4e28' }}>Enviando...</span>
                      <span style={{ fontSize: '.8rem', color: '#7a4e28' }}>{progress}%</span>
                    </div>
                    <div style={{ background: '#e8d4b8', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                      <div style={{
                        background: 'linear-gradient(90deg,#c47a3a,#7a4e28)',
                        height: '100%', borderRadius: 99,
                        width: `${progress}%`,
                        transition: 'width .3s ease',
                      }} />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  style={{
                    background: canSubmit ? 'linear-gradient(135deg,#c47a3a,#7a4e28)' : '#e8d4b8',
                    color: canSubmit ? '#fdf6ee' : '#7a4e28',
                    border: 'none', borderRadius: 14, padding: '13px 20px',
                    fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem',
                    fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed',
                    letterSpacing: '.03em',
                  }}
                >
                  {sending ? 'Enviando...' : '🎬 Enviar vídeo'}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </>
  )
}
