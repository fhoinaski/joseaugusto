'use client'

import { useEffect, useState } from 'react'
import type { StoreItem } from '@/lib/db'

type Item = StoreItem

function priceLabel(cents: number | null): string {
  if (!cents) return ''
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

function ClaimModal({ item, onClose, onClaim }: {
  item: Item
  onClose: () => void
  onClaim: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(() => {
    try { return localStorage.getItem('cha_author') ?? '' } catch { return '' }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim()) { setError('Informe seu nome para reservar.'); return }
    setLoading(true); setError('')
    try {
      await onClaim(name.trim())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--cream)', borderRadius: '20px 20px 0 0', padding: '28px 24px 36px', width: '100%', maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 4, background: 'var(--sand)', borderRadius: 99, margin: '0 auto 20px' }} />
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6, fontWeight: 600 }}>
          Reservar presente
        </p>
        <p style={{ fontSize: '.9rem', color: 'var(--text-md)', marginBottom: 20 }}>
          Você vai dar <strong>{item.name}</strong> para o José Augusto?
        </p>
        <input
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          placeholder="Seu nome"
          maxLength={60}
          style={{ width: '100%', border: '1px solid var(--sand)', borderRadius: 12, padding: '12px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--warm)', outline: 'none', marginBottom: 8 }}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          autoFocus
        />
        {error && <p style={{ color: '#c0392b', fontSize: '.85rem', margin: '4px 0 12px', fontStyle: 'italic' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
          <button onClick={submit} className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Reservando...' : '🎁 Confirmar presente'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StorePage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<Item | null>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const loadItems = async () => {
    try {
      const res = await fetch('/api/store')
      const data = await res.json() as { items?: Item[] }
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadItems() }, [])

  const handleClaim = async (name: string) => {
    if (!claiming) return
    const res = await fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: claiming.id, claimed_by: name }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) throw new Error(data.error ?? 'Erro ao reservar.')
    try { localStorage.setItem('cha_author', name) } catch {}
    setClaiming(null)
    showToast(`🎁 Obrigado, ${name}! Presente reservado com sucesso.`)
    await loadItems()
  }

  const available = items.filter(i => !i.claimed_by)
  const claimed   = items.filter(i => i.claimed_by)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--warm)', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background: 'var(--cream)', borderBottom: '1px solid var(--beige)', padding: '20px 20px 16px' }}>
        <p style={{ fontFamily: "'Dancing Script',cursive", color: 'var(--sand)', fontSize: '1rem', marginBottom: 2 }}>✦ Lista de Presentes ✦</p>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.75rem', color: 'var(--bd)', margin: 0 }}>Para o <em>José Augusto</em></h1>
        <p style={{ fontSize: '.88rem', color: 'var(--text-lo)', marginTop: 6, fontStyle: 'italic' }}>
          Escolha um presente e clique para reservar. Cada item pode ser reservado por apenas uma pessoa.
        </p>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-lo)', fontStyle: 'italic' }}>Carregando lista...</div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-md)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎁</div>
            <p style={{ fontStyle: 'italic' }}>Nenhum presente cadastrado ainda.</p>
          </div>
        )}

        {/* Available */}
        {available.length > 0 && (
          <>
            <p style={{ fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-lo)', fontWeight: 600, margin: '0 0 12px' }}>
              Disponíveis ({available.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {available.map(item => (
                <div key={item.id} style={{ background: 'var(--cream)', border: '1px solid var(--beige)', borderRadius: 16, overflow: 'hidden', display: 'flex', gap: 0 }}>
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} style={{ width: 90, minHeight: 90, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: '1rem', color: 'var(--bd)', margin: 0 }}>{item.name}</p>
                    {item.description && <p style={{ fontSize: '.85rem', color: 'var(--text-md)', margin: 0 }}>{item.description}</p>}
                    {item.price_brl && <p style={{ fontSize: '.82rem', color: 'var(--sage)', fontWeight: 600, margin: 0 }}>{priceLabel(item.price_brl)}</p>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setClaiming(item)}
                        className="btn-primary"
                        style={{ fontSize: '.82rem', padding: '7px 16px' }}
                      >
                        🎁 Quero dar este presente
                      </button>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ fontSize: '.82rem', padding: '7px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                          🔗 Ver produto
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Claimed */}
        {claimed.length > 0 && (
          <>
            <p style={{ fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-lo)', fontWeight: 600, margin: '0 0 12px' }}>
              Já reservados ({claimed.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {claimed.map(item => (
                <div key={item.id} style={{ background: '#f0f5f1', border: '1px solid #c8dece', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: .8 }}>
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '.95rem', color: 'var(--bd)', margin: 0, textDecoration: 'line-through', opacity: .7 }}>{item.name}</p>
                    <p style={{ fontSize: '.82rem', color: 'var(--sage)', margin: '2px 0 0', fontStyle: 'italic' }}>
                      ✓ Reservado por <strong>{item.claimed_by}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {claiming && (
        <ClaimModal
          item={claiming}
          onClose={() => setClaiming(null)}
          onClaim={handleClaim}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: 'var(--bd)', color: '#fff', padding: '12px 20px', borderRadius: 999, fontSize: '.9rem', fontWeight: 600, zIndex: 4000, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,.35)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
