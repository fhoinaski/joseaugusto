'use client'

import { useEffect, useState } from 'react'

interface Settings {
  babyBorn: boolean
  babyDueDate: string | null
  babyBornWeight: number | null
  babyBornHora: string | null
  babyBornCabelo: string | null
}

function formatWeight(g: number): string {
  return `${(g / 1000).toFixed(2).replace('.', ',')} kg`
}

function getCountdown(target: Date): { days: number; hours: number; minutes: number; seconds: number; expired: boolean } {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  const s = Math.floor(diff / 1000)
  return {
    expired: false,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  }
}

export default function CountdownBanner() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [countdown, setCountdown] = useState<ReturnType<typeof getCountdown> | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Settings) => setSettings(data))
      .catch(() => {})
  }, [])

  // Fire confetti once when baby arrival is shown
  useEffect(() => {
    if (!settings?.babyBorn) return
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('cha:confetti'))
    }, 600)
    return () => clearTimeout(timer)
  }, [settings?.babyBorn])

  useEffect(() => {
    if (!settings || settings.babyBorn || !settings.babyDueDate) return

    const target = new Date(settings.babyDueDate)
    setCountdown(getCountdown(target))

    const interval = setInterval(() => {
      setCountdown(getCountdown(target))
    }, 1000)

    return () => clearInterval(interval)
  }, [settings])

  if (!settings) return null

  // Baby has arrived — show announcement card
  if (settings.babyBorn) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a3a1a, #2d5a2d)',
          border: '1px solid rgba(80,200,80,.3)',
          borderRadius: 20,
          padding: '28px 24px',
          marginBottom: 24,
          textAlign: 'center',
          animation: 'babyGlow 2s ease-in-out infinite',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🍼</div>
        <h2
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: '1.8rem',
            color: '#f5dab6',
            marginBottom: 8,
            lineHeight: 1.2,
          }}
        >
          José Augusto chegou!
        </h2>
        <p
          style={{
            fontSize: '.9rem',
            color: 'rgba(245,218,182,.65)',
            fontStyle: 'italic',
            marginBottom: 18,
            fontFamily: "'Cormorant Garamond',serif",
          }}
        >
          Bem-vindo ao mundo, pequenino!
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          {settings.babyBornWeight != null && (
            <span
              style={{
                background: 'rgba(213,144,86,.2)',
                border: '1px solid rgba(213,144,86,.4)',
                borderRadius: 99,
                padding: '6px 16px',
                fontSize: '.9rem',
                color: '#d59056',
                fontFamily: "'Cormorant Garamond',serif",
              }}
            >
              ⚖️ {formatWeight(settings.babyBornWeight)}
            </span>
          )}
          {settings.babyBornHora && (
            <span
              style={{
                background: 'rgba(106,158,122,.2)',
                border: '1px solid rgba(106,158,122,.4)',
                borderRadius: 99,
                padding: '6px 16px',
                fontSize: '.9rem',
                color: '#9dcfad',
                fontFamily: "'Cormorant Garamond',serif",
              }}
            >
              🕐 {settings.babyBornHora}
            </span>
          )}
          {settings.babyBornCabelo && (
            <span
              style={{
                background: 'rgba(255,255,255,.1)',
                border: '1px solid rgba(255,255,255,.15)',
                borderRadius: 99,
                padding: '6px 16px',
                fontSize: '.9rem',
                color: 'rgba(245,218,182,.8)',
                fontFamily: "'Cormorant Garamond',serif",
              }}
            >
              Cabelo: {settings.babyBornCabelo}
            </span>
          )}
        </div>
      </div>
    )
  }

  // No due date set — render nothing
  if (!settings.babyDueDate || !countdown) return null

  // Countdown timer
  if (countdown.expired) {
    return (
      <div
        style={{
          background: 'rgba(255,255,255,.06)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 20,
          padding: '24px 20px',
          marginBottom: 24,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: '1.2rem',
            color: '#f5dab6',
          }}
        >
          A chegada está próxima... 🌟
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,.06)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 20,
        padding: '24px 20px',
        marginBottom: 24,
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: '.78rem',
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: 'rgba(245,218,182,.5)',
          fontWeight: 600,
          marginBottom: 12,
          fontFamily: "'Cormorant Garamond',serif",
        }}
      >
        📅 Previsão de chegada
      </p>
      <p
        style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: '2rem',
          color: '#d59056',
          letterSpacing: '.04em',
          lineHeight: 1.1,
        }}
      >
        {countdown.days}d {String(countdown.hours).padStart(2, '0')}h{' '}
        {String(countdown.minutes).padStart(2, '0')}m{' '}
        {String(countdown.seconds).padStart(2, '0')}s
      </p>
    </div>
  )
}
