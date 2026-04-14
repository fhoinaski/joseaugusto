'use client'

import { useEffect, useRef } from 'react'

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  rotation: number
  rotSpeed: number
  size: number
  shape: 'rect' | 'circle'
  alpha: number
}

const COLORS = ['#d59056', '#f5dab6', '#c97a6e', '#6b9e7a', '#9b6ea8', '#4a7a9b', '#e8d4b8', '#fff']

function createPieces(count: number, width: number): Piece[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: -20 - Math.random() * 80,
    vx: (Math.random() - 0.5) * 3,
    vy: 3 + Math.random() * 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.2,
    size: 6 + Math.random() * 8,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
    alpha: 1,
  }))
}

export default function ConfettiCelebration() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)
  const activeRef = useRef(false)

  const launch = () => {
    const canvas = canvasRef.current
    if (!canvas || activeRef.current) return
    activeRef.current = true

    canvas.style.display = 'block'
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const pieces = createPieces(120, canvas.width)
    let frame = 0
    const maxFrames = 180 // ~3s at 60fps

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of pieces) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.12 // gravity
        p.vx *= 0.99 // air resistance
        p.rotation += p.rotSpeed
        if (frame > maxFrames * 0.6) {
          p.alpha = Math.max(0, p.alpha - 0.025)
        }

        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color

        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        }
        ctx.restore()
      }

      frame++
      if (frame < maxFrames) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        canvas.style.display = 'none'
        activeRef.current = false
      }
    }

    animRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    const handler = () => launch()
    window.addEventListener('cha:confetti', handler)
    return () => {
      window.removeEventListener('cha:confetti', handler)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'none',
      }}
      aria-hidden="true"
    />
  )
}
