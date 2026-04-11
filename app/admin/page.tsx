'use client'
import { useState, useEffect, useCallback } from 'react'

interface MediaItem { id: string; thumbUrl: string; fullUrl: string; author: string; type: 'image' | 'video'; createdAt: string }

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true); setErr('')
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
    if (res.ok) onLogin()
    else { setErr('Senha incorreta'); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--warm)' }}>
      <div style={{ background: 'var(--warm)', border: '1px solid var(--beige)', borderRadius: 24, padding: '48px 36px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 8px 48px rgba(139,98,66,.12)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>🐻</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', color: 'var(--bd)', marginBottom: 6 }}>Área Admin</h1>
        <p style={{ fontSize: '.95rem', fontStyle: 'italic', color: 'var(--bl)', marginBottom: 32 }}>Chá do José Augusto</p>
        {err && <p style={{ color: '#c0392b', fontSize: '.9rem', fontStyle: 'italic', marginBottom: 12 }}>{err}</p>}
        <input style={{ width: '100%', border: '1px solid var(--sand)', borderRadius: 12, padding: '13px 16px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', marginBottom: 14 }}
          type="password" placeholder="Senha" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={submit} disabled={loading}>
          {loading ? 'Entrando…' : '🔑 Entrar'}
        </button>
      </div>
    </div>
  )
}

