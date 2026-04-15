'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { emitToast } from '@/lib/ui-feedback'

interface Photo {
  id: string
  thumbUrl: string
  fullUrl: string
  author: string
  caption: string
  totalReactions: number
}

type Tab = 'top' | 'favorites'

export default function MelhoresPage() {
  const [tab, setTab] = useState<Tab>('top')
  const [topPhotos, setTopPhotos] = useState<Photo[]>([])
  const [favPhotos, setFavPhotos] = useState<Photo[]>([])
  const [favIds, setFavIds] = useState<string[]>([])
  const [loadingTop, setLoadingTop] = useState(false)
  const [loadingFav, setLoadingFav] = useState(false)
  const [downloadingZip, setDownloadingZip] = useState(false)

  // Load favorites IDs from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('cha_favorites') ?? '[]') as string[]
      setFavIds(Array.isArray(stored) ? stored : [])
    } catch {
      setFavIds([])
    }
  }, [])

  // Fetch top photos
  useEffect(() => {
    setLoadingTop(true)
    fetch('/api/melhores?mode=top')
      .then(r => r.json())
      .then(data => {
        const d = data as { photos?: Photo[] }
        setTopPhotos(Array.isArray(d.photos) ? d.photos : [])
      })
      .catch(() => {})
      .finally(() => setLoadingTop(false))
  }, [])

  // Fetch favorite photos when tab switches to favorites or favIds change
  useEffect(() => {
    if (tab !== 'favorites') return
    if (favIds.length === 0) { setFavPhotos([]); return }
    setLoadingFav(true)
    fetch(`/api/melhores?ids=${encodeURIComponent(favIds.join(','))}`)
      .then(r => r.json())
      .then(data => {
        const d = data as { photos?: Photo[] }
        setFavPhotos(Array.isArray(d.photos) ? d.photos : [])
      })
      .catch(() => {})
      .finally(() => setLoadingFav(false))
  }, [tab, favIds])

  const downloadFavoritesZip = async () => {
    if (favIds.length === 0) { emitToast('Nenhum favorito para baixar.'); return }
    setDownloadingZip(true)
    emitToast('Preparando ZIP...')
    try {
      const res = await fetch(`/api/download/favoritas?ids=${encodeURIComponent(favIds.join(','))}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'favoritas-cha-jose-augusto.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 8000)
      emitToast('Download do ZIP concluído! ✓')
    } catch {
      emitToast('Não foi possível gerar o ZIP.')
    } finally {
      setDownloadingZip(false)
    }
  }

  const activePhotos = tab === 'top' ? topPhotos : favPhotos
  const loading = tab === 'top' ? loadingTop : loadingFav

  // ── Styles ──────────────────────────────────────────────────────────────────

  const WARM = '#fdf6ee'
  const DARK = '#3e2408'
  const ACCENT = '#c47a3a'
  const BORDER = '#e8d4b8'

  return (
    <div style={{ minHeight: '100dvh', background: WARM, color: DARK, paddingBottom: 100 }}>
      {/* Back link */}
      <div style={{ padding: '80px 20px 0' }}>
        <Link
          href="/"
          style={{ fontSize: '.85rem', color: ACCENT, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          ← voltar
        </Link>
      </div>

      {/* Header */}
      <div style={{ padding: '16px 20px 0', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 700, color: DARK, margin: '0 0 6px' }}>
          ✨ Melhores Fotos
        </h1>
        <p style={{ margin: 0, fontSize: '.9rem', color: 'rgba(62,36,8,.55)', fontStyle: 'italic' }}>
          As fotos mais curtidas e seus favoritos
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '20px 20px 0', justifyContent: 'center' }}>
        <button
          onClick={() => setTab('top')}
          style={{
            padding: '10px 20px',
            borderRadius: 999,
            border: tab === 'top' ? `1.5px solid ${ACCENT}` : `1.5px solid ${BORDER}`,
            background: tab === 'top' ? ACCENT : '#fff',
            color: tab === 'top' ? '#fff' : DARK,
            fontFamily: "'Cormorant Garamond',serif",
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all .2s',
          }}
        >
          ✨ Mais curtidas
        </button>
        <button
          onClick={() => setTab('favorites')}
          style={{
            padding: '10px 20px',
            borderRadius: 999,
            border: tab === 'favorites' ? `1.5px solid ${ACCENT}` : `1.5px solid ${BORDER}`,
            background: tab === 'favorites' ? ACCENT : '#fff',
            color: tab === 'favorites' ? '#fff' : DARK,
            fontFamily: "'Cormorant Garamond',serif",
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all .2s',
          }}
        >
          ⭐ Minhas favoritas
          {favIds.length > 0 && (
            <span style={{
              marginLeft: 6,
              background: 'rgba(255,255,255,.35)',
              borderRadius: 999,
              padding: '1px 6px',
              fontSize: '.75rem',
              fontWeight: 700,
            }}>
              {favIds.length}
            </span>
          )}
        </button>
      </div>

      {/* Download ZIP button (favorites tab only) */}
      {tab === 'favorites' && favIds.length > 0 && (
        <div style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={downloadFavoritesZip}
            disabled={downloadingZip}
            style={{
              padding: '10px 24px',
              borderRadius: 999,
              border: `1.5px solid ${BORDER}`,
              background: downloadingZip ? 'rgba(62,36,8,.06)' : 'linear-gradient(135deg,rgba(196,122,58,.15),rgba(122,78,40,.06))',
              color: DARK,
              fontFamily: "'Cormorant Garamond',serif",
              fontWeight: 700,
              fontSize: '1rem',
              cursor: downloadingZip ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all .2s',
            }}
          >
            {downloadingZip ? '⏳ Gerando ZIP...' : '⬇ Baixar favoritas (ZIP)'}
          </button>
        </div>
      )}

      {/* Empty favorites message */}
      {tab === 'favorites' && favIds.length === 0 && !loading && (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '2.5rem', margin: '0 0 12px' }}>☆</p>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', color: DARK, margin: '0 0 6px', fontWeight: 600 }}>
            Nenhum favorito ainda
          </p>
          <p style={{ fontSize: '.85rem', color: 'rgba(62,36,8,.5)', margin: 0, fontStyle: 'italic' }}>
            Toque em ☆ em qualquer foto no feed para favoritar
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '.9rem', color: 'rgba(62,36,8,.45)', fontStyle: 'italic' }}>Carregando...</p>
        </div>
      )}

      {/* Grid */}
      {!loading && activePhotos.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          padding: '20px 16px 0',
        }}>
          {activePhotos.map((photo, idx) => (
            <div
              key={photo.id}
              style={{
                background: '#fff',
                borderRadius: 14,
                border: `1.5px solid ${BORDER}`,
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(62,36,8,.06)',
              }}
            >
              {/* Square image */}
              <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', position: 'relative' }}>
                {tab === 'top' && idx < 3 && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 1,
                    background: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : '#cd7f32',
                    borderRadius: 999,
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '.75rem',
                    fontWeight: 700,
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,.2)',
                  }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                )}
                <img
                  src={photo.thumbUrl}
                  alt={photo.author}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).src = photo.fullUrl }}
                />
              </div>

              {/* Card info */}
              <div style={{ padding: '10px 12px 12px' }}>
                <p style={{
                  margin: 0,
                  fontFamily: "'Cormorant Garamond',serif",
                  fontWeight: 700,
                  fontSize: '.9rem',
                  color: DARK,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  @{photo.author}
                </p>
                {photo.totalReactions > 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: '.78rem', color: ACCENT, fontWeight: 600 }}>
                    {photo.totalReactions} {photo.totalReactions === 1 ? 'reação' : 'reações'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results (top tab) */}
      {!loading && tab === 'top' && topPhotos.length === 0 && (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '.9rem', color: 'rgba(62,36,8,.45)', fontStyle: 'italic' }}>
            Nenhuma foto encontrada.
          </p>
        </div>
      )}
    </div>
  )
}
