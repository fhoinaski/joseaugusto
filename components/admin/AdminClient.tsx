'use client'
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'

const CartaoAgradecimento = lazy(() => import('@/components/CartaoAgradecimento'))

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
interface RsvpItem { id: number; name: string; status: string; guests_count: number; contact: string | null; message: string | null; created_at: string }
interface RsvpStats { total: number; confirmed: number; maybe: number; declined: number; total_guests: number }
interface MarcoAdmin { id: number; title: string; emoji: string; description: string | null; marco_date: string; photo_url: string | null }

function AdminPanel() {
  const [tab, setTab] = useState<'pending' | 'approved' | 'message' | 'capsule' | 'settings' | 'store' | 'baby' | 'avaliacao' | 'enquete' | 'musicas' | 'desafios' | 'bingo' | 'diario' | 'pwa' | 'convite' | 'rsvp' | 'marcos' | 'memorias' | 'cartoes' | 'anunciar'>('pending')
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
  const [babyBorn, setBabyBorn] = useState(false)
  const [babyDueDate, setBabyDueDate] = useState('')
  const [babyWeightKg, setBabyWeightKg] = useState('')
  const [babyHora, setBabyHora] = useState('')
  const [babyCabelo, setBabyCabelo] = useState('')
  const [savingBaby, setSavingBaby] = useState(false)
  const qrRef = useRef<HTMLCanvasElement>(null)

  // ── Avaliação ────────────────────────────────────────────────────────────────
  const [avalStats,   setAvalStats]   = useState<{ avg: number; total: number; distribution: Record<number,number> } | null>(null)
  const [avalRatings, setAvalRatings] = useState<Array<{ id: number; author: string; stars: number; comment: string | null; createdAt: string }>>([])
  const [loadingAval, setLoadingAval] = useState(false)

  // ── Músicas ───────────────────────────────────────────────────────────────────
  interface MusicaAdmin { id: number; author: string; title: string; artist: string; spotifyUrl: string | null; votes: number; approved: boolean }
  const [musicas,       setMusicas]       = useState<MusicaAdmin[]>([])
  const [loadingMusicas, setLoadingMusicas] = useState(false)

  // ── Desafios ──────────────────────────────────────────────────────────────────
  interface DesafioAdmin { id: number; emoji: string; title: string; description: string; completions: number; active: boolean }
  const [desafios,       setDesafios]       = useState<DesafioAdmin[]>([])
  const [desafioForm,    setDesafioForm]    = useState({ emoji: '📸', title: '', description: '' })
  const [savingDesafio,  setSavingDesafio]  = useState(false)
  const [loadingDesafios, setLoadingDesafios] = useState(false)

  // ── Bingo ─────────────────────────────────────────────────────────────────────
  interface BingoAdmin { id: number; label: string; emoji: string; called: boolean }
  const [bingoItems,    setBingoItems]    = useState<BingoAdmin[]>([])
  const [bingoForm,     setBingoForm]     = useState({ label: '', emoji: '🎁' })
  const [loadingBingo,  setLoadingBingo]  = useState(false)

  // ── Diário ────────────────────────────────────────────────────────────────────
  interface DiarioAdmin { id: number; title: string; content: string; imageUrl: string | null; milestoneDate: string | null; published: boolean }
  const [diarioEntries, setDiarioEntries] = useState<DiarioAdmin[]>([])
  const [diarioForm,    setDiarioForm]    = useState({ title: '', content: '', imageUrl: '', milestoneDate: '' })
  const [savingDiario,  setSavingDiario]  = useState(false)
  const [loadingDiario, setLoadingDiario] = useState(false)

  // ── PWA ───────────────────────────────────────────────────────────────────────
  const [pwaStats, setPwaStats] = useState<{ installs: number; sessions: number; devices: Array<{ author: string | null; event: string; created_at: string }> } | null>(null)

  // ── RSVP ──────────────────────────────────────────────────────────────────────
  const [rsvpList,   setRsvpList]   = useState<RsvpItem[]>([])
  const [rsvpStats,  setRsvpStats]  = useState<RsvpStats | null>(null)
  const [loadingRsvp, setLoadingRsvp] = useState(false)

  // ── Marcos ────────────────────────────────────────────────────────────────────
  const [marcos,       setMarcos]       = useState<MarcoAdmin[]>([])
  const [marcosForm,   setMarcosForm]   = useState({ emoji: '👶', title: '', marco_date: '', description: '', photo_url: '' })
  const [savingMarco,  setSavingMarco]  = useState(false)
  const [loadingMarcos, setLoadingMarcos] = useState(false)

  // ── Memórias ──────────────────────────────────────────────────────────────────
  interface MemoriaSubscriber { id: number; author: string; email: string; opted_in: number; created_at: string }
  const [memorias,       setMemorias]       = useState<MemoriaSubscriber[]>([])
  const [loadingMemorias, setLoadingMemorias] = useState(false)

  // ── Anunciar ──────────────────────────────────────────────────────────────────
  const [announceMsg,     setAnnounceMsg]     = useState('')
  const [sendingAnnounce, setSendingAnnounce] = useState(false)
  const [announceSuccess, setAnnounceSuccess] = useState(false)

  // ── Cartões ───────────────────────────────────────────────────────────────────
  const [cartaoTo,      setCartaoTo]      = useState('')
  const [cartaoFrom,    setCartaoFrom]    = useState('Fernando & Mariana')
  const [cartaoMsg,     setCartaoMsg]     = useState('Obrigado por estar com a gente neste dia tão especial! A sua presença tornou o nosso chá ainda mais bonito e inesquecível.')
  const [cartaoAuthors, setCartaoAuthors] = useState<string[]>([])

  // ── Enquete ──────────────────────────────────────────────────────────────────
  const [enquete,       setEnquete]       = useState<{ id: number; question: string; options: string[]; active: boolean } | null>(null)
  const [enqueteResults, setEnqueteResults] = useState<Array<{ option: string; votes: number }>>([])
  const [enqueteQ,      setEnqueteQ]      = useState('')
  const [enqueteOpts,   setEnqueteOpts]   = useState(['', ''])
  const [savingEnquete, setSavingEnquete] = useState(false)
  const [loadingEnquete, setLoadingEnquete] = useState(false)

  const showToast = (t: string) => { setToast(t); setTimeout(() => setToast(''), 3000) }

  const sendAnnounce = async () => {
    if (!announceMsg.trim() || sendingAnnounce) return
    setSendingAnnounce(true)
    setAnnounceSuccess(false)
    try {
      const res = await fetch('/api/admin/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: announceMsg.trim() }),
      })
      if (res.ok) { setAnnounceSuccess(true); setTimeout(() => setAnnounceSuccess(false), 5000) }
    } finally {
      setSendingAnnounce(false)
    }
  }

  const clearAnnounce = async () => {
    setSendingAnnounce(true)
    try {
      await fetch('/api/admin/announce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '' }) })
      setAnnounceMsg('')
      setAnnounceSuccess(false)
    } finally {
      setSendingAnnounce(false)
    }
  }

  const fetchPending = useCallback(async () => {
    setLoadingP(true)
    try {
      const res = await fetch('/api/admin/approve?type=pending')
      const data = await res.json()
      setPending(data.media ?? [])
    } catch {
      showToast('Nao foi possivel carregar pendentes.')
    } finally {
      setLoadingP(false)
    }
  }, [])

  const fetchApproved = useCallback(async () => {
    setLoadingA(true)
    try {
      const res = await fetch('/api/admin/approve?type=approved')
      const data = await res.json()
      setApproved(data.media ?? [])
    } catch {
      showToast('Nao foi possivel carregar aprovadas.')
    } finally {
      setLoadingA(false)
    }
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
    // Load baby status from public settings endpoint
    fetch('/api/settings')
      .then(r => r.json()).then((d: { babyBorn?: boolean; babyDueDate?: string | null; babyBornWeight?: number | null; babyBornHora?: string | null; babyBornCabelo?: string | null }) => {
        setBabyBorn(d.babyBorn ?? false)
        setBabyDueDate(d.babyDueDate ?? '')
        setBabyWeightKg(d.babyBornWeight ? (d.babyBornWeight / 1000).toFixed(2) : '')
        setBabyHora(d.babyBornHora ?? '')
        setBabyCabelo(d.babyBornCabelo ?? '')
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

  const saveBabyStatus = async () => {
    setSavingBaby(true)
    try {
      const weightG = babyWeightKg ? Math.round(parseFloat(babyWeightKg.replace(',', '.')) * 1000) : null
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'baby_status',
          babyBorn,
          babyDueDate: babyDueDate.trim(),
          babyBornWeightG: weightG,
          babyBornHora: babyHora.trim(),
          babyBornCabelo: babyCabelo.trim(),
        }),
      })
      showToast(babyBorn ? '🍼 Status do bebê atualizado!' : '📅 Data prevista salva!')
    } finally {
      setSavingBaby(false)
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

  const fetchAvaliacao = useCallback(async () => {
    setLoadingAval(true)
    try {
      const res  = await fetch('/api/avaliacao')
      const data = await res.json()
      setAvalStats(data.stats ?? null)
      setAvalRatings(data.ratings ?? [])
    } finally {
      setLoadingAval(false)
    }
  }, [])

  const fetchEnquete = useCallback(async () => {
    setLoadingEnquete(true)
    try {
      const res  = await fetch('/api/admin/enquete')
      const data = await res.json()
      setEnquete(data.enquete ?? null)
      setEnqueteResults(data.results ?? [])
    } finally {
      setLoadingEnquete(false)
    }
  }, [])

  const createEnquete = async () => {
    const opts = enqueteOpts.map(o => o.trim()).filter(Boolean)
    if (!enqueteQ.trim() || opts.length < 2) { showToast('Preencha a pergunta e ao menos 2 opções.'); return }
    setSavingEnquete(true)
    try {
      const res = await fetch('/api/admin/enquete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', question: enqueteQ.trim(), options: opts }),
      })
      if (res.ok) {
        setEnqueteQ(''); setEnqueteOpts(['', ''])
        await fetchEnquete()
        showToast('🗳 Enquete criada!')
      }
    } finally {
      setSavingEnquete(false)
    }
  }

  const closeEnquete = async (id: number) => {
    if (!confirm('Encerrar esta enquete?')) return
    await fetch('/api/admin/enquete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close', id }),
    })
    await fetchEnquete()
    showToast('Enquete encerrada.')
  }

  const fetchMusicas = useCallback(async () => {
    setLoadingMusicas(true)
    try { const d = await fetch('/api/admin/musicas').then(r => r.json()); setMusicas(d.musicas ?? []) }
    finally { setLoadingMusicas(false) }
  }, [])

  const fetchDesafios = useCallback(async () => {
    setLoadingDesafios(true)
    try { const d = await fetch('/api/admin/desafios').then(r => r.json()); setDesafios(d.desafios ?? []) }
    finally { setLoadingDesafios(false) }
  }, [])

  const fetchBingo = useCallback(async () => {
    setLoadingBingo(true)
    try { const d = await fetch('/api/admin/bingo').then(r => r.json()); setBingoItems(d.items ?? []) }
    finally { setLoadingBingo(false) }
  }, [])

  const fetchDiario = useCallback(async () => {
    setLoadingDiario(true)
    try { const d = await fetch('/api/admin/diario').then(r => r.json()); setDiarioEntries(d.entries ?? []) }
    finally { setLoadingDiario(false) }
  }, [])

  const fetchRsvp = useCallback(async () => {
    setLoadingRsvp(true)
    try {
      const d = await fetch('/api/rsvp').then(r => r.json()) as { rsvps?: RsvpItem[]; stats?: RsvpStats }
      setRsvpList(d.rsvps ?? [])
      setRsvpStats(d.stats ?? null)
    } finally { setLoadingRsvp(false) }
  }, [])

  const fetchMarcos = useCallback(async () => {
    setLoadingMarcos(true)
    try { const d = await fetch('/api/marcos').then(r => r.json()) as { marcos?: MarcoAdmin[] }; setMarcos(d.marcos ?? []) }
    finally { setLoadingMarcos(false) }
  }, [])

  const fetchMemorias = useCallback(async () => {
    setLoadingMemorias(true)
    try {
      const d = await fetch('/api/memorias').then(r => r.json()) as { subscribers?: MemoriaSubscriber[] }
      setMemorias(d.subscribers ?? [])
    } finally {
      setLoadingMemorias(false)
    }
  }, [])

  const approveAll = async () => {
    if (!confirm('Aprovar TODAS as mídias pendentes de uma vez?')) return
    const res = await fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve_all' }) })
    const d = await res.json() as { count?: number }
    fetchPending(); fetchApproved()
    showToast(`✓ ${d.count ?? 0} mídias aprovadas!`)
  }

  useEffect(() => {
    if (tab === 'settings') refreshCdnStats()
    if (tab === 'store') fetchStore()
    if (tab === 'avaliacao') fetchAvaliacao()
    if (tab === 'enquete') fetchEnquete()
    if (tab === 'musicas') fetchMusicas()
    if (tab === 'desafios') fetchDesafios()
    if (tab === 'bingo') { fetchBingo() }
    if (tab === 'diario') fetchDiario()
    if (tab === 'pwa') { fetch('/api/pwa-session').then(r => r.json()).then(setPwaStats) }
    if (tab === 'rsvp') fetchRsvp()
    if (tab === 'marcos') fetchMarcos()
    if (tab === 'memorias') fetchMemorias()
    if (tab === 'cartoes') {
      fetch('/api/photos?limit=50').then(r => r.json()).then((d: { topAuthors?: { author: string }[] }) => {
        setCartaoAuthors(d.topAuthors?.map((a: { author: string }) => a.author) ?? [])
      }).catch(() => {})
    }
  }, [tab, fetchStore, fetchAvaliacao, fetchEnquete, fetchMusicas, fetchDesafios, fetchBingo, fetchDiario, fetchRsvp, fetchMarcos, fetchMemorias])

  useEffect(() => {
    if (tab !== 'settings') return
    const url = typeof window !== 'undefined' ? window.location.origin : ''
    if (!url) return
    import('qrcode').then(QRCode => {
      if (qrRef.current) {
        QRCode.toCanvas(qrRef.current, url, { width: 220, margin: 2, color: { dark: '#3e2408', light: '#fdf6ee' } }, () => {})
      }
    }).catch(() => {})
  }, [tab])

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
          {pending.length > 0 && <button onClick={approveAll} style={{ ...tabStyle(false), background: '#e8f5e0', borderColor: '#5a9e3a', color: '#3a6d10' }}>✓ Aprovar todas ({pending.length})</button>}
          <button onClick={exportMediaZip} style={tabStyle(false)}>📦 Exportar mídia</button>
          <button onClick={exportTexts} style={tabStyle(false)}>📝 Exportar textos</button>
          <a href="/album-print" target="_blank" style={{ ...tabStyle(false), textDecoration: 'none', display: 'inline-block', lineHeight: 'normal' }}>🖨 Álbum PDF</a>
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
          { key: 'baby', label: '👶 Bebê', count: 0 },
          { key: 'avaliacao', label: '⭐ Avaliações', count: 0 },
          { key: 'enquete', label: '🗳 Enquete', count: 0 },
          { key: 'musicas', label: '🎵 Músicas', count: 0 },
          { key: 'desafios', label: '📸 Desafios', count: 0 },
          { key: 'bingo', label: '🎯 Bingo', count: 0 },
          { key: 'diario', label: '📖 Diário', count: 0 },
          { key: 'settings', label: '⚙ Configurações', count: 0 },
          { key: 'pwa', label: '📱 PWA', count: 0 },
          { key: 'convite', label: '🔗 Convite', count: 0 },
          { key: 'rsvp', label: '📋 RSVP', count: 0 },
          { key: 'marcos', label: '🧸 Marcos', count: 0 },
          { key: 'memorias', label: '📬 Memórias', count: 0 },
          { key: 'cartoes', label: '💌 Cartões', count: 0 },
          { key: 'anunciar', label: '📣 Anunciar', count: 0 },
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

      {tab === 'baby' && (
        <div style={S.card}>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 20, fontWeight: 600 }}>
            👶 Status do Bebê
          </p>

          {/* Baby arrived toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '16px 18px', background: babyBorn ? 'rgba(40,120,40,.08)' : 'rgba(0,0,0,.03)', border: `1px solid ${babyBorn ? 'rgba(40,120,40,.25)' : 'var(--beige)'}`, borderRadius: 14 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, color: 'var(--bd)', marginBottom: 2 }}>José Augusto chegou?</p>
              <p style={{ fontSize: '.82rem', color: 'var(--bl)', fontStyle: 'italic' }}>Ativa o anúncio de chegada em todo o app</p>
            </div>
            <button
              onClick={() => setBabyBorn(v => !v)}
              style={{ padding: '8px 20px', borderRadius: 50, border: 'none', background: babyBorn ? '#3a7d3a' : 'var(--beige)', color: babyBorn ? '#fff' : 'var(--bd)', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', cursor: 'pointer', fontWeight: 600 }}
            >
              {babyBorn ? '✓ Sim!' : 'Não ainda'}
            </button>
          </div>

          {/* Due date */}
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'var(--bl)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              📅 Data prevista do nascimento
            </span>
            <input
              type="date"
              value={babyDueDate}
              onChange={e => setBabyDueDate(e.target.value)}
              style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', width: '100%' }}
            />
            <p style={{ fontSize: '.76rem', color: 'var(--bl)', marginTop: 4, fontStyle: 'italic' }}>Exibe o countdown regressivo na home e palpites</p>
          </label>

          {/* Weight */}
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'var(--bl)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              ⚖️ Peso ao nascer (kg)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={babyWeightKg}
              onChange={e => setBabyWeightKg(e.target.value)}
              placeholder="ex: 3.45"
              style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', width: '100%' }}
            />
          </label>

          {/* Hora */}
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'var(--bl)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              🕐 Hora do nascimento
            </span>
            <input
              type="time"
              value={babyHora}
              onChange={e => setBabyHora(e.target.value)}
              style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', width: '100%' }}
            />
          </label>

          {/* Cabelo */}
          <div style={{ marginBottom: 22 }}>
            <span style={{ fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'var(--bl)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Cabelo ao nascer
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['Sim', 'Pouco', 'Não'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setBabyCabelo(prev => prev === opt ? '' : opt)}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: 12, border: babyCabelo === opt ? '2px solid var(--b)' : '1px solid var(--sand)', background: babyCabelo === opt ? 'var(--beige)' : 'transparent', color: 'var(--bd)', cursor: 'pointer', fontFamily: "'Cormorant Garamond',serif", fontSize: '.9rem', fontWeight: babyCabelo === opt ? 700 : 400 }}
                >
                  {opt === 'Sim' ? '👶' : opt === 'Pouco' ? '🍃' : '🥚'} {opt}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={saveBabyStatus}
            disabled={savingBaby}
            style={{ width: '100%', padding: '13px 20px', background: savingBaby ? 'var(--beige)' : 'linear-gradient(135deg,var(--bd),var(--b))', color: savingBaby ? 'var(--bl)' : '#fff', border: 'none', borderRadius: 12, cursor: savingBaby ? 'not-allowed' : 'pointer', fontFamily: "'Playfair Display',serif", fontSize: '1rem', fontWeight: 600 }}
          >
            {savingBaby ? 'Salvando…' : '💾 Salvar status do bebê'}
          </button>
        </div>
      )}

      {tab === 'musicas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>🎵 Sugestões de Músicas</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 16 }}>Aprove as músicas para exibir na lista pública. As rejeitadas ficam ocultas.</p>
            {loadingMusicas ? <p style={S.empty}>Carregando…</p> : musicas.length === 0 ? <p style={S.empty}>Nenhuma sugestão ainda 🎵</p> : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                {musicas.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `1px solid ${m.approved ? 'var(--beige)' : '#f5d0d0'}`, borderRadius: 14, background: m.approved ? 'var(--cream)' : '#fff8f8' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: 'var(--bd)', fontSize: '.95rem' }}>{m.title} <span style={{ fontWeight: 400, color: 'var(--bl)' }}>— {m.artist}</span></p>
                      <p style={{ fontSize: '.8rem', color: 'var(--bl)' }}>por {m.author} · ♥ {m.votes} votos{m.spotifyUrl ? <> · <a href={m.spotifyUrl} target="_blank" rel="noreferrer" style={{ color: '#1db954' }}>Spotify</a></> : ''}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {!m.approved && <button style={{ ...S.btnApprove, padding: '5px 10px', fontSize: '.8rem' }} onClick={async () => { await fetch('/api/admin/musicas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', id: m.id }) }); fetchMusicas(); showToast('✓ Música aprovada!') }}>✓</button>}
                      {m.approved && <button style={{ ...S.btnDelete, padding: '5px 10px', fontSize: '.8rem' }} onClick={async () => { await fetch('/api/admin/musicas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', id: m.id }) }); fetchMusicas(); showToast('Música ocultada.') }}>✗</button>}
                      <button style={{ ...S.btnDelete, padding: '5px 10px', fontSize: '.8rem' }} onClick={async () => { if (!confirm('Excluir?')) return; await fetch('/api/admin/musicas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: m.id }) }); fetchMusicas(); showToast('🗑 Removida.') }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'desafios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>📸 Criar Desafio</h2>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={{ width: 60, border: '1px solid var(--sand)', borderRadius: 8, padding: '10px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1.2rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none', textAlign: 'center' }} placeholder="📸" value={desafioForm.emoji} onChange={e => setDesafioForm(f => ({ ...f, emoji: e.target.value }))} maxLength={4} />
                <input style={{ flex: 1, border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="Título do desafio *" value={desafioForm.title} onChange={e => setDesafioForm(f => ({ ...f, title: e.target.value }))} maxLength={100} />
              </div>
              <textarea style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none', resize: 'vertical', minHeight: 80 }} placeholder="Descrição do desafio *" value={desafioForm.description} onChange={e => setDesafioForm(f => ({ ...f, description: e.target.value }))} maxLength={300} />
              <button style={S.btnApprove} onClick={async () => {
                if (!desafioForm.title.trim() || !desafioForm.description.trim()) { showToast('Título e descrição obrigatórios'); return }
                setSavingDesafio(true)
                await fetch('/api/admin/desafios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', ...desafioForm }) })
                setDesafioForm({ emoji: '📸', title: '', description: '' }); fetchDesafios(); showToast('📸 Desafio criado!'); setSavingDesafio(false)
              }} disabled={savingDesafio}>{savingDesafio ? 'Criando…' : '+ Criar desafio'}</button>
            </div>
          </div>
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 14 }}>Desafios ativos</h2>
            {loadingDesafios ? <p style={S.empty}>Carregando…</p> : desafios.length === 0 ? <p style={S.empty}>Nenhum desafio criado ainda.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                {desafios.map(d => (
                  <div key={d.id} style={{ display: 'flex', gap: 12, padding: '12px 16px', border: '1px solid var(--beige)', borderRadius: 14, background: 'var(--cream)', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.6rem' }}>{d.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, color: 'var(--bd)', fontSize: '.95rem' }}>{d.title}</p>
                      <p style={{ fontSize: '.82rem', color: 'var(--bl)', fontStyle: 'italic' }}>{d.description}</p>
                      <p style={{ fontSize: '.72rem', color: 'var(--bl)', marginTop: 4 }}>{d.completions} completados</p>
                    </div>
                    <button style={{ ...S.btnDelete, padding: '5px 10px', fontSize: '.8rem' }} onClick={async () => { if (!confirm('Excluir desafio?')) return; await fetch('/api/admin/desafios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: d.id }) }); fetchDesafios(); showToast('🗑 Removido.') }}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'bingo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>🎯 Bingo do Chá</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 16 }}>Marque os itens conforme os presentes são abertos. Os convidados veem em tempo real.</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const }}>
              {bingoItems.length === 0 && (
                <button style={{ ...S.btnApprove, padding: '9px 18px' }} onClick={async () => { await fetch('/api/admin/bingo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seed' }) }); fetchBingo(); showToast('🎯 30 itens padrão adicionados!') }}>
                  🌱 Popular com itens padrão (30)
                </button>
              )}
              <button style={{ ...S.btnDelete, padding: '9px 18px', background: '#fff7e6', color: '#8a6d1f', borderColor: '#f4a623' }} onClick={async () => { if (!confirm('Resetar todos os itens (desmarcar todos)?')) return; await fetch('/api/admin/bingo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset' }) }); fetchBingo(); showToast('↻ Bingo resetado!') }}>↻ Resetar</button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input style={{ width: 60, border: '1px solid var(--sand)', borderRadius: 8, padding: '8px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="🎁" value={bingoForm.emoji} onChange={e => setBingoForm(f => ({ ...f, emoji: e.target.value }))} maxLength={4} />
              <input style={{ flex: 1, border: '1px solid var(--sand)', borderRadius: 8, padding: '8px 12px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="Nome do item" value={bingoForm.label} onChange={e => setBingoForm(f => ({ ...f, label: e.target.value }))} onKeyDown={async e => { if (e.key !== 'Enter' || !bingoForm.label.trim()) return; await fetch('/api/admin/bingo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', label: bingoForm.label.trim(), emoji: bingoForm.emoji }) }); setBingoForm(f => ({ ...f, label: '' })); fetchBingo() }} maxLength={60} />
              <button style={S.btnApprove} onClick={async () => { if (!bingoForm.label.trim()) return; await fetch('/api/admin/bingo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', label: bingoForm.label.trim(), emoji: bingoForm.emoji }) }); setBingoForm(f => ({ ...f, label: '' })); fetchBingo(); showToast('Item adicionado!') }}>+ Add</button>
            </div>
            {loadingBingo ? <p style={S.empty}>Carregando…</p> : bingoItems.length === 0 ? <p style={S.empty}>Nenhum item. Clique em "Popular" para começar!</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 8 }}>
                {bingoItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${item.called ? '#5a9e3a' : 'var(--beige)'}`, borderRadius: 10, background: item.called ? '#e8f5e0' : 'var(--cream)', cursor: 'pointer' }} onClick={async () => { await fetch('/api/admin/bingo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: item.called ? 'uncall' : 'call', id: item.id }) }); fetchBingo() }}>
                    <span style={{ fontSize: '1.1rem' }}>{item.emoji}</span>
                    <span style={{ flex: 1, fontSize: '.85rem', color: 'var(--bd)', fontWeight: item.called ? 700 : 400 }}>{item.label}</span>
                    {item.called && <span style={{ fontSize: '.7rem', color: '#3a6d10' }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: '.76rem', color: 'var(--bl)', marginTop: 12, fontStyle: 'italic' }}>Clique em um item para marcar/desmarcar. Os convidados veem automaticamente.</p>
          </div>
        </div>
      )}

      {tab === 'diario' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>📖 Nova Entrada no Diário</h2>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <input style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '11px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="Título *" value={diarioForm.title} onChange={e => setDiarioForm(f => ({ ...f, title: e.target.value }))} maxLength={120} />
              <textarea style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '11px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none', resize: 'vertical', minHeight: 120, lineHeight: 1.7 }} placeholder="Conte o momento *" value={diarioForm.content} onChange={e => setDiarioForm(f => ({ ...f, content: e.target.value }))} maxLength={2000} />
              <input style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '11px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="URL da foto (opcional)" value={diarioForm.imageUrl} onChange={e => setDiarioForm(f => ({ ...f, imageUrl: e.target.value }))} />
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: '.78rem', color: 'var(--bl)', display: 'block', marginBottom: 4 }}>Data do marco</span>
                <input type="date" style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none', width: '100%' }} value={diarioForm.milestoneDate} onChange={e => setDiarioForm(f => ({ ...f, milestoneDate: e.target.value }))} />
              </label>
              <button style={{ ...S.btnApprove, padding: '11px 24px', fontSize: '.95rem' }} onClick={async () => {
                if (!diarioForm.title.trim() || !diarioForm.content.trim()) { showToast('Título e conteúdo obrigatórios'); return }
                setSavingDiario(true)
                await fetch('/api/admin/diario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', title: diarioForm.title.trim(), content: diarioForm.content.trim(), imageUrl: diarioForm.imageUrl.trim() || null, milestoneDate: diarioForm.milestoneDate || null }) })
                setDiarioForm({ title: '', content: '', imageUrl: '', milestoneDate: '' }); fetchDiario(); showToast('📖 Entrada publicada!'); setSavingDiario(false)
              }} disabled={savingDiario}>{savingDiario ? 'Publicando…' : '📖 Publicar entrada'}</button>
            </div>
          </div>
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 14 }}>Entradas publicadas</h2>
            {loadingDiario ? <p style={S.empty}>Carregando…</p> : diarioEntries.length === 0 ? <p style={S.empty}>Nenhuma entrada ainda.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                {diarioEntries.map(e => (
                  <div key={e.id} style={{ padding: '14px 16px', border: `1px solid ${e.published ? 'var(--beige)' : '#f5d0d0'}`, borderRadius: 14, background: e.published ? 'var(--cream)' : '#fff8f8' }}>
                    {e.imageUrl && <img src={e.imageUrl} alt={e.title} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} onError={ev => { (ev.currentTarget as HTMLImageElement).style.display = 'none' }} />}
                    <p style={{ fontWeight: 700, color: 'var(--bd)', fontSize: '.95rem', marginBottom: 4 }}>{e.title}</p>
                    <p style={{ fontSize: '.85rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>{e.content.slice(0, 100)}{e.content.length > 100 ? '…' : ''}</p>
                    {e.milestoneDate && <p style={{ fontSize: '.72rem', color: 'var(--bl)', marginBottom: 8 }}>📅 {new Date(e.milestoneDate).toLocaleDateString('pt-BR')}</p>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ ...S.btnDelete, flex: 1, fontSize: '.8rem' }} onClick={async () => { if (!confirm('Excluir entrada?')) return; await fetch('/api/admin/diario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: e.id }) }); fetchDiario(); showToast('🗑 Entrada excluída.') }}>🗑 Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'avaliacao' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>⭐ Avaliações do Evento</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>Notas e comentários deixados pelos convidados.</p>
            {loadingAval ? (
              <p style={S.empty}>Carregando…</p>
            ) : avalStats && avalStats.total > 0 ? (
              <>
                {/* Summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '18px 20px', background: 'var(--cream)', borderRadius: 16, marginBottom: 20, flexWrap: 'wrap' as const }}>
                  <div style={{ textAlign: 'center' as const }}>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '3rem', color: 'var(--bd)', lineHeight: 1 }}>{avalStats.avg.toFixed(1)}</p>
                    <p style={{ color: '#f4a623', fontSize: '1.2rem' }}>{'★'.repeat(Math.round(avalStats.avg))}{'☆'.repeat(5 - Math.round(avalStats.avg))}</p>
                    <p style={{ fontSize: '.8rem', color: 'var(--bl)', marginTop: 4 }}>{avalStats.total} avaliações</p>
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    {[5, 4, 3, 2, 1].map(s => {
                      const count = avalStats.distribution[s] ?? 0
                      const pct = avalStats.total > 0 ? Math.round((count / avalStats.total) * 100) : 0
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: '.75rem', color: 'var(--bl)', width: 8 }}>{s}</span>
                          <span style={{ color: '#f4a623', fontSize: '.75rem' }}>★</span>
                          <div style={{ flex: 1, height: 8, background: 'var(--beige)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: '#f4a623', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: '.72rem', color: 'var(--bl)', width: 26, textAlign: 'right' as const }}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* Comments list */}
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                  {avalRatings.map(r => (
                    <div key={r.id} style={{ padding: '12px 16px', border: '1px solid var(--beige)', borderRadius: 14, background: 'var(--cream)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: r.comment ? 6 : 0 }}>
                        <span style={{ color: '#f4a623' }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                        <p style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--bd)' }}>{r.author}</p>
                        <p style={{ fontSize: '.72rem', color: 'var(--bl)', fontStyle: 'italic', marginLeft: 'auto' }}>{new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      {r.comment && <p style={{ fontSize: '.88rem', color: 'var(--bd)', fontStyle: 'italic' }}>"{r.comment}"</p>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={S.empty}>Nenhuma avaliação ainda. ⭐</p>
            )}
          </div>
        </div>
      )}

      {tab === 'enquete' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Create new poll */}
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>🗳 Nova Enquete</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>Crie uma enquete ao vivo que aparece para todos os convidados. Ao criar, a anterior é encerrada automaticamente.</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <input
                style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '11px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none' }}
                placeholder="Pergunta da enquete *"
                value={enqueteQ}
                onChange={e => setEnqueteQ(e.target.value)}
                maxLength={200}
              />
              {enqueteOpts.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ flex: 1, border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none' }}
                    placeholder={`Opção ${i + 1} *`}
                    value={opt}
                    onChange={e => setEnqueteOpts(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                    maxLength={100}
                  />
                  {enqueteOpts.length > 2 && (
                    <button style={{ ...S.btnDelete, minWidth: 36, padding: '0 10px' }} onClick={() => setEnqueteOpts(prev => prev.filter((_, j) => j !== i))}>✕</button>
                  )}
                </div>
              ))}
              {enqueteOpts.length < 6 && (
                <button style={{ ...S.btnApprove, alignSelf: 'flex-start', padding: '7px 16px', fontSize: '.88rem' }} onClick={() => setEnqueteOpts(prev => [...prev, ''])}>+ Opção</button>
              )}
              <button className="btn-primary" onClick={createEnquete} disabled={savingEnquete || !enqueteQ.trim() || enqueteOpts.filter(o => o.trim()).length < 2} style={{ fontSize: '.95rem', justifyContent: 'center' }}>
                {savingEnquete ? 'Criando…' : '🗳 Publicar enquete'}
              </button>
            </div>
          </div>

          {/* Active poll + results */}
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>Enquete Ativa</h2>
            {loadingEnquete ? (
              <p style={S.empty}>Carregando…</p>
            ) : !enquete ? (
              <p style={S.empty}>Nenhuma enquete ativa no momento.</p>
            ) : (
              <div>
                <p style={{ fontWeight: 600, color: 'var(--bd)', fontSize: '1rem', marginBottom: 16 }}>{enquete.question}</p>
                {(() => {
                  const total = enqueteResults.reduce((s, r) => s + r.votes, 0)
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 18 }}>
                      {enqueteResults.map((r, i) => {
                        const pct = total > 0 ? Math.round((r.votes / total) * 100) : 0
                        return (
                          <div key={i} style={{ position: 'relative' as const, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--beige)', background: 'var(--cream)', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute' as const, inset: 0, width: `${pct}%`, background: 'rgba(139,98,66,.08)', borderRadius: 10, transition: 'width .6s ease' }} />
                            <div style={{ position: 'relative' as const, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '.93rem', color: 'var(--bd)' }}>{r.option}</span>
                              <span style={{ fontSize: '.82rem', color: 'var(--bl)', fontWeight: 600 }}>{pct}% · {r.votes} votos</span>
                            </div>
                          </div>
                        )
                      })}
                      <p style={{ fontSize: '.78rem', color: 'var(--bl)', textAlign: 'right' as const }}>{total} votos no total</p>
                    </div>
                  )
                })()}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={{ ...S.btnApprove, flex: 1 }} onClick={fetchEnquete}>↻ Atualizar</button>
                  <button style={{ ...S.btnDelete, flex: 1 }} onClick={() => closeEnquete(enquete.id)}>⏹ Encerrar enquete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* QR Code do Evento */}
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>📲 QR Code do Evento</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>
              Imprima e cole na entrada do salão. Os convidados escaneiam e entram direto no álbum.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 16 }}>
              <canvas
                ref={qrRef}
                style={{ borderRadius: 12, border: '1px solid var(--beige)', padding: 8, background: '#fdf6ee' }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '.88rem' }}
                  onClick={() => {
                    const canvas = qrRef.current
                    if (!canvas) return
                    const link = document.createElement('a')
                    link.download = 'qr-cha-jose-augusto.png'
                    link.href = canvas.toDataURL()
                    link.click()
                  }}
                >
                  ⬇ Baixar PNG
                </button>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '.88rem' }}
                  onClick={() => {
                    try { navigator.clipboard.writeText(window.location.origin) } catch {}
                    showToast('Link copiado!')
                  }}
                >
                  📋 Copiar link
                </button>
              </div>
              <p style={{ fontSize: '.78rem', color: 'var(--text-lo)', fontFamily: 'monospace' }}>
                {typeof window !== 'undefined' ? window.location.origin : ''}
              </p>
            </div>
          </div>

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

      {tab === 'pwa' && (
        <div style={S.card}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>📱 PWA — Instalações e Sessões</h2>
          <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>Rastreamento de instalações do app e sessões standalone.</p>
          {!pwaStats ? (
            <p style={S.empty}>Carregando…</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14, marginBottom: 24 }}>
                <div style={S.statCard}><span style={S.statNum}>{pwaStats.installs}</span><span style={S.statLbl}>Instalações</span></div>
                <div style={S.statCard}><span style={S.statNum}>{pwaStats.sessions}</span><span style={S.statLbl}>Sessões</span></div>
                <div style={S.statCard}><span style={S.statNum}>{pwaStats.devices.length}</span><span style={S.statLbl}>Registros</span></div>
              </div>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', color: 'var(--bd)', marginBottom: 12 }}>Atividade recente</h3>
              {pwaStats.devices.length === 0 ? (
                <p style={S.empty}>Nenhum registro ainda.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {pwaStats.devices.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid var(--beige)', borderRadius: 12, background: 'var(--cream)' }}>
                      <span style={{ fontSize: '1.2rem' }}>{d.event === 'installed' ? '📲' : '📱'}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '.88rem', color: 'var(--bd)', fontWeight: 500 }}>{d.event === 'installed' ? 'Instalação' : 'Sessão'}{d.author ? ` · ${d.author}` : ''}</p>
                        <p style={{ margin: 0, fontSize: '.76rem', color: 'var(--bl)', fontStyle: 'italic' }}>{new Date(d.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'convite' && (() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const conviteUrl = `${origin}/convite`
        const qrSrc = origin ? `/api/qrcode?url=${encodeURIComponent(conviteUrl)}&size=240` : ''
        const copyLink = () => {
          navigator.clipboard.writeText(conviteUrl).then(() => showToast('🔗 Link copiado!')).catch(() => showToast('Erro ao copiar link'))
        }
        return (
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>🔗 Convite Digital</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 24 }}>QR Code e link do convite público para compartilhar com os convidados.</p>

            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 20 }}>
              {qrSrc && (
                <div style={{ background: '#fdf6ee', border: '1px solid var(--beige)', borderRadius: 16, padding: 20, display: 'inline-block' }}>
                  <img src={qrSrc} alt="QR Code do convite" width={240} height={240} style={{ display: 'block' }} />
                </div>
              )}

              <p style={{ fontSize: '.85rem', color: 'var(--bl)', fontStyle: 'italic', wordBreak: 'break-all' as const, textAlign: 'center' as const }}>
                {conviteUrl}
              </p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, justifyContent: 'center' as const }}>
                <button
                  style={S.btnApprove}
                  onClick={() => origin && window.open(`/api/qrcode?url=${encodeURIComponent(conviteUrl)}&size=600`, '_blank')}
                >
                  ⬇ Baixar QR Code (600px)
                </button>
                <button
                  style={{ ...S.btnApprove, background: '#eef1ff', color: '#3d4f9b' }}
                  onClick={() => window.open('/convite', '_blank')}
                >
                  👁 Ver convite
                </button>
                <button style={{ ...S.btnApprove, background: '#fff7d6', color: '#8a6d1f' }} onClick={copyLink}>
                  🔗 Copiar link
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {tab === 'rsvp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stats */}
          {rsvpStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 14 }}>
              <div style={{ ...S.statCard, borderColor: 'rgba(90,158,58,.3)', background: 'rgba(90,158,58,.06)' }}>
                <span style={{ ...S.statNum, color: '#3a6d10' }}>{rsvpStats.confirmed}</span>
                <span style={S.statLbl}>Confirmados</span>
              </div>
              <div style={{ ...S.statCard, borderColor: 'rgba(201,160,32,.3)', background: 'rgba(201,160,32,.06)' }}>
                <span style={{ ...S.statNum, color: '#7a5f10' }}>{rsvpStats.maybe}</span>
                <span style={S.statLbl}>Talvez</span>
              </div>
              <div style={{ ...S.statCard, borderColor: 'rgba(192,57,43,.3)', background: 'rgba(192,57,43,.06)' }}>
                <span style={{ ...S.statNum, color: '#a33' }}>{rsvpStats.declined}</span>
                <span style={S.statLbl}>Não podem</span>
              </div>
              <div style={S.statCard}>
                <span style={S.statNum}>{rsvpStats.total_guests}</span>
                <span style={S.statLbl}>Pessoas esperadas</span>
              </div>
            </div>
          )}
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>📋 Confirmações de Presença</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20 }}>
              {rsvpList.length} {rsvpList.length === 1 ? 'resposta' : 'respostas'} recebidas
            </p>
            {loadingRsvp ? <p style={S.empty}>Carregando…</p> : rsvpList.length === 0
              ? <p style={S.empty}>Nenhuma confirmação ainda 🎀</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {rsvpList.map(item => {
                    const statusColors: Record<string, { bg: string; color: string; label: string }> = {
                      confirmed: { bg: 'rgba(90,158,58,.12)', color: '#3a6d10', label: '✅ Confirmado' },
                      maybe:     { bg: 'rgba(201,160,32,.12)', color: '#7a5f10', label: '🤔 Talvez' },
                      declined:  { bg: 'rgba(192,57,43,.1)', color: '#a33', label: '❌ Não pode' },
                    }
                    const sc = statusColors[item.status] ?? statusColors.confirmed
                    return (
                      <div key={item.id} style={{ padding: '12px 16px', border: '1px solid var(--beige)', borderRadius: 14, background: 'var(--cream)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                              <p style={{ fontWeight: 600, fontSize: '.95rem', color: 'var(--bd)', margin: 0 }}>{item.name}</p>
                              <span style={{ fontSize: '.72rem', padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
                              {(item.status === 'confirmed' || item.status === 'maybe') && (
                                <span style={{ fontSize: '.72rem', color: 'var(--bl)' }}>👥 {item.guests_count} {item.guests_count === 1 ? 'pessoa' : 'pessoas'}</span>
                              )}
                            </div>
                            {item.contact && <p style={{ margin: '0 0 3px', fontSize: '.82rem', color: 'var(--bl)' }}>📞 {item.contact}</p>}
                            {item.message && <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--bd)', fontStyle: 'italic', lineHeight: 1.5 }}>"{item.message}"</p>}
                          </div>
                          <p style={{ margin: 0, fontSize: '.72rem', color: 'var(--bl)', fontStyle: 'italic', flexShrink: 0 }}>
                            {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>
        </div>
      )}

      {tab === 'marcos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Add form */}
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>Adicionar Marco</h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 18 }}>Registre os momentos especiais do José Augusto.</p>

            {/* Suggested chips */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--bl)', fontWeight: 600, marginBottom: 8 }}>Sugestões</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { emoji: '👶', title: 'Chegou ao mundo' },
                  { emoji: '😊', title: 'Primeiro sorriso' },
                  { emoji: '🛁', title: 'Primeiro banho' },
                  { emoji: '💬', title: 'Primeiras palavras' },
                  { emoji: '🦷', title: 'Primeiro dentinho' },
                  { emoji: '👣', title: 'Primeiros passos' },
                  { emoji: '🎂', title: 'Primeiro aniversário' },
                ].map(chip => (
                  <button
                    key={chip.title}
                    type="button"
                    onClick={() => setMarcosForm(f => ({ ...f, emoji: chip.emoji, title: chip.title }))}
                    style={{ padding: '6px 12px', borderRadius: 99, border: '1px solid var(--beige)', background: 'var(--warm)', cursor: 'pointer', fontSize: '.82rem', fontFamily: "'Cormorant Garamond',serif", color: 'var(--bd)' }}
                  >
                    {chip.emoji} {chip.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Emoji picker */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--bl)', fontWeight: 600, marginBottom: 8 }}>Emoji</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['👶','😊','🛁','💬','🦷','👣','🎂','⭐','🌟','🍼','💕','🧸'].map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setMarcosForm(f => ({ ...f, emoji: em }))}
                    style={{ width: 38, height: 38, borderRadius: 10, border: `1.5px solid ${marcosForm.emoji === em ? 'var(--sand)' : 'var(--beige)'}`, background: marcosForm.emoji === em ? 'var(--beige)' : 'var(--warm)', cursor: 'pointer', fontSize: '1.2rem', display: 'grid', placeItems: 'center' }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="Título do marco *" value={marcosForm.title} onChange={e => setMarcosForm(f => ({ ...f, title: e.target.value }))} />
              <input style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} type="date" placeholder="Data *" value={marcosForm.marco_date} onChange={e => setMarcosForm(f => ({ ...f, marco_date: e.target.value }))} />
              <textarea style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none', resize: 'vertical', minHeight: 80 }} placeholder="Descrição (opcional)" value={marcosForm.description} onChange={e => setMarcosForm(f => ({ ...f, description: e.target.value }))} />
              <input style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '.95rem', background: 'var(--cream)', color: 'var(--bd)', outline: 'none' }} placeholder="URL da foto (opcional)" value={marcosForm.photo_url} onChange={e => setMarcosForm(f => ({ ...f, photo_url: e.target.value }))} />
              <button
                style={{ ...S.btnApprove, padding: '11px 24px', fontSize: '.95rem' }}
                disabled={savingMarco || !marcosForm.title.trim() || !marcosForm.marco_date}
                onClick={async () => {
                  setSavingMarco(true)
                  try {
                    const res = await fetch('/api/marcos', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        emoji: marcosForm.emoji,
                        title: marcosForm.title.trim(),
                        marco_date: marcosForm.marco_date,
                        description: marcosForm.description.trim() || undefined,
                        photo_url: marcosForm.photo_url.trim() || undefined,
                      }),
                    })
                    if (res.ok) {
                      setMarcosForm({ emoji: '👶', title: '', marco_date: '', description: '', photo_url: '' })
                      await fetchMarcos()
                      showToast('🧸 Marco adicionado!')
                    } else {
                      const d = await res.json() as { error?: string }
                      showToast(d.error ?? 'Erro ao adicionar marco.')
                    }
                  } finally { setSavingMarco(false) }
                }}
              >
                {savingMarco ? 'Adicionando…' : '+ Adicionar marco'}
              </button>
            </div>
          </div>

          {/* List */}
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>Marcos registrados</h2>
            {loadingMarcos ? <p style={S.empty}>Carregando…</p> : marcos.length === 0
              ? <p style={S.empty}>Nenhum marco registrado ainda 🌸</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                  {marcos.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', border: '1px solid var(--beige)', borderRadius: 14, background: 'var(--cream)' }}>
                      <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>{m.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '.95rem', color: 'var(--bd)' }}>{m.title}</p>
                        <p style={{ margin: 0, fontSize: '.78rem', color: 'var(--bl)', fontStyle: 'italic' }}>{m.marco_date}</p>
                        {m.description && <p style={{ margin: '3px 0 0', fontSize: '.82rem', color: 'var(--bd)', lineHeight: 1.5 }}>{m.description}</p>}
                      </div>
                      <button style={S.btnDelete} onClick={async () => {
                        if (!confirm(`Excluir marco "${m.title}"?`)) return
                        await fetch('/api/marcos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id }) })
                        setMarcos(prev => prev.filter(x => x.id !== m.id))
                        showToast('🗑 Marco removido.')
                      }}>🗑</button>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      )}

      {tab === 'memorias' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 6 }}>
              📬 Memórias Automáticas
            </h2>
            <p style={{ fontSize: '.9rem', color: 'var(--bl)', fontStyle: 'italic', marginBottom: 20, lineHeight: 1.6 }}>
              {loadingMemorias ? 'Carregando…' : `${memorias.length} ${memorias.length === 1 ? 'pessoa inscrita' : 'pessoas inscritas'} para receber memórias`}
            </p>
            <p style={{ fontSize: '.82rem', color: 'var(--bl)', background: 'rgba(201,168,124,.12)', borderRadius: 10, padding: '12px 16px', lineHeight: 1.6, marginBottom: 20 }}>
              💡 As memórias serão enviadas manualmente ou por cron job no 1º aniversário do José Augusto (25/04/2027).
            </p>
            <button
              style={{ ...S.btnApprove, padding: '10px 20px', fontSize: '.9rem', flex: 'none' }}
              onClick={() => {
                if (memorias.length === 0) return
                const csv = ['Nome,Email,Data']
                  .concat(memorias.map(m => `"${m.author}","${m.email}","${m.created_at}"`))
                  .join('\n')
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url  = URL.createObjectURL(blob)
                const a    = document.createElement('a')
                a.href = url; a.download = 'memorias-subscribers.csv'; a.click()
                URL.revokeObjectURL(url)
              }}
            >
              📋 Exportar lista CSV
            </button>
          </div>

          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', color: 'var(--bd)', marginBottom: 16 }}>
              Lista de inscritos
            </h2>
            {loadingMemorias ? (
              <p style={S.empty}>Carregando…</p>
            ) : memorias.length === 0 ? (
              <p style={S.empty}>Nenhum inscrito ainda 🌸</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {memorias.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', border: '1px solid var(--beige)', borderRadius: 14, background: 'var(--cream)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#c9902a,#7a4e28)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '.85rem', fontWeight: 700, flexShrink: 0 }}>
                      {m.author.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '.95rem', color: 'var(--bd)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.author}</p>
                      <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--bl)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</p>
                    </div>
                    <p style={{ fontSize: '.72rem', color: 'var(--bl)', flexShrink: 0 }}>
                      {new Date(m.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'cartoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={S.card}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', color: 'var(--bd)', marginBottom: 16 }}>
              💌 Gerar Cartão de Agradecimento
            </h2>

            {cartaoAuthors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '.85rem', color: 'var(--bl)', marginBottom: 8 }}>Selecionar convidado rapidamente:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {cartaoAuthors.map(a => (
                    <button
                      key={a}
                      onClick={() => setCartaoTo(a)}
                      style={{
                        padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                        border: cartaoTo === a ? '1px solid var(--bl)' : '1px solid var(--sand)',
                        background: cartaoTo === a ? 'var(--beige)' : 'transparent',
                        color: 'var(--b)', fontFamily: "'Cormorant Garamond',serif", fontSize: '.88rem',
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '.85rem', color: 'var(--bl)', display: 'block', marginBottom: 4 }}>Para (nome do convidado)</label>
                <input
                  value={cartaoTo}
                  onChange={e => setCartaoTo(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  style={{ width: '100%', border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '.85rem', color: 'var(--bl)', display: 'block', marginBottom: 4 }}>De (remetente)</label>
                <input
                  value={cartaoFrom}
                  onChange={e => setCartaoFrom(e.target.value)}
                  placeholder="Ex: Fernando & Mariana"
                  style={{ width: '100%', border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '.85rem', color: 'var(--bl)', display: 'block', marginBottom: 4 }}>Mensagem</label>
                <textarea
                  value={cartaoMsg}
                  onChange={e => setCartaoMsg(e.target.value)}
                  rows={4}
                  style={{ width: '100%', border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--cream)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {cartaoTo.trim() && (
            <div style={S.card}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', color: 'var(--bd)', marginBottom: 16 }}>
                Pré-visualização
              </h3>
              <Suspense fallback={<p style={{ color: 'var(--bl)', fontStyle: 'italic' }}>Carregando…</p>}>
                <CartaoAgradecimento
                  toName={cartaoTo.trim()}
                  fromName={cartaoFrom.trim() || 'Fernando & Mariana'}
                  message={cartaoMsg.trim()}
                />
              </Suspense>
            </div>
          )}
        </div>
      )}

      {tab === 'anunciar' && (
        <div style={{ maxWidth: 560 }}>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.15rem', color: 'var(--bd)', fontWeight: 600, marginBottom: 4 }}>📣 Anunciar ao Vivo</p>
          <p style={{ fontSize: '.85rem', color: 'var(--text-lo)', marginBottom: 20, fontStyle: 'italic' }}>
            Envia push notification para todos os convidados e exibe banner na home e no telão em tempo real.
          </p>

          {/* Quick presets */}
          <p style={{ fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-lo)', fontWeight: 600, marginBottom: 10 }}>Mensagens rápidas</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {[
              '📸 Hora da foto oficial! Abra o app!',
              '🎂 O bolo chegou! Vamos cantar!',
              '🎁 Sorteio em 5 minutos! Fique atento!',
              '📷 Missão: foto com os futuros pais!',
              '🎉 Chegou a hora de assinar o livro!',
              '✨ Última chance de enviar fotos!',
            ].map(preset => (
              <button
                key={preset}
                onClick={() => setAnnounceMsg(preset)}
                style={{
                  background: announceMsg === preset ? 'var(--accent)' : 'var(--warm)',
                  border: `1px solid ${announceMsg === preset ? 'var(--accent)' : 'var(--beige)'}`,
                  color: announceMsg === preset ? '#fff' : 'var(--bd)',
                  borderRadius: 20, padding: '7px 14px',
                  fontSize: '.82rem', cursor: 'pointer', transition: 'all .15s',
                }}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Custom message */}
          <p style={{ fontSize: '.78rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-lo)', fontWeight: 600, marginBottom: 8 }}>Mensagem personalizada</p>
          <textarea
            value={announceMsg}
            onChange={e => setAnnounceMsg(e.target.value)}
            placeholder="Digite o anúncio para todos os convidados..."
            maxLength={120}
            rows={3}
            style={{ width: '100%', border: '1px solid var(--sand)', borderRadius: 12, padding: '12px 14px', fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', color: 'var(--bd)', background: 'var(--warm)', outline: 'none', resize: 'vertical', marginBottom: 4 }}
          />
          <p style={{ fontSize: '.78rem', color: 'var(--text-lo)', textAlign: 'right', margin: '0 0 16px' }}>{announceMsg.length}/120</p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={sendAnnounce}
              disabled={!announceMsg.trim() || sendingAnnounce}
              className="btn-primary"
              style={{ flex: 2, justifyContent: 'center' }}
            >
              {sendingAnnounce ? 'Enviando…' : '📣 Anunciar agora'}
            </button>
            <button
              onClick={clearAnnounce}
              disabled={sendingAnnounce}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              🗑 Limpar
            </button>
          </div>

          {announceSuccess && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0f9f4', border: '1px solid #b8dece', borderRadius: 10, color: '#2d6a4f', fontSize: '.88rem' }}>
              ✓ Anúncio enviado com sucesso! Banner ativo por 15 segundos.
            </div>
          )}
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
