'use client'

import { useEffect, useRef, useState } from 'react'

interface ShareStoriesProps {
  imageUrl: string
  author: string
  onClose: () => void
}

export default function ShareStories({ imageUrl, author, onClose }: ShareStoriesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width  = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // ── Background gradient ──────────────────────────────────────────────────
    const grad = ctx.createLinearGradient(0, 0, 0, 1920)
    grad.addColorStop(0,   '#fdf6ee')
    grad.addColorStop(0.6, '#f5ede0')
    grad.addColorStop(1,   '#eddfc8')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 1080, 1920)

    // ── Subtle watermark pattern (circles) ──────────────────────────────────
    ctx.save()
    ctx.globalAlpha = 0.04
    ctx.fillStyle = '#a0713e'
    for (let i = 0; i < 30; i++) {
      const x = (i % 6) * 200 + 100
      const y = Math.floor(i / 6) * 400 + 200
      ctx.beginPath()
      ctx.arc(x, y, 80, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // ── Top decoration ──────────────────────────────────────────────────────
    ctx.save()
    ctx.font = '600 38px serif'
    ctx.fillStyle = '#a0713e'
    ctx.textAlign = 'center'
    ctx.fillText('✦  Chá de Bebê  ✦', 540, 110)
    ctx.restore()

    // ── Main title ──────────────────────────────────────────────────────────
    ctx.save()
    ctx.font = `bold 96px 'Playfair Display', Georgia, serif`
    ctx.fillStyle = '#3e2408'
    ctx.textAlign = 'center'
    ctx.fillText('José Augusto 🧸', 540, 240)
    ctx.restore()

    // ── Subtitle ────────────────────────────────────────────────────────────
    ctx.save()
    ctx.font = `500 52px 'Cormorant Garamond', Georgia, serif`
    ctx.fillStyle = '#7a4e28'
    ctx.textAlign = 'center'
    ctx.fillText('25 de Abril · 2026', 540, 315)
    ctx.restore()

    // ── Thin line ───────────────────────────────────────────────────────────
    ctx.save()
    ctx.strokeStyle = '#c9a87c'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(340, 355)
    ctx.lineTo(740, 355)
    ctx.stroke()
    ctx.restore()

    // ── Photo area ──────────────────────────────────────────────────────────
    const photoX = 64
    const photoY = 390
    const photoW = 952
    const photoH = 1180
    const radius = 28

    // Load the image via server proxy to bypass R2 CORS restrictions.
    // Blob URLs are same-origin so canvas.toBlob() won't throw a security error.
    let blobUrl = ''

    const drawImage = (img: HTMLImageElement) => {
      ctx.save()

      // Rounded clip
      ctx.beginPath()
      ctx.moveTo(photoX + radius, photoY)
      ctx.lineTo(photoX + photoW - radius, photoY)
      ctx.quadraticCurveTo(photoX + photoW, photoY, photoX + photoW, photoY + radius)
      ctx.lineTo(photoX + photoW, photoY + photoH - radius)
      ctx.quadraticCurveTo(photoX + photoW, photoY + photoH, photoX + photoW - radius, photoY + photoH)
      ctx.lineTo(photoX + radius, photoY + photoH)
      ctx.quadraticCurveTo(photoX, photoY + photoH, photoX, photoY + photoH - radius)
      ctx.lineTo(photoX, photoY + radius)
      ctx.quadraticCurveTo(photoX, photoY, photoX + radius, photoY)
      ctx.closePath()
      ctx.clip()

      // Draw cover-fit image
      const scale = Math.max(photoW / img.width, photoH / img.height)
      const sw    = img.width  * scale
      const sh    = img.height * scale
      const sx    = photoX + (photoW - sw) / 2
      const sy    = photoY + (photoH - sh) / 2
      ctx.drawImage(img, sx, sy, sw, sh)
      ctx.restore()

      // Shadow overlay around the photo (inner glow effect)
      ctx.save()
      const shadowGrad = ctx.createRadialGradient(540, photoY + photoH / 2, photoW * 0.3, 540, photoY + photoH / 2, photoW * 0.8)
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0)')
      shadowGrad.addColorStop(1, 'rgba(0,0,0,0.12)')
      ctx.fillStyle = shadowGrad
      ctx.fillRect(photoX, photoY, photoW, photoH)
      ctx.restore()

      // ── Author tag ────────────────────────────────────────────────────────
      ctx.save()
      ctx.font = `600 44px 'Cormorant Garamond', Georgia, serif`
      ctx.fillStyle = '#3e2408'
      ctx.textAlign = 'center'
      ctx.fillText(`📸 ${author}`, 540, photoY + photoH + 66)
      ctx.restore()

      // ── Watermark footer ─────────────────────────────────────────────────
      ctx.save()
      ctx.font = `500 38px 'Cormorant Garamond', Georgia, serif`
      ctx.fillStyle = 'rgba(160,113,62,.55)'
      ctx.textAlign = 'center'
      ctx.fillText('cha.app', 540, 1870)
      ctx.restore()

      setReady(true)
    }

    const showPlaceholder = () => {
      ctx.save()
      ctx.fillStyle = 'rgba(62,36,8,.08)'
      ctx.roundRect(photoX, photoY, photoW, photoH, radius)
      ctx.fill()
      ctx.fillStyle = '#a0713e'
      ctx.font = '96px serif'
      ctx.textAlign = 'center'
      ctx.fillText('🌸', 540, photoY + photoH / 2 + 32)
      ctx.restore()
      setReady(true)
    }

    // Fetch image through Next.js proxy (server-to-R2, no CORS restriction).
    // Resulting blob URL is same-origin → canvas stays untainted → toBlob() works.
    ;(async () => {
      try {
        const res = await fetch(`/api/download?url=${encodeURIComponent(imageUrl)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        blobUrl = URL.createObjectURL(blob)
        const img = new Image()
        img.onload  = () => drawImage(img)
        img.onerror = () => showPlaceholder()
        img.src = blobUrl
      } catch {
        showPlaceholder()
      }
    })()

    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [imageUrl, author])

  const saveImage = async () => {
    const canvas = canvasRef.current
    if (!canvas || !ready) return
    setSaving(true)
    try {
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('blob null')); return }
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `stories-jose-augusto-${author.replace(/\s+/g, '-').toLowerCase()}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          setTimeout(() => URL.revokeObjectURL(url), 5000)
          resolve()
        }, 'image/png')
      })
    } finally {
      setSaving(false)
    }
  }

  // Preview scale: 80% of viewport height → maintain 9:16 ratio
  const previewH = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.78, 600) : 560
  const previewW = previewH * (1080 / 1920)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(10,4,0,.88)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          maxWidth: 480, width: '100%',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: '1.05rem', fontWeight: 600,
            color: '#f5dab6',
          }}>
            Stories Instagram
          </p>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.12)', border: 'none',
              color: '#fff', fontSize: '1.2rem', borderRadius: '50%',
              width: 36, height: 36, cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Canvas preview */}
        <div style={{
          position: 'relative',
          width: previewW, height: previewH,
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(0,0,0,.5)',
          background: '#fdf6ee',
        }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%', height: '100%',
              display: 'block',
            }}
          />
          {!ready && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'grid', placeItems: 'center',
              background: 'rgba(253,246,238,.85)',
            }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", color: '#7a4e28', fontStyle: 'italic' }}>
                Gerando imagem…
              </p>
            </div>
          )}
        </div>

        {/* Tip */}
        <p style={{
          fontFamily: "'Cormorant Garamond',serif",
          fontSize: '.88rem', color: 'rgba(245,218,182,.7)',
          fontStyle: 'italic', textAlign: 'center',
        }}>
          Salve e compartilhe nos seus Stories 📲
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            onClick={saveImage}
            disabled={!ready || saving}
            style={{
              flex: 1,
              background: ready && !saving ? 'linear-gradient(135deg,#c47a3a,#7a4e28)' : 'rgba(255,255,255,.1)',
              color: '#fff',
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: '1rem', fontWeight: 600,
              border: 'none', borderRadius: 999,
              padding: '14px 20px',
              cursor: ready && !saving ? 'pointer' : 'not-allowed',
              boxShadow: ready && !saving ? '0 4px 14px rgba(196,122,58,.4)' : 'none',
              transition: 'all .2s',
            }}
          >
            {saving ? 'Salvando…' : '💾 Salvar imagem'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.12)',
              color: '#fff',
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: '1rem',
              border: '1px solid rgba(255,255,255,.25)',
              borderRadius: 999,
              padding: '14px 20px',
              cursor: 'pointer',
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
