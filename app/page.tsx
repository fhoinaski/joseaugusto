'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { GeoStatus, useGeoAccess } from '@/components/GeoAccessProvider'
import Stories, { StoryMediaItem } from '@/components/Stories'
import HeroSection from '@/components/home/HeroSection'
import MediaGallery from '@/components/home/MediaGallery'
import CountdownBanner from '@/components/home/CountdownBanner'
import { vibrateSoft } from '@/lib/ui-feedback'
import { REACTION_EMOJIS } from '@/lib/config'
import AvaliacaoCard from '@/components/AvaliacaoCard'
import EnqueteCard from '@/components/EnqueteCard'
import { useUpload } from '@/components/UploadProvider'

interface MediaItem { id:string; thumbUrl:string; fullUrl:string; author:string; type:'image'|'video'|'audio'; createdAt:string; reactions:Record<string,number> }
interface ToastMsg  { id:string; text:string; thumb?:string }
interface TopAuthor { author:string; score:number }
interface EventComment { mediaId:string; author:string; text:string; createdAt:string }
interface PinnedPayload { pinnedPost?: MediaItem | null; pinnedMediaId?: string; pinnedText?: string }

function getReacted(id:string):string[] { try{ return JSON.parse(localStorage.getItem(`cha_reacted_${id}`)??'[]') }catch{return[]} }
function markReacted(id:string,emoji:string){ const r=getReacted(id); if(!r.includes(emoji))localStorage.setItem(`cha_reacted_${id}`,JSON.stringify([...r,emoji])) }

function GeoBanner({ geoStatus, unlockWithKey }: { geoStatus: GeoStatus; unlockWithKey: (k: string) => Promise<boolean> }) {
  const [key,       setKey]       = useState('')
  const [showKey,   setShowKey]   = useState(false)
  const [keyError,  setKeyError]  = useState(false)

  if (geoStatus === 'allowed' || geoStatus === 'idle' || geoStatus === 'checking') return null

  const tryKey = async () => {
    if (await unlockWithKey(key)) { setKeyError(false) }
    else { setKeyError(true) }
  }

  if (geoStatus === 'observer' && !showKey) {
    return (
      <div className="geo-banner observer">
        <span className="geo-banner-icon">📍</span>
        <p className="geo-banner-text">Modo observador — você está fora do local do evento.</p>
        <button className="geo-banner-key-btn" onClick={() => setShowKey(true)}>Tenho a chave</button>
      </div>
    )
  }

  return (
    <div className="geo-banner key-input">
      <span className="geo-banner-icon">🔑</span>
      <p className="geo-banner-text">Digite a chave de acesso para enviar fotos:</p>
      <div className="geo-banner-row">
        <input className="geo-banner-input" type="text" value={key} onChange={e => setKey(e.target.value)}
          placeholder="Chave de acesso…" onKeyDown={e => e.key === 'Enter' && tryKey()}/>
        <button className="geo-banner-submit" onClick={tryKey}>Entrar</button>
      </div>
      {keyError && <p className="geo-banner-error">Chave incorreta. Tente novamente.</p>}
    </div>
  )
}

async function fetchJsonSafe<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url)
    const text = await res.text()
    if (!text) return fallback
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

// ── Onboarding ────────────────────────────────────────────────────────────
function Onboarding({ onDone }: { onDone:()=>void }) {
  const [hiding, setHiding] = useState(false)
  const finish = () => { setHiding(true); setTimeout(onDone, 600) }
  return (
    <div className={`onboard-overlay${hiding?' hiding':''}`}>
      <span className="onboard-bear">🧸</span>
      <h1 className="onboard-name">José Augusto</h1>
      <p className="onboard-sub">25 de Abril · Chá de Bebê</p>
      <div className="onboard-steps">
        {[['📷','Veja as fotos em tempo real'],['✨','Edite e compartilhe as suas'],['🎉','Acompanhe o evento ao vivo']].map(([icon,text])=>(
          <div key={text} className="onboard-step"><span className="onboard-step-icon">{icon}</span><p className="onboard-step-text">{text}</p></div>
        ))}
      </div>
      <button className="onboard-btn" onClick={finish}>Entrar no álbum</button>
      <p className="onboard-pwa">📲 Adicione à tela inicial para acesso rápido</p>
    </div>
  )
}

