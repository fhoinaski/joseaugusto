'use client'

import { useEffect, useState } from 'react'
import MemoriasOptIn from '@/components/MemoriasOptIn'

interface CartaItem {
  id: number
  author: string
  message: string
  createdAt: string
}

const MAX_MESSAGE = 2000
const MIN_MESSAGE = 20
const MAX_NAME = 60

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase() || '?'
}

function avatarBg(name: string): string {
  const colors = ['#c97a6e', '#6b9e7a', '#c47a3a', '#9b6ea8', '#4a7a9b', '#7a4e28']
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

export default function CartaPage() {
  const [author, setAuthor] = useState('')
  const [message, setMessage] = useState('')

  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [success, setSuccess] = useState(false)

  const [cartas, setCartas] = useState<CartaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cha_author')
      if (saved) setAuthor(saved)
    } catch {}
  }, [])

  const loadCartas = async () => {
    try {
      const res = await fetch('/api/carta')
      const data = await res.json() as { cartas?: CartaItem[] }
      setCartas(Array.isArray(data.cartas) ? data.cartas : [])
    } catch {
      setCartas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCartas() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendError('')

    const trimmedAuthor = author.trim()
    const trimmedMessage = message.trim()

    if (!trimmedAuthor) {
      setSendError('Informe seu nome para enviar a carta.')
      return
    }
    if (trimmedMessage.length < MIN_MESSAGE) {
      setSendError(`A carta precisa ter pelo menos ${MIN_MESSAGE} caracteres.`)
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/carta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: trimmedAuthor, message: trimmedMessage }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setSendError(data.error ?? 'Erro ao enviar carta.')
        return
      }
      try { localStorage.setItem('cha_author', trimmedAuthor) } catch {}
      setSuccess(true)
      setMessage('')
      await loadCartas()
    } catch {
      setSendError('Sem conexão. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  const charsLeft = MAX_MESSAGE - message.length
  const messageValid = message.trim().length >= MIN_MESSAGE
  const authorValid = author.trim().length > 0

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #1a0d00 0%, #3e2408 50%, #1a0d00 100%)',
      color: '#f5dab6',
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{ padding: '36px 20px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>✉️</div>
        <p style={{
          fontFamily: "'Dancing Script',cursive",
          color: '#d59056',
          fontSize: '1.05rem',
          marginBottom: 4,
        }}>
          ✦ Uma mensagem especial ✦
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: '2rem',
          margin: '0 0 8px',
          color: '#f5dab6',
        }}>
          Carta para o <em>José Augusto</em>
        </h1>
        <p style={{
          fontSize: '.9rem',
          color: 'rgba(245,218,182,.6)',
          fontStyle: 'italic',
          maxWidth: 340,
          margin: '0 auto',
        }}>
          Escreva uma mensagem que ele vai ler quando crescer
        </p>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px' }}>

        {/* Success state */}
        {success ? (
          <div style={{
            background: 'rgba(106,158,122,.18)',
            border: '1px solid rgba(106,158,122,.4)',
            borderRadius: 20,
            padding: '32px 24px',
            textAlign: 'center',
            marginBottom: 32,
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>💌</div>
            <p style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: '1.35rem',
              color: '#f5dab6',
              marginBottom: 8,
            }}>
              Sua carta foi guardada com carinho!
            </p>
            <p style={{
              fontSize: '.95rem',
              color: 'rgba(245,218,182,.7)',
              marginBottom: 20,
              fontStyle: 'italic',
            }}>
              O José Augusto vai adorar ler quando crescer. 💌
            </p>
            <button
              onClick={() => { setSuccess(false); setSendError('') }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(245,218,182,.3)',
                color: '#f5dab6',
                borderRadius: 12,
                padding: '10px 22px',
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: '.95rem',
                cursor: 'pointer',
              }}
            >
              Escrever outra carta
            </button>
          </div>
        ) : (
          /* Form */
          <form
            onSubmit={handleSubmit}
            style={{
              background: 'rgba(255,255,255,.06)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 20,
              padding: '24px 20px',
              marginBottom: 32,
            }}
          >
            <p style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: '1.1rem',
              color: '#f5dab6',
              marginBottom: 20,
              fontWeight: 600,
            }}>
              Escreva sua carta
            </p>

            {/* Name field */}
            <label style={{ display: 'block', marginBottom: 18 }}>
              <span style={{
                fontSize: '.78rem',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'rgba(245,218,182,.55)',
                fontWeight: 600,
                display: 'block',
                marginBottom: 8,
              }}>
                Seu nome *
              </span>
              <input
                type="text"
                value={author}
                onChange={e => { setAuthor(e.target.value); setSendError('') }}
                placeholder="Como você se chama?"
                maxLength={MAX_NAME}
                required
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,.08)',
                  border: '1px solid rgba(255,255,255,.15)',
                  borderRadius: 12,
                  padding: '11px 14px',
                  color: '#f5dab6',
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </label>

            {/* Message textarea */}
            <label style={{ display: 'block', marginBottom: 8 }}>
              <span style={{
                fontSize: '.78rem',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'rgba(245,218,182,.55)',
                fontWeight: 600,
                display: 'block',
                marginBottom: 8,
              }}>
                Sua carta *
              </span>
              <textarea
                value={message}
                onChange={e => { setMessage(e.target.value); setSendError('') }}
                placeholder={`Querido José Augusto,\n\nEscreva aqui sua mensagem especial para ele ler quando crescer...`}
                maxLength={MAX_MESSAGE}
                rows={8}
                required
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,.08)',
                  border: `1px solid ${message.length > 0 && !messageValid ? 'rgba(192,57,43,.6)' : 'rgba(255,255,255,.15)'}`,
                  borderRadius: 12,
                  padding: '11px 14px',
                  color: '#f5dab6',
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: 160,
                  boxSizing: 'border-box',
                  lineHeight: 1.6,
                }}
              />
            </label>

            {/* Character counter */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <span style={{
                fontSize: '.78rem',
                color: message.length > 0 && !messageValid
                  ? 'rgba(192,57,43,.8)'
                  : 'rgba(245,218,182,.4)',
                fontStyle: 'italic',
              }}>
                {message.length > 0 && !messageValid
                  ? `Ainda faltam ${MIN_MESSAGE - message.trim().length} caracteres`
                  : 'Mínimo de 20 caracteres'}
              </span>
              <span style={{
                fontSize: '.78rem',
                color: charsLeft < 100 ? '#d59056' : 'rgba(245,218,182,.4)',
                fontFamily: 'monospace',
              }}>
                {charsLeft} restantes
              </span>
            </div>

            {/* Error message */}
            {sendError && (
              <div style={{
                background: 'rgba(192,57,43,.15)',
                border: '1px solid rgba(192,57,43,.3)',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#e07b6a',
                fontSize: '.9rem',
                marginBottom: 16,
              }}>
                {sendError}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={sending || !authorValid || !messageValid}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: sending || !authorValid || !messageValid
                  ? 'rgba(255,255,255,.08)'
                  : 'linear-gradient(135deg,#c9920a,#7a5c00)',
                border: 'none',
                borderRadius: 14,
                color: sending || !authorValid || !messageValid
                  ? 'rgba(245,218,182,.4)'
                  : '#fff',
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: '1.05rem',
                fontWeight: 600,
                cursor: sending || !authorValid || !messageValid ? 'not-allowed' : 'pointer',
                transition: 'all .2s',
                letterSpacing: '.03em',
              }}
            >
              {sending ? 'Enviando...' : '💌 Enviar minha carta'}
            </button>
          </form>
        )}

        {/* Cartas list */}
        <div>
          <h2 style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: '1.3rem',
            color: '#f5dab6',
            marginBottom: 6,
            fontWeight: 600,
          }}>
            Cartas guardadas
          </h2>
          <p style={{
            fontSize: '.85rem',
            color: 'rgba(245,218,182,.5)',
            marginBottom: 20,
            fontStyle: 'italic',
          }}>
            Mensagens cheias de amor para o José Augusto
          </p>

          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'rgba(245,218,182,.4)',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
              <p style={{ fontStyle: 'italic', fontSize: '.9rem' }}>Carregando cartas...</p>
            </div>
          ) : cartas.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 16,
              color: 'rgba(245,218,182,.45)',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>✉️</div>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem' }}>
                Ainda não há cartas
              </p>
              <p style={{ fontSize: '.85rem', marginTop: 6, fontStyle: 'italic' }}>
                Seja o primeiro a escrever uma mensagem!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {cartas.map(carta => (
                <div
                  key={carta.id}
                  style={{
                    background: 'rgba(255,255,255,.06)',
                    border: '1px solid rgba(255,255,255,.1)',
                    borderRadius: 16,
                    padding: '16px 18px',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: avatarBg(carta.author),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '.9rem',
                    letterSpacing: '.05em',
                  }}>
                    {getInitials(carta.author)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 6,
                      flexWrap: 'wrap',
                    }}>
                      <span style={{
                        fontFamily: "'Playfair Display',serif",
                        fontSize: '1rem',
                        color: '#f5dab6',
                        fontWeight: 600,
                      }}>
                        {carta.author}
                      </span>
                      <span style={{
                        fontSize: '.75rem',
                        color: 'rgba(245,218,182,.35)',
                        fontStyle: 'italic',
                      }}>
                        {formatDate(carta.createdAt)}
                      </span>
                    </div>

                    {/* Envelope icon + preview */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>✉️</span>
                      <p style={{
                        fontFamily: "'Cormorant Garamond',serif",
                        fontSize: '.95rem',
                        color: 'rgba(245,218,182,.75)',
                        lineHeight: 1.6,
                        fontStyle: 'italic',
                        margin: 0,
                      }}>
                        {truncate(carta.message, 200)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px' }}>
          <MemoriasOptIn />
        </div>
      </div>
    </div>
  )
}
