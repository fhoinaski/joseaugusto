'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { LeaderboardEntry } from '@/lib/db'
import dynamic from 'next/dynamic'

const PushSubscribeButton = dynamic(() => import('@/components/PushSubscribeButton'), { ssr: false })

type Entry = LeaderboardEntry

function medal(rank: number): string {
  if (rank === 0) return '🥇'
  if (rank === 1) return '🥈'
  if (rank === 2) return '🥉'
  return `${rank + 1}°`
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

export default function RankingPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [myName] = useState(() => {
    try { return localStorage.getItem('cha_author') ?? '' } catch { return '' }
  })

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => {
        setEntries(Array.isArray((data as { entries?: Entry[] }).entries) ? (data as { entries: Entry[] }).entries : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const top3 = entries.slice(0, 3)
  const rest  = entries.slice(3)
  const maxPts = entries[0]?.total_points || 1

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--warm)', color: 'var(--bd)', paddingBottom: 100 }}>
      {/* Back link */}
      <div style={{ padding: '80px 20px 0' }}>
        <Link href="/" style={{ fontSize: '.85rem', color: 'var(--bl)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          ← voltar
        </Link>
      </div>

      {/* Header */}
      <div style={{ padding: '12px 20px 20px', textAlign: 'center' }}>
        <p style={{ fontFamily: "'Dancing Script',cursive", color: 'var(--accent)', fontSize: '1rem', marginBottom: 4 }}>✦ Convidados mais ativos ✦</p>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', margin: 0, color: 'var(--bd)' }}>Ranking do <em>Chá</em></h1>
        <p style={{ fontSize: '.82rem', color: 'var(--bl)', marginTop: 8, fontStyle: 'italic' }}>
          +10 pts por foto · +3 pts por comentário · +2 pts por reação recebida
        </p>
        <div style={{ maxWidth: 340, margin: '16px auto 0' }}>
          <PushSubscribeButton />
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--bl)', fontStyle: 'italic' }}>Carregando...</div>
      )}

      {!loading && entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📸</div>
          <p style={{ fontStyle: 'italic', color: 'var(--bl)' }}>Nenhum convidado participou ainda.<br/>Seja o primeiro a postar!</p>
        </div>
      )}

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12, padding: '0 16px 28px', maxWidth: 480, margin: '0 auto' }}>
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, i) => {
            const rank = i === 1 ? 0 : i === 0 ? 1 : 2
            const isFirst = rank === 0
            const isMe = myName && entry.author === myName
            return (
              <div key={entry.author} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: isFirst ? '1.2' : '1' }}>
                <div
                  style={{
                    width: isFirst ? 72 : 56,
                    height: isFirst ? 72 : 56,
                    borderRadius: '50%',
                    background: avatarBg(entry.author),
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: isFirst ? 22 : 18,
                    fontWeight: 700,
                    color: '#fff',
                    fontFamily: "'Cormorant Garamond',serif",
                    border: isMe ? '3px solid #c47a3a' : `2px solid rgba(62,36,8,${isFirst ? .3 : .15})`,
                    marginBottom: 8,
                    boxShadow: isFirst ? '0 0 24px rgba(196,122,58,.35)' : 'none',
                  }}
                >
                  {getInitials(entry.author)}
                </div>
                <p style={{ fontSize: isFirst ? '.82rem' : '.75rem', fontWeight: 700, textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4, color: 'var(--bd)' }}>
                  {isMe ? 'Você' : entry.author.split(' ')[0]}
                </p>
                <p style={{ fontSize: isFirst ? '.95rem' : '.85rem', fontWeight: 700, color: isFirst ? '#c47a3a' : 'var(--bl)', marginBottom: 4 }}>
                  {entry.total_points} pts
                </p>
                <div
                  style={{
                    width: '100%',
                    height: isFirst ? 60 : 40,
                    background: isFirst
                      ? 'linear-gradient(180deg,#c47a3a,#7a4e28)'
                      : 'linear-gradient(180deg,rgba(160,113,62,.25),rgba(160,113,62,.12))',
                    borderRadius: '6px 6px 0 0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: 8,
                    fontSize: isFirst ? '1.3rem' : '1rem',
                  }}
                >
                  {medal(rank)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full list */}
      {rest.length > 0 && (
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px' }}>
          {rest.map((entry, i) => {
            const rank = i + 3
            const isMe = myName && entry.author === myName
            const barWidth = Math.max(4, Math.round((entry.total_points / maxPts) * 100))
            return (
              <div
                key={entry.author}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', marginBottom: 8,
                  borderRadius: 14,
                  background: isMe ? 'rgba(196,122,58,.1)' : 'rgba(62,36,8,.04)',
                  border: isMe ? '1px solid rgba(196,122,58,.35)' : '1px solid rgba(62,36,8,.08)',
                }}
              >
                <span style={{ fontSize: '.85rem', fontWeight: 700, minWidth: 28, textAlign: 'center', color: 'var(--bl)' }}>
                  {rank + 1}°
                </span>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarBg(entry.author), display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0, fontFamily: "'Cormorant Garamond',serif" }}>
                  {getInitials(entry.author)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <p style={{ fontWeight: 600, fontSize: '.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--bd)' }}>
                      {isMe ? <span style={{ color: '#c47a3a' }}>Você ({entry.author})</span> : entry.author}
                      {' '}<span style={{ fontSize: '.75rem' }}>{entry.badge}</span>
                    </p>
                    <p style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--accent)', flexShrink: 0, paddingLeft: 8 }}>{entry.total_points} pts</p>
                  </div>
                  <div style={{ height: 4, background: 'rgba(62,36,8,.1)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barWidth}%`, background: 'linear-gradient(90deg,#7a4e28,#d59056)', borderRadius: 99, transition: 'width .6s ease' }} />
                  </div>
                  <p style={{ fontSize: '.72rem', color: 'var(--bl)', marginTop: 4 }}>
                    {entry.uploads} foto{entry.uploads !== 1 ? 's' : ''} · {entry.reactions_received} reação{entry.reactions_received !== 1 ? 'ões' : ''} · {entry.comments_made} comentário{entry.comments_made !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
