'use client'

import { useEffect, useState } from 'react'

interface Marco {
  id: number
  title: string
  emoji: string
  description: string | null
  marco_date: string
  photo_url: string | null
  created_at: string
}

function formatDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(
      new Date(year, month - 1, day)
    )
  } catch {
    return dateStr
  }
}

export default function MarcosPage() {
  const [marcos, setMarcos] = useState<Marco[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/marcos')
      .then(r => r.json())
      .then((d: { marcos?: Marco[]; error?: string }) => {
        if (d.error) { setError(d.error); return }
        setMarcos(d.marcos ?? [])
      })
      .catch(() => setError('Não foi possível carregar os marcos.'))
      .finally(() => setLoading(false))
  }, [])

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
          ✦ Uma jornada de amor ✦
        </p>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.9rem', color: 'var(--bd)', margin: '0 0 8px' }}>
          Marcos do <em>José Augusto</em> 🧸
        </h1>
        <p style={{ fontSize: '.9rem', color: 'var(--text-lo)', fontStyle: 'italic' }}>
          Cada momento especial da sua história
        </p>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--beige)', flexShrink: 0, animation: 'pulse 1.4s ease-in-out infinite' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 14, width: '40%', background: 'var(--beige)', borderRadius: 8, marginBottom: 8, animation: 'pulse 1.4s ease-in-out infinite' }} />
                  <div style={{ height: 60, background: 'var(--beige)', borderRadius: 12, animation: 'pulse 1.4s ease-in-out infinite' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-lo)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
            <p style={{ fontStyle: 'italic' }}>{error}</p>
          </div>
        )}

        {!loading && !error && marcos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-lo)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🌸</div>
            <p style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: '1.2rem',
              color: 'var(--bd)',
              marginBottom: 8,
            }}>
              Os primeiros momentos estão chegando...
            </p>
            <p style={{ fontStyle: 'italic', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem' }}>
              Em breve esta página será preenchida com as memórias mais preciosas do José Augusto.
            </p>
          </div>
        )}

        {!loading && !error && marcos.length > 0 && (
          <div style={{ position: 'relative' }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute',
              left: 23,
              top: 0,
              bottom: 0,
              width: 2,
              background: 'linear-gradient(to bottom, var(--sand), var(--beige))',
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {marcos.map((marco, idx) => (
                <div
                  key={marco.id}
                  style={{
                    display: 'flex',
                    gap: 20,
                    alignItems: 'flex-start',
                    animation: `marcos-fade-up .5s ease ${idx * .08}s both`,
                  }}
                >
                  {/* Emoji bubble */}
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--cream)',
                    border: '2px solid var(--sand)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '1.5rem',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                    boxShadow: '0 2px 10px rgba(62,36,8,.1)',
                  }}>
                    {marco.emoji}
                  </div>

                  {/* Content */}
                  <div style={{
                    flex: 1,
                    background: 'var(--cream)',
                    border: '1px solid var(--beige)',
                    borderRadius: 16,
                    padding: '16px 18px',
                    boxShadow: '0 2px 12px rgba(62,36,8,.06)',
                    marginTop: 4,
                  }}>
                    <p style={{ fontSize: '.78rem', color: 'var(--sand)', fontStyle: 'italic', marginBottom: 4, letterSpacing: '.04em' }}>
                      {formatDate(marco.marco_date)}
                    </p>
                    <h3 style={{
                      fontFamily: "'Playfair Display',serif",
                      fontSize: '1.1rem',
                      color: 'var(--bd)',
                      marginBottom: marco.description || marco.photo_url ? 10 : 0,
                    }}>
                      {marco.title}
                    </h3>
                    {marco.description && (
                      <p style={{
                        fontFamily: "'Cormorant Garamond',serif",
                        fontSize: '1rem',
                        color: 'var(--text-hi)',
                        lineHeight: 1.65,
                        marginBottom: marco.photo_url ? 12 : 0,
                      }}>
                        {marco.description}
                      </p>
                    )}
                    {marco.photo_url && (
                      <img
                        src={marco.photo_url}
                        alt={marco.title}
                        style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 280, display: 'block' }}
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes marcos-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
