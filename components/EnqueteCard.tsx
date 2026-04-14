'use client'
import { useState, useEffect, useCallback } from 'react'

interface EnqueteItem {
  id: number
  question: string
  options: string[]
  active: boolean
}

interface EnqueteResult {
  option: string
  votes: number
}

function getVoterId(): string {
  if (typeof window === 'undefined') return 'ssr'
  const k = 'cha_voter_id'
  let id = localStorage.getItem(k)
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(k, id)
  }
  return id
}

function getVoted(enqueteId: number): number | null {
  try {
    const raw = localStorage.getItem(`cha_enquete_voted_${enqueteId}`)
    return raw !== null ? Number(raw) : null
  } catch { return null }
}

function markVoted(enqueteId: number, optionIdx: number) {
  try { localStorage.setItem(`cha_enquete_voted_${enqueteId}`, String(optionIdx)) } catch {}
}

interface Props {
  /** tv=true: dark background for big screen; default=false (home light theme) */
  tv?: boolean
  /** Poll every N ms (default 6000) */
  pollMs?: number
}

export default function EnqueteCard({ tv = false, pollMs = 6000 }: Props) {
  const [enquete,  setEnquete]  = useState<EnqueteItem | null>(null)
  const [results,  setResults]  = useState<EnqueteResult[]>([])
  const [votedIdx, setVotedIdx] = useState<number | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [animate,  setAnimate]  = useState(false)

  const totalVotes = results.reduce((s, r) => s + r.votes, 0)

  const fetchEnquete = useCallback(async () => {
    try {
      const res  = await fetch('/api/enquete')
      const data = await res.json() as { enquete: EnqueteItem | null; results: EnqueteResult[] }
      if (data.enquete?.id !== enquete?.id) {
        setEnquete(data.enquete)
        setResults(data.results ?? [])
        if (data.enquete) {
          const voted = getVoted(data.enquete.id)
          setVotedIdx(voted)
          if (voted !== null) setAnimate(true)
        }
      } else {
        setResults(data.results ?? [])
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquete?.id])

  useEffect(() => {
    fetchEnquete()
    const t = setInterval(fetchEnquete, pollMs)
    return () => clearInterval(t)
  }, [fetchEnquete, pollMs])

  const vote = async (optionIdx: number) => {
    if (!enquete || votedIdx !== null || loading) return
    setLoading(true)
    try {
      const res  = await fetch('/api/enquete/vote', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ enqueteId: enquete.id, optionIdx, voterId: getVoterId() }),
      })
      const data = await res.json() as { ok?: boolean; results?: EnqueteResult[] }
      if (res.ok && data.results) {
        setResults(data.results)
        setVotedIdx(optionIdx)
        markVoted(enquete.id, optionIdx)
        setAnimate(true)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  if (!enquete) return null

  const bg        = tv ? 'rgba(255,255,255,.06)'  : 'var(--warm)'
  const border    = tv ? 'rgba(255,255,255,.12)'  : 'var(--beige)'
  const textHi    = tv ? '#fff'                   : 'var(--bd)'
  const textLo    = tv ? 'rgba(255,255,255,.55)'  : 'var(--bl)'
  const optionBg  = tv ? 'rgba(255,255,255,.09)'  : 'var(--cream)'
  const barColor  = tv ? '#f4a623'                : 'var(--b)'
  const barTrack  = tv ? 'rgba(255,255,255,.1)'   : 'var(--beige)'

  return (
    <section style={{
      background:   bg,
      border:       `1px solid ${border}`,
      borderRadius: 20,
      padding:      tv ? '28px 32px' : '28px 24px',
      backdropFilter: tv ? 'blur(12px)' : undefined,
    }}>
      <p style={{ fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase', color: textLo, marginBottom: 8 }}>
        🗳 Enquete ao vivo
      </p>
      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: tv ? '1.35rem' : '1.2rem', color: textHi, marginBottom: 20, lineHeight: 1.3 }}>
        {enquete.question}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {enquete.options.map((opt, i) => {
          const res  = results[i]
          const pct  = totalVotes > 0 ? Math.round(((res?.votes ?? 0) / totalVotes) * 100) : 0
          const isMe = votedIdx === i
          const showResults = votedIdx !== null

          return (
            <button
              key={i}
              onClick={() => vote(i)}
              disabled={votedIdx !== null || loading}
              style={{
                position:     'relative',
                overflow:     'hidden',
                display:      'flex',
                alignItems:   'center',
                gap:          10,
                padding:      '12px 16px',
                borderRadius: 12,
                border:       `1.5px solid ${isMe ? barColor : border}`,
                background:   isMe ? (tv ? 'rgba(244,166,35,.15)' : 'rgba(139,98,66,.08)') : optionBg,
                cursor:       votedIdx !== null ? 'default' : 'pointer',
                textAlign:    'left',
                transition:   'border-color .2s, background .2s',
              }}
            >
              {/* Progress bar fill */}
              {showResults && (
                <div style={{
                  position:   'absolute',
                  inset:      0,
                  width:      animate ? `${pct}%` : '0%',
                  background: isMe ? (tv ? 'rgba(244,166,35,.18)' : 'rgba(139,98,66,.1)') : barTrack,
                  transition: 'width .7s cubic-bezier(.34,1.56,.64,1)',
                  borderRadius: 12,
                  zIndex:     0,
                }} />
              )}

              <span style={{ position: 'relative', zIndex: 1, flex: 1, fontFamily: "'Cormorant Garamond',serif", fontSize: tv ? '1rem' : '.95rem', color: textHi, fontWeight: isMe ? 700 : 400 }}>
                {isMe && '✓ '}{opt}
              </span>

              {showResults && (
                <span style={{ position: 'relative', zIndex: 1, fontSize: '.8rem', color: textLo, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {pct}% · {res?.votes ?? 0}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {totalVotes > 0 && (
        <p style={{ fontSize: '.72rem', color: textLo, textAlign: 'right', marginTop: 10 }}>
          {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'} · atualiza automaticamente
        </p>
      )}
    </section>
  )
}
