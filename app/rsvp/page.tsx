'use client'

import { useState } from 'react'

type RsvpStatus = 'confirmed' | 'maybe' | 'declined'

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--beige)',
  borderRadius: 12,
  padding: '11px 14px',
  fontFamily: "'Cormorant Garamond',serif",
  fontSize: '1rem',
  color: 'var(--bd)',
  background: 'var(--warm)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 14,
}

const labelTextStyle: React.CSSProperties = {
  fontSize: '.8rem',
  color: 'var(--text-lo)',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  fontWeight: 600,
  display: 'block',
  marginBottom: 6,
}

export default function RsvpPage() {
  const [name, setName] = useState('')
  const [status, setStatus] = useState<RsvpStatus>('confirmed')
  const [guestsCount, setGuestsCount] = useState(1)
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Por favor, informe seu nome.'); return }

    setSending(true)
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          status,
          guests_count: guestsCount,
          contact: contact.trim() || undefined,
          message: message.trim() || undefined,
        }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Erro ao confirmar presença.'); return }
      setSuccess(true)
    } catch {
      setError('Sem conexão. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '4rem', marginBottom: 16, animation: 'rsvp-pop .5s cubic-bezier(.34,1.56,.64,1) both' }}>
            🎉
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: '1.8rem',
            color: 'var(--bd)',
            marginBottom: 12,
            animation: 'rsvp-fade-up .6s ease .1s both',
          }}>
            {status === 'confirmed' ? 'Presença confirmada!' : status === 'maybe' ? 'Resposta registrada!' : 'Entendemos!'}
          </h1>
          <p style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: '1.1rem',
            color: 'var(--text-md)',
            fontStyle: 'italic',
            lineHeight: 1.6,
            marginBottom: 32,
            animation: 'rsvp-fade-up .6s ease .2s both',
          }}>
            {status === 'confirmed'
              ? `Que ótimo, ${name.split(' ')[0]}! Mal podemos esperar para te ver no chá do José Augusto. 🎀`
              : status === 'maybe'
              ? `Obrigado, ${name.split(' ')[0]}! Ficamos torcendo para você conseguir vir.`
              : `Obrigado por responder, ${name.split(' ')[0]}! Sentiremos sua falta.`}
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              background: 'var(--bd)',
              color: '#f5dab6',
              fontFamily: "'Playfair Display',serif",
              fontSize: '1rem',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '13px 28px',
              borderRadius: 999,
              animation: 'rsvp-fade-up .6s ease .3s both',
            }}
          >
            ← Voltar ao início
          </a>
        </div>
        <style>{`
          @keyframes rsvp-pop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes rsvp-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--warm)', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        background: 'var(--cream)',
        borderBottom: '1px solid var(--beige)',
        padding: '28px 20px 24px',
        textAlign: 'center',
      }}>
        <a href="/" style={{ fontSize: '.8rem', color: 'var(--text-lo)', textDecoration: 'none', display: 'block', marginBottom: 12 }}>
          ← Voltar ao início
        </a>
        <p style={{ fontFamily: "'Dancing Script',cursive", color: 'var(--sand)', fontSize: '1rem', marginBottom: 4 }}>
          ✦ Chá de Bebê ✦
        </p>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.9rem', color: 'var(--bd)', margin: '0 0 8px' }}>
          Confirmar <em>Presença</em> 🎀
        </h1>
        <p style={{ fontSize: '.9rem', color: 'var(--text-lo)', fontStyle: 'italic' }}>
          José Augusto · 25 de Abril · 2026
        </p>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 16px' }}>
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--cream)',
            border: '1px solid var(--beige)',
            borderRadius: 20,
            padding: '28px 24px',
            boxShadow: '0 2px 16px rgba(62,36,8,.06)',
          }}
        >
          {/* Name */}
          <label style={labelStyle}>
            <span style={labelTextStyle}>Nome completo *</span>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="Seu nome completo"
              maxLength={80}
              style={inputStyle}
            />
          </label>

          {/* Status toggle */}
          <div style={{ marginBottom: 20 }}>
            <span style={labelTextStyle}>Você vai?</span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {([
                { value: 'confirmed', label: '✅ Vou!', bg: '#e8f5e0', color: '#3a6d10', border: '#5a9e3a' },
                { value: 'maybe',     label: '🤔 Talvez', bg: '#fff8e6', color: '#7a5f10', border: '#c9a020' },
                { value: 'declined',  label: '❌ Não posso', bg: '#fbeaea', color: '#a33', border: '#e0a0a0' },
              ] as { value: RsvpStatus; label: string; bg: string; color: string; border: string }[]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: `1.5px solid ${status === opt.value ? opt.border : 'var(--beige)'}`,
                    background: status === opt.value ? opt.bg : 'var(--warm)',
                    color: status === opt.value ? opt.color : 'var(--text-lo)',
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: '.95rem',
                    fontWeight: status === opt.value ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Guest count (only if confirmed or maybe) */}
          {(status === 'confirmed' || status === 'maybe') && (
            <label style={labelStyle}>
              <span style={labelTextStyle}>Quantas pessoas vão (incluindo você)?</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setGuestsCount(c => Math.max(1, c - 1))}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--beige)', background: 'var(--warm)', fontSize: '1.2rem', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--bd)' }}
                >−</button>
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', color: 'var(--bd)', minWidth: 32, textAlign: 'center' }}>{guestsCount}</span>
                <button
                  type="button"
                  onClick={() => setGuestsCount(c => Math.min(10, c + 1))}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--beige)', background: 'var(--warm)', fontSize: '1.2rem', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--bd)' }}
                >+</button>
              </div>
            </label>
          )}

          {/* Contact */}
          <label style={labelStyle}>
            <span style={labelTextStyle}>WhatsApp ou e-mail (opcional)</span>
            <input
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="Para entrarmos em contato se necessário"
              maxLength={120}
              style={inputStyle}
            />
          </label>

          {/* Message */}
          <label style={{ ...labelStyle, marginBottom: 20 }}>
            <span style={labelTextStyle}>Uma mensagem especial (opcional)</span>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, 300))}
              placeholder="Uma mensagem especial..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
            />
            <span style={{ fontSize: '.75rem', color: 'var(--text-lo)', display: 'block', textAlign: 'right', marginTop: 4 }}>
              {300 - message.length} caracteres restantes
            </span>
          </label>

          {error && (
            <p style={{ color: '#c0392b', fontSize: '.88rem', fontStyle: 'italic', marginBottom: 14 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: sending ? 'var(--beige)' : 'var(--bd)',
              color: sending ? 'var(--text-lo)' : '#f5dab6',
              border: 'none',
              borderRadius: 14,
              cursor: sending ? 'not-allowed' : 'pointer',
              fontFamily: "'Playfair Display',serif",
              fontSize: '1.05rem',
              fontWeight: 600,
              letterSpacing: '.03em',
              transition: 'background .2s',
            }}
          >
            {sending ? 'Enviando...' : '🎀 Confirmar'}
          </button>
        </form>
      </div>
    </div>
  )
}
