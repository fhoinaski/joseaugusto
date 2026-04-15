'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useUpload } from '@/components/UploadProvider'

interface DesafioItem {
  id: number
  emoji: string
  title: string
  description: string
  sortOrder: number
  active: boolean
  completions: number
  createdAt: string
}

const LS_DONE = 'cha_desafios_done'

function getDone(): number[] {
  try { return JSON.parse(localStorage.getItem(LS_DONE) ?? '[]') } catch { return [] }
}
function markDone(id: number) {
  try {
    const d = getDone()
    if (!d.includes(id)) localStorage.setItem(LS_DONE, JSON.stringify([...d, id]))
  } catch {}
}

export default function DesafiosPage() {
  const { openUpload } = useUpload()
  const [desafios,  setDesafios]  = useState<DesafioItem[]>([])
  const [done,      setDone]      = useState<number[]>([])
  const [active,    setActive]    = useState<DesafioItem | null>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/desafios')
      .then(r => r.json())
      .then((d: { desafios?: DesafioItem[] }) => {
        setDesafios(d.desafios ?? [])
        setLoading(false)
      })
    setDone(getDone())
  }, [])

  // Listen for upload-success to mark challenge done
  useEffect(() => {
    const handler = () => {
      if (active) {
        markDone(active.id)
        setDone(getDone())
        // Refresh completions count
        fetch('/api/desafios')
          .then(r => r.json())
          .then((d: { desafios?: DesafioItem[] }) => setDesafios(d.desafios ?? []))
        setActive(null)
      }
    }
    window.addEventListener('cha:upload-success', handler)
    return () => window.removeEventListener('cha:upload-success', handler)
  }, [active])

  const handleCumprir = useCallback((desafio: DesafioItem) => {
    // Store the active challenge so we know which one to mark after upload
    setActive(desafio)
    openUpload()
  }, [openUpload])

  const completed  = done.length
  const total      = desafios.length

  return (
    <div style={{ minHeight: '100svh', background: 'var(--warm)', padding: '24px 16px 120px', fontFamily: "'Cormorant Garamond',serif" }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: '.8rem', color: 'var(--bl)', textDecoration: 'none', display: 'block', marginBottom: 20 }}>← voltar</Link>

        <p style={{ textAlign: 'center', fontSize: '.72rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--bl)', marginBottom: 6 }}>✦ Chá do José Augusto ✦</p>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', color: 'var(--bd)', textAlign: 'center', marginBottom: 4 }}>📸 Desafios Fotográficos</h1>
        <p style={{ textAlign: 'center', color: 'var(--bl)', fontSize: '.92rem', marginBottom: 20, fontStyle: 'italic' }}>
          Complete os desafios e deixe sua marca no álbum do José!
        </p>

        {/* Progress bar */}
        {total > 0 && (
          <div style={{ background: 'var(--cream)', border: '1px solid var(--beige)', borderRadius: 16, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '.82rem', color: 'var(--bd)', fontWeight: 600 }}>Seu progresso</span>
              <span style={{ fontSize: '.82rem', color: 'var(--bl)' }}>{completed}/{total} desafios</span>
            </div>
            <div style={{ height: 8, background: 'var(--beige)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${total > 0 ? (completed / total) * 100 : 0}%`, background: 'linear-gradient(90deg, var(--bd), var(--b))', borderRadius: 99, transition: 'width .6s ease' }} />
            </div>
            {completed === total && total > 0 && (
              <p style={{ textAlign: 'center', fontSize: '.88rem', color: '#3a6d10', fontWeight: 700, marginTop: 10 }}>
                🏆 Todos os desafios concluídos! Incrível!
              </p>
            )}
          </div>
        )}

        {/* Active challenge banner */}
        {active && (
          <div style={{ background: 'linear-gradient(135deg, var(--bd), var(--b))', borderRadius: 16, padding: '16px 20px', marginBottom: 20, color: '#fff', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: '2rem' }}>{active.emoji}</span>
            <div>
              <p style={{ fontSize: '.72rem', letterSpacing: '.1em', opacity: .75, marginBottom: 2 }}>DESAFIO ATIVO</p>
              <p style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>{active.title}</p>
              <p style={{ fontSize: '.82rem', opacity: .85, marginTop: 2 }}>Tire a foto e envie — será contabilizada!</p>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--bl)', fontStyle: 'italic', padding: '48px 0' }}>Carregando…</p>
        ) : desafios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--cream)', borderRadius: 20, border: '1px solid var(--beige)' }}>
            <p style={{ fontSize: '3rem', marginBottom: 12 }}>⏳</p>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)' }}>Desafios em preparação</p>
            <p style={{ color: 'var(--bl)', fontStyle: 'italic', marginTop: 8 }}>Volte no dia do evento!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {desafios.map(d => {
              const isDone = done.includes(d.id)
              return (
                <div
                  key={d.id}
                  style={{
                    background: isDone ? 'rgba(90,158,58,.07)' : 'var(--cream)',
                    border: `1.5px solid ${isDone ? 'rgba(90,158,58,.35)' : active?.id === d.id ? 'var(--b)' : 'var(--beige)'}`,
                    borderRadius: 20,
                    padding: '18px 18px',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                    transition: 'border-color .2s',
                  }}
                >
                  {/* Emoji / done checkmark */}
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: isDone ? '#e8f5e0' : 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                    {isDone ? '✅' : d.emoji}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.05rem', color: 'var(--bd)', marginBottom: 4, fontWeight: 700 }}>{d.title}</p>
                    <p style={{ fontSize: '.88rem', color: 'var(--bl)', lineHeight: 1.6, marginBottom: 12 }}>{d.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 8 }}>
                      <span style={{ fontSize: '.72rem', color: 'var(--bl)', background: 'var(--beige)', padding: '3px 10px', borderRadius: 99 }}>
                        {d.completions} {d.completions === 1 ? 'foto' : 'fotos'} enviadas
                      </span>

                      {isDone ? (
                        <span style={{ fontSize: '.84rem', color: '#3a6d10', fontWeight: 700 }}>✓ Concluído!</span>
                      ) : (
                        /* ← KEY FIX: button calls openUpload() directly */
                        <button
                          onClick={() => handleCumprir(d)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '10px 20px',
                            background: active?.id === d.id
                              ? 'linear-gradient(135deg,#3a7d3a,#5a9e3a)'
                              : 'linear-gradient(135deg,var(--bd),var(--b))',
                            color: '#fff',
                            borderRadius: 50,
                            border: 'none',
                            fontSize: '.9rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: "'Cormorant Garamond',serif",
                            letterSpacing: '.02em',
                            boxShadow: '0 2px 12px rgba(139,98,66,.25)',
                            transition: 'background .2s, transform .15s',
                          }}
                          onMouseDown={e => (e.currentTarget.style.transform = 'scale(.97)')}
                          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                          📷 {active?.id === d.id ? 'Câmera aberta…' : 'Cumprir desafio'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
