'use client'
import { useState, useEffect } from 'react'

interface TimelineEvent {
  date: string
  type: 'foto' | 'mensagem' | 'carta' | 'palpite' | 'diario' | 'marco'
  title: string
  subtitle?: string
  imageUrl?: string
}

function fmt(d: string): string {
  try { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) }
  catch { return d }
}

const TYPE_CONFIG = {
  marco:    { icon: '⭐', color: '#f4a623', label: 'Marco' },
  foto:     { icon: '📷', color: '#c97a6e', label: 'Foto' },
  mensagem: { icon: '💬', color: '#6b9e7a', label: 'Mensagem' },
  carta:    { icon: '💌', color: '#9b6ea8', label: 'Carta' },
  palpite:  { icon: '🎲', color: '#4a7a9b', label: 'Palpite' },
  diario:   { icon: '📖', color: '#7a4e28', label: 'Diário' },
}

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TimelineEvent['type'] | 'all'>('all')

  useEffect(() => {
    const all: TimelineEvent[] = []

    // Fixed milestones
    all.push({ date: '2025-07-25', type: 'marco', title: '🤰 Gravidez confirmada!', subtitle: 'O José Augusto está a caminho ♥' })
    all.push({ date: '2026-04-25', type: 'marco', title: '🎀 Chá de Bebê', subtitle: 'Sábado, 25 de Abril · 17h' })

    Promise.all([
      fetch('/api/photos').then(r => r.json()).catch(() => ({ media: [] })),
      fetch('/api/diario').then(r => r.json()).catch(() => ({ entries: [] })),
    ]).then(([photosData, diarioData]) => {
      const photos = (photosData.media ?? []) as Array<{ id: string; author: string; thumbUrl: string; createdAt: string }>
      photos.slice(0, 50).forEach(p => all.push({ date: p.createdAt, type: 'foto', title: `📷 Foto de ${p.author}`, imageUrl: p.thumbUrl }))

      const diario = (diarioData.entries ?? []) as Array<{ id: number; title: string; content: string; milestoneDate: string | null; createdAt: string }>
      diario.forEach(e => all.push({ date: e.milestoneDate || e.createdAt, type: 'diario', title: e.title, subtitle: e.content.slice(0, 80) + (e.content.length > 80 ? '…' : '') }))

      all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setEvents(all)
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

  return (
    <div style={{ minHeight: '100svh', background: 'var(--warm)', padding: '24px 16px 100px', fontFamily: "'Cormorant Garamond',serif" }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <a href="/" style={{ fontSize: '.8rem', color: 'var(--bl)', textDecoration: 'none', display: 'block', marginBottom: 20 }}>← voltar</a>
        <p style={{ textAlign: 'center', fontSize: '.72rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--bl)', marginBottom: 6 }}>✦ Chá do José Augusto ✦</p>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', color: 'var(--bd)', textAlign: 'center', marginBottom: 4 }}>⏱ Linha do Tempo</h1>
        <p style={{ textAlign: 'center', color: 'var(--bl)', fontSize: '.92rem', marginBottom: 24, fontStyle: 'italic' }}>Todos os momentos do José Augusto, em ordem</p>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
          {(['all', 'marco', 'foto', 'diario'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 16px', borderRadius: 50, border: '1px solid var(--sand)', background: filter === f ? 'var(--beige)' : 'transparent', color: 'var(--bd)', cursor: 'pointer', fontFamily: "'Cormorant Garamond',serif", fontSize: '.88rem' }}>
              {f === 'all' ? 'Tudo' : TYPE_CONFIG[f].icon + ' ' + TYPE_CONFIG[f].label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--bl)', fontStyle: 'italic' }}>Carregando…</p>
        ) : (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: 'var(--beige)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {filtered.map((ev, i) => {
                const cfg = TYPE_CONFIG[ev.type]
                return (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, zIndex: 1, boxShadow: `0 0 0 4px var(--warm)` }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, background: 'var(--cream)', border: '1px solid var(--beige)', borderRadius: 16, padding: '14px 16px', overflow: 'hidden' }}>
                      {ev.imageUrl && <img src={ev.imageUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 10, display: 'block' }} />}
                      <p style={{ fontWeight: 700, color: 'var(--bd)', fontSize: '1rem', marginBottom: ev.subtitle ? 4 : 0 }}>{ev.title}</p>
                      {ev.subtitle && <p style={{ fontSize: '.88rem', color: 'var(--bl)', fontStyle: 'italic', lineHeight: 1.5 }}>{ev.subtitle}</p>}
                      <p style={{ fontSize: '.72rem', color: 'var(--bl)', marginTop: 8 }}>{fmt(ev.date)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
