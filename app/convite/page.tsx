'use client'

import { useEffect, useState } from 'react'

const EVENT_DATE = new Date('2026-04-25T17:00:00-03:00')

// ── Countdown ─────────────────────────────────────────────────────────────────

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(() => Math.max(0, target.getTime() - Date.now()))

  useEffect(() => {
    const id = setInterval(() => {
      setDiff(Math.max(0, target.getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(id)
  }, [target])

  const total = Math.floor(diff / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  return { days, hours, minutes, seconds, ended: diff === 0 }
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div style={{
      background: 'rgba(62,36,8,.06)',
      border: '1px solid rgba(62,36,8,.12)',
      borderRadius: 16,
      padding: '16px 12px',
      minWidth: 64,
      textAlign: 'center',
    }}>
      <span style={{
        fontFamily: "'Playfair Display',serif",
        fontSize: '2.2rem',
        fontWeight: 700,
        color: '#3e2408',
        display: 'block',
        lineHeight: 1,
      }}>
        {String(value).padStart(2, '0')}
      </span>
      <span style={{
        fontSize: '.68rem',
        letterSpacing: '.12em',
        textTransform: 'uppercase' as const,
        color: '#a0713e',
        marginTop: 4,
        display: 'block',
      }}>
        {label}
      </span>
    </div>
  )
}

// ── RSVP inline ───────────────────────────────────────────────────────────────

type RsvpStatus = 'confirmed' | 'maybe' | 'declined'

function RsvpSection() {
  const [name, setName] = useState('')
  const [status, setStatus] = useState<RsvpStatus>('confirmed')
  const [guestsCount, setGuestsCount] = useState(1)
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #e8d4b8',
    borderRadius: 12,
    padding: '11px 14px',
    fontFamily: "'Cormorant Garamond',serif",
    fontSize: '1rem',
    color: '#3e2408',
    background: '#fdf6ee',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelTextStyle: React.CSSProperties = {
    fontSize: '.78rem',
    color: '#a0713e',
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    fontWeight: 600,
    display: 'block',
    marginBottom: 6,
  }

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
      <div style={{ textAlign: 'center', padding: '28px 0' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 14, animation: 'rsvp-pop .5s cubic-bezier(.34,1.56,.64,1) both' }}>
          🎉
        </div>
        <h2 style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: '1.6rem',
          color: '#3e2408',
          marginBottom: 10,
          animation: 'rsvp-fade-up .6s ease .1s both',
        }}>
          {status === 'confirmed' ? 'Presença confirmada!' : status === 'maybe' ? 'Resposta registrada!' : 'Entendemos!'}
        </h2>
        <p style={{
          fontFamily: "'Cormorant Garamond',serif",
          fontSize: '1.05rem',
          color: '#7a4e28',
          fontStyle: 'italic',
          lineHeight: 1.6,
          animation: 'rsvp-fade-up .6s ease .2s both',
        }}>
          {status === 'confirmed'
            ? `Que ótimo, ${name.split(' ')[0]}! Mal podemos esperar para te ver no chá do José Augusto. 🎀`
            : status === 'maybe'
            ? `Obrigado, ${name.split(' ')[0]}! Ficamos torcendo para você conseguir vir.`
            : `Obrigado por responder, ${name.split(' ')[0]}! Sentiremos sua falta.`}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Name */}
      <label>
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
      <div>
        <span style={labelTextStyle}>Você vai?</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
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
                minWidth: 90,
                padding: '9px 10px',
                borderRadius: 12,
                border: `1.5px solid ${status === opt.value ? opt.border : '#e8d4b8'}`,
                background: status === opt.value ? opt.bg : '#fdf6ee',
                color: status === opt.value ? opt.color : '#a0713e',
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

      {/* Guest count */}
      {(status === 'confirmed' || status === 'maybe') && (
        <div>
          <span style={labelTextStyle}>Quantas pessoas (incluindo você)?</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => setGuestsCount(c => Math.max(1, c - 1))}
              style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e8d4b8', background: '#fdf6ee', fontSize: '1.2rem', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#3e2408' }}
            >−</button>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', color: '#3e2408', minWidth: 32, textAlign: 'center' }}>{guestsCount}</span>
            <button
              type="button"
              onClick={() => setGuestsCount(c => Math.min(10, c + 1))}
              style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e8d4b8', background: '#fdf6ee', fontSize: '1.2rem', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#3e2408' }}
            >+</button>
          </div>
        </div>
      )}

      {/* Contact */}
      <label>
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
      <label>
        <span style={labelTextStyle}>Uma mensagem especial (opcional)</span>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value.slice(0, 300))}
          placeholder="Uma mensagem carinhosa para a família..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
        />
        <span style={{ fontSize: '.72rem', color: '#a0713e', display: 'block', textAlign: 'right', marginTop: 3 }}>
          {300 - message.length} caracteres
        </span>
      </label>

      {error && (
        <p style={{ color: '#c0392b', fontSize: '.88rem', fontStyle: 'italic', margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: sending ? '#e8d4b8' : 'linear-gradient(135deg,#c47a3a,#7a4e28)',
          color: sending ? '#a0713e' : '#fdf6ee',
          border: 'none',
          borderRadius: 14,
          cursor: sending ? 'not-allowed' : 'pointer',
          fontFamily: "'Playfair Display',serif",
          fontSize: '1.05rem',
          fontWeight: 600,
          letterSpacing: '.03em',
          transition: 'background .2s',
          boxShadow: sending ? 'none' : '0 4px 14px rgba(196,122,58,.3)',
        }}
      >
        {sending ? 'Enviando...' : '🎀 Confirmar presença'}
      </button>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConvitePage() {
  const { days, hours, minutes, seconds, ended } = useCountdown(EVENT_DATE)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const qrUrl = origin ? `/api/qrcode?url=${encodeURIComponent(origin + '/convite')}&size=240` : null

  const card: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e8d4b8',
    borderRadius: 20,
    padding: '20px 24px',
    maxWidth: 440,
    width: '100%',
    marginBottom: 24,
    boxShadow: '0 4px 24px rgba(62,36,8,.08)',
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #fdf6ee 0%, #f5ede0 60%, #eddfc8 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 20px 60px',
    }}>
      {/* Decorative top strip */}
      <div style={{
        width: '100%',
        height: 4,
        background: 'linear-gradient(90deg, #c47a3a, #a0713e, #c47a3a)',
      }} />

      {/* Header */}
      <div style={{
        textAlign: 'center',
        paddingTop: 48,
        paddingBottom: 32,
        animation: 'convite-fade-in .8s ease both',
      }}>
        <p style={{
          fontFamily: "'Dancing Script',cursive",
          fontSize: '1.1rem',
          color: '#a0713e',
          letterSpacing: '.06em',
          marginBottom: 10,
        }}>
          ✦ Você está convidado ✦
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: 'clamp(1.9rem, 7vw, 3rem)',
          fontWeight: 700,
          color: '#3e2408',
          lineHeight: 1.15,
          marginBottom: 8,
        }}>
          Chá de Bebê
          <br />
          <span style={{ color: '#c47a3a' }}>José Augusto</span>
        </h1>
        <p style={{
          fontFamily: "'Cormorant Garamond',serif",
          fontSize: '1.15rem',
          color: '#7a4e28',
          fontStyle: 'italic',
          letterSpacing: '.04em',
        }}>
          25 de Abril · 2026 · 17h
        </p>
      </div>

      {/* Divider */}
      <div style={{ width: 60, height: 1, background: '#c9a87c', marginBottom: 36 }} />

      {/* Countdown */}
      {!ended ? (
        <div style={{
          marginBottom: 40,
          textAlign: 'center',
          animation: 'convite-fade-in .9s ease .1s both',
        }}>
          <p style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: '.88rem',
            letterSpacing: '.14em',
            textTransform: 'uppercase' as const,
            color: '#a0713e',
            marginBottom: 16,
          }}>
            Faltam
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <CountdownBox value={days} label="dias" />
            <CountdownBox value={hours} label="horas" />
            <CountdownBox value={minutes} label="min" />
            <CountdownBox value={seconds} label="seg" />
          </div>
        </div>
      ) : (
        <p style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: '1.3rem',
          color: '#c47a3a',
          marginBottom: 40,
          fontStyle: 'italic',
          animation: 'convite-fade-in .9s ease both',
        }}>
          🎉 O evento começa agora!
        </p>
      )}

      {/* Event details */}
      <div style={{ ...card, animation: 'convite-fade-in 1s ease .2s both' }}>
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', fontWeight: 600, color: '#3e2408', marginBottom: 16 }}>
          Detalhes do Evento
        </p>
        {[
          { icon: '📅', label: 'Data', value: '25 de Abril de 2026' },
          { icon: '🕔', label: 'Horário', value: '17h00' },
          { icon: '👗', label: 'Traje', value: 'Pastel / Elegante casual' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
            <div>
              <span style={{ fontSize: '.72rem', textTransform: 'uppercase' as const, letterSpacing: '.1em', color: '#a0713e', fontWeight: 600, display: 'block' }}>{item.label}</span>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: '#3e2408' }}>{item.value}</span>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: 1 }}>📍</span>
          <div>
            <span style={{ fontSize: '.72rem', textTransform: 'uppercase' as const, letterSpacing: '.1em', color: '#a0713e', fontWeight: 600, display: 'block' }}>Local</span>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: '#3e2408', display: 'block', fontStyle: 'italic' }}>
              Endereço a ser confirmado
            </span>
            <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '.88rem', color: '#c47a3a', textDecoration: 'none', fontWeight: 700 }}>
              Ver no Maps →
            </a>
          </div>
        </div>
      </div>

      {/* ── RSVP inline ── */}
      <div style={{ ...card, animation: 'convite-fade-in 1s ease .3s both' }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#3e2408',
            marginBottom: 4,
          }}>
            📋 Confirmar Presença
          </p>
          <p style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: '.95rem',
            color: '#a0713e',
            fontStyle: 'italic',
          }}>
            Por favor, confirme sua presença até 20 de Abril.
          </p>
        </div>
        <RsvpSection />
      </div>

      {/* Gifts section */}
      <div style={{ ...card, animation: 'convite-fade-in 1s ease .4s both' }}>
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', fontWeight: 600, color: '#3e2408', marginBottom: 10 }}>
          🎁 Lista de Presentes
        </p>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: '#7a4e28', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 14 }}>
          Montamos uma lista especial com os itens que o José Augusto vai precisar. Se quiser presentear, confira nossa lista de presentes.
        </p>
        <a
          href="/store"
          style={{
            display: 'inline-block',
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: '.95rem',
            color: '#c47a3a',
            textDecoration: 'none',
            fontWeight: 700,
            letterSpacing: '.04em',
          }}
        >
          Ver lista de presentes →
        </a>
      </div>

      {/* FAQ */}
      <div style={{ ...card, animation: 'convite-fade-in 1s ease .5s both' }}>
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', fontWeight: 600, color: '#3e2408', marginBottom: 16 }}>
          Perguntas Frequentes
        </p>
        {[
          { q: 'Posso levar meus filhos?', a: 'Sim! Crianças são muito bem-vindas no chá do José Augusto.' },
          { q: 'Tem estacionamento?', a: 'Sim, o local dispõe de estacionamento gratuito para os convidados.' },
          { q: 'Preciso levar presente?', a: 'A sua presença é o presente mais especial! Mas se quiser, confira nossa lista de presentes.' },
          { q: 'O evento tem hora para terminar?', a: 'O evento começa às 17h. Fique à vontade para ficar até o fim da festa!' },
        ].map((item, idx) => (
          <div key={idx} style={{ marginBottom: idx < 3 ? 14 : 0 }}>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '.92rem', fontWeight: 600, color: '#3e2408', marginBottom: 4 }}>
              {item.q}
            </p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', color: '#7a4e28', lineHeight: 1.55 }}>
              {item.a}
            </p>
          </div>
        ))}
      </div>

      {/* QR Code — para os convidados compartilharem entre si */}
      {qrUrl && (
        <div style={{ ...card, textAlign: 'center', animation: 'convite-fade-in 1s ease .6s both' }}>
          <p style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: '1rem',
            fontWeight: 600,
            color: '#3e2408',
            marginBottom: 12,
          }}>
            Compartilhe com outros convidados
          </p>
          <img
            src={qrUrl}
            alt="QR Code do convite"
            width={160}
            height={160}
            style={{ display: 'block', margin: '0 auto', borderRadius: 8 }}
          />
          <p style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: '.85rem',
            color: '#a0713e',
            fontStyle: 'italic',
            marginTop: 10,
          }}>
            Escaneie para abrir este convite
          </p>
        </div>
      )}

      {/* Back to album */}
      <div style={{ maxWidth: 440, width: '100%', animation: 'convite-fade-in 1s ease .65s both' }}>
        <a
          href="/"
          style={{
            display: 'block',
            background: 'transparent',
            color: '#3e2408',
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: '1.05rem',
            fontWeight: 600,
            textAlign: 'center',
            textDecoration: 'none',
            padding: '14px 24px',
            borderRadius: 999,
            border: '1.5px solid #c9a87c',
            letterSpacing: '.03em',
          }}
        >
          Abrir o álbum →
        </a>
      </div>

      {/* Footer */}
      <p style={{
        fontFamily: "'Dancing Script',cursive",
        fontSize: '1rem',
        color: '#a0713e',
        marginTop: 48,
        textAlign: 'center',
        animation: 'convite-fade-in 1s ease .7s both',
      }}>
        Com amor, família Fhoinaski 🧸
      </p>

      <style>{`
        @keyframes convite-fade-in {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rsvp-pop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes rsvp-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
