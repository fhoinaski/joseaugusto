'use client'
import { useState, useEffect } from 'react'

interface DesafioItem { id: number; emoji: string; title: string; description: string; sortOrder: number; active: boolean; completions: number; createdAt: string }

export default function DesafiosPage() {
  const [desafios, setDesafios] = useState<DesafioItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/desafios').then(r => r.json()).then((d: { desafios?: DesafioItem[] }) => { setDesafios(d.desafios ?? []); setLoading(false) })
  }, [])

  return (
    <div style={{ minHeight: '100svh', background: 'var(--warm)', padding: '24px 16px 100px', fontFamily: "'Cormorant Garamond',serif" }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <a href="/" style={{ fontSize: '.8rem', color: 'var(--bl)', textDecoration: 'none', display: 'block', marginBottom: 20 }}>← voltar</a>
        <p style={{ textAlign: 'center', fontSize: '.72rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--bl)', marginBottom: 6 }}>✦ Chá do José Augusto ✦</p>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', color: 'var(--bd)', textAlign: 'center', marginBottom: 4 }}>📸 Desafios Fotográficos</h1>
        <p style={{ textAlign: 'center', color: 'var(--bl)', fontSize: '.92rem', marginBottom: 28, fontStyle: 'italic' }}>Complete os desafios e deixe sua marca no álbum do José!</p>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--bl)', fontStyle: 'italic' }}>Carregando…</p>
        ) : desafios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--cream)', borderRadius: 20, border: '1px solid var(--beige)' }}>
            <p style={{ fontSize: '3rem', marginBottom: 12 }}>⏳</p>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)' }}>Desafios em preparação</p>
            <p style={{ color: 'var(--bl)', fontStyle: 'italic', marginTop: 8 }}>Volte no dia do evento!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {desafios.map(d => (
              <div key={d.id} style={{ background: 'var(--cream)', border: '1px solid var(--beige)', borderRadius: 20, padding: '20px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '2.4rem', flexShrink: 0, lineHeight: 1 }}>{d.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', color: 'var(--bd)', marginBottom: 4, fontWeight: 700 }}>{d.title}</p>
                  <p style={{ fontSize: '.9rem', color: 'var(--bl)', lineHeight: 1.6, marginBottom: 12 }}>{d.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <span style={{ fontSize: '.75rem', color: 'var(--bl)', background: 'var(--beige)', padding: '3px 10px', borderRadius: 99 }}>
                      {d.completions} {d.completions === 1 ? 'foto enviada' : 'fotos enviadas'}
                    </span>
                    <a href="/#galeria" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'linear-gradient(135deg,var(--bd),var(--b))', color: '#fff', borderRadius: 50, fontSize: '.88rem', fontWeight: 600, textDecoration: 'none', fontFamily: "'Cormorant Garamond',serif" }}>
                      📷 Cumprir desafio
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 32, padding: '20px', background: 'var(--cream)', border: '1px solid var(--beige)', borderRadius: 16, textAlign: 'center' }}>
          <p style={{ fontSize: '.88rem', color: 'var(--bl)', fontStyle: 'italic' }}>
            💡 Tire a foto pelo botão "+" no menu e ela aparecerá automaticamente no álbum do José!
          </p>
        </div>
      </div>
    </div>
  )
}
