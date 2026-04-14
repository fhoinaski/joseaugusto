'use client'
import { useState, useEffect, useCallback } from 'react'

interface MediaItem   { id: string; thumbUrl: string; fullUrl: string; author: string; type: 'image' | 'video' | 'audio'; createdAt: string }
interface CapsuleItem { id: string; author: string; message: string; createdAt: string; imageUrl: string }

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

interface StoreItemAdmin { id: number; name: string; description: string; image_url: string; link: string; price_brl: number | null; claimed_by: string | null; claimed_at: string | null; sort_order: number; created_at: string }

function AdminPanel() {
  const [tab, setTab] = useState<'pending' | 'approved' | 'message' | 'capsule' | 'settings' | 'store'>('pending')
  const [pending, setPending] = useState<MediaItem[]>([])
  const [approved, setApproved] = useState<MediaItem[]>([])
  const [capsules, setCapsules] = useState<CapsuleItem[]>([])
  const [capsuleOpenDate, setCapsuleOpenDate] = useState('18 anos')
  const [editingOpenDate, setEditingOpenDate] = useState('')
  const [msg, setMsg] = useState('')
  const [pinnedText, setPinnedText] = useState('')
  const [savingMsg, setSavingMsg] = useState(false)
  const [savingPinnedText, setSavingPinnedText] = useState(false)
  const [savingOpenDate, setSavingOpenDate] = useState(false)
  const [loadingC, setLoadingC] = useState(false)
  const [toast, setToast] = useState('')
  const [loadingP, setLoadingP] = useState(true)
  const [loadingA, setLoadingA] = useState(true)
  const [geoGateEnabled, setGeoGateEnabled] = useState(false)
  const [savingGeo, setSavingGeo] = useState(false)
  const [accessKeys, setAccessKeys] = useState<Array<{id:number; name:string; key:string; createdAt:string}>>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pinnedMediaId, setPinnedMediaId] = useState('')
  const [cdnStats, setCdnStats] = useState<{ cacheHitRate: number | null; generatedAt?: string; firstRequest?: { cfCacheStatus?: string }; secondRequest?: { cfCacheStatus?: string } } | null>(null)
  const [loadingCdn, setLoadingCdn] = useState(false)
  const [storeItems, setStoreItems] = useState<StoreItemAdmin[]>([])
  const [loadingStore, setLoadingStore] = useState(false)
  const [storeForm, setStoreForm] = useState({ name: '', description: '', image_url: '', link: '', price_brl: '', sort_order: '0' })
  const [savingStore, setSavingStore] = useState(false)
  const [pushMsg, setPushMsg] = useState({ title: '', body: '' })
  const [sendingPush, setSendingPush] = useState(false)

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

  const fetchCapsules = useCallback(async () => {
    setLoadingC(true)
    const res = await fetch('/api/admin/capsule')
    const data = await res.json()
    setCapsules(data.capsules ?? [])
    setCapsuleOpenDate(data.openDate ?? '18 anos')
    setEditingOpenDate(data.openDate ?? '18 anos')
    setLoadingC(false)
  }, [])

  useEffect(() => {
    fetchPending(); fetchApproved()
    fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_message' }) })
      .then(r => r.json()).then(d => setMsg(d.message ?? ''))
    fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_pinned_text' }) })
      .then(r => r.json()).then(d => setPinnedText(d.pinnedText ?? ''))
    fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_pinned_media' }) })
      .then(r => r.json()).then(d => setPinnedMediaId(d.pinnedMediaId ?? ''))
    fetch('/api/admin/settings')
      .then(r => r.json()).then(d => {
        setGeoGateEnabled(d.geoGateEnabled ?? false)
        setAccessKeys(d.keys ?? [])
      })
  }, [fetchPending, fetchApproved])

  const togglePin = async (id: string) => {
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pin_media', id }),
    })
    const data = await res.json()
    setPinnedMediaId(data.pinnedMediaId ?? '')
    showToast(data.pinnedMediaId ? '📌 Post fixado no feed!' : '📌 Post desafixado.')
  }

  const toggleGeoGate = async (enabled: boolean) => {
    setSavingGeo(true)
    await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ geoGateEnabled: enabled }) })
    setGeoGateEnabled(enabled); setSavingGeo(false)
    showToast(enabled ? '📍 Geofencing ativado!' : '🌐 Geofencing desativado.')
  }

  const addKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) return
    setSavingKey(true)
    const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_key', name: newKeyName.trim(), key: newKeyValue.trim() }) })
    if (res.ok) {
      setNewKeyName(''); setNewKeyValue('')
      const data = await fetch('/api/admin/settings').then(r => r.json())
      setAccessKeys(data.keys ?? [])
      showToast('🔑 Chave adicionada!')
    }
    setSavingKey(false)
  }

  const deleteKey = async (id: number, name: string) => {
    if (!confirm(`Excluir chave de "${name}"?`)) return
    await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_key', id }) })
    setAccessKeys(prev => prev.filter(k => k.id !== id))
    showToast('🗑 Chave removida.')
  }

  const changePw = async () => {
    if (newPw.length < 6) { setPwError('Senha deve ter ao menos 6 caracteres'); return }
    setSavingPw(true); setPwError('')
    const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'change_password', password: newPw }) })
    if (res.ok) { setNewPw(''); showToast('🔒 Senha atualizada!') }
    else { const d = await res.json(); setPwError(d.error ?? 'Erro') }
    setSavingPw(false)
  }

  const action = async (id: string, act: 'approve' | 'reject' | 'delete', type = 'image') => {
    await fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: act, id, resourceType: type }) })
    if (act === 'approve') { setPending(p => p.filter(x => x.id !== id)); fetchApproved(); showToast('✓ Aprovada!') }
    else if (act === 'reject') { setPending(p => p.filter(x => x.id !== id)); showToast('Rejeitada.') }
    else { setPending(p => p.filter(x => x.id !== id)); setApproved(a => a.filter(x => x.id !== id)); showToast('🗑 Excluída permanentemente.') }
  }

  const saveOpenDate = async () => {
    setSavingOpenDate(true)
    await fetch('/api/admin/capsule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_open_date', openDate: editingOpenDate }) })
    setCapsuleOpenDate(editingOpenDate); setSavingOpenDate(false); showToast('🔒 Data de abertura salva!')
  }

  const deleteCapsule = async (id: string, author: string) => {
    if (!confirm(`Excluir mensagem de ${author}?`)) return
    await fetch('/api/admin/capsule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) })
    setCapsules(prev => prev.filter(c => c.id !== id)); showToast('🗑 Mensagem excluída.')
  }

  const saveMsg = async () => {
    setSavingMsg(true)
    await fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_message', message: msg }) })
    setSavingMsg(false); showToast('🌸 Mensagem salva!')
  }

  const savePinnedText = async () => {
    setSavingPinnedText(true)
    await fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_pinned_text', text: pinnedText }) })
    setSavingPinnedText(false); showToast('📌 Texto fixado atualizado!')
  }

  const fetchStore = useCallback(async () => {
    setLoadingStore(true)
    try {
      const res = await fetch('/api/admin/store')
      const data = await res.json()
      setStoreItems((data as { items?: StoreItemAdmin[] }).items ?? [])
    } finally {
      setLoadingStore(false)
    }
  }, [])

  const addStoreItem = async () => {
    if (!storeForm.name.trim()) return
    setSavingStore(true)
    try {
      const res = await fetch('/api/admin/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          name: storeForm.name.trim(),
          description: storeForm.description.trim(),
          image_url: storeForm.image_url.trim(),
          link: storeForm.link.trim(),
          price_brl: storeForm.price_brl ? Math.round(parseFloat(storeForm.price_brl) * 100) : null,
          sort_order: parseInt(storeForm.sort_order) || 0,
        }),
      })
      if (res.ok) {
        setStoreForm({ name: '', description: '', image_url: '', link: '', price_brl: '', sort_order: '0' })
        await fetchStore()
        showToast('🎁 Item adicionado!')
      }
    } finally {
      setSavingStore(false)
    }
  }

  const deleteStoreItem = async (id: number, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return
    await fetch('/api/admin/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    setStoreItems(prev => prev.filter(s => s.id !== id))
    showToast('🗑 Item removido.')
  }

  const unclaimStoreItem = async (id: number) => {
    await fetch('/api/admin/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unclaim', id }),
    })
    setStoreItems(prev => prev.map(s => s.id === id ? { ...s, claimed_by: null, claimed_at: null } : s))
    showToast('↩ Reserva cancelada.')
  }

  const sendPush = async () => {
    if (!pushMsg.title.trim()) return
    setSendingPush(true)
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pushMsg.title.trim(), body: pushMsg.body.trim() }),
      })
      if (res.ok) {
        setPushMsg({ title: '', body: '' })
        showToast('🔔 Notificação enviada!')
      } else {
        showToast('Erro ao enviar notificação.')
      }
    } finally {
      setSendingPush(false)
    }
  }

  const logout = async () => { await fetch('/api/admin/logout', { method: 'POST' }); window.location.reload() }
  const exportMediaZip = () => { window.location.href = '/api/admin/export/media' }
  const exportTexts = () => { window.location.href = '/api/admin/export/texts' }
  const refreshCdnStats = async () => {
    setLoadingCdn(true)
    try {
      const res = await fetch('/api/admin/cdn')
      const data = await res.json()
      if (res.ok) setCdnStats(data)
    } finally {
      setLoadingCdn(false)
    }
  }

  useEffect(() => {
    if (tab === 'settings') refreshCdnStats()
    if (tab === 'store') fetchStore()
  }, [tab, fetchStore])

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    borderRadius: 50,
    border: `1px solid ${active ? 'var(--bl)' : 'var(--sand)'}`,
    background: active ? 'var(--beige)' : 'transparent',
    color: 'var(--b)',
    fontFamily: "'Cormorant Garamond',serif",
    fontSize: '.9rem',
    cursor: 'pointer',
    letterSpacing: '.08em',
  })

  const S: Record<string, React.CSSProperties> = {
    wrap: { maxWidth: 1000, margin: '0 auto', padding: '32px 20px 80px', fontFamily: "'Cormorant Garamond',serif" },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap' as const, gap: 12 },
    title: { fontFamily: "'Dancing Script',cursive", fontSize: '2rem', color: 'var(--bd)' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 14, marginBottom: 28 },
    statCard: { background: 'var(--warm)', border: '1px solid var(--beige)', borderRadius: 16, padding: '20px 16px', textAlign: 'center' as const },
    statNum: { fontFamily: "'Playfair Display',serif", fontSize: '2rem', color: 'var(--bd)', display: 'block' },
    statLbl: { fontSize: '.7rem', letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--bl)' },
    tabs: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' as const },
    card: { background: 'var(--warm)', border: '1px solid var(--beige)', borderRadius: 20, padding: 24, boxShadow: '0 4px 24px rgba(139,98,66,.07)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 16 },
    photoCard: { borderRadius: 14, overflow: 'hidden' as const, border: '2px solid var(--beige)', background: 'var(--cream)' },
    photoInfo: { padding: '10px 10px 8px' },
    photoAuthor: { fontSize: '.85rem', color: 'var(--bd)', fontWeight: 500 as const, marginBottom: 2 },
    photoDate: { fontSize: '.72rem', color: 'var(--bl)', fontStyle: 'italic' as const, marginBottom: 8 },
    actionRow: { display: 'flex', gap: 6 },
    btnApprove: { flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', background: '#e8f5e0', color: '#3a6d10', cursor: 'pointer', fontFamily: "'Cormorant Garamond',serif", fontSize: '.85rem' },
    btnDelete: { flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', background: '#fbeaea', color: '#a33', cursor: 'pointer', fontFamily: "'Cormorant Garamond',serif", fontSize: '.82rem' },
    empty: { textAlign: 'center' as const, padding: '48px 24px', color: 'var(--bl)', fontStyle: 'italic' },
    badge: { display: 'inline-block', background: 'var(--bl)', color: '#fff', fontSize: '.7rem', padding: '2px 7px', borderRadius: 99, marginLeft: 6 },
    toast: { position: 'fixed' as const, bottom: 24, left: '50%', transform: toast ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(80px)', background: 'var(--bd)', color: 'var(--warm)', padding: '10px 24px', borderRadius: 50, fontSize: '.88rem', transition: 'transform .4s', zIndex: 100, whiteSpace: 'nowrap' as const },
  }

  const MediaCard = ({ item, showApprove }: { item: MediaItem; showApprove: boolean }) => (
    <div style={S.photoCard}>
      {item.type === 'video'
        ? <div style={{ aspectRatio: '1', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🎥</div>
        : item.type === 'audio'
          ? <div style={{ aspectRatio: '1', background: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🎙️</div>
          : <img src={item.thumbUrl} alt={item.author} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = item.fullUrl }} />
      }
      <div style={S.photoInfo}>
        <p style={S.photoAuthor}>{item.author}</p>
        <p style={S.photoDate}>{new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
        <div style={S.actionRow}>
          {showApprove && <button style={S.btnApprove} onClick={() => action(item.id, 'approve', item.type)}>✓ Aprovar</button>}
          {showApprove && <button style={S.btnDelete} onClick={() => action(item.id, 'reject', item.type)}>✗ Rejeitar</button>}
          {!showApprove && <button style={{ ...S.btnApprove, background: pinnedMediaId === item.id ? '#fff7d6' : '#eef1ff', color: pinnedMediaId === item.id ? '#8a6d1f' : '#3d4f9b' }} onClick={() => togglePin(item.id)}>{pinnedMediaId === item.id ? '📌 Fixado' : '📍 Fixar'}</button>}
          {!showApprove && <button style={S.btnDelete} onClick={() => {
            if (confirm(`Excluir permanentemente esta foto de ${item.author}?`)) action(item.id, 'delete', item.type)
          }}>🗑 Excluir</button>}
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={exportMediaZip} style={tabStyle(false)}>📦 Exportar mídia</button>
          <button onClick={exportTexts} style={tabStyle(false)}>📝 Exportar textos</button>
          <button onClick={logout} style={{ ...tabStyle(false), color: '#a33', borderColor: '#e0a0a0' }}>Sair</button>
        </div>
      </div>

      <div style={S.statsRow}>
        {[{ num: pending.length, lbl: 'Pendentes' }, { num: approved.length, lbl: 'No mural' }, { num: capsules.length, lbl: 'Cápsulas' }].map(s => (
          <div key={s.lbl} style={S.statCard}><span style={S.statNum}>{s.num}</span><span style={S.statLbl}>{s.lbl}</span></div>
        ))}
      </div>

      <div style={S.tabs}>
        {[
          { key: 'pending', label: 'Pendentes', count: pending.length },
          { key: 'approved', label: 'Aprovadas', count: 0 },
          { key: 'message', label: 'Mensagem', count: 0 },
          { key: 'capsule', label: '💌 Cápsula', count: 0 },
          { key: 'store', label: '🎁 Loja', count: 0 },
          { key: 'settings', label: '⚙ Configurações', count: 0 },
        ].map(t => (
          <button key={t.key} style={tabStyle(tab === t.key)} onClick={() => { setTab(t.key as any); if (t.key === 'capsule' && capsules.length === 0) fetchCapsules() }}>
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
          <textarea style={{ width: '100%', border: '1px solid var(--sand)', borderRadius: 12, padding: '14px 16px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', resize: 'vertical', minHeight: 140, lineHeight: 1.7, marginBottom: 14 }} value={msg} onChange={e => setMsg(e.target.value)} />
          <button className="btn-primary" onClick={saveMsg} disabled={savingMsg} style={{ fontSize: '.95rem', padding: '11px 28px' }}>
            {savingMsg ? 'Salvando…' : '🌸 Salvar mensagem'}
          </button>

          <div style={{ height: 18 }} />
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.08rem', color: 'var(--bd)', marginBottom: 6 }}>Texto fixado do feed</h3>
          <p style={{ fontSize: '.88rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 14 }}>Este texto aparece no bloco “Destaque do Feed”, independente da mensagem dos pais.</p>
          <textarea style={{ width: '100%', border: '1px solid var(--sand)', borderRadius: 12, padding: '14px 16px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', resize: 'vertical', minHeight: 110, lineHeight: 1.7, marginBottom: 12 }} value={pinnedText} onChange={e => setPinnedText(e.target.value)} maxLength={240} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.78rem', color: 'var(--text-lo)' }}>{pinnedText.length}/240</span>
            <button className="btn-secondary" onClick={() => setPinnedText('')} style={{ fontSize: '.9rem', padding: '8px 20px' }}>Limpar</button>
            <button className="btn-primary" onClick={savePinnedText} disabled={savingPinnedText} style={{ fontSize: '.95rem', padding: '11px 28px' }}>
              {savingPinnedText ? 'Salvando…' : '📌 Salvar texto fixado'}
            </button>
          </div>
        </div>
      )}

      {tab === 'capsule' && (
        <div style={S.card}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>💌 Cápsula do Tempo</h2>
          <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>Mensagens dos convidados para o José Augusto.</p>

          <div style={{ background: 'rgba(62,36,8,.05)', border: '1px solid var(--beige)', borderRadius: 14, padding: '16px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: '.84rem', color: 'var(--bl)', fontWeight: 600 }}>🔒 Abre em:</span>
            <input style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '7px 12px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', flex: 1, minWidth: 120 }} value={editingOpenDate} onChange={e => setEditingOpenDate(e.target.value)} placeholder="ex: 18 anos" />
            <button style={S.btnApprove} onClick={saveOpenDate} disabled={savingOpenDate}>{savingOpenDate ? 'Salvando…' : '✓ Salvar'}</button>
          </div>

          {loadingC ? <p style={S.empty}>Carregando…</p> : capsules.length === 0
            ? <p style={S.empty}>Nenhuma mensagem ainda 💌</p>
            : (
              <div style={S.grid}>
                {capsules.map(c => (
                  <div key={c.id} style={{ ...S.photoCard, display: 'flex', flexDirection: 'column' as const }}>
                    <img src={c.imageUrl} alt={c.author} style={{ width: '100%', aspectRatio: '9/6', objectFit: 'cover', display: 'block' }} />
                    <div style={{ ...S.photoInfo, flex: 1 }}>
                      <p style={S.photoAuthor}>✍️ {c.author}</p>
                      <p style={S.photoDate}>{new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                      <p style={{ fontSize: '.82rem', color: 'var(--bd)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                        "{c.message}"
                      </p>
                      <div style={S.actionRow}>
                        <button style={S.btnDelete} onClick={() => deleteCapsule(c.id, c.author)}>🗑 Excluir</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {tab === 'store' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>Adicionar item</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>Itens aparecem na página /store para os convidados.</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <input style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="Nome do produto *" value={storeForm.name} onChange={e => setStoreForm(f => ({ ...f, name: e.target.value }))} />
              <textarea style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none', resize: 'vertical', minHeight: 70 }} placeholder="Descrição (opcional)" value={storeForm.description} onChange={e => setStoreForm(f => ({ ...f, description: e.target.value }))} />
              <input style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="URL da imagem (opcional)" value={storeForm.image_url} onChange={e => setStoreForm(f => ({ ...f, image_url: e.target.value }))} />
              <input style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="Link externo (opcional — ex: Amazon)" value={storeForm.link} onChange={e => setStoreForm(f => ({ ...f, link: e.target.value }))} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                <input style={{ flex: 1, minWidth: 100, border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="Preço (R$, opcional)" type="number" min="0" step="0.01" value={storeForm.price_brl} onChange={e => setStoreForm(f => ({ ...f, price_brl: e.target.value }))} />
                <input style={{ flex: 1, minWidth: 80, border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="Ordem (0=primeiro)" type="number" min="0" value={storeForm.sort_order} onChange={e => setStoreForm(f => ({ ...f, sort_order: e.target.value }))} />
              </div>
              <button style={{ ...S.btnApprove, padding: '11px 24px', fontSize: '.95rem' }} onClick={addStoreItem} disabled={savingStore || !storeForm.name.trim()}>
                {savingStore ? 'Adicionando…' : '+ Adicionar item'}
              </button>
            </div>
          </div>

          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>Itens da loja</h2>
            {loadingStore
              ? <p style={S.empty}>Carregando…</p>
              : storeItems.length === 0
                ? <p style={S.empty}>Nenhum item cadastrado ainda.</p>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                    {storeItems.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', border: `1px solid ${item.claimed_by ? 'rgba(90,158,58,.4)' : 'var(--beige)'}`, borderRadius: 14, background: item.claimed_by ? 'rgba(90,158,58,.06)' : 'var(--cream)' }}>
                        {item.image_url && (
                          <img src={item.image_url} alt={item.name} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                            <p style={{ fontWeight: 600, fontSize: '.95rem', color: 'var(--bd)' }}>{item.name}</p>
                            {item.price_brl != null && (
                              <span style={{ fontSize: '.75rem', background: 'var(--beige)', color: 'var(--bd)', padding: '2px 8px', borderRadius: 99 }}>
                                R$ {(item.price_brl / 100).toFixed(2)}
                              </span>
                            )}
                            {item.claimed_by
                              ? <span style={{ fontSize: '.75rem', background: '#e8f5e0', color: '#3a6d10', padding: '2px 8px', borderRadius: 99 }}>✓ Reservado por {item.claimed_by}</span>
                              : <span style={{ fontSize: '.75rem', background: 'var(--warm)', color: 'var(--bl)', padding: '2px 8px', borderRadius: 99 }}>Disponível</span>
                            }
                          </div>
                          {item.description && <p style={{ fontSize: '.82rem', color: 'var(--bl)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>}
                          {item.link && <a href={item.link} target="_blank" rel="noreferrer" style={{ fontSize: '.78rem', color: 'var(--bd)', textDecoration: 'underline' }}>🔗 {item.link.slice(0, 40)}{item.link.length > 40 ? '…' : ''}</a>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, flexShrink: 0 }}>
                          {item.claimed_by && (
                            <button style={{ ...S.btnApprove, padding: '5px 10px', fontSize: '.78rem' }} onClick={() => unclaimStoreItem(item.id)}>↩ Liberar</button>
                          )}
                          <button style={{ ...S.btnDelete, padding: '5px 10px', fontSize: '.78rem' }} onClick={() => deleteStoreItem(item.id, item.name)}>🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
            }
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>📍 Restrição por Localização</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>Controle quem pode enviar fotos ao álbum.</p>
            <div style={{ border: '1px solid var(--beige)', borderRadius: 16, padding: '20px 22px', display: 'flex', alignItems: 'flex-start', gap: 20 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: 'var(--bd)', fontSize: '1rem', marginBottom: 4 }}>Restringir upload por localização</p>
                <p style={{ fontSize: '.85rem', color: 'var(--bl)', lineHeight: 1.6 }}>
                  Quando <strong>ativado</strong>, apenas quem estiver dentro do raio do evento pode enviar fotos. Visitantes de fora verão "Modo observador" e poderão entrar com uma chave cadastrada abaixo.
                </p>
              </div>
              <button onClick={() => toggleGeoGate(!geoGateEnabled)} disabled={savingGeo} style={{ flexShrink: 0, width: 56, height: 30, borderRadius: 15, border: 'none', background: geoGateEnabled ? '#5a9e3a' : '#c9b8a8', cursor: savingGeo ? 'wait' : 'pointer', position: 'relative', transition: 'background .25s' }}>
                <span style={{ position: 'absolute', top: 3, left: geoGateEnabled ? 29 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.25)', transition: 'left .25s' }}/>
              </button>
            </div>
          </div>

          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>🔑 Chaves de Acesso</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>
              Cadastre chaves para convidados que estão fora do local do evento. Pode ser uma chave compartilhada para todos ou chaves individuais.
            </p>

            <div style={{ background: 'rgba(62,36,8,.04)', border: '1px solid var(--beige)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
              <p style={{ fontSize: '.84rem', fontWeight: 600, color: 'var(--bd)', marginBottom: 12 }}>Adicionar chave</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                <input style={{ flex: 2, minWidth: 120, border: '1px solid var(--sand)', borderRadius: 8, padding: '8px 12px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="Nome do convidado ou grupo" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
                <input style={{ flex: 1, minWidth: 100, border: '1px solid var(--sand)', borderRadius: 8, padding: '8px 12px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="Chave (ex: bebe2025)" value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKey()} />
                <button style={S.btnApprove} onClick={addKey} disabled={savingKey}>{savingKey ? '…' : '+ Adicionar'}</button>
              </div>
            </div>

            {accessKeys.length === 0
              ? <p style={S.empty}>Nenhuma chave cadastrada.</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                  {accessKeys.map(k => (
                    <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1px solid var(--beige)', borderRadius: 12, background: 'var(--cream)' }}>
                      <span style={{ fontSize: '1rem' }}>🔑</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--bd)', marginBottom: 2 }}>{k.name}</p>
                        <p style={{ fontSize: '.8rem', color: 'var(--bl)', fontFamily: 'monospace', letterSpacing: '.05em' }}>{k.key}</p>
                      </div>
                      <p style={{ fontSize: '.72rem', color: 'var(--bl)', fontStyle: 'italic', whiteSpace: 'nowrap' as const }}>{new Date(k.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                      <button style={S.btnDelete} onClick={() => deleteKey(k.id, k.name)}>🗑</button>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>🔒 Senha do Painel Admin</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>Altere a senha de acesso ao painel. A senha atual é exibida abaixo.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
              <input style={{ flex: 1, minWidth: 160, border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} type={showNewPw ? 'text' : 'password'} placeholder="Nova senha (mín. 6 caracteres)" value={newPw} onChange={e => setNewPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && changePw()} />
              <button style={{ ...S.btnApprove, minWidth: 40 }} onClick={() => setShowNewPw(p => !p)}>{showNewPw ? '🙈' : '👁'}</button>
              <button style={S.btnApprove} onClick={changePw} disabled={savingPw || newPw.length < 6}>{savingPw ? 'Salvando…' : '✓ Trocar senha'}</button>
            </div>
            {pwError && <p style={{ fontSize: '.82rem', color: '#a33', marginTop: 8 }}>{pwError}</p>}
          </div>

          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>🔔 Notificações Push</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>Envie uma notificação manual para todos os inscritos.</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <input style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="Título da notificação *" value={pushMsg.title} onChange={e => setPushMsg(m => ({ ...m, title: e.target.value }))} />
              <input style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="Mensagem (opcional)" value={pushMsg.body} onChange={e => setPushMsg(m => ({ ...m, body: e.target.value }))} />
              <button style={{ ...S.btnApprove, padding: '10px 20px', fontSize: '.92rem', alignSelf: 'flex-start' }} onClick={sendPush} disabled={sendingPush || !pushMsg.title.trim()}>
                {sendingPush ? 'Enviando…' : '🔔 Enviar para todos'}
              </button>
            </div>
          </div>

          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>📡 Monitoramento de Cache CDN</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 14 }}>Valida cache hit com duas requisições HEAD em uma imagem recente.</p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button style={S.btnApprove} onClick={refreshCdnStats} disabled={loadingCdn}>{loadingCdn ? 'Atualizando…' : 'Atualizar cache status'}</button>
              {cdnStats && (
                <p style={{ margin: 0, fontSize: '.88rem', color: 'var(--bd)' }}>
                  Hit rate: <strong>{cdnStats.cacheHitRate == null ? 'N/A' : `${cdnStats.cacheHitRate}%`}</strong>
                  {' · '}1a: {cdnStats.firstRequest?.cfCacheStatus || 'n/a'}
                  {' · '}2a: {cdnStats.secondRequest?.cfCacheStatus || 'n/a'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={S.toast}>{toast}</div>
    </div>
  )
}

export default function AdminClient() {
  const [auth, setAuth] = useState<boolean | null>(null)
  useEffect(() => { fetch('/api/admin/approve').then(r => setAuth(r.ok)) }, [])
  if (auth === null) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--warm)' }}>
      <span style={{ fontFamily: 'serif', color: 'var(--bl)', fontStyle: 'italic' }}>Carregando…</span>
    </div>
  )
  return auth ? <AdminPanel /> : <LoginForm onLogin={() => setAuth(true)} />
}
