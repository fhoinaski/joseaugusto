import type { Metadata } from 'next'
import { dbGetMediaById } from '@/lib/db'
import { objectUrl } from '@/lib/r2'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ slug: string[] }> }

async function resolveItem(params: Props['params']) {
  const { slug } = await params
  const id = slug.map(decodeURIComponent).join('/')
  const item = await dbGetMediaById(id).catch(() => null)
  return { id, item }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, item } = await resolveItem(params)
  if (!item) {
    return {
      title: 'Chá de Bebê · José Augusto',
      description: 'Veja as fotos e vídeos do Chá de Bebê do José Augusto',
    }
  }
  const imageUrl = objectUrl(id)
  const title    = `📸 ${item.author} no Chá do José Augusto 🧸`
  const desc     = item.caption?.trim() || '25 de Abril de 2026 · Florianópolis · Veja o álbum completo!'
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `/foto/${id.split('/').map(encodeURIComponent).join('/')}`,
      siteName: 'Chá · José Augusto',
      images: [{ url: imageUrl, width: 1080, height: 1080, alt: title }],
      type: 'website',
      locale: 'pt_BR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [imageUrl],
    },
  }
}

export default async function FotoPage({ params }: Props) {
  const { id, item } = await resolveItem(params)

  if (!item) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#fdf6ee', fontFamily: 'Georgia, serif' }}>
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <p style={{ fontSize: '3rem', marginBottom: 16 }}>🧸</p>
          <p style={{ color: '#7a4e28', fontSize: '1.1rem', marginBottom: 24 }}>Foto não encontrada.</p>
          <a href="/" style={{ color: '#c47a3a', fontWeight: 600, textDecoration: 'none', border: '1.5px solid #c47a3a', borderRadius: 999, padding: '10px 24px' }}>
            ← Ver o álbum completo
          </a>
        </div>
      </div>
    )
  }

  const mediaUrl = objectUrl(id)

  return (
    <div style={{ minHeight: '100dvh', background: '#0d0500', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Media */}
      <div style={{ width: '100%', maxWidth: 640, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 48px rgba(0,0,0,.6)' }}>
        {item.type === 'video' ? (
          <video
            src={mediaUrl}
            controls
            autoPlay
            playsInline
            style={{ width: '100%', display: 'block', maxHeight: '75dvh', background: '#000' }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl}
            alt={`Foto de ${item.author}`}
            style={{ width: '100%', display: 'block', maxHeight: '75dvh', objectFit: 'contain', background: '#111' }}
          />
        )}
      </div>

      {/* Author + caption */}
      <div style={{ marginTop: 20, textAlign: 'center', maxWidth: 560 }}>
        <p style={{ color: '#f5dab6', fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.1rem', fontWeight: 600, margin: '0 0 6px' }}>
          {item.type === 'video' ? '🎥' : '📷'} {item.author}
        </p>
        {item.caption && (
          <p style={{ color: 'rgba(245,218,182,.65)', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1rem', fontStyle: 'italic', margin: '0 0 20px' }}>
            {item.caption}
          </p>
        )}

        {/* CTA */}
        <a
          href={`/?foto=${encodeURIComponent(id)}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #c47a3a, #7a4e28)',
            color: '#fff', textDecoration: 'none',
            borderRadius: 999, padding: '13px 28px',
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '1rem', fontWeight: 700,
            boxShadow: '0 4px 20px rgba(196,122,58,.4)',
          }}
        >
          🧸 Ver álbum completo
        </a>

        <p style={{ color: 'rgba(245,218,182,.3)', fontSize: '.75rem', marginTop: 16, fontFamily: 'Georgia, serif' }}>
          Chá de Bebê · José Augusto · 25 de Abril de 2026
        </p>
      </div>
    </div>
  )
}
