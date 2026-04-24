'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface BingoItem { id: number; label: string; emoji: string; called: boolean; sortOrder: number }

const CARD_LS = 'cha_bingo_card'
const MARKED_LS = 'cha_bingo_marked'

function getVoterId(): string {
  if (typeof window === 'undefined') return ''
  const k = 'cha_voter_id'
  let id = localStorage.getItem(k)
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, id) }
  return id
}

function generateCard(items: BingoItem[]): number[] {
  const pool = items.map(i => i.id)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const card = shuffled.slice(0, 24)
  card.splice(12, 0, -1) // center free cell
  return card
}

function isValidCard(card: unknown, items: BingoItem[]): card is number[] {
  if (!Array.isArray(card) || card.length !== 25) return false
  if (card[12] !== -1) return false

  const availableIds = new Set(items.map(item => item.id))
  const cardIds = card.filter(id => id !== -1)
  return cardIds.length === 24
    && new Set(cardIds).size === 24
    && cardIds.every(id => typeof id === 'number' && availableIds.has(id))
}

function checkBingo(card: number[], marked: Set<number>, called: Set<number>): boolean {
  const active = new Set(card.map((id, i) => (id === -1 || (marked.has(id) && called.has(id))) ? i : -1).filter(i => i >= 0))
  const lines = [
    [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
    [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
    [0,6,12,18,24],[4,8,12,16,20],
  ]
  return lines.some(line => line.every(i => active.has(i)))
}

export default function BingoPage() {
  const [items, setItems] = useState<BingoItem[]>([])
  const [card, setCard] = useState<number[]>([])
  const [marked, setMarked] = useState<Set<number>>(new Set())
  const [bingo, setBingo] = useState(false)
  const [loading, setLoading] = useState(true)

  const calledSet = new Set(items.filter(i => i.called).map(i => i.id))

  const loadCard = useCallback((pool: BingoItem[]) => {
    if (pool.length < 24) return
    const saved = localStorage.getItem(CARD_LS)
    const poolIds = new Set(pool.map(item => item.id))
    let markedSaved: number[] = []
    try {
      const parsed = JSON.parse(localStorage.getItem(MARKED_LS) ?? '[]')
      if (Array.isArray(parsed)) {
        markedSaved = parsed.filter(id => typeof id === 'number' && poolIds.has(id))
      }
    } catch {
      localStorage.removeItem(MARKED_LS)
    }
    let c: number[]
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        c = isValidCard(parsed, pool) ? parsed : generateCard(pool)
      } catch {
        c = generateCard(pool)
      }
    } else {
      c = generateCard(pool)
    }
    localStorage.setItem(CARD_LS, JSON.stringify(c))
    localStorage.setItem(MARKED_LS, JSON.stringify(markedSaved))
    setCard(c)
    setMarked(new Set(markedSaved))
  }, [])

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/bingo')
      const data = await res.json()
      const nextItems = data.items ?? []
      setItems(nextItems)
      if (nextItems.length >= 24 && (card.length === 0 || !isValidCard(card, nextItems))) {
        loadCard(nextItems)
      }
    } catch {} finally { setLoading(false) }
  }, [card, loadCard])

  useEffect(() => { fetchItems(); const t = setInterval(fetchItems, 5000); return () => clearInterval(t) }, [fetchItems])

  useEffect(() => {
    if (card.length > 0 && items.length > 0) {
      setBingo(checkBingo(card, marked, calledSet))
    } else {
      setBingo(false)
    }
  }, [card, marked, items])

  const toggleMark = (id: number) => {
    if (id === -1) return
    setMarked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      localStorage.setItem(MARKED_LS, JSON.stringify(Array.from(next)))
      return next
    })
  }

  const newCard = () => {
    if (items.length < 24) return
    const c = generateCard(items)
    localStorage.setItem(CARD_LS, JSON.stringify(c))
    localStorage.removeItem(MARKED_LS)
    setCard(c); setMarked(new Set()); setBingo(false)
  }

  const itemMap = new Map(items.map(i => [i.id, i]))

  return (
    <div style={{ minHeight: '100svh', background: 'var(--warm)', padding: '24px 16px 100px', fontFamily: "'Cormorant Garamond',serif" }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: '.8rem', color: 'var(--bl)', textDecoration: 'none', display: 'block', marginBottom: 20 }}>← voltar</Link>
        <p style={{ textAlign: 'center', fontSize: '.72rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--bl)', marginBottom: 6 }}>✦ Chá do José Augusto ✦</p>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', color: 'var(--bd)', textAlign: 'center', marginBottom: 4 }}>🎯 Bingo do Chá</h1>
        <p style={{ textAlign: 'center', color: 'var(--bl)', fontSize: '.92rem', marginBottom: 24, fontStyle: 'italic' }}>Marque os presentes conforme são abertos. Cinco em linha = BINGO!</p>

        {bingo && (
          <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg,#f4a623,#e8851f)', borderRadius: 20, marginBottom: 20, color: '#fff', fontFamily: "'Playfair Display',serif", fontSize: '2rem', boxShadow: '0 8px 32px rgba(244,166,35,.4)' }}>
            🎉 BINGO! Você completou uma linha!
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--bl)', fontStyle: 'italic' }}>Carregando…</p>
        ) : items.length < 24 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--cream)', borderRadius: 20, border: '1px solid var(--beige)' }}>
            <p style={{ fontSize: '3rem', marginBottom: 12 }}>⏳</p>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 8 }}>Bingo em preparação</p>
            <p style={{ color: 'var(--bl)', fontStyle: 'italic' }}>O admin está configurando os itens. Volte em breve!</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 16 }}>
              {card.map((id, i) => {
                const item = id === -1 ? null : itemMap.get(id)
                const isFree = id === -1
                const isCalled = isFree || calledSet.has(id)
                const isMarked = isFree || marked.has(id)
                const isMatch = isCalled && isMarked
                return (
                  <button
                    key={i}
                    onClick={() => toggleMark(id)}
                    disabled={isFree}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 10,
                      border: isMatch ? '2px solid #5a9e3a' : isCalled ? '2px solid #f4a623' : '1px solid var(--beige)',
                      background: isFree ? 'linear-gradient(135deg,#f4a623,#e8851f)' : isMatch ? '#e8f5e0' : isMarked ? '#fff7d6' : 'var(--cream)',
                      cursor: isFree ? 'default' : 'pointer',
                      padding: 4,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                      transition: 'all .2s',
                    }}
                  >
                    <span style={{ fontSize: isFree ? '1.4rem' : '1.1rem' }}>{isFree ? '⭐' : item?.emoji}</span>
                    <span style={{ fontSize: '.6rem', color: isMatch ? '#3a6d10' : 'var(--bd)', fontWeight: isMatch ? 700 : 400, lineHeight: 1.2, textAlign: 'center', wordBreak: 'break-word' }}>
                      {isFree ? 'GRÁTIS' : item?.label}
                    </span>
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', color: 'var(--bl)' }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: '#e8f5e0', border: '1px solid #5a9e3a' }}/> Marcado + Chamado = Match!
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', color: 'var(--bl)' }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, border: '2px solid #f4a623' }}/> Chamado pelo admin
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={newCard} style={{ padding: '10px 24px', borderRadius: 50, border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--bd)', cursor: 'pointer', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem' }}>
                🎲 Nova cartela
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: '.72rem', color: 'var(--bl)', marginTop: 12, fontStyle: 'italic' }}>
              {items.filter(i => i.called).length} de {items.length} itens chamados · atualiza automaticamente
            </p>
          </>
        )}
      </div>
    </div>
  )
}
