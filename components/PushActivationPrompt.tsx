'use client'

import { useEffect, useState } from 'react'
import { ensurePushSubscription, getPushDeviceState } from '@/lib/push-client'

const DISMISS_UNTIL_KEY = 'cha_push_prompt_dismissed_until'
const DISMISS_MS = 6 * 60 * 60 * 1000
const SHOW_DELAY_MS = 2500

function toast(text: string) {
  window.dispatchEvent(new CustomEvent('cha:toast', { detail: { text } }))
}

export default function PushActivationPrompt() {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      if (cancelled) return

      try {
        const dismissedUntil = Number(localStorage.getItem(DISMISS_UNTIL_KEY) || '0')
        if (dismissedUntil > Date.now()) return
      } catch {}

      const state = await getPushDeviceState()
      if (cancelled) return

      if (state.supported && !state.subscribed && state.permission !== 'denied') {
        setVisible(true)
      }
    }, SHOW_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + DISMISS_MS))
    } catch {}
  }

  const activate = async () => {
    if (loading) return
    setLoading(true)

    const result = await ensurePushSubscription()
    setLoading(false)

    if (result.ok) {
      setVisible(false)
      toast('Notificacoes ativadas neste aparelho.')
      return
    }

    toast(result.reason)
    if (result.reason.toLowerCase().includes('permissao')) dismiss()
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Ativar notificacoes do evento"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'max(156px, calc(146px + env(safe-area-inset-bottom)))',
        transform: 'translateX(-50%)',
        zIndex: 1750,
        width: 'min(92vw, 390px)',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 12,
        padding: '13px 14px',
        borderRadius: 18,
        border: '1px solid rgba(122,78,40,.18)',
        background: 'rgba(255,250,244,.97)',
        boxShadow: '0 12px 34px rgba(39,18,0,.18)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: 14,
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(135deg, rgba(246,196,123,.35), rgba(214,132,103,.22))',
          color: '#7a4e28',
          fontSize: 20,
        }}
      >
        !
      </span>

      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, color: '#3e2408', fontSize: '.93rem', fontWeight: 800, lineHeight: 1.2 }}>
          Receber avisos do evento
        </p>
        <p style={{ margin: '3px 0 0', color: 'rgba(62,36,8,.64)', fontSize: '.78rem', lineHeight: 1.25 }}>
          Ative para chamadas ao vivo e novidades do album.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={activate}
          disabled={loading}
          style={{
            minHeight: 36,
            padding: '0 14px',
            border: 0,
            borderRadius: 12,
            background: loading ? 'rgba(122,78,40,.28)' : 'linear-gradient(135deg,#7a4e28,#3e2408)',
            color: '#fff8ef',
            fontSize: '.82rem',
            fontWeight: 800,
            cursor: loading ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Ativando' : 'Ativar'}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar aviso de notificacoes"
          style={{
            width: 30,
            height: 30,
            border: 0,
            borderRadius: 10,
            background: 'rgba(122,78,40,.08)',
            color: 'rgba(62,36,8,.58)',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          x
        </button>
      </div>
    </div>
  )
}
