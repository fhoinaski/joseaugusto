'use client'

import { usePathname } from 'next/navigation'
import { useGeoAccess } from '@/components/GeoAccessProvider'
import { useUpload } from '@/components/UploadProvider'

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

/* ── SVG icons ── */
function IconHome({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M12 3.5L3 10.25V21h5.5v-6.5h7V21H21V10.25L12 3.5z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.25L12 3.5l9 6.75V21h-5.5v-6.5h-7V21H3V10.25z" />
    </svg>
  )
}

function IconGrid({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="23" height="23" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  )
}

function IconReels({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill={active ? 'currentColor' : 'none'} />
      <path
        d="M10 8.5l6 3.5-6 3.5V8.5z"
        fill={active ? '#faf3ea' : 'currentColor'}
        stroke="none"
      />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconMural({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Polaroid frame */}
      <rect x="3" y="3" width="18" height="18" rx="2" fill={active ? 'currentColor' : 'none'} />
      {/* Photo area */}
      <rect x="5.5" y="5.5" width="13" height="10" rx="1"
        fill={active ? 'rgba(250,243,234,0.9)' : 'none'}
        stroke={active ? 'rgba(250,243,234,0.6)' : 'currentColor'}
        strokeWidth="1.2" />
      {/* Caption line */}
      <line x1="8" y1="18" x2="16" y2="18"
        stroke={active ? 'rgba(250,243,234,0.7)' : 'currentColor'}
        strokeWidth="1.4" />
    </svg>
  )
}

export default function GlobalInstagramNav() {
  const pathname = usePathname()
  const { canWrite } = useGeoAccess()
  const { openUpload } = useUpload()

  const items = [
    {
      href: '/',
      label: 'Início',
      icon: (active: boolean) => <IconHome active={active} />,
    },
    {
      href: '/feed',
      label: 'Feed',
      icon: (active: boolean) => <IconGrid active={active} />,
    },
  ]

  const afterItems = [
    {
      href: '/reels',
      label: 'Reels',
      icon: (active: boolean) => <IconReels active={active} />,
    },
    {
      href: '/mural',
      label: 'Mural',
      icon: (active: boolean) => <IconMural active={active} />,
    },
  ]

  return (
    <nav className="ig-shell-nav" aria-label="Navegação principal">

      {/* Brand — desktop sidebar only */}
      <div className="ig-shell-brand">Chá JA</div>

      {items.map(({ href, label, icon }) => {
        const active = isActive(pathname, href)
        return (
          <a key={href} className={`ig-shell-item${active ? ' active' : ''}`} href={href} aria-label={label}>
            {icon(active)}
            <small>{label}</small>
          </a>
        )
      })}

      {/* Post button */}
      <button
        className="ig-shell-item ig-shell-post"
        onClick={openUpload}
        disabled={!canWrite}
        aria-label="Postar foto ou vídeo"
        title={canWrite ? 'Postar foto ou vídeo' : 'Acesso necessário para postar'}
      >
        <IconPlus />
        <small>Postar</small>
      </button>

      {afterItems.map(({ href, label, icon }) => {
        const active = isActive(pathname, href)
        return (
          <a key={href} className={`ig-shell-item${active ? ' active' : ''}`} href={href} aria-label={label}>
            {icon(active)}
            <small>{label}</small>
          </a>
        )
      })}

    </nav>
  )
}