// ReactionBar moved to components/home/MediaGallery.tsx

// UploadModal moved to components/home/UploadModal.tsx

// Carousel3D moved to components/home/MediaGallery.tsx

// ── Lightbox ──────────────────────────────────────────────────────────────
function Lightbox({ items, index, onClose, onNav, onReact, simpleMode }:{ items:MediaItem[]; index:number; onClose:()=>void; onNav:(n:number)=>void; onReact:(id:string,emoji:string)=>void; simpleMode?:boolean }) {
  const [displayIdx, setDisplayIdx] = useState(index)
  const [slideDir, setSlideDir]     = useState<'left'|'right'|null>(null)
  const [animating, setAnimating]   = useState(false)
  const [popping,   setPopping]     = useState<string|null>(null)
  const touchStart = useRef<number|null>(null)

  // When index changes externally, trigger slide transition
  useEffect(()=>{
    if(index === displayIdx) return
    const dir = index > displayIdx ? 'left' : 'right'
    setSlideDir(dir)
    setAnimating(true)
    const t = setTimeout(()=>{
      setDisplayIdx(index)
      setSlideDir(null)
      setTimeout(()=>setAnimating(false), 320)
    }, 60)
    return()=>clearTimeout(t)
  },[index, displayIdx])

  useEffect(()=>{
    const fn=(e:KeyboardEvent)=>{ if(e.key==='Escape')onClose(); if(e.key==='ArrowRight')onNav(1); if(e.key==='ArrowLeft')onNav(-1) }
    window.addEventListener('keydown',fn); return()=>window.removeEventListener('keydown',fn)
  },[onClose,onNav])

  const onTS=(e:React.TouchEvent)=>{ touchStart.current=e.touches[0].clientX }
  const onTE=(e:React.TouchEvent)=>{
    if(touchStart.current===null)return
    const diff=touchStart.current-e.changedTouches[0].clientX
    if(Math.abs(diff)>50)onNav(diff>0?1:-1)
    touchStart.current=null
  }

  const item = items[displayIdx] ?? items[index]
  const maxDots = Math.min(items.length, 7)
  const ds = Math.max(0, Math.min(index-3, items.length-maxDots))

  // Slide animation style
  const getSlideStyle = (): React.CSSProperties => {
    if(!animating || !slideDir) return { transition:'transform .35s cubic-bezier(.25,.46,.45,.94), opacity .35s ease', transform:'translateX(0) scale(1)', opacity:1 }
    // Before update: exit current
    if(slideDir==='left')  return { transition:'transform .35s cubic-bezier(.25,.46,.45,.94), opacity .35s ease', transform:'translateX(-8%) scale(.96)', opacity:0 }
    return { transition:'transform .35s cubic-bezier(.25,.46,.45,.94), opacity .35s ease', transform:'translateX(8%) scale(.96)', opacity:0 }
  }

  return (
    <div className="lightbox" onClick={onClose} onTouchStart={onTS} onTouchEnd={onTE}>
      <button className="lightbox-close" onClick={e=>{e.stopPropagation();onClose()}}>✕</button>
      <button className={`lightbox-nav lightbox-prev${simpleMode?' lb-simple-nav':''}`} disabled={index===0} onClick={e=>{e.stopPropagation();onNav(-1)}}>{simpleMode?'← Anterior':'‹'}</button>
      <button className={`lightbox-nav lightbox-next${simpleMode?' lb-simple-nav':''}`} disabled={index===items.length-1} onClick={e=>{e.stopPropagation();onNav(1)}}>{simpleMode?'Próximo →':'›'}</button>

      <div className="lightbox-content" onClick={e=>e.stopPropagation()}>
        <div style={{...getSlideStyle(), display:'flex', flexDirection:'column', alignItems:'center', gap:12}}>
          {item.type==='video'
            ?<video src={item.fullUrl} className="lightbox-media" controls autoPlay/>
            :item.type==='audio'
              ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'32px 16px',background:'linear-gradient(135deg,#f5ede0,#e8d4b8)',borderRadius:16,width:'100%',maxWidth:400}}>
                 <span style={{fontSize:'4rem'}}>🎙️</span>
                 <p style={{fontFamily:'var(--serif)',fontSize:'1.1rem',color:'var(--text-md)',textAlign:'center'}}>Mensagem de voz de<br/><strong>{item.author}</strong></p>
                 <audio src={item.fullUrl} controls autoPlay style={{width:'100%'}}/>
               </div>
              :<img src={item.fullUrl} alt={item.author} className="lightbox-media"/>
          }
          <p className="lightbox-caption">
            {item.type==='video'?'🎥':item.type==='audio'?'🎙️':'📷'} {item.author} · {new Date(item.createdAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})}
          </p>
          <div className="lb-reactions">
            {REACTION_EMOJIS.map(emoji=>{
              const reacted=typeof window!=='undefined'&&getReacted(item.id).includes(emoji)
              const count=item.reactions[emoji]??0
              return (
                <button key={emoji}
                  className={`lb-reaction-btn${reacted?' reacted':''}${popping===emoji?' popping':''}`}
                  onClick={()=>{
                    if(reacted)return
                    setPopping(emoji); setTimeout(()=>setPopping(null),400)
                    onReact(item.id,emoji)
                  }}>
                  <span className="lb-reaction-emoji">{emoji}</span>
                  {count>0&&<span className="lb-reaction-count">{count}</span>}
                </button>
              )
            })}
          </div>

          {/* Download + Share */}
          {item.type!=='audio'&&(
            <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap' as const}}>
              <a
                href={`/api/download?url=${encodeURIComponent(item.fullUrl)}`}
                download
                onClick={e=>e.stopPropagation()}
                style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.12)',border:'1.5px solid rgba(255,255,255,.22)',borderRadius:50,color:'#fff',padding:'8px 18px',fontSize:'.84rem',fontWeight:600,textDecoration:'none',letterSpacing:'.02em'}}
              >
                ⬇ Baixar
              </a>
              {typeof navigator!=='undefined'&&'share' in navigator&&(
                <button
                  onClick={e=>{
                    e.stopPropagation()
                    navigator.share({title:`Foto de ${item.author} — Chá do José Augusto`,url:item.fullUrl}).catch(()=>{})
                  }}
                  style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.12)',border:'1.5px solid rgba(255,255,255,.22)',borderRadius:50,color:'#fff',padding:'8px 18px',fontSize:'.84rem',fontWeight:600,cursor:'pointer',letterSpacing:'.02em'}}
                >
                  🔗 Compartilhar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {items.length>1&&(
        <div className="lightbox-counter">
          {Array.from({length:maxDots},(_,i)=>ds+i).map(i=>(
            <div key={i} className={`lightbox-dot${i===index?' active':''}`}/>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────
function ToastManager({ toasts, onRemove }:{ toasts:ToastMsg[]; onRemove:(id:string)=>void }) {
  return (
    <div className="toast-container">
      {toasts.map(t=>(
        <div key={t.id} className="toast-item" onClick={()=>onRemove(t.id)}>
          {t.thumb&&<img src={t.thumb} alt="" className="toast-photo"/>}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}

// ── PWA Banner ────────────────────────────────────────────────────────────
function PWABanner() {
  const [show,setShow]=useState(false)
  useEffect(()=>{
    const h=()=>setShow(true)
    window.addEventListener('beforeinstallprompt',h)
    return()=>window.removeEventListener('beforeinstallprompt',h)
  },[])
  if(!show)return null
  return (
    <div className="pwa-banner">
      <span className="pwa-banner-icon">📱</span>
      <div className="pwa-banner-text">
        <p className="pwa-banner-title">Instalar o app</p>
        <p className="pwa-banner-sub">Use o menu do navegador para instalar na tela inicial</p>
      </div>
      <button className="pwa-banner-btn" onClick={()=>setShow(false)}>Ok</button>
      <button className="pwa-dismiss" onClick={()=>setShow(false)}>✕</button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function Home() {
  const [showOnboard, setShowOnboard]  = useState(false)
  const [media,       setMedia]        = useState<MediaItem[]>([])
  const [loading,     setLoading]      = useState(true)
  const [nextCursor,  setNextCursor]   = useState<string|null>(null)
  const [lbIdx,       setLbIdx]        = useState<number|null>(null)
  const [showAll,     setShowAll]      = useState(false)
  const [toasts,      setToasts]       = useState<ToastMsg[]>([])
  const [topAuthors,  setTopAuthors]   = useState<TopAuthor[]>([])
  const [recentComments, setRecentComments] = useState<EventComment[]>([])
  const [parentsMsg,  setParentsMsg]   = useState('')
  const [pinnedPost,  setPinnedPost]   = useState<MediaItem | null>(null)
  const [pinnedText,  setPinnedText]   = useState('')
  const [savedAuthor, setSavedAuthor]  = useState('')
  const [eventStats,  setEventStats]   = useState<{photos:number; reactions:number; comments:number; authors:number} | null>(null)
  const { geoStatus, canWrite, unlockWithKey } = useGeoAccess()
  const { openUpload } = useUpload()
  const lastRtTs  = useRef<number>(0)
  const mediaRef = useRef<MediaItem[]>([])
  const authorRef = useRef('')
  const recentFetchAtRef = useRef(0)
  const sentinelRef= useRef<HTMLDivElement>(null)
  const obsRef     = useRef<IntersectionObserver|null>(null)

  useEffect(()=>{
    if(typeof window==='undefined')return
    if(!localStorage.getItem('cha_visited'))setShowOnboard(true)
    setSavedAuthor(localStorage.getItem('cha_author')?? '')
  },[])

  useEffect(()=>{ mediaRef.current = media },[media])
  useEffect(()=>{ authorRef.current = savedAuthor },[savedAuthor])

  const fetchMedia=useCallback(async(cursor?:string)=>{
    const data=await fetchJsonSafe<{ media?: MediaItem[]; nextCursor?: string | null; topAuthors?: TopAuthor[] } & PinnedPayload>(
      cursor?`/api/photos?cursor=${cursor}`:'/api/photos',
      {},
    )
    setMedia(prev=>cursor?[...prev,...(data.media??[])]:(data.media??[]))
    if (!cursor) {
      setTopAuthors(data.topAuthors??[])
      setPinnedPost(data.pinnedPost ?? null)
      setPinnedText(data.pinnedText ?? '')
    }
    setNextCursor(data.nextCursor??null)
    setLoading(false)
  },[])

  useEffect(()=>{fetchMedia()},[fetchMedia])

  // Refresh gallery when an upload completes anywhere in the app
  useEffect(() => {
    const onUploadSuccess = (e: Event) => {
      const { author, thumb } = (e as CustomEvent<{ author: string; thumb: string }>).detail ?? {}
      if (author && author !== 'Convidado') setSavedAuthor(author)
      const id = Math.random().toString(36).slice(2)
      const text = author && author !== 'Convidado' ? `${author} enviou uma foto! 🌸` : 'Nova foto no álbum! 🌸'
      setToasts(prev => [...prev.slice(-2), { id, text, thumb }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
      setTimeout(() => fetchMedia(), 2000)
    }
    window.addEventListener('cha:upload-success', onUploadSuccess)
    return () => window.removeEventListener('cha:upload-success', onUploadSuccess)
  }, [fetchMedia])

  const fetchRecentComments = useCallback(async () => {
    const ids = media.slice(0, 6).map(m => m.id)
    if (ids.length === 0) { setRecentComments([]); return }
    try {
      const groups = await Promise.all(ids.map(async mediaId => {
        const res = await fetch(`/api/comments?media_id=${encodeURIComponent(mediaId)}`)
        const data = await res.json() as { comments?: Array<{ id: number; author: string; text: string; createdAt: string }> }
        const comments = Array.isArray(data.comments) ? data.comments : []
        const latest = comments[comments.length - 1]
        if (!latest) return null
        return { mediaId, author: latest.author, text: latest.text, createdAt: latest.createdAt }
      }))
      const sorted = groups.filter(Boolean).sort((a, b) => +new Date((b as EventComment).createdAt) - +new Date((a as EventComment).createdAt))
      setRecentComments(sorted.slice(0, 6) as EventComment[])
    } catch {
      setRecentComments([])
    }
  }, [media])

  useEffect(() => {
    fetchRecentComments()
  }, [fetchRecentComments])

  useEffect(()=>{
    if(!sentinelRef.current||!nextCursor)return
    obsRef.current?.disconnect()
    const obs=new IntersectionObserver(entries=>{if(entries[0].isIntersecting)fetchMedia(nextCursor!)},{rootMargin:'400px'})
    obs.observe(sentinelRef.current); obsRef.current=obs
    return()=>obs.disconnect()
  },[nextCursor,fetchMedia])

  useEffect(()=>{
    fetchJsonSafe<{ message?: string }>('/api/admin/message', {}).then(d=>setParentsMsg(d.message??''))
    fetchJsonSafe<{ photos?:number; reactions?:number; comments?:number; authors?:number }>('/api/stats', {}).then(d=>{
      if(d.photos !== undefined) setEventStats({ photos: d.photos??0, reactions: d.reactions??0, comments: d.comments??0, authors: d.authors??0 })
    })
  },[])

  useEffect(()=>{
    // Seed the last-known timestamp so we don't fire stale toasts on reconnect
    fetchJsonSafe<{ data?: { ts?: number } }>('/api/realtime', {}).then(({data})=>{if(data?.ts)lastRtTs.current=data.ts})

    const handleNewPhoto=(data:any)=>{
      if(!data?.ts||data.ts<=lastRtTs.current||data.ts<=Date.now()-30000)return
      lastRtTs.current=data.ts
      const id=Math.random().toString(36).slice(2)
      const text=data.author!=='Convidado'?`${data.author} adicionou uma foto! 📷`:'Nova foto adicionada! 📷'
      setToasts(prev=>[...prev.slice(-2),{id,text,thumb:data.thumbUrl}])
      setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),4500)
      setTimeout(()=>fetchMedia(),2000)
    }

    const refreshRecentComments = () => {
      const now = Date.now()
      if (now - recentFetchAtRef.current < 5000) return
      recentFetchAtRef.current = now
      fetchRecentComments()
    }

    // Fallback polling — used when EventSource is unavailable or times out
    let fallback:ReturnType<typeof setInterval>|null=null
    const startFallback=()=>{
      if(fallback)return
      fallback=setInterval(async()=>{
        const { data } = await fetchJsonSafe<{ data?: any }>('/api/realtime', {})
        handleNewPhoto(data)
      },25000)
    }

    if(typeof EventSource==='undefined'){
      startFallback()
      return()=>{if(fallback)clearInterval(fallback)}
    }

    let es=new EventSource('/api/stream')

    // If SSE hasn't confirmed connection within 5s, fall back to polling
    let fbTimer:ReturnType<typeof setTimeout>|null=setTimeout(()=>{
      if(es.readyState!==EventSource.OPEN){es.close();startFallback()}
    },5000)

    es.addEventListener('ping',()=>{
      if(fbTimer){clearTimeout(fbTimer);fbTimer=null}
    })
    es.addEventListener('new-photo',(e:MessageEvent)=>{
      try{handleNewPhoto(JSON.parse(e.data))}catch{}
    })
    es.addEventListener('reaction-update',(e:MessageEvent)=>{
      try {
        const event = JSON.parse(e.data) as { mediaId?: string; emoji?: string }
        if (!event.mediaId || !event.emoji) return
        setMedia(prev => prev.map(m => m.id === event.mediaId
          ? { ...m, reactions: { ...m.reactions, [event.emoji!]: (m.reactions[event.emoji!] ?? 0) + 1 } }
          : m,
        ))
        if (!authorRef.current) return
        const target = mediaRef.current.find(m => m.id === event.mediaId)
        if (target && target.author === authorRef.current) {
          addToast(`Sua foto recebeu ${event.emoji ?? 'uma reação'} 💛`, target.thumbUrl)
        }
      } catch {}
    })
    es.addEventListener('comment-update',()=>{
      refreshRecentComments()
    })
    es.addEventListener('message-update',(e:MessageEvent)=>{
      try{const{message}=JSON.parse(e.data);if(message)setParentsMsg(message)}catch{}
    })

    return()=>{
      es.close()
      if(fallback)clearInterval(fallback)
      if(fbTimer)clearTimeout(fbTimer)
    }
  },[fetchMedia])

  useEffect(()=>{
    if(loading)return
    const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.08})
    document.querySelectorAll('.reveal').forEach(el=>obs.observe(el))
    return()=>obs.disconnect()
  },[loading])

  const addToast=(text:string,thumb?:string)=>{
    const id=Math.random().toString(36).slice(2)
    setToasts(prev=>[...prev.slice(-2),{id,text,thumb}])
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),4000)
  }

  const handleReact=useCallback(async(id:string,emoji:string)=>{
    const reacted=getReacted(id)
    if(reacted.includes(emoji))return
    markReacted(id,emoji)
    vibrateSoft(18)
    // Optimistic update
    setMedia(prev=>prev.map(m=>m.id===id?{...m,reactions:{...m.reactions,[emoji]:(m.reactions[emoji]??0)+1}}:m))
    addToast(`Voce reagiu com ${emoji}`)
    try{
      await fetch('/api/react',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,emoji})})
    }catch{}
  },[])

  return (
    <>
      <div id="topo"/>
      {[['5%','18s','0s'],['88%','22s','7s'],['48%','20s','13s']].map(([l,d,delay],i)=>(
        <div key={i} className="balloon" style={{left:l,animationDuration:d,animationDelay:delay}}>🎈</div>
      ))}

      {showOnboard&&<Onboarding onDone={()=>{localStorage.setItem('cha_visited','1');setShowOnboard(false)}}/>}
      <GeoBanner geoStatus={geoStatus} unlockWithKey={unlockWithKey}/>

      <HeroSection media={media} />

      {/* ── Ações principais ── */}
      <div style={{ padding: '0 16px 20px', maxWidth: 560, margin: '0 auto', display: 'flex', gap: 10 }}>
        <button
          onClick={openUpload}
          style={{
            flex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #c47a3a, #7a4e28)',
            border: 'none',
            borderRadius: 16,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(196,122,58,.30)',
            fontFamily: "'Cormorant Garamond',serif",
            color: '#fff',
          }}
        >
          <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>📷</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Enviar foto</p>
            <p style={{ margin: 0, fontSize: '.76rem', opacity: .82, marginTop: 1 }}>ou vídeo</p>
          </div>
        </button>
        <a
          href="#galeria"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '14px 10px',
            background: 'var(--cream)',
            border: '1.5px solid var(--beige)',
            borderRadius: 16,
            textDecoration: 'none',
            color: 'var(--bd)',
            boxShadow: '0 2px 8px rgba(139,98,66,.08)',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🖼️</span>
          <span style={{ fontSize: '.78rem', fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, color: 'var(--b)' }}>Álbum ao vivo</span>
        </a>
      </div>

      {/* Stories bar */}
      {media.length > 0 && (
        <Stories items={media as StoryMediaItem[]} />
      )}

      <div className="leaves">🌿 🌸 🌿 🌸 🌿</div>

      {/* Countdown / Baby Arrival */}
      <div style={{ padding: '0 16px', marginBottom: 4 }}>
        <CountdownBanner />
      </div>

      {/* Party stats bar */}
      {eventStats && (
        <div className="event-stats-bar reveal">
          {[
            { num: eventStats.photos,    lbl: 'fotos',       icon: '📷' },
            { num: eventStats.reactions, lbl: 'reações',     icon: '❤' },
            { num: eventStats.comments,  lbl: 'comentários', icon: '💬' },
            { num: eventStats.authors,   lbl: 'convidados',  icon: '👥' },
          ].map(({ num, lbl, icon }) => (
            <div key={lbl} className="event-stat">
              <span className="event-stat-icon">{icon}</span>
              <span className="event-stat-num">{num}</span>
              <span className="event-stat-lbl">{lbl}</span>
            </div>
          ))}
        </div>
      )}

      {parentsMsg&&(
        <div className="parents-section reveal">
          <p className="section-label">✦ Uma mensagem de amor ✦</p>
          <div className="parents-card">
            <p className="parents-quote">{parentsMsg}</p>
            <p className="parents-sig">— papai e mamãe e maninha</p>
          </div>
        </div>
      )}

      {(pinnedPost || pinnedText.trim()) && (
        <section className="social-pinned reveal" id="feed">
          <div className="social-pinned-head">
            <p className="section-label">✦ Destaque do Feed ✦</p>
            <span className="social-pinned-badge">📌 fixado pelo admin</span>
          </div>
          {!!pinnedText.trim() && (
            <div className="social-text-card">
              <p>{pinnedText}</p>
            </div>
          )}
          {pinnedPost && (
            <article className="social-media-card" onClick={() => {
              const idx = media.findIndex(m => m.id === pinnedPost.id)
              setLbIdx(idx >= 0 ? idx : 0)
            }}>
              <div className="social-media-top">
                <strong>{pinnedPost.author}</strong>
                <span>{new Date(pinnedPost.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
              </div>
              <img src={pinnedPost.thumbUrl} alt={pinnedPost.author} loading="lazy" className="social-media-image"/>
              <div className="social-media-actions">
                {REACTION_EMOJIS.map(emoji => (
                  <button
                    key={`pinned-${pinnedPost.id}-${emoji}`}
                    className="social-action-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReact(pinnedPost.id, emoji)
                    }}
                  >
                    <span>{emoji}</span>
                    <small>{pinnedPost.reactions?.[emoji] ?? 0}</small>
                  </button>
                ))}
              </div>
            </article>
          )}
        </section>
      )}

      <MediaGallery
        loading={loading}
        media={media}
        showAll={showAll}
        setShowAll={setShowAll}
        setLbIdx={setLbIdx}
        handleReact={handleReact}
        sentinelRef={sentinelRef}
      />

      {recentComments.length > 0 && (
        <section id="comentarios-evento" className="parents-section reveal" style={{marginTop:14}}>
          <p className="section-label">✦ Últimas interações ✦</p>
          <div className="parents-card" style={{padding:'14px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <strong style={{color:'var(--bd)',fontSize:'.9rem'}}>Comentários em tempo real</strong>
              <a href="/feed" style={{fontSize:'.84rem',color:'var(--bl)'}}>ver feed ↗</a>
            </div>
            <div style={{display:'grid',gap:8}}>
              {recentComments.map((c, idx) => (
                <div key={`${c.mediaId}-${idx}`} style={{padding:'8px 10px',borderRadius:10,background:'rgba(245,237,224,.7)',border:'1px solid rgba(201,168,124,.25)'}}>
                  <p style={{margin:'0 0 2px',fontSize:'.82rem',color:'var(--b)'}}><strong>{c.author}</strong> comentou</p>
                  <p style={{margin:0,color:'var(--bd)',fontSize:'.9rem'}}>{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Info */}
      <div className="info-strip reveal">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-icon">📅</span>
            <p className="info-lbl">Data</p>
            <p className="info-val">25 de Abril<br/><small style={{fontSize:'.84rem',color:'var(--text-lo)',fontWeight:500}}>Sábado, 17h</small></p>
          </div>
          <div className="info-item">
            <span className="info-icon">📍</span>
            <p className="info-lbl">Local</p>
            <p className="info-val" style={{fontSize:'.92rem'}}>Salão Alto dos Ingleses<br/><small style={{fontSize:'.8rem',color:'var(--text-lo)',fontWeight:500}}>Rod. João Gualberto, 1836 · Floripa</small></p>
          </div>
        </div>
      </div>

      {/* ── Enquete ao Vivo ── */}
      <div className="reveal" style={{ padding: '0 16px', marginBottom: 8, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
        <EnqueteCard />
      </div>

      {/* ── Avaliação do Evento ── */}
      <div className="reveal" style={{ padding: '0 16px', marginBottom: 8 }}>
        <AvaliacaoCard />
      </div>

      <footer className="reveal">
        <span className="footer-bear">🧸</span>
        <p className="footer-text">Bem-vindo ao mundo, José Augusto</p>
        <div style={{width:80,height:1.5,background:'linear-gradient(to right,transparent,var(--accent),transparent)',margin:'16px auto'}}/>
        <p className="footer-sub">com muito amor · papai e mamãe e maninha</p>
      </footer>

      {lbIdx!==null&&(
        <Lightbox items={media} index={lbIdx} onClose={()=>setLbIdx(null)}
          onNav={d=>setLbIdx(prev=>prev!==null?Math.max(0,Math.min(media.length-1,prev+d)):null)}
          onReact={handleReact}/>
      )}

      <ToastManager toasts={toasts} onRemove={id=>setToasts(prev=>prev.filter(t=>t.id!==id))}/>
      <PWABanner/>
    </>
  )
}
