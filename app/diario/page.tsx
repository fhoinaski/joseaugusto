'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DiarioEntry { id: number; title: string; content: string; imageUrl: string | null; milestoneDate: string | null; published: boolean; createdAt: string }

function formatDate(d: string | null): string {
  if (!d) return ''
  try { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(d)) }
  catch { return d }
}

export default function DiarioPage() {
  const [entries, setEntries] = useState<DiarioEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/diario').then(r => r.json()).then((d: { entries?: DiarioEntry[] }) => { setEntries(d.entries ?? []); setLoading(false) })
  }, [])

  return (
    <div style={{ minHeight: '100svh', background: 'var(--warm)', padding: '24px 16px 100px', fontFamily: "'Cormorant Garamond',serif" }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: '.8rem', color: 'var(--bl)', textDecoration: 'none', display: 'block', marginBottom: 20 }}>← voltar</Link>
        <p style={{ textAlign: 'center', fontSize: '.72rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--bl)', marginBottom: 6 }}>✦ Família José Augusto ✦</p>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', color: 'var(--bd)', textAlign: 'center', marginBottom: 4 }}>📖 Diário do Bebê</h1>
        <p style={{ textAlign: 'center', color: 'var(--bl)', fontSize: '.92rem', marginBottom: 32, fontStyle: 'italic' }}>Acompanhe os primeiros momentos do José Augusto ♥</p>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--bl)', fontStyle: 'italic' }}>Carregando…</p>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <p style={{ fontSize: '4rem', marginBottom: 16 }}>🧸</p>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', color: 'var(--bd)', marginBottom: 8 }}>O diário ainda está em branco</p>
            <p style={{ color: 'var(--bl)', fontStyle: 'italic' }}>Os primeiros registros aparecerão aqui logo após o nascimento do José ♥</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {entries.map((e, i) => (
              <article key={e.id} style={{ background: 'var(--cream)', border: '1px solid var(--beige)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 4px 24px rgba(139,98,66,.07)' }}>
                {e.imageUrl && (
                  <img src={e.imageUrl} alt={e.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ padding: '22px 22px 24px' }}>
                  {(e.milestoneDate || e.createdAt) && (
                    <p style={{ fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bl)', marginBottom: 8 }}>
                      📅 {formatDate(e.milestoneDate || e.createdAt)}
                    </p>
                  )}
                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', color: 'var(--bd)', marginBottom: 12, lineHeight: 1.3 }}>{e.title}</h2>
                  <p style={{ color: 'var(--bd)', lineHeight: 1.8, fontSize: '1rem', whiteSpace: 'pre-wrap' }}>{e.content}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
