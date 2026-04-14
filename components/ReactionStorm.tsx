'use client'

import { useEffect, useState, useRef } from 'react'

interface FloatingEmoji {
  id: string
  emoji: string
  x: number // percent 10-90
  duration: number // ms 2000-3500
}

export default function ReactionStorm() {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([])
  const counterRef = useRef(0)

  useEffect(() => {
    if (typeof EventSource === 'undefined') return

    const es = new EventSource('/api/stream')

    es.addEventListener('reaction-update', (e: Event) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as { emoji?: string }
        if (!payload.emoji) return

        const id = `r_${Date.now()}_${counterRef.current++}`
        const x = 10 + Math.random() * 80
        const duration = 2000 + Math.random() * 1500

        setEmojis(prev => [...prev.slice(-8), { id, emoji: payload.emoji!, x, duration }])

        // Remove after animation
        setTimeout(() => {
          setEmojis(prev => prev.filter(em => em.id !== id))
        }, duration + 100)
      } catch {}
    })

    return () => es.close()
  }, [])

  if (emojis.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {emojis.map(em => (
        <div
          key={em.id}
          style={{
            position: 'absolute',
            bottom: 80,
            left: `${em.x}%`,
            fontSize: '2.4rem',
            lineHeight: 1,
            animation: `reactionFloat ${em.duration}ms ease-out forwards`,
            userSelect: 'none',
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.4))',
          }}
        >
          {em.emoji}
        </div>
      ))}
    </div>
  )
}
