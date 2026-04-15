'use client'
import { useRef, useState, useEffect } from 'react'

interface Props {
  toName: string
  fromName: string
  message: string
  photoUrl?: string
}

export default function CartaoAgradecimento({ toName, fromName, message, photoUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 800
    canvas.height = 560
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fundo gradiente quente
    const grad = ctx.createLinearGradient(0, 0, 800, 560)
    grad.addColorStop(0, '#fdf6ee')
    grad.addColorStop(1, '#eddfc8')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 800, 560)

    // Borda decorativa
    ctx.strokeStyle = '#c9a87c'
    ctx.lineWidth = 3
    ctx.strokeRect(20, 20, 760, 520)
    ctx.strokeStyle = 'rgba(201,168,124,.4)'
    ctx.lineWidth = 1
    ctx.strokeRect(28, 28, 744, 504)

    // Decoração floral cantos
    ctx.font = '32px serif'
    ctx.fillText('🌸', 30, 62)
    ctx.fillText('🌸', 730, 62)
    ctx.fillText('🧸', 30, 515)
    ctx.fillText('🌸', 730, 515)

    // Header
    ctx.textAlign = 'center'
    ctx.font = 'italic 22px Georgia, serif'
    ctx.fillStyle = '#a0713e'
    ctx.fillText('✦  Chá de Bebê  ✦', 400, 80)

    ctx.font = 'bold 36px Georgia, serif'
    ctx.fillStyle = '#3e2408'
    ctx.fillText('José Augusto 🧸', 400, 125)

    // Linha divisória
    ctx.strokeStyle = '#c9a87c'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(200, 145)
    ctx.lineTo(600, 145)
    ctx.stroke()

    // "Para:" nome
    ctx.font = 'italic 18px Georgia, serif'
    ctx.fillStyle = '#7a4e28'
    ctx.fillText('Para:', 400, 178)
    ctx.font = 'bold 28px Georgia, serif'
    ctx.fillStyle = '#3e2408'
    ctx.fillText(toName, 400, 212)

    // Mensagem (quebra de linha automática)
    ctx.font = '18px Georgia, serif'
    ctx.fillStyle = '#5a3a1a'
    const words = message.split(' ')
    let line = ''
    let y = 270
    const maxW = 600
    const lineH = 28
    for (const word of words) {
      const test = line + word + ' '
      if (ctx.measureText(test).width > maxW && line !== '') {
        ctx.fillText(line.trim(), 400, y)
        y += lineH
        line = word + ' '
      } else {
        line = test
      }
    }
    if (line) ctx.fillText(line.trim(), 400, y)

    // Assinatura
    ctx.font = 'italic 16px Georgia, serif'
    ctx.fillStyle = '#a0713e'
    ctx.fillText('25 de Abril · 2026', 400, 470)
    ctx.font = 'bold 18px Georgia, serif'
    ctx.fillStyle = '#3e2408'
    ctx.fillText(fromName, 400, 500)

    setReady(true)
  }, [toName, fromName, message, photoUrl])

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `obrigado-${toName.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          maxWidth: 600,
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(62,36,8,.15)',
          border: '1px solid #e8d4b8',
        }}
      />
      <button
        onClick={download}
        disabled={!ready}
        style={{
          background: 'linear-gradient(135deg,#c47a3a,#7a4e28)',
          color: '#fdf6ee',
          border: 'none',
          borderRadius: 999,
          padding: '12px 28px',
          fontFamily: "'Playfair Display',serif",
          fontSize: '1rem',
          fontWeight: 600,
          cursor: ready ? 'pointer' : 'not-allowed',
          opacity: ready ? 1 : 0.6,
          boxShadow: '0 4px 12px rgba(196,122,58,.3)',
        }}
      >
        ⬇ Baixar cartão
      </button>
    </div>
  )
}
