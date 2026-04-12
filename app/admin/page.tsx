'use client'
import { useState, useEffect, useCallback } from 'react'

interface MediaItem   { id: string; thumbUrl: string; fullUrl: string; author: string; type: 'image' | 'video'; createdAt: string }
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

function AdminPanel() {
  const [tab, setTab] = useState<'pending' | 'approved' | 'message' | 'capsule' | 'settings'>('pending')
  const [pending,   setPending]   = useState<MediaItem[]>([])
  const [approved,  setApproved]  = useState<MediaItem[]>([])
  const [capsules,  setCapsules]  = useState<CapsuleItem[]>([])
  const [capsuleOpenDate, setCapsuleOpenDate] = useState('18 anos')
  const [editingOpenDate, setEditingOpenDate] = useState('')
  const [msg, setMsg] = useState('')
  const [savingMsg,       setSavingMsg]       = useState(false)
  const [savingOpenDate,  setSavingOpenDate]  = useState(false)
  const [loadingC, setLoadingC] = useState(false)
  const [toast, setToast] = useState('')
  const [loadingP, setLoadingP] = useState(true)
  const [loadingA, setLoadingA] = useState(true)
  const [geoGateEnabled, setGeoGateEnabled] = useState(false)
  const [savingGeo, setSavingGeo] = useState(false)

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
    fetch('/api/admin/settings')
      .then(r => r.json()).then(d => setGeoGateEnabled(d.geoGateEnabled ?? false))
  }, [fetchPending, fetchApproved])

  const toggleGeoGate = async (enabled: boolean) => {
    setSavingGeo(true)
    await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ geoGateEnabled: enabled }) })
    setGeoGateEnabled(enabled); setSavingGeo(false)
    showToast(enabled ? '📍 Geofencing ativado!' : '🌐 Geofencing desativado.')
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

  const logout = async () => { await fetch('/api/admin/logout', { method: 'POST' }); window.location.reload() }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    borderRadius: 50,
    border: `1px solid ${active ? 'var(--bl)' : 'var(--sand)'}`,
    background: active ? 'var(--beige)' : 'transparent',
    color: 'var(--b)',
    fontFamily: "'Cormorant Garamond',serif",
    fontSize: '.9rem',
    cursor: 'pointer',
    letterSpacing: '.08em'
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
        : <img src={item.thumbUrl} alt={item.author} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
      }
      <div style={S.photoInfo}>
        <p style={S.photoAuthor}>{item.author}</p>
        <p style={S.photoDate}>{new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
        <div style={S.actionRow}>
          {showApprove && <button style={S.btnApprove} onClick={() => action(item.id, 'approve', item.type)}>✓ Aprovar</button>}
          {showApprove && <button style={S.btnDelete} onClick={() => action(item.id, 'reject', item.type)}>✗ Rejeitar</button>}
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
        <button onClick={logout} style={{ ...tabStyle(false), color: '#a33', borderColor: '#e0a0a0' }}>Sair</button>
      </div>

      <div style={S.statsRow}>
        {[{ num: pending.length, lbl: 'Pendentes' }, { num: approved.length, lbl: 'No mural' }, { num: capsules.length, lbl: 'Cápsulas' }].map(s => (
          <div key={s.lbl} style={S.statCard}><span style={S.statNum}>{s.num}</span><span style={S.statLbl}>{s.lbl}</span></div>
        ))}
      </div>

      <div style={S.tabs}>
        {[
          { key: 'pending',  label: 'Pendentes',      count: pending.length },
          { key: 'approved', label: 'Aprovadas',       count: 0 },
          { key: 'message',  label: 'Mensagem',        count: 0 },
          { key: 'capsule',  label: '💌 Cápsula',      count: 0 },
          { key: 'settings', label: '⚙ Configurações', count: 0 },
        ].map(t => (
          <button key={t.key} style={tabStyle(tab === t.key)}
            onClick={() => { setTab(t.key as any); if (t.key === 'capsule' && capsules.length === 0) fetchCapsules() }}>
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

      {tab === 'capsule' && (
        <div style={S.card}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>💌 Cápsula do Tempo</h2>
          <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>Mensagens dos convidados para o José Augusto.</p>

          {/* Open date config */}
          <div style={{ background: 'rgba(62,36,8,.05)', border: '1px solid var(--beige)', borderRadius: 14, padding: '16px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: '.84rem', color: 'var(--bl)', fontWeight: 600 }}>🔒 Abre em:</span>
            <input
              style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '7px 12px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', flex: 1, minWidth: 120 }}
              value={editingOpenDate}
              onChange={e => setEditingOpenDate(e.target.value)}
              placeholder="ex: 18 anos"
            />
            <button style={S.btnApprove} onClick={saveOpenDate} disabled={savingOpenDate}>
              {savingOpenDate ? 'Salvando…' : '✓ Salvar'}
            </button>
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

      {tab === 'settings' && (
        <div style={S.card}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>⚙ Configurações de Acesso</h2>
          <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 24 }}>Controle quem pode enviar fotos ao álbum.</p>

          {/* Geo gate toggle */}
          <div style={{ border: '1px solid var(--beige)', borderRadius: 16, padding: '20px 22px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, color: 'var(--bd)', fontSize: '1rem', marginBottom: 4 }}>📍 Restringir upload por localização</p>
              <p style={{ fontSize: '.85rem', color: 'var(--bl)', lineHeight: 1.6 }}>
                Quando <strong>ativado</strong>, apenas quem estiver dentro do raio de {process.env.NEXT_PUBLIC_GEO_RADIUS ?? '200'} m do evento pode enviar fotos.
                Quem estiver fora verá o aviso "Modo observador" e poderá entrar com uma chave de acesso.
              </p>
              <p style={{ fontSize: '.78rem', color: 'var(--bl)', fontStyle: 'italic', marginTop: 6, opacity: 0.7 }}>
                Quando <strong>desativado</strong>, qualquer pessoa com o link pode enviar fotos livremente.
              </p>
            </div>
            <button
              onClick={() => toggleGeoGate(!geoGateEnabled)}
              disabled={savingGeo}
              style={{
                flexShrink: 0,
                width: 56,
                height: 30,
                borderRadius: 15,
                border: 'none',
                background: geoGateEnabled ? '#5a9e3a' : '#c9b8a8',
                cursor: savingGeo ? 'wait' : 'pointer',
                position: 'relative',
                transition: 'background .25s',
              }}
              aria-label={geoGateEnabled ? 'Desativar geofencing' : 'Ativar geofencing'}
            >
              <span style={{
                position: 'absolute',
                top: 3,
                left: geoGateEnabled ? 29 : 3,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,.25)',
                transition: 'left .25s',
              }}/>
            </button>
          </div>

          <p style={{ fontSize: '.78rem', color: 'var(--bl)', fontStyle: 'italic', opacity: 0.6 }}>
            A chave de acesso para visitantes externos é definida pela variável de ambiente <code>NEXT_PUBLIC_ACCESS_KEY</code>.
          </p>
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
