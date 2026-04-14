'use client'
import { useState, useEffect } from 'react'

interface MediaItem { id: string; thumbUrl: string; fullUrl: string; author: string; createdAt: string; type: string }

export default function AlbumPrintPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [printReady, setPrintReady] = useState(false)

  useEffect(() => {
    fetch('/api/photos').then(r => r.json()).then((d: { media?: MediaItem[] }) => {
      setMedia((d.media ?? []).filter(m => m.type === 'image'))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!loading && media.length > 0) {
      const imgs = document.querySelectorAll('img[data-print]')
      let loaded = 0
      imgs.forEach(img => {
        if ((img as HTMLImageElement).complete) { loaded++; if (loaded === imgs.length) setPrintReady(true) }
        else img.addEventListener('load', () => { loaded++; if (loaded === imgs.length) setPrintReady(true) })
      })
      if (imgs.length === 0) setPrintReady(true)
    }
  }, [loading, media])

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { page-break-after: always; }
        }
        @page { size: A4; margin: 15mm; }
      `}</style>

      <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--warm)', borderBottom: '1px solid var(--beige)', padding: '14px 20px', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: "'Cormorant Garamond',serif" }}>
        <a href="/admin" style={{ fontSize: '.85rem', color: 'var(--bl)', textDecoration: 'none' }}>← admin</a>
        <p style={{ fontFamily: "'Playfair Display',serif", color: 'var(--bd)', fontSize: '1.1rem' }}>📄 Álbum para Imprimir</p>
        <button onClick={() => window.print()} disabled={!printReady} style={{ padding: '8px 20px', background: printReady ? 'var(--bd)' : 'var(--beige)', color: printReady ? '#fff' : 'var(--bl)', border: 'none', borderRadius: 50, cursor: printReady ? 'pointer' : 'wait', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem' }}>
          {printReady ? '🖨 Imprimir / Salvar PDF' : 'Carregando fotos…'}
        </button>
      </div>

      <div style={{ marginTop: 60, padding: '20px 20px 40px', background: '#fff', fontFamily: "'Cormorant Garamond',serif" }}>
        {/* Cover page */}
        <div className="print-page" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderBottom: '1px solid #eee', marginBottom: 40, paddingBottom: 40 }}>
          <p style={{ fontSize: '5rem', marginBottom: 16 }}>🧸</p>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '3rem', color: '#3e2408', marginBottom: 8 }}>José Augusto</h1>
          <p style={{ fontSize: '1.4rem', color: '#8b6242', marginBottom: 4 }}>Chá de Bebê · 25 de Abril de 2026</p>
          <p style={{ fontSize: '1rem', color: '#a07850', fontStyle: 'italic' }}>Um álbum de momentos especiais</p>
          <div style={{ marginTop: 32, width: 80, height: 2, background: '#c9b8a8' }} />
          <p style={{ marginTop: 32, color: '#a07850' }}>{media.length} fotos · com amor de todos os convidados</p>
        </div>

        {/* Photo grid */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', fontStyle: 'italic' }}>Carregando fotos…</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {media.map(item => (
              <div key={item.id} style={{ breakInside: 'avoid' }}>
                <img
                  data-print="1"
                  src={item.fullUrl}
                  alt={item.author}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, display: 'block', marginBottom: 4 }}
                />
                <p style={{ fontSize: '.72rem', color: '#8b6242', textAlign: 'center' }}>📷 {item.author}</p>
              </div>
            ))}
          </div>
        )}

        {/* Back cover */}
        {!loading && media.length > 0 && (
          <div style={{ marginTop: 60, textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: '2rem', marginBottom: 12 }}>♥</p>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', color: '#3e2408' }}>Bem-vindo ao mundo, José Augusto</p>
            <p style={{ color: '#8b6242', fontStyle: 'italic', marginTop: 8 }}>com muito amor · papai e mamãe e maninha</p>
          </div>
        )}
      </div>
    </>
  )
}
