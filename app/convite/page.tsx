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

      {/* Location card */}
      <div style={{
        background: '#fff',
        border: '1px solid #e8d4b8',
        borderRadius: 20,
        padding: '20px 24px',
        maxWidth: 400,
        width: '100%',
        marginBottom: 28,
        boxShadow: '0 4px 24px rgba(62,36,8,.08)',
        animation: 'convite-fade-in 1s ease .2s both',
      }}>
        <p style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: '1rem',
          fontWeight: 600,
          color: '#3e2408',
          marginBottom: 6,
        }}>
          📍 Local do evento
        </p>
        <p style={{
          fontFamily: "'Cormorant Garamond',serif",
          fontSize: '1rem',
          color: '#7a4e28',
          fontStyle: 'italic',
          lineHeight: 1.5,
          marginBottom: 12,
        }}>
          Endereço a ser confirmado pelos pais — fique ligado!
        </p>
        <a
          href="https://maps.google.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: '.92rem',
            color: '#c47a3a',
            textDecoration: 'none',
            fontWeight: 700,
            letterSpacing: '.04em',
          }}
        >
          Ver no Maps →
        </a>
      </div>

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

      {/* CTA buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 12,
        maxWidth: 400,
        width: '100%',
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
          Confirmar presença →
        </a>
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
        animation: 'convite-fade-in 1s ease .5s both',
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
