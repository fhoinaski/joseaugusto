'use client'

import { useEffect, useState } from 'react'

const EVENT_DATE = new Date('2026-04-25T17:00:00-03:00')

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

export default function ConvitePage() {
  const { days, hours, minutes, seconds, ended } = useCountdown(EVENT_DATE)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const qrUrl = origin ? `/api/qrcode?url=${encodeURIComponent(origin + '/convite')}&size=240` : null

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
        marginBottom: 0,
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

      {/* QR Code */}
      {qrUrl && (
        <div style={{
          background: '#fff',
          border: '1px solid #e8d4b8',
          borderRadius: 20,
          padding: '20px 24px',
          maxWidth: 400,
          width: '100%',
          marginBottom: 28,
          boxShadow: '0 4px 24px rgba(62,36,8,.08)',
          textAlign: 'center',
          animation: 'convite-fade-in 1s ease .3s both',
        }}>
          <p style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: '1rem',
            fontWeight: 600,
            color: '#3e2408',
            marginBottom: 12,
          }}>
            Compartilhe o convite
          </p>
          <img
            src={qrUrl}
            alt="QR Code do convite"
            width={180}
            height={180}
            style={{ display: 'block', margin: '0 auto', borderRadius: 8 }}
          />
          <p style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: '.85rem',
            color: '#a0713e',
            fontStyle: 'italic',
            marginTop: 10,
          }}>
            Escaneie para abrir o convite
          </p>
        </div>
      )}

      {/* Event details */}
      <div style={{
        background: '#fff',
        border: '1px solid #e8d4b8',
        borderRadius: 20,
        padding: '20px 24px',
        maxWidth: 400,
        width: '100%',
        marginBottom: 24,
        boxShadow: '0 4px 24px rgba(62,36,8,.08)',
        animation: 'convite-fade-in 1s ease .35s both',
      }}>
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

      {/* Confirm presence CTA */}
      <div style={{
        maxWidth: 400,
        width: '100%',
        marginBottom: 24,
        animation: 'convite-fade-in 1s ease .4s both',
      }}>
        <a
          href="/rsvp"
          style={{
            display: 'block',
            background: 'linear-gradient(135deg, #c47a3a, #7a4e28)',
            color: '#fdf6ee',
            fontFamily: "'Playfair Display',serif",
            fontSize: '1.05rem',
            fontWeight: 600,
            textAlign: 'center',
            textDecoration: 'none',
            padding: '16px 24px',
            borderRadius: 999,
            boxShadow: '0 4px 16px rgba(196,122,58,.35)',
            letterSpacing: '.03em',
          }}
        >
          📋 Confirmar presença →
        </a>
      </div>

      {/* Gifts section */}
      <div style={{
        background: '#fff',
        border: '1px solid #e8d4b8',
        borderRadius: 20,
        padding: '20px 24px',
        maxWidth: 400,
        width: '100%',
        marginBottom: 24,
        boxShadow: '0 4px 24px rgba(62,36,8,.08)',
        animation: 'convite-fade-in 1s ease .45s both',
      }}>
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
      <div style={{
        background: '#fff',
        border: '1px solid #e8d4b8',
        borderRadius: 20,
        padding: '20px 24px',
        maxWidth: 400,
        width: '100%',
        marginBottom: 28,
        boxShadow: '0 4px 24px rgba(62,36,8,.08)',
        animation: 'convite-fade-in 1s ease .5s both',
      }}>
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

      {/* Back link */}
      <div style={{
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 12,
        maxWidth: 400,
        width: '100%',
        animation: 'convite-fade-in 1s ease .55s both',
      }}>
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
        animation: 'convite-fade-in 1s ease .6s both',
      }}>
        Com amor, família Fhoinaski 🧸
      </p>

      <style>{`
        @keyframes convite-fade-in {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
