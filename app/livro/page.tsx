'use client'

import { useEffect, useState, useRef } from 'react'
import MemoriasOptIn from '@/components/MemoriasOptIn'

interface LivroMessage {
  id: number
  author: string
  message: string
  createdAt: string
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--cream)', border: '1px solid var(--beige)',
      borderRadius: 16, padding: '20px 20px',
    }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--beige)', flexShrink: 0, animation: 'pulse 1.4s ease-in-out infinite' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, width: '40%', background: 'var(--beige)', borderRadius: 8, marginBottom: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />
          <div style={{ height: 11, width: '25%', background: 'var(--beige)', borderRadius: 8, animation: 'pulse 1.4s ease-in-out infinite', animationDelay: '.1s' }} />
        </div>
      </div>
      <div style={{ height: 12, background: 'var(--beige)', borderRadius: 8, marginBottom: 6, animation: 'pulse 1.4s ease-in-out infinite', animationDelay: '.15s' }} />
      <div style={{ height: 12, width: '80%', background: 'var(--beige)', borderRadius: 8, animation: 'pulse 1.4s ease-in-out infinite', animationDelay: '.2s' }} />
    </div>
  )
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase() || '?'
}

function avatarBg(name: string): string {
  const colors = ['#c97a6e', '#6b9e7a', '#c47a3a', '#9b6ea8', '#4a7a9b', '#7a4e28']
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}

