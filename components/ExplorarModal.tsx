'use client'

// FloatingExplorarBtn — renders a circular gradient FAB at bottom-center
// When tapped, opens a bottom-sheet overlay with all 11 explore links
// in a responsive 3-column grid

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const EXPLORE_LINKS = [
  { href: '/bingo',    emoji: '🎯', label: 'Bingo' },
  { href: '/desafios', emoji: '📸', label: 'Desafios' },
  { href: '/musicas',  emoji: '🎵', label: 'Músicas' },
  { href: '/palpites', emoji: '🎲', label: 'Palpites' },
  { href: '/carta',    emoji: '💌', label: 'Carta ao José' },
  { href: '/mural',    emoji: '🖼️', label: 'Mural' },
  { href: '/livro',    emoji: '📖', label: 'Livro' },
  { href: '/diario',   emoji: '🧸', label: 'Diário' },
  { href: '/mosaico',  emoji: '🎨', label: 'Mosaico' },
  { href: '/ranking',  emoji: '🏆', label: 'Ranking' },
  { href: '/timeline', emoji: '⏱',  label: 'Timeline' },
  { href: '/feed',     emoji: '📷',  label: 'Álbum ao vivo' },
]

export default function ExplorarModal() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function handleCardClick(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Explorar o Evento"
        style={{
          position: 'fixed',
          bottom: 'max(80px, calc(72px + env(safe-area-inset-bottom)))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1800,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #c47a3a, #7a4e28)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem',
          boxShadow: '0 4px 16px rgba(62,36,8,.35), 0 2px 6px rgba(62,36,8,.2)',
          transition: 'transform .15s ease, box-shadow .15s ease',
        }}
        onMouseEnter={e => {
          const btn = e.currentTarget as HTMLButtonElement
          btn.style.transform = 'translateX(-50%) scale(1.1)'
          btn.style.boxShadow = '0 6px 20px rgba(62,36,8,.4), 0 2px 8px rgba(62,36,8,.25)'
        }}
        onMouseLeave={e => {
          const btn = e.currentTarget as HTMLButtonElement
          btn.style.transform = 'translateX(-50%) scale(1)'
          btn.style.boxShadow = '0 4px 16px rgba(62,36,8,.35), 0 2px 6px rgba(62,36,8,.2)'
        }}
      >
        🧭
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1900,
          }}
        />
      )}

      {/* Bottom Sheet */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1901,
          background: '#fdf6ee',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 32px rgba(62,36,8,.2)',
          padding: '0 20px max(24px, env(safe-area-inset-bottom))',
          transform: open ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
          maxHeight: '85dvh',
          overflowY: 'auto',
        }}
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{
            width: 40,
            height: 4,
            borderRadius: 99,
            background: 'rgba(62,36,8,.2)',
          }} />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.4rem',
            color: '#3e2408',
            margin: 0,
          }}>
            Explorar o <em>Evento</em>
          </h2>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          paddingBottom: 20,
        }}>
          {EXPLORE_LINKS.map(({ href, emoji, label }) => (
            <button
              key={href}
              onClick={() => handleCardClick(href)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '16px 8px',
                background: '#fff',
                border: '1.5px solid rgba(160,113,62,.2)',
                borderRadius: 14,
                cursor: 'pointer',
                transition: 'background .15s ease, border-color .15s ease, transform .15s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = '#fdf0e0'
                el.style.borderColor = 'rgba(196,122,58,.45)'
                el.style.transform = 'scale(1.04)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = '#fff'
                el.style.borderColor = 'rgba(160,113,62,.2)'
                el.style.transform = 'scale(1)'
              }}
            >
              <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{emoji}</span>
              <span style={{
                fontSize: '.75rem',
                fontWeight: 600,
                color: '#3e2408',
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
