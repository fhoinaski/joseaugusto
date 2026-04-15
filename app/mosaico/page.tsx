'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface MediaItem { id: string; thumbUrl: string; fullUrl: string; author: string; type: string }

export default function MosaicoPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lbItem, setLbItem] = useState<MediaItem | null>(null)

  useEffect(() => {
    fetch('/api/photos').then(r => r.json()).then((d: { media?: MediaItem[] }) => {
      setMedia((d.media ?? []).filter(m => m.type === 'image'))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setLbItem(null) }
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn)
  }, [])

  return (
    <div style={{ minHeight: '100svh', background: '#0d0d0d' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(13,13,13,.9)', backdropFilter: 'blur(12px)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,.6)', fontSize: '.85rem', textDecoration: 'none' }}>← voltar</Link>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '.68rem', letterSpacing: '.14em', textTransform: 'uppercase' }}>Chá do José Augusto</p>
          <p style={{ fontFamily: "'Playfair Display',serif", color: '#fff', fontSize: '1.1rem' }}>🖼️ Mosaico de Fotos</p>
        </div>
        <span style={{ color: 'rgba(255,255,255,.4)', fontSize: '.8rem' }}>{media.length} fotos</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <p style={{ color: 'rgba(255,255,255,.4)', fontFamily: 'serif', fontStyle: 'italic' }}>Carregando mosaico…</p>
        </div>
      ) : media.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
          <span style={{ fontSize: '4rem' }}>📷</span>
          <p style={{ color: 'rgba(255,255,255,.5)', fontFamily: 'serif', fontStyle: 'italic' }}>Nenhuma foto ainda</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 30vw), 1fr))',
          gap: 3,
          padding: 3,
        }}>
          {media.map(item => (
            <div
              key={item.id}
              onClick={() => setLbItem(item)}
              style={{ aspectRatio: '1', overflow: 'hidden', cursor: 'pointer', background: '#1a1a1a', position: 'relative' }}
            >
              <img
                src={item.thumbUrl}
                alt={item.author}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .3s, opacity .3s' }}
                loading="lazy"
                onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.06)'; (e.currentTarget as HTMLImageElement).style.opacity = '.85' }}
                onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLImageElement).style.opacity = '1' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lbItem && (
        <div onClick={() => setLbItem(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <button onClick={() => setLbItem(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: '50%', width: 40, height: 40, fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: '100%' }}>
            <img src={lbItem.fullUrl} alt={lbItem.author} style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12 }} />
            <p style={{ color: 'rgba(255,255,255,.7)', textAlign: 'center', marginTop: 12, fontFamily: 'serif', fontSize: '.95rem' }}>📷 {lbItem.author}</p>
          </div>
        </div>
      )}
    </div>
  )
}