function AdminPanel() {
  const [tab, setTab] = useState<'pending' | 'approved' | 'message'>('pending')
  const [pending, setPending] = useState<MediaItem[]>([])
  const [approved, setApproved] = useState<MediaItem[]>([])
  const [msg, setMsg] = useState('')
  const [savingMsg, setSavingMsg] = useState(false)
  const [toast, setToast] = useState('')
  const [loadingP, setLoadingP] = useState(true)
  const [loadingA, setLoadingA] = useState(true)

  const showToast = (t: string) => { setToast(t); setTimeout(() => setToast(''), 3000) }

  const fetchPending = useCallback(async () => {
    setLoadingP(true)
    const res = await fetch('/api/admin/approve?type=pending')
    const data = await res.json()
    setPending(data.media ?? [])
    setLoadingP(false)
  }, [])

  const fetchApproved = useCallback(async () => {
    setLoadingA(true)
    const res = await fetch('/api/admin/approve?type=approved')
    const data = await res.json()
    setApproved(data.media ?? [])
    setLoadingA(false)
  }, [])

  useEffect(() => {
    fetchPending(); fetchApproved()
    fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_message' }) })
      .then(r => r.json()).then(d => setMsg(d.message ?? ''))
  }, [fetchPending, fetchApproved])

  const action = async (id: string, act: 'approve' | 'reject', type = 'image') => {
    await fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: act, id, resourceType: type }) })
    if (act === 'approve') { setPending(p => p.filter(x => x.id !== id)); fetchApproved(); showToast('✓ Aprovada!') }
    else { setPending(p => p.filter(x => x.id !== id)); setApproved(a => a.filter(x => x.id !== id)); showToast('Removida.') }
  }

  const saveMsg = async () => {
    setSavingMsg(true)
    await fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_message', message: msg }) })
    setSavingMsg(false); showToast('🌸 Mensagem salva!')
  }

  const logout = async () => { await fetch('/api/admin/logout', { method: 'POST' }); window.location.reload() }

  const S: Record<string, React.CSSProperties> = {
    wrap: { maxWidth: 1000, margin: '0 auto', padding: '32px 20px 80px', fontFamily: "'Cormorant Garamond',serif" },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap' as const, gap: 12 },
    title: { fontFamily: "'Dancing Script',cursive", fontSize: '2rem', color: 'var(--bd)' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 14, marginBottom: 28 },
    statCard: { background: 'var(--warm)', border: '1px solid var(--beige)', borderRadius: 16, padding: '20px 16px', textAlign: 'center' as const },
    statNum: { fontFamily: "'Playfair Display',serif", fontSize: '2rem', color: 'var(--bd)', display: 'block' },
    statLbl: { fontSize: '.7rem', letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--bl)' },
    tabs: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' as const },
    tab: (active: boolean) => ({ padding: '8px 20px', borderRadius: 50, border: `1px solid ${active ? 'var(--bl)' : 'var(--sand)'}`, background: active ? 'var(--beige)' : 'transparent', color: 'var(--b)', fontFamily: "'Cormorant Garamond',serif", fontSize: '.9rem', cursor: 'pointer', letterSpacing: '.08em' }),
    card: { background: 'var(--warm)', border: '1px solid var(--beige)', borderRadius: 20, padding: 24, boxShadow: '0 4px 24px rgba(139,98,66,.07)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 16 },
    photoCard: { borderRadius: 14, overflow: 'hidden' as const, border: '2px solid var(--beige)', background: 'var(--cream)' },
    photoInfo: { padding: '10px 10px 8px' },
    photoAuthor: { fontSize: '.85rem', color: 'var(--bd)', fontWeight: 500 as const, marginBottom: 2 },
    photoDate: { fontSize: '.72rem', color: 'var(--bl)', fontStyle: 'italic' as const, marginBottom: 8 },
    actionRow: { display: 'flex', gap: 6 },
    btnApprove: { flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', background: '#e8f5e0', color: '#3a6d10', cursor: 'pointer', fontFamily: "'Cormorant Garamond',serif", fontSize: '.85rem' },
    btnReject: { flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', background: '#fbeaea', color: '#a33', cursor: 'pointer', fontFamily: "'Cormorant Garamond',serif", fontSize: '.85rem' },
    empty: { textAlign: 'center' as const, padding: '48px 24px', color: 'var(--bl)', fontStyle: 'italic' },
    badge: { display: 'inline-block', background: 'var(--bl)', color: '#fff', fontSize: '.7rem', padding: '2px 7px', borderRadius: 99, marginLeft: 6 },
    toast: { position: 'fixed' as const, bottom: 24, left: '50%', transform: toast ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(80px)', background: 'var(--bd)', color: 'var(--warm)', padding: '10px 24px', borderRadius: 50, fontSize: '.88rem', transition: 'transform .4s', zIndex: 100, whiteSpace: 'nowrap' as const },
  }

  const MediaCard = ({ item, showApprove }: { item: MediaItem; showApprove: boolean }) => (
    <div style={S.photoCard}>
      {item.type === 'video'
        ? <div style={{ aspectRatio: '1', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🎥</div>
        : <img src={item.thumbUrl} alt={item.author} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
      }
      <div style={S.photoInfo}>
        <p style={S.photoAuthor}>{item.author}</p>
        <p style={S.photoDate}>{new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
        <div style={S.actionRow}>
          {showApprove && <button style={S.btnApprove} onClick={() => action(item.id, 'approve', item.type)}>✓ Aprovar</button>}
          <button style={S.btnReject} onClick={() => action(item.id, 'reject', item.type)}>✗ {showApprove ? 'Rejeitar' : 'Remover'}</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <a href="/" style={{ fontSize: '.8rem', color: 'var(--bl)', textDecoration: 'none' }}>← voltar ao site</a>
          <p style={S.title}>🐻 Painel Admin</p>
        </div>
        <button onClick={logout} style={{ ...S.tab(false), color: '#a33', borderColor: '#e0a0a0' }}>Sair</button>
      </div>

      <div style={S.statsRow}>
        {[{ num: pending.length, lbl: 'Pendentes' }, { num: approved.length, lbl: 'No mural' }].map(s => (
          <div key={s.lbl} style={S.statCard}><span style={S.statNum}>{s.num}</span><span style={S.statLbl}>{s.lbl}</span></div>
        ))}
      </div>

      <div style={S.tabs}>
        {[{ key: 'pending', label: 'Pendentes', count: pending.length }, { key: 'approved', label: 'Aprovadas', count: 0 }, { key: 'message', label: 'Mensagem', count: 0 }].map(t => (
          <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key as any)}>
            {t.label}{t.count > 0 && <span style={S.badge}>{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'pending' && (
        <div style={S.card}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>Aguardando revisão</h2>
          <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>Aprove para aparecer no mural</p>
          {loadingP ? <p style={S.empty}>Carregando…</p> : pending.length === 0
            ? <p style={S.empty}>Nenhuma foto pendente 🌸</p>
            : <div style={S.grid}>{pending.map(m => <MediaCard key={m.id} item={m} showApprove={true} />)}</div>
          }
        </div>
      )}

      {tab === 'approved' && (
        <div style={S.card}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>No mural público</h2>
          <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>Todas visíveis para os convidados</p>
          {loadingA ? <p style={S.empty}>Carregando…</p> : approved.length === 0
            ? <p style={S.empty}>Nenhuma ainda.</p>
            : <div style={S.grid}>{approved.map(m => <MediaCard key={m.id} item={m} showApprove={false} />)}</div>
          }
        </div>
      )}

      {tab === 'message' && (
        <div style={S.card}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>Mensagem dos pais</h2>
          <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>Aparece em destaque no mural. Atualize quando quiser.</p>
          <textarea style={{ width: '100%', border: '1px solid var(--sand)', borderRadius: 12, padding: '14px 16px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', resize: 'vertical', minHeight: 140, lineHeight: 1.7, marginBottom: 14 }}
            value={msg} onChange={e => setMsg(e.target.value)} />
          <button className="btn-primary" onClick={saveMsg} disabled={savingMsg} style={{ fontSize: '.95rem', padding: '11px 28px' }}>
            {savingMsg ? 'Salvando…' : '🌸 Salvar mensagem'}
          </button>
        </div>
      )}

      <div style={S.toast}>{toast}</div>
    </div>
  )
}

export default function AdminPage() {
  const [auth, setAuth] = useState<boolean | null>(null)
  useEffect(() => { fetch('/api/admin/approve').then(r => setAuth(r.ok)) }, [])
  if (auth === null) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--warm)' }}>
      <span style={{ fontFamily: 'serif', color: 'var(--bl)', fontStyle: 'italic' }}>Carregando…</span>
    </div>
  )
  return auth ? <AdminPanel /> : <LoginForm onLogin={() => setAuth(true)} />
}