export default function LivroPage() {
  const draftStorageKey = 'cha_livro_draft'
  const [messages, setMessages] = useState<LivroMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

  const [author, setAuthor] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [toast, setToast] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // Read saved author name
  useEffect(() => {
    try {
      setAuthor(localStorage.getItem('cha_author') ?? '')
      setMessage(localStorage.getItem(draftStorageKey) ?? '')
    } catch {}
  }, [])

  useEffect(() => {
    try {
      if (message.trim()) localStorage.setItem(draftStorageKey, message)
      else localStorage.removeItem(draftStorageKey)
    } catch {}
  }, [draftStorageKey, message])

  const loadMessages = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/livro')
      if (!res.ok) throw new Error('server error')
      const data = await res.json() as { messages?: LivroMessage[] }
      setMessages(Array.isArray(data.messages) ? data.messages : [])
      setOffline(false)
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMessages() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendError('')

    const trimmedAuthor = author.trim()
    const trimmedMessage = message.trim()

    if (!trimmedAuthor) { setSendError('Informe seu nome antes de enviar.'); return }
    if (!trimmedMessage) { setSendError('Escreva sua mensagem antes de enviar.'); return }

    setSending(true)
    try {
      const res = await fetch('/api/livro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: trimmedAuthor, message: trimmedMessage }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setSendError(data.error ?? 'Erro ao enviar mensagem.')
        return
      }
      try {
        localStorage.setItem('cha_author', trimmedAuthor)
        localStorage.removeItem(draftStorageKey)
      } catch {}
      setMessage('')
      showToast('💌 Mensagem enviada com carinho!')
      await loadMessages()
      setTimeout(() => textareaRef.current?.focus(), 60)
    } catch {
      setSendError('Sem conexão. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  const charsLeft = 500 - message.length
  const canSubmit = author.trim().length > 0 && message.trim().length > 0 && !sending

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--warm)', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        background: 'var(--cream)', borderBottom: '1px solid var(--beige)',
        padding: '28px 20px 20px', textAlign: 'center',
      }}>
        <p style={{ fontFamily: "'Dancing Script',cursive", color: 'var(--sand)', fontSize: '1.05rem', marginBottom: 4 }}>
          ✦ Para Thaysa e Fernando ✦
        </p>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.9rem', color: 'var(--bd)', margin: '0 0 8px' }}>
          Livro de <em>Mensagens</em>
        </h1>
        <p style={{ fontSize: '.9rem', color: 'var(--text-lo)', fontStyle: 'italic', maxWidth: 380, margin: '0 auto' }}>
          Deixe um recado cheio de amor para os papais do José Augusto.
        </p>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--cream)', border: '1px solid var(--beige)',
            borderRadius: 20, padding: '24px 20px', marginBottom: 32,
            boxShadow: '0 2px 16px rgba(62,36,8,.06)',
          }}
        >
          <p style={{
            fontFamily: "'Playfair Display',serif", fontSize: '1.1rem',
            color: 'var(--bd)', marginBottom: 16, fontWeight: 600,
          }}>
            Escrever recado
          </p>

          {/* Name input */}
          <label style={{ display: 'block', marginBottom: 14 }}>
            <span style={{ fontSize: '.8rem', color: 'var(--text-lo)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Seu nome
            </span>
            <input
              type="text"
              value={author}
              onChange={e => { setAuthor(e.target.value); setSendError('') }}
              placeholder="Como você quer ser identificado?"
              maxLength={60}
              style={{
                width: '100%', border: '1px solid var(--beige)', borderRadius: 12,
                padding: '11px 14px', fontFamily: "'Cormorant Garamond',serif",
                fontSize: '1rem', color: 'var(--bd)', background: 'var(--warm)',
                outline: 'none',
              }}
            />
            {author.trim() && (
              <span style={{ display: 'block', marginTop: 6, fontSize: '.78rem', color: 'var(--text-lo)', fontStyle: 'italic' }}>
                Seu nome aparecera junto da mensagem publicada.
              </span>
            )}
          </label>

          {/* Message textarea */}
          <label style={{ display: 'block', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: '.8rem', color: 'var(--text-lo)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                Mensagem
              </span>
              {message.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setMessage(''); setSendError(''); textareaRef.current?.focus() }}
                  style={{ border: 'none', background: 'transparent', color: 'var(--sand)', fontSize: '.8rem', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                >
                  Limpar texto
                </button>
              )}
            </div>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={e => { setMessage(e.target.value.slice(0, 500)); setSendError('') }}
              placeholder="Deixe aqui seu recado, desejo ou palavra de carinho..."
              rows={5}
              style={{
                width: '100%', border: '1px solid var(--beige)', borderRadius: 12,
                padding: '11px 14px', fontFamily: "'Cormorant Garamond',serif",
                fontSize: '1rem', color: 'var(--bd)', background: 'var(--warm)',
                outline: 'none', resize: 'vertical', minHeight: 120,
              }}
            />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <span style={{
              fontSize: '.75rem',
              color: charsLeft < 50 ? '#c0392b' : 'var(--text-lo)',
            }}>
              {charsLeft} caracteres restantes
            </span>
          </div>
          {message.trim().length > 0 && (
            <p style={{ margin: '0 0 14px', fontSize: '.76rem', color: 'var(--text-lo)', fontStyle: 'italic' }}>
              Seu texto fica salvo neste aparelho ate o envio.
            </p>
          )}

          {sendError && (
            <p style={{ color: '#c0392b', fontSize: '.88rem', fontStyle: 'italic', marginBottom: 12 }}>
              {sendError}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '13px 20px',
              background: !canSubmit ? 'var(--beige)' : 'var(--bd)',
              color: !canSubmit ? 'var(--text-lo)' : '#f5dab6',
              border: 'none', borderRadius: 14, cursor: !canSubmit ? 'not-allowed' : 'pointer',
              fontFamily: "'Playfair Display',serif", fontSize: '1rem', fontWeight: 600,
              letterSpacing: '.03em', transition: 'background .2s',
            }}
          >
            {sending ? 'Enviando...' : '💌 Enviar mensagem'}
          </button>
        </form>

        {/* Offline notice */}
        {offline && (
          <div style={{
            background: '#fff8f0', border: '1px solid #f0c89a',
            borderRadius: 14, padding: '16px 18px', marginBottom: 24,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '1.2rem', marginBottom: 6 }}>📡</p>
            <p style={{ fontSize: '.9rem', color: 'var(--text-md)', fontStyle: 'italic' }}>
              Não foi possível carregar as mensagens. Verifique sua conexão.
            </p>
            <button
              onClick={loadMessages}
              style={{ marginTop: 12, border: '1px solid rgba(122,78,40,.28)', borderRadius: 999, background: '#fff', color: 'var(--bd)', padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Messages list */}
        {!offline && (
          <>
            <p style={{
              fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase',
              color: 'var(--text-lo)', fontWeight: 600, marginBottom: 14,
            }}>
              {loading ? 'Carregando...' : `${messages.length} ${messages.length === 1 ? 'mensagem' : 'mensagens'}`}
            </p>

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-lo)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>✉️</div>
                <p style={{ fontStyle: 'italic', fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem' }}>
                  Ainda não há mensagens. Seja o primeiro a deixar um recado!
                </p>
              </div>
            )}

            {!loading && messages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      background: 'var(--cream)', border: '1px solid var(--beige)',
                      borderRadius: 16, padding: '20px 20px',
                      boxShadow: '0 1px 8px rgba(62,36,8,.05)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                      {/* Avatar */}
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: avatarBg(msg.author),
                        display: 'grid', placeItems: 'center',
                        fontFamily: "'Cormorant Garamond',serif",
                        fontWeight: 700, fontSize: '1rem', color: '#fff',
                        flexShrink: 0,
                      }}>
                        {getInitials(msg.author)}
                      </div>
                      <div>
                        <p style={{
                          fontFamily: "'Playfair Display',serif",
                          fontWeight: 600, fontSize: '.95rem', color: 'var(--bd)', marginBottom: 2,
                        }}>
                          {msg.author}
                        </p>
                        <p style={{ fontSize: '.75rem', color: 'var(--text-lo)', fontStyle: 'italic' }}>
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Opening quote mark */}
                    <div style={{ position: 'relative', paddingLeft: 16 }}>
                      <span style={{
                        position: 'absolute', left: 0, top: -4,
                        fontSize: '2rem', lineHeight: 1, color: 'var(--sand)',
                        fontFamily: "'Playfair Display',serif", opacity: .5,
                      }}>
                        "
                      </span>
                      <p style={{
                        fontFamily: "'Cormorant Garamond',serif",
                        fontSize: '1.05rem', lineHeight: 1.65,
                        color: 'var(--text-hi)', whiteSpace: 'pre-wrap',
                      }}>
                        {msg.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <MemoriasOptIn />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bd)', color: '#f5dab6',
          padding: '12px 22px', borderRadius: 999,
          fontSize: '.92rem', fontWeight: 600, zIndex: 4000,
          whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,.3)',
          fontFamily: "'Cormorant Garamond',serif",
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
