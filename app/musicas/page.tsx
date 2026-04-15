'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface MusicaItem { id: number; author: string; title: string; artist: string; spotifyUrl: string | null; votes: number; approved: boolean; createdAt: string }

function getVoterId(): string {
  if (typeof window === 'undefined') return ''
  const k = 'cha_voter_id'
  let id = localStorage.getItem(k)
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, id) }
  return id
}

function hasVoted(id: number): boolean { try { return JSON.parse(localStorage.getItem('cha_musica_votes') ?? '[]').includes(id) } catch { return false } }
function markVoted(id: number) { try { const v = JSON.parse(localStorage.getItem('cha_musica_votes') ?? '[]'); if (!v.includes(id)) { v.push(id); localStorage.setItem('cha_musica_votes', JSON.stringify(v)) } } catch {} }

export default function MusicasPage() {
  const [musicas, setMusicas] = useState<MusicaItem[]>([])
  const [form, setForm] = useState({ author: '', title: '', artist: '', spotifyUrl: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/musicas').then(r => r.json()).then((d: { musicas?: MusicaItem[] }) => setMusicas(d.musicas ?? []))
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cha_author') ?? '' : ''
    if (saved) setForm(f => ({ ...f, author: saved }))
  }, [])

  const submit = async () => {
    if (!form.author.trim() || !form.title.trim() || !form.artist.trim()) { setError('Nome, título e artista são obrigatórios'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/musicas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form }) })
    const data = await res.json() as { ok?: boolean; musicas?: MusicaItem[]; error?: string }
    if (!res.ok) { setError(data.error ?? 'Erro'); setLoading(false); return }
    setMusicas(data.musicas ?? [])
    setSent(true); setLoading(false)
    setForm(f => ({ ...f, title: '', artist: '', spotifyUrl: '' }))
    setTimeout(() => setSent(false), 3000)
  }

  const vote = async (id: number) => {
    if (hasVoted(id)) return
    markVoted(id)
    setMusicas(prev => prev.map(m => m.id === id ? { ...m, votes: m.votes + 1 } : m).sort((a, b) => b.votes - a.votes))
    await fetch('/api/musicas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'vote', id, voterId: getVoterId() }) })
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--warm)', padding: '24px 16px 100px', fontFamily: "'Cormorant Garamond',serif" }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: '.8rem', color: 'var(--bl)', textDecoration: 'none', display: 'block', marginBottom: 20 }}>← voltar</Link>
        <p style={{ textAlign: 'center', fontSize: '.72rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--bl)', marginBottom: 6 }}>✦ Chá do José Augusto ✦</p>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', color: 'var(--bd)', textAlign: 'center', marginBottom: 4 }}>🎵 Lista de Músicas</h1>
        <p style={{ textAlign: 'center', color: 'var(--bl)', fontSize: '.92rem', marginBottom: 28, fontStyle: 'italic' }}>Sugira uma música para tocar no evento e vote nas suas favoritas!</p>

        {/* Suggest form */}
        <div style={{ background: 'var(--cream)', border: '1px solid var(--beige)', borderRadius: 20, padding: '24px 20px', marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 16 }}>Sugerir uma música</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '11px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--warm)', outline: 'none' }} placeholder="Seu nome *" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} maxLength={80} />
            <input style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '11px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--warm)', outline: 'none' }} placeholder="Nome da música *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={120} />
            <input style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '11px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--warm)', outline: 'none' }} placeholder="Artista *" value={form.artist} onChange={e => setForm(f => ({ ...f, artist: e.target.value }))} maxLength={120} />
            <input style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '11px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--warm)', outline: 'none' }} placeholder="Link do Spotify (opcional)" value={form.spotifyUrl} onChange={e => setForm(f => ({ ...f, spotifyUrl: e.target.value }))} />
            {error && <p style={{ fontSize: '.82rem', color: '#c0392b', fontStyle: 'italic' }}>{error}</p>}
            {sent && <p style={{ fontSize: '.88rem', color: '#3a6d10', fontStyle: 'italic' }}>✓ Música sugerida! Obrigado 🎵</p>}
            <button onClick={submit} disabled={loading} style={{ padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,var(--bd),var(--b))', color: '#fff', fontFamily: "'Playfair Display',serif", fontSize: '1rem', cursor: 'pointer', opacity: loading ? .7 : 1 }}>
              {loading ? 'Enviando…' : '🎵 Sugerir música'}
            </button>
          </div>
        </div>

        {/* Music list */}
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 14 }}>Músicas sugeridas</h2>
        {musicas.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--bl)', fontStyle: 'italic', padding: '32px 0' }}>Nenhuma música ainda. Seja o primeiro a sugerir! 🎶</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {musicas.map((m, i) => (
              <div key={m.id} style={{ background: 'var(--cream)', border: '1px solid var(--beige)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', color: 'var(--bl)', width: 28, textAlign: 'center', flexShrink: 0 }}>#{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: 'var(--bd)', fontSize: '1rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</p>
                  <p style={{ fontSize: '.85rem', color: 'var(--bl)' }}>{m.artist} · <span style={{ fontStyle: 'italic', fontSize: '.8rem' }}>por {m.author}</span></p>
                  {m.spotifyUrl && <a href={m.spotifyUrl} target="_blank" rel="noreferrer" style={{ fontSize: '.75rem', color: '#1db954', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>▶ Ouvir no Spotify</a>}
                </div>
                <button onClick={() => vote(m.id)} disabled={hasVoted(m.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 12px', borderRadius: 12, border: hasVoted(m.id) ? '1.5px solid var(--b)' : '1px solid var(--beige)', background: hasVoted(m.id) ? 'var(--beige)' : 'var(--warm)', cursor: hasVoted(m.id) ? 'default' : 'pointer', flexShrink: 0 }}>
                  <span style={{ fontSize: '1.1rem' }}>♥</span>
                  <span style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--bd)' }}>{m.votes}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
