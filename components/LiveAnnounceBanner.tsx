'use client'

export interface LiveAnnounce {
  message: string
  ts: number
}

export default function LiveAnnounceBanner({
  announce,
  onClose,
  top = 0,
}: {
  announce: LiveAnnounce | null
  onClose: () => void
  top?: number | string
}) {
  if (!announce?.message) return null

  return (
    <div
      onClick={onClose}
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top,
        left: 0,
        right: 0,
        zIndex: 5000,
        background: 'linear-gradient(135deg, #c47a3a, #7a4e28)',
        color: '#fff',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,.32)',
        animation: 'announceSlide .35s ease-out',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: '1.45rem', flexShrink: 0 }}>!</span>
      <p style={{ margin: 0, fontFamily: "'Playfair Display',serif", fontSize: 'clamp(.95rem, 2.4vw, 1.08rem)', fontWeight: 700, flex: 1, lineHeight: 1.28 }}>
        {announce.message}
      </p>
      <button
        onClick={event => {
          event.stopPropagation()
          onClose()
        }}
        style={{
          background: 'rgba(255,255,255,.2)',
          border: 'none',
          color: '#fff',
          borderRadius: 8,
          padding: '5px 10px',
          cursor: 'pointer',
          fontSize: '.9rem',
          flexShrink: 0,
        }}
        aria-label="Fechar anuncio"
      >
        x
      </button>
    </div>
  )
}
