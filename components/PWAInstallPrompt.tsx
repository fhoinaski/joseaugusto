'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)

    try {
      if (localStorage.getItem('cha_pwa_dismissed') === '1') {
        setDismissed(true)
        return
      }
    } catch {}

    const handler = (event: Event) => {
      event.preventDefault()
      setPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setPrompt(null)
    else dismiss()
  }

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem('cha_pwa_dismissed', '1') } catch {}
  }

  if (isStandalone || dismissed || !prompt) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 'max(96px, calc(88px + env(safe-area-inset-bottom)))',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1700,
      width: 'min(92vw, 380px)',
      background: 'rgba(250,244,236,.97)',
      border: '1px solid rgba(122,78,40,.2)',
      borderRadius: 18,
      boxShadow: '0 8px 32px rgba(39,18,0,.18)',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      backdropFilter: 'blur(12px)',
    }}>
      <span style={{ fontSize: 22, flexShrink: 0, fontWeight: 800, color: '#7a4e28' }} aria-hidden="true">+</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: "'Playfair Display',serif", fontSize: '.92rem', fontWeight: 700, color: '#3e2408' }}>
          Adicionar a tela inicial
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '.76rem', color: 'rgba(62,36,8,.58)', fontStyle: 'italic' }}>
          Acesse o album como um app
        </p>
      </div>
      <button
        onClick={install}
        style={{ flexShrink: 0, background: 'linear-gradient(135deg,#7a4e28,#3e2408)', color: '#faf3ea', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: '.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Cormorant Garamond',serif" }}
      >
        Instalar
      </button>
      <button
        onClick={dismiss}
        style={{ flexShrink: 0, background: 'none', border: 'none', color: 'rgba(62,36,8,.45)', fontSize: 18, cursor: 'pointer', padding: '4px 6px', lineHeight: 1 }}
        aria-label="Fechar"
      >
        x
      </button>
    </div>
  )
}
