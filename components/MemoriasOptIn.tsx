'use client'

import { useEffect, useState } from 'react'

export default function MemoriasOptIn() {
  const [author, setAuthor]     = useState('')
  const [email, setEmail]       = useState('')
  const [sending, setSending]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cha_author') ?? ''
      if (saved.trim()) setAuthor(saved.trim())
    } catch {}
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!author.trim()) { setError('Informe seu nome.'); return }
    if (!email.trim())  { setError('Informe seu e-mail.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Informe um e-mail válido.')
      return
    }

    setSending(true)
    try {
      const res  = await fetch('/api/memorias', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ author: author.trim(), email: email.trim() }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Erro ao inscrever.')
        return
      }
      try { localStorage.setItem('cha_author', author.trim()) } catch {}
      setSuccess(true)
    } catch {
      setError('Sem conexão. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      marginTop: 40,
      background: '#faf6ef',
      border: '1.5px solid #c9a87c',
      borderRadius: 20,
      padding: '28px 24px',
      boxShadow: '0 4px 24px rgba(196,122,58,.1)',
    }}>
      {success ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎂</div>
          <p style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: '1.05rem', color: '#3e2408',
            marginBottom: 6,
          }}>
            Inscrição confirmada!
          </p>
          <p style={{ fontSize: '.88rem', color: '#7a4e28', fontStyle: 'italic', lineHeight: 1.5 }}>
            ✅ Você receberá as memórias no aniversário do José Augusto! 🎂
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: '2rem' }}>📬</span>
            <div>
              <p style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: '1.05rem', fontWeight: 600, color: '#3e2408', marginBottom: 2,
              }}>
                Receba memórias do José Augusto
              </p>
              <p style={{ fontSize: '.82rem', color: '#7a4e28', fontStyle: 'italic', lineHeight: 1.4 }}>
                No 1º aniversário, enviaremos as fotos e mensagens do chá direto para você.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Seu nome"
              maxLength={60}
              style={{
                border: '1px solid #e8d4b8', borderRadius: 12,
                padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif",
                fontSize: '1rem', color: '#3e2408', background: 'var(--warm, #fdf6ee)',
                outline: 'none', width: '100%', boxSizing: 'border-box',
              }}
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              maxLength={120}
              style={{
                border: '1px solid #e8d4b8', borderRadius: 12,
                padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif",
                fontSize: '1rem', color: '#3e2408', background: 'var(--warm, #fdf6ee)',
                outline: 'none', width: '100%', boxSizing: 'border-box',
              }}
            />

            {error && (
              <p style={{ color: '#c0392b', fontSize: '.85rem', fontStyle: 'italic' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={sending}
              style={{
                background: sending ? '#e8d4b8' : 'linear-gradient(135deg,#c9a87c,#7a4e28)',
                color: sending ? '#7a4e28' : '#fdf6ee',
                border: 'none', borderRadius: 12, padding: '11px 20px',
                fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem',
                fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer',
                letterSpacing: '.03em',
              }}
            >
              {sending ? 'Inscrevendo...' : '📬 Quero receber as memórias'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
