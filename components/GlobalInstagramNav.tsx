'use client'

import { usePathname } from 'next/navigation'
import { useGeoAccess } from '@/components/GeoAccessProvider'
import { useUpload } from '@/components/UploadProvider'

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

export default function GlobalInstagramNav() {
  const pathname = usePathname()
  const { canWrite } = useGeoAccess()
  const { openUpload } = useUpload()

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
        onClick={openUpload}
        disabled={!canWrite}
        aria-label="Postar foto ou video"
        title={canWrite ? 'Postar foto ou vídeo' : 'Acesso necessário para postar'}
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
