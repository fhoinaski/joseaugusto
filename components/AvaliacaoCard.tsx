'use client'
import { useState, useEffect } from 'react'

interface AvaliacaoStats {
  avg: number
  total: number
  distribution: Record<number, number>
}

const LS_KEY = 'cha_avaliacao_sent'

function StarRow({ value, onChange, size = 32 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{
            background: 'none',
            border: 'none',
            cursor: onChange ? 'pointer' : 'default',
            fontSize: size,
            lineHeight: 1,
            padding: 2,
            color: i <= (hover || value) ? '#f4a623' : '#d4c4a8',
            transition: 'color .15s, transform .15s',
            transform: i <= (hover || value) ? 'scale(1.18)' : 'scale(1)',
          }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function DistBar({ distribution, total }: { distribution: Record<number, number>; total: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      {[5, 4, 3, 2, 1].map(s => {
        const count = distribution[s] ?? 0
        const pct   = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '.75rem', color: 'var(--bl)', width: 8, textAlign: 'right' }}>{s}</span>
            <span style={{ fontSize: '.7rem', color: '#f4a623' }}>★</span>
            <div style={{ flex: 1, height: 8, background: 'var(--beige)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#f4a623,#e8851f)', borderRadius: 99, transition: 'width .6s ease' }} />
            </div>
            <span style={{ fontSize: '.72rem', color: 'var(--bl)', width: 26, textAlign: 'right' }}>{count}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AvaliacaoCard() {
  const [author,  setAuthor]  = useState('')
  const [stars,   setStars]   = useState(0)
  const [comment, setComment] = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats,   setStats]   = useState<AvaliacaoStats | null>(null)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(LS_KEY)) setSent(true)
    fetch('/api/avaliacao')
      .then(r => r.json())
      .then((d: { stats?: AvaliacaoStats }) => { if (d.stats) setStats(d.stats) })
      .catch(() => {})
  }, [])

  const submit = async () => {
    if (!author.trim() || stars < 1) { setError('Preencha seu nome e selecione as estrelas.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/avaliacao', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ author: author.trim(), stars, comment: comment.trim() || null }),
      })
      const data = await res.json() as { ok?: boolean; stats?: AvaliacaoStats; error?: string }
      if (!res.ok) { setError(data.error ?? 'Erro ao enviar.'); return }
      if (data.stats) setStats(data.stats)
      localStorage.setItem(LS_KEY, '1')
      setSent(true)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={{
      background: 'var(--warm)',
      border: '1px solid var(--beige)',
      borderRadius: 24,
      padding: '32px 28px',
      maxWidth: 480,
      margin: '0 auto',
      boxShadow: '0 4px 32px rgba(139,98,66,.08)',
    }}>
      <p style={{ textAlign: 'center', fontSize: '.72rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--bl)', marginBottom: 6 }}>
        ✦ Avaliação do Evento ✦
      </p>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.45rem', color: 'var(--bd)', textAlign: 'center', marginBottom: 20 }}>
        O que você achou? 🌸
      </h2>

      {/* Stats always visible */}
      {stats && stats.total > 0 && (
        <div style={{ background: 'var(--cream)', borderRadius: 16, padding: '18px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '2.4rem', color: 'var(--bd)', lineHeight: 1 }}>
                {stats.avg.toFixed(1)}
              </p>
              <StarRow value={Math.round(stats.avg)} size={18} />
              <p style={{ fontSize: '.72rem', color: 'var(--bl)', marginTop: 4 }}>{stats.total} avaliações</p>
            </div>
            <div style={{ flex: 1 }}>
              <DistBar distribution={stats.distribution} total={stats.total} />
            </div>
          </div>
        </div>
      )}

      {sent ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</p>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', color: 'var(--bd)', marginBottom: 4 }}>
            Obrigado pela avaliação!
          </p>
          <p style={{ fontSize: '.88rem', color: 'var(--bl)', fontStyle: 'italic' }}>
            Sua opinião é muito importante para nós ♥
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '12px 16px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', width: '100%' }}
            placeholder="Seu nome *"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            maxLength={80}
          />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <p style={{ fontSize: '.82rem', color: 'var(--bl)' }}>Sua nota *</p>
            <StarRow value={stars} onChange={setStars} size={38} />
          </div>

          <textarea
            style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '12px 16px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', resize: 'vertical', minHeight: 80, lineHeight: 1.6 }}
            placeholder="Deixe um comentário (opcional)…"
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={300}
          />

          {error && <p style={{ fontSize: '.82rem', color: '#c0392b', fontStyle: 'italic' }}>{error}</p>}

          <button
            className="btn-primary"
            onClick={submit}
            disabled={loading || stars < 1 || !author.trim()}
            style={{ justifyContent: 'center', opacity: (loading || stars < 1 || !author.trim()) ? .6 : 1 }}
          >
            {loading ? 'Enviando…' : '⭐ Enviar avaliação'}
          </button>
        </div>
      )}
    </section>
  )
}
