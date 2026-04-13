'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useGeoAccess } from '@/components/GeoAccessProvider'

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

export default function GlobalInstagramNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { canWrite } = useGeoAccess()

  return (
    <nav className="ig-shell-nav" aria-label="Navegacao principal">
      <div className="ig-shell-brand">Cha JA</div>

      <a className={`ig-shell-item ${isActive(pathname, '/') ? 'active' : ''}`} href="/">
        <span>🏠</span>
        <small>Início</small>
      </a>

      <a className={`ig-shell-item ${isActive(pathname, '/feed') ? 'active' : ''}`} href="/feed">
        <span>📷</span>
        <small>Feed</small>
      </a>

      <button
        className="ig-shell-item ig-shell-post"
        onClick={() => {
          if (pathname === '/') {
            window.dispatchEvent(new CustomEvent('cha:open-upload'))
          } else {
            router.push('/?upload=1')
          }
        }}
        disabled={!canWrite}
        aria-label="Postar foto ou video"
      >
        <span>➕</span>
        <small>Postar</small>
      </button>

      <a className={`ig-shell-item ${isActive(pathname, '/reels') ? 'active' : ''}`} href="/reels">
        <span>🎬</span>
        <small>Reels</small>
      </a>

      <a className={`ig-shell-item ${isActive(pathname, '/tv') ? 'active' : ''}`} href="/tv">
        <span>📺</span>
        <small>TV</small>
      </a>
    </nav>
  )
}
