'use client'

import { useEffect, useState } from 'react'

interface PalpiteItem {
  id: number
  author: string
  peso_g: number | null
  altura_cm: number | null
  hora: string | null
  cabelo: string | null
  createdAt: string
}

type CabeloOption = 'Sim' | 'Pouco' | 'Não'

function formatPeso(g: number | null): string {
  if (g == null) return '—'
  return `${(g / 1000).toFixed(1).replace('.', ',')} kg`
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
  } catch {
    return iso
  }
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

const CABELO_OPTS: CabeloOption[] = ['Sim', 'Pouco', 'Não']

const CABELO_EMOJI: Record<CabeloOption, string> = {
  'Sim': '👶🏻',
  'Pouco': '🍃',
  'Não': '🥚',
}

export default function PalpitesPage() {
  // Form state
  const [author, setAuthor] = useState('')
  const [pesoKg, setPesoKg] = useState('3.5')
  const [hora, setHora] = useState('')
  const [cabelo, setCabelo] = useState<CabeloOption | ''>('')

  // UI state
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [success, setSuccess] = useState(false)

  // List state
  const [palpites, setPalpites] = useState<PalpiteItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try { setAuthor(localStorage.getItem('cha_author') ?? '') } catch {}
  }, [])

  const loadPalpites = async () => {
    try {
      const res = await fetch('/api/palpites')
      const data = await res.json() as { palpites?: PalpiteItem[] }
      setPalpites(Array.isArray(data.palpites) ? data.palpites : [])
    } catch {
      setPalpites([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPalpites() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendError('')

    const trimmedAuthor = author.trim()
    if (!trimmedAuthor) { setSendError('Informe seu nome para registrar o palpite.'); return }

    const pesoNum = parseFloat(pesoKg.replace(',', '.'))
    const peso_g = !isNaN(pesoNum) && pesoNum > 0 ? Math.round(pesoNum * 1000) : null

    setSending(true)
    try {
      const res = await fetch('/api/palpites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: trimmedAuthor,
          peso_g,
          hora: hora || null,
          cabelo: cabelo || null,
        }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setSendError(data.error ?? 'Erro ao registrar palpite.'); return }
      try { localStorage.setItem('cha_author', trimmedAuthor) } catch {}
      setSuccess(true)
      await loadPalpites()
    } catch {
      setSendError('Sem conexão. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  const pesoNum = parseFloat(pesoKg.replace(',', '.'))
  const pesoValid = !isNaN(pesoNum) && pesoNum >= 0.5 && pesoNum <= 7

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #1a0d00 0%, #3e2408 50%, #1a0d00 100%)',
      color: '#f5dab6',
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{ padding: '36px 20px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🎲</div>
        <p style={{ fontFamily: "'Dancing Script',cursive", color: '#d59056', fontSize: '1.05rem', marginBottom: 4 }}>
          ✦ Chute suas previsões ✦
        </p>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', margin: '0 0 8px', color: '#f5dab6' }}>
          Palpites do <em>Bebê</em>
        </h1>
        <p style={{ fontSize: '.9rem', color: 'rgba(245,218,182,.6)', fontStyle: 'italic', maxWidth: 320, margin: '0 auto' }}>
          O que você acha que o José Augusto vai pesar?
        </p>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px' }}>

        {/* Success banner */}
        {success ? (
          <div style={{
            background: 'rgba(106,158,122,.18)', border: '1px solid rgba(106,158,122,.4)',
            borderRadius: 20, padding: '28px 24px', textAlign: 'center', marginBottom: 32,
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>🎲</div>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', color: '#f5dab6', marginBottom: 6 }}>
              Palpite registrado!
            </p>
            <p style={{ fontSize: '.95rem', color: 'rgba(245,218,182,.7)', marginBottom: 16, fontStyle: 'italic' }}>
              Vamos ver se você acertou quando o José Augusto chegar! 🍼
            </p>
            <button
              onClick={() => { setSuccess(false); setSendError('') }}
              style={{
                background: 'transparent', border: '1px solid rgba(245,218,182,.3)',
                color: '#f5dab6', borderRadius: 12, padding: '10px 22px',
                fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem',
                cursor: 'pointer',
              }}
            >
              Atualizar meu palpite
            </button>
          </div>
        ) : (
          /* Form */
          <form
            onSubmit={handleSubmit}
            style={{
              background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 20, padding: '24px 20px', marginBottom: 32,
            }}
          >
            <p style={{
              fontFamily: "'Playfair Display',serif", fontSize: '1.1rem',
              color: '#f5dab6', marginBottom: 20, fontWeight: 600,
            }}>
              Registrar meu palpite
            </p>

            {/* Name */}
            <label style={{ display: 'block', marginBottom: 18 }}>
              <span style={{ fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(245,218,182,.55)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Seu nome *
              </span>
              <input
                type="text"
                value={author}
                onChange={e => { setAuthor(e.target.value); setSendError('') }}
                placeholder="Como você se chama?"
                maxLength={60}
                style={{
                  width: '100%', background: 'rgba(255,255,255,.08)',
                  border: '1px solid rgba(255,255,255,.15)', borderRadius: 12,
                  padding: '11px 14px', color: '#f5dab6',
                  fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem',
                  outline: 'none',
                }}
              />
            </label>

            {/* Peso */}
            <label style={{ display: 'block', marginBottom: 18 }}>
              <span style={{ fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(245,218,182,.55)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Peso estimado (kg)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <input
                  type="range"
                  min="1.0"
                  max="5.5"
                  step="0.1"
                  value={isNaN(parseFloat(pesoKg.replace(',', '.'))) ? 3.5 : parseFloat(pesoKg.replace(',', '.'))}
                  onChange={e => setPesoKg(parseFloat(e.target.value).toFixed(1))}
                  style={{ flex: 1, accentColor: '#d59056' }}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={pesoKg}
                  onChange={e => setPesoKg(e.target.value)}
                  placeholder="3.5"
                  maxLength={5}
                  style={{
                    width: 72, background: 'rgba(255,255,255,.08)',
                    border: `1px solid ${pesoValid || pesoKg === '' ? 'rgba(255,255,255,.15)' : '#c0392b'}`,
                    borderRadius: 10, padding: '8px 10px', textAlign: 'center',
                    color: '#f5dab6', fontFamily: "'Cormorant Garamond',serif",
                    fontSize: '1rem', outline: 'none',
                  }}
                />
                <span style={{ color: 'rgba(245,218,182,.6)', fontSize: '.9rem', minWidth: 20 }}>kg</span>
              </div>
              <p style={{ fontSize: '.78rem', color: 'rgba(245,218,182,.4)', marginTop: 6, fontStyle: 'italic' }}>
                Deslize ou digite o valor estimado
              </p>
            </label>

            {/* Hora */}
            <label style={{ display: 'block', marginBottom: 18 }}>
              <span style={{ fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(245,218,182,.55)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Hora estimada do nascimento
              </span>
              <input
                type="time"
                value={hora}
                onChange={e => setHora(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,.08)',
                  border: '1px solid rgba(255,255,255,.15)', borderRadius: 12,
                  padding: '11px 14px', color: '#f5dab6',
                  fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem',
                  outline: 'none', width: '100%',
                  colorScheme: 'dark',
                }}
              />
            </label>

            {/* Cabelo */}
            <div style={{ marginBottom: 22 }}>
              <span style={{ fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(245,218,182,.55)', fontWeight: 600, display: 'block', marginBottom: 10 }}>
                Vai ter bastante cabelo?
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                {CABELO_OPTS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCabelo(prev => prev === opt ? '' : opt)}
                    style={{
                      flex: 1, padding: '12px 8px', borderRadius: 14,
                      border: cabelo === opt
                        ? '2px solid #d59056'
                        : '1px solid rgba(255,255,255,.15)',
                      background: cabelo === opt
                        ? 'rgba(213,144,86,.2)'
                        : 'rgba(255,255,255,.06)',
                      color: cabelo === opt ? '#f5dab6' : 'rgba(245,218,182,.6)',
                      cursor: 'pointer', textAlign: 'center',
                      transition: 'all .2s',
                    }}
                  >
                    <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{CABELO_EMOJI[opt]}</div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', fontWeight: 600 }}>{opt}</div>
                  </button>
                ))}
              </div>
            </div>

            {sendError && (
              <p style={{ color: '#e88', fontSize: '.88rem', fontStyle: 'italic', marginBottom: 12 }}>
                {sendError}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              style={{
                width: '100%', padding: '14px 20px',
                background: sending
                  ? 'rgba(255,255,255,.1)'
                  : 'linear-gradient(135deg,#c9920a,#7a5c00)',
                color: '#f5dab6',
                border: 'none', borderRadius: 14,
                cursor: sending ? 'not-allowed' : 'pointer',
                fontFamily: "'Playfair Display',serif",
                fontSize: '1rem', fontWeight: 600,
                letterSpacing: '.03em',
                transition: 'opacity .2s',
                opacity: sending ? .6 : 1,
              }}
            >
              {sending ? 'Registrando...' : '🎲 Registrar meu palpite'}
            </button>
          </form>
        )}

        {/* Palpites list */}
        <div>
          <p style={{
            fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase',
            color: 'rgba(245,218,182,.45)', fontWeight: 600, marginBottom: 14,
          }}>
            {loading ? 'Carregando...' : `${palpites.length} ${palpites.length === 1 ? 'palpite' : 'palpites'} registrados`}
          </p>

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 88, borderRadius: 16,
                    background: 'rgba(255,255,255,.06)',
                    animation: 'pulse 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}

          {!loading && palpites.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(245,218,182,.45)' }}>
              <p style={{ fontStyle: 'italic' }}>Nenhum palpite ainda. Seja o primeiro!</p>
            </div>
          )}

          {!loading && palpites.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {palpites.map(p => (
                <div
                  key={p.id}
                  style={{
                    background: 'rgba(255,255,255,.06)',
                    border: '1px solid rgba(255,255,255,.1)',
                    borderRadius: 16, padding: '16px 18px',
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: avatarBg(p.author),
                    display: 'grid', placeItems: 'center',
                    fontFamily: "'Cormorant Garamond',serif",
                    fontWeight: 700, fontSize: '1rem', color: '#fff',
                    flexShrink: 0,
                  }}>
                    {getInitials(p.author)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '.95rem', fontWeight: 600, color: '#f5dab6' }}>
                        {p.author}
                      </p>
                      <p style={{ fontSize: '.72rem', color: 'rgba(245,218,182,.4)', fontStyle: 'italic' }}>
                        {formatDate(p.createdAt)}
                      </p>
                    </div>

                    {/* Palpite chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {p.peso_g != null && (
                        <span style={{
                          background: 'rgba(213,144,86,.15)',
                          border: '1px solid rgba(213,144,86,.3)',
                          borderRadius: 99, padding: '3px 10px',
                          fontSize: '.8rem', color: '#d59056',
                        }}>
                          ⚖️ {formatPeso(p.peso_g)}
                        </span>
                      )}
                      {p.hora && (
                        <span style={{
                          background: 'rgba(106,158,122,.15)',
                          border: '1px solid rgba(106,158,122,.3)',
                          borderRadius: 99, padding: '3px 10px',
                          fontSize: '.8rem', color: '#9dcfad',
                        }}>
                          🕐 {p.hora}
                        </span>
                      )}
                      {p.cabelo && (
                        <span style={{
                          background: 'rgba(255,255,255,.08)',
                          border: '1px solid rgba(255,255,255,.12)',
                          borderRadius: 99, padding: '3px 10px',
                          fontSize: '.8rem', color: 'rgba(245,218,182,.7)',
                        }}>
                          {CABELO_EMOJI[p.cabelo as CabeloOption] ?? ''} Cabelo: {p.cabelo}
                        </span>
                      )}
                      {p.peso_g == null && !p.hora && !p.cabelo && (
                        <span style={{ fontSize: '.82rem', color: 'rgba(245,218,182,.4)', fontStyle: 'italic' }}>
                          Nenhum detalhe informado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
