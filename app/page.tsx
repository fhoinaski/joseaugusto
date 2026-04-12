'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

interface MediaItem { id:string; thumbUrl:string; fullUrl:string; author:string; type:'image'|'video'; createdAt:string; reactions:Record<string,number> }
interface ToastMsg  { id:string; text:string; thumb?:string }

const REACTION_EMOJIS = ['♥','😍','🎉','👶']

function getReacted(id:string):string[] { try{ return JSON.parse(localStorage.getItem(`cha_reacted_${id}`)??'[]') }catch{return[]} }
function markReacted(id:string,emoji:string){ const r=getReacted(id); if(!r.includes(emoji))localStorage.setItem(`cha_reacted_${id}`,JSON.stringify([...r,emoji])) }
interface FilterDef { id:string; label:string; css:string }

const FILTERS: FilterDef[] = [
  { id:'normal',   label:'Original',  css:'none' },
  { id:'vivid',    label:'Vívido',    css:'saturate(1.6) contrast(1.1)' },
  { id:'warm',     label:'Quente',    css:'sepia(0.3) saturate(1.4) brightness(1.05)' },
  { id:'cool',     label:'Frio',      css:'hue-rotate(20deg) saturate(1.2) brightness(1.05)' },
  { id:'vintage',  label:'Vintage',   css:'sepia(0.5) contrast(0.9) brightness(0.95) saturate(0.8)' },
  { id:'dramatic', label:'Dramático', css:'contrast(1.3) saturate(1.3) brightness(0.9)' },
  { id:'soft',     label:'Suave',     css:'brightness(1.08) contrast(0.92) saturate(0.9)' },
  { id:'bw',       label:'P&B',       css:'grayscale(1) contrast(1.1)' },
  { id:'fade',     label:'Desbotado', css:'brightness(1.15) contrast(0.85) saturate(0.7)' },
  { id:'golden',   label:'Dourado',   css:'sepia(0.6) brightness(1.1) saturate(1.3)' },
]

// ── Helpers ───────────────────────────────────────────────────────────────
async function compressImage(file: File, maxPx = 1800, q = 0.88): Promise<Blob> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width: w, height: h } = img
      const ratio = Math.min(maxPx / w, maxPx / h)
      if (ratio < 1) { w = Math.round(w * ratio); h = Math.round(h * ratio) }
      const cv = document.createElement('canvas')
      cv.width = w; cv.height = h
      cv.getContext('2d')!.drawImage(img, 0, 0, w, h)
      cv.toBlob(b => resolve(b || file), 'image/jpeg', q)
    }
    img.onerror = () => resolve(file)
    img.src = url
  })
}

// ── Onboarding ────────────────────────────────────────────────────────────
function Onboarding({ onDone }: { onDone:()=>void }) {
  const [hiding, setHiding] = useState(false)
  const finish = () => { setHiding(true); setTimeout(onDone, 600) }
  return (
    <div className={`onboard-overlay${hiding?' hiding':''}`}>
      <span className="onboard-bear">🐻</span>
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

// ── Reaction Bar (gallery cards) ──────────────────────────────────────────
function ReactionBar({ item, onReact }:{ item:MediaItem; onReact:(id:string,emoji:string)=>void }) {
  const hasAny = REACTION_EMOJIS.some(e=>(item.reactions[e]??0)>0)
  if(!hasAny) return null
  return (
    <div className="reaction-bar" onClick={e=>e.stopPropagation()}>
      {REACTION_EMOJIS.filter(e=>(item.reactions[e]??0)>0).map(emoji=>(
        <button key={emoji} className="reaction-pill" onClick={()=>onReact(item.id,emoji)}>
          {emoji} <span>{item.reactions[emoji]}</span>
        </button>
      ))}
    </div>
  )
}

// ── Photo Editor ──────────────────────────────────────────────────────────
function PhotoEditor({ file, onConfirm, onCancel }: { file:File; onConfirm:(b:Blob)=>void; onCancel:()=>void }) {
  const cvRef   = useRef<HTMLCanvasElement>(null)
  const imgRef  = useRef<HTMLImageElement|null>(null)
  const prevs   = useRef<HTMLCanvasElement[]>([])
  const [filter,setBrightness2] = useState('normal')
  const [brightness,setBrightness] = useState(100)
  const [contrast, setContrast]   = useState(100)
  const [saturation,setSat]       = useState(100)
  const [ready,setReady]          = useState(false)

  const css = useCallback((f:string,b:number,c:number,s:number) => {
    const base = FILTERS.find(x=>x.id===f)?.css ?? 'none'
    return `${base} brightness(${b}%) contrast(${c}%) saturate(${s}%)`
  },[])

  const draw = useCallback(()=>{
    const cv=cvRef.current; const img=imgRef.current
    if(!cv||!img) return
    const ctx=cv.getContext('2d')!
    cv.width=img.naturalWidth; cv.height=img.naturalHeight
    ctx.filter=css(filter,brightness,contrast,saturation)
    ctx.drawImage(img,0,0)
  },[filter,brightness,contrast,saturation,css])

  useEffect(()=>{
    const url=URL.createObjectURL(file)
    const img=new Image()
    img.onload=()=>{
      imgRef.current=img; setReady(true)
      FILTERS.forEach((f,i)=>{
        const c=prevs.current[i]; if(!c)return
        const ctx=c.getContext('2d')!
        c.width=80; c.height=80
        ctx.filter=f.css; ctx.drawImage(img,0,0,80,80)
      })
    }
    img.src=url
    return()=>URL.revokeObjectURL(url)
  },[file])

  useEffect(()=>{ if(ready)draw() },[draw,ready])

  const confirm=()=> cvRef.current?.toBlob(b=>{ if(b)onConfirm(b) },'image/jpeg',.92)

  return (
    <div className="editor-wrap">
      <div className="editor-canvas-wrap">
        {!ready && <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div className="preview-spinner"/></div>}
        <canvas ref={cvRef} style={{opacity:ready?1:0,transition:'opacity .3s'}}/>
      </div>
      <div className="filters-row">
        {FILTERS.map((f,i)=>(
          <button key={f.id} className={`filter-btn${filter===f.id?' active':''}`} onClick={()=>setBrightness2(f.id)}>
            <canvas ref={el=>{if(el)prevs.current[i]=el}} className="filter-preview"/>
            <span className="filter-name">{f.label}</span>
          </button>
        ))}
      </div>
      <div className="adjust-row">
        {[{l:'Brilho',v:brightness,s:setBrightness,min:50,max:150},{l:'Contraste',v:contrast,s:setContrast,min:50,max:150},{l:'Saturação',v:saturation,s:setSat,min:0,max:200}].map(({l,v,s,min,max})=>(
          <div key={l} className="adjust-item">
            <label><span>{l}</span><span>{v}%</span></label>
            <input type="range" min={min} max={max} value={v} step={1} onChange={e=>s(Number(e.target.value))}/>
          </div>
        ))}
      </div>
      <div className="editor-actions">
        <button className="btn-secondary" onClick={onCancel} style={{fontSize:'.9rem',padding:'10px 16px'}}>← Voltar</button>
        <button className="btn-primary" onClick={confirm} style={{fontSize:'.9rem',padding:'10px 20px',flex:2,justifyContent:'center'}}>✓ Usar esta foto</button>
      </div>
    </div>
  )
}

// ── Upload Modal ──────────────────────────────────────────────────────────
interface QItem { file:Blob; name:string; preview:string; status:'waiting'|'uploading'|'done'|'error'; progress:number; error?:string; type:'image'|'video' }

function UploadModal({ onClose, onSuccess, authorDefault }:{ onClose:()=>void; onSuccess:(a:string,t:string)=>void; authorDefault:string }) {
  const [author,setAuthor]   = useState(authorDefault)
  const [step,setStep]       = useState<'source'|'loading'|'edit'|'queue'>('source')
  const [editFile,setEditFile]= useState<File|null>(null)
  const [queue,setQueue]     = useState<QItem[]>([])
  const [uploading,setUploading]= useState(false)
  const [compPct,setCompPct] = useState(0)
  const fileRef=useRef<HTMLInputElement>(null)
  const camRef =useRef<HTMLInputElement>(null)
  const vidRef =useRef<HTMLInputElement>(null)
  const allDone = queue.length>0 && queue.every(q=>q.status==='done'||q.status==='error')

  const handleImgFiles=async(files:FileList|null)=>{
    if(!files||!files[0])return
    if(files.length===1&&files[0].type.startsWith('image/')){
      setStep('loading'); setCompPct(0)
      const interval=setInterval(()=>setCompPct(p=>Math.min(p+20,90)),80)
      setEditFile(files[0])
      clearInterval(interval); setCompPct(100)
      setTimeout(()=>setStep('edit'),150)
    } else {
      setStep('loading')
      const items:QItem[]=[]
      for(let i=0;i<files.length;i++){
        const f=files[i]; setCompPct(Math.round(((i+1)/files.length)*100))
        const isImg=f.type.startsWith('image/')
        const blob=isImg?await compressImage(f,1800):f
        items.push({file:blob,name:f.name,preview:URL.createObjectURL(blob),status:'waiting',progress:0,type:isImg?'image':'video'})
      }
      setQueue(items); setStep('queue')
    }
  }

  const handleEditorConfirm=async(blob:Blob)=>{
    setStep('loading'); setCompPct(0)
    const iv=setInterval(()=>setCompPct(p=>Math.min(p+25,90)),80)
    await new Promise(r=>setTimeout(r,50)); clearInterval(iv); setCompPct(100)
    setQueue([{file:blob,name:editFile?.name??'foto.jpg',preview:URL.createObjectURL(blob),status:'waiting',progress:0,type:'image'}])
    setTimeout(()=>setStep('queue'),100)
  }

  const uploadAll=async()=>{
    if(uploading)return; setUploading(true)
    let lastThumb=''
    for(let i=0;i<queue.length;i++){
      if(queue[i].status==='done')continue
      setQueue(p=>p.map((q,idx)=>idx===i?{...q,status:'uploading',progress:10}:q))
      try{
        const fd=new FormData()
        fd.append('media',queue[i].file,queue[i].name)
        fd.append('author',author||'Convidado')
        const timer=setInterval(()=>setQueue(p=>p.map((q,idx)=>idx===i&&q.progress<85?{...q,progress:q.progress+15}:q)),250)
        const res=await fetch('/api/upload',{method:'POST',body:fd})
        clearInterval(timer)
        const data=await res.json()
        if(res.ok){lastThumb=queue[i].preview;setQueue(p=>p.map((q,idx)=>idx===i?{...q,status:'done',progress:100}:q))}
        else setQueue(p=>p.map((q,idx)=>idx===i?{...q,status:'error',error:data.error}:q))
      }catch{setQueue(p=>p.map((q,idx)=>idx===i?{...q,status:'error',error:'Erro de conexão'}:q))}
    }
    setUploading(false)
    if(lastThumb)onSuccess(author||'Convidado',lastThumb)
  }

  return (
    <div className="modal-overlay" onClick={step==='source'?onClose:undefined}>
      <div className="modal-sheet" onClick={e=>e.stopPropagation()}>
        <div className="modal-handle"/>
        {step==='source'&&(
          <>
            <p className="modal-label">✦ Compartilhe suas fotos ✦</p>
            <h2 className="modal-title">Adicionar ao álbum</h2>
            <p className="modal-hint">Sua foto aparece no mural imediatamente 🌸</p>
            <input className="name-input" placeholder="Seu nome (opcional — aparece na foto)" value={author} onChange={e=>setAuthor(e.target.value)} maxLength={60}/>
            <div className="source-grid">
              {[
                {icon:'📷',label:'Câmera',sub:'Tirar foto agora',action:()=>camRef.current?.click()},
                {icon:'🖼️',label:'Galeria',sub:'Editar e enviar',action:()=>{if(fileRef.current){fileRef.current.multiple=false;fileRef.current.click()}}},
                {icon:'🎥',label:'Vídeo',sub:'Compartilhar vídeo',action:()=>vidRef.current?.click()},
                {icon:'📚',label:'Várias',sub:'Enviar de uma vez',action:()=>{if(fileRef.current){fileRef.current.multiple=true;fileRef.current.click()}}},
              ].map(({icon,label,sub,action})=>(
                <button key={label} className="source-btn" onClick={action}>
                  <span className="source-btn-icon">{icon}</span>
                  <span className="source-btn-label">{label}</span>
                  <span className="source-btn-sub">{sub}</span>
                </button>
              ))}
            </div>
            <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e=>handleImgFiles(e.target.files)}/>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleImgFiles(e.target.files)}/>
            <input ref={vidRef} type="file" accept="video/*" style={{display:'none'}} onChange={e=>{
              if(!e.target.files)return
              const items:QItem[]=Array.from(e.target.files).map(f=>({file:f,name:f.name,preview:URL.createObjectURL(f),status:'waiting' as const,progress:0,type:'video' as const}))
              setQueue(items);setStep('queue')
            }}/>
          </>
        )}
        {step==='loading'&&(
          <div className="preview-loading">
            <div className="preview-spinner"/>
            <div className="compress-bar-wrap">
              <div className="compress-bar-inner"><div className="compress-bar-fill" style={{width:`${compPct}%`}}/></div>
              <p className="compress-label">{compPct<100?`Otimizando… ${compPct}%`:'Pronto!'}</p>
            </div>
          </div>
        )}
        {step==='edit'&&editFile&&(
          <>
            <p className="modal-label">✦ Editar foto ✦</p>
            <h2 className="modal-title" style={{marginBottom:16}}>Personalize</h2>
            <PhotoEditor file={editFile} onConfirm={handleEditorConfirm} onCancel={()=>setStep('source')}/>
          </>
        )}
        {step==='queue'&&(
          <>
            <p className="modal-label">✦ {allDone?'Concluído':'Enviando'} ✦</p>
            <h2 className="modal-title" style={{marginBottom:16}}>{allDone?'🌸 Tudo enviado!':`${queue.length} arquivo${queue.length>1?'s':''}`}</h2>
            <div className="queue-list">
              {queue.map((q,i)=>(
                <div key={i} className="queue-item">
                  {q.type==='image'?<img src={q.preview} alt="" className="queue-thumb"/>:<div className="queue-thumb" style={{background:'var(--beige)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem'}}>🎥</div>}
                  <div className="queue-info">
                    <p className="queue-name">{q.name}</p>
                    <div className="queue-bar-wrap"><div className="queue-bar" style={{width:`${q.progress}%`}}/></div>
                    <p className={`queue-status ${q.status}`}>
                      {q.status==='waiting'&&'Aguardando…'}{q.status==='uploading'&&'Enviando…'}{q.status==='done'&&'✓ No mural!'}{q.status==='error'&&`✗ ${q.error}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {!uploading&&!allDone&&<button className="btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={uploadAll}>📤 Enviar {queue.length>1?`${queue.length} arquivos`:'agora'}</button>}
            {uploading&&<p style={{textAlign:'center',color:'var(--text-md)',fontStyle:'italic',fontSize:'.92rem'}}>Não feche enquanto envia…</p>}
            {allDone&&(
              <div style={{display:'flex',gap:10}}>
                {queue.some(q=>q.status==='error')&&<button className="btn-secondary" style={{flex:1}} onClick={()=>{setQueue(p=>p.map(q=>q.status==='error'?{...q,status:'waiting' as const,progress:0}:q));setUploading(false)}}>🔄 Tentar novamente</button>}
                <button className="btn-primary" style={{flex:2,justifyContent:'center'}} onClick={onClose}>✓ Fechar</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── 3D Carousel ───────────────────────────────────────────────────────────
function Carousel3D({ items, onOpenLightbox }:{ items:MediaItem[]; onOpenLightbox:(idx:number)=>void }) {
  const [current, setCurrent] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const dragStart = useRef<number|null>(null)
  const touchStart = useRef<number|null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const total = items.length

  // Autoplay
  useEffect(()=>{
    if(!autoplay||total<2)return
    const t=setInterval(()=>setCurrent(c=>(c+1)%total),3200)
    return()=>clearInterval(t)
  },[autoplay,total])

  const go=(n:number)=>{
    setCurrent(c=>(c+n+total)%total)
    setAutoplay(false)
    setTimeout(()=>setAutoplay(true),8000)
  }

  // Touch swipe
  const onTouchStart=(e:React.TouchEvent)=>{ touchStart.current=e.touches[0].clientX }
  const onTouchEnd  =(e:React.TouchEvent)=>{
    if(touchStart.current===null)return
    const diff=touchStart.current-e.changedTouches[0].clientX
    if(Math.abs(diff)>40)go(diff>0?1:-1)
    touchStart.current=null
  }

  // Mouse drag
  const onMouseDown=(e:React.MouseEvent)=>{ dragStart.current=e.clientX }
  const onMouseUp  =(e:React.MouseEvent)=>{
    if(dragStart.current===null)return
    const diff=dragStart.current-e.clientX
    if(Math.abs(diff)>40)go(diff>0?1:-1)
    dragStart.current=null
  }

  if(total===0)return null

  // Build card positions
  const getTransform=(i:number)=>{
    const offset=((i-current)+total)%total
    // normalize so cards on both sides
    const norm=offset<=total/2?offset:offset-total
    const angle=norm*(360/Math.max(total,5))
    const radius=Math.min(320, Math.max(180, total*55))
    return `rotateY(${angle}deg) translateZ(${radius}px)`
  }
  const getZIndex=(i:number)=>{
    const offset=((i-current)+total)%total
    const norm=offset<=total/2?offset:offset-total
    return 100-Math.abs(norm)*10
  }
  const getOpacity=(i:number)=>{
    const offset=((i-current)+total)%total
    const norm=Math.abs(offset<=total/2?offset:offset-total)
    return norm===0?1:norm===1?.85:norm===2?.55:.25
  }

  // Dots — max 7 visible
  const maxDots=Math.min(total,7)
  const dotStart=Math.max(0,Math.min(current-3,total-maxDots))

  return (
    <div>
      <div className="carousel-wrap" ref={stageRef}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown} onMouseUp={onMouseUp}>
        <div className="carousel-stage">
          {items.map((item,i)=>(
            <div key={item.id}
              className={`c-card${i===current?' active-card':''}`}
              style={{ transform:getTransform(i), zIndex:getZIndex(i), opacity:getOpacity(i) }}
              onClick={()=>{ if(i===current)onOpenLightbox(i); else { go(((i-current)+total)%total<=total/2?1:-1) } }}>
              {/* Sempre mostra thumbUrl como imagem — vídeos têm poster gerado pelo Cloudinary */}
              <img src={item.thumbUrl} alt={item.author} loading="lazy"
                style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
              {item.type==='video'&&(
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(255,255,255,.85)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem',boxShadow:'0 4px 16px rgba(0,0,0,.3)'}}>
                    ▶
                  </div>
                </div>
              )}
              <div className="c-card-overlay">
                <p className="c-card-author">{item.type==='video'?'🎥':'📷'} {item.author}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="carousel-controls">
        <button className="c-nav" onClick={()=>go(-1)} aria-label="Anterior">‹</button>
        <div className="c-dots">
          {Array.from({length:maxDots},(_,i)=>dotStart+i).map(i=>(
            <button key={i} className={`c-dot${i===current?' active':''}`} onClick={()=>{setCurrent(i);setAutoplay(false);setTimeout(()=>setAutoplay(true),8000)}}/>
          ))}
        </div>
        <button className="c-nav" onClick={()=>go(1)} aria-label="Próximo">›</button>
      </div>
      <p className="c-counter" style={{textAlign:'center',marginTop:8}}>{current+1} / {total}</p>
    </div>
  )
}

// ── Lightbox ──────────────────────────────────────────────────────────────
function Lightbox({ items, index, onClose, onNav, onReact }:{ items:MediaItem[]; index:number; onClose:()=>void; onNav:(n:number)=>void; onReact:(id:string,emoji:string)=>void }) {
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
      <button className="lightbox-nav lightbox-prev" disabled={index===0} onClick={e=>{e.stopPropagation();onNav(-1)}}>‹</button>
      <button className="lightbox-nav lightbox-next" disabled={index===items.length-1} onClick={e=>{e.stopPropagation();onNav(1)}}>›</button>

      <div className="lightbox-content" onClick={e=>e.stopPropagation()}>
        <div style={{...getSlideStyle(), display:'flex', flexDirection:'column', alignItems:'center', gap:12}}>
          {item.type==='video'
            ?<video src={item.fullUrl} className="lightbox-media" controls autoPlay/>
            :<img src={item.fullUrl} alt={item.author} className="lightbox-media"/>
          }
          <p className="lightbox-caption">
            {item.type==='video'?'🎥':'📷'} {item.author} · {new Date(item.createdAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})}
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
  const [prompt,setPrompt]=useState<any>(null)
  const [show,setShow]=useState(false)
  useEffect(()=>{
    const h=(e:any)=>{e.preventDefault();setPrompt(e);setShow(true)}
    window.addEventListener('beforeinstallprompt',h)
    return()=>window.removeEventListener('beforeinstallprompt',h)
  },[])
  if(!show)return null
  return (
    <div className="pwa-banner">
      <span className="pwa-banner-icon">📱</span>
      <div className="pwa-banner-text">
        <p className="pwa-banner-title">Instalar o app</p>
        <p className="pwa-banner-sub">Acesse rápido direto da tela inicial</p>
      </div>
      <button className="pwa-banner-btn" onClick={()=>{prompt?.prompt();setShow(false)}}>Instalar</button>
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
  const [showUpload,  setShowUpload]   = useState(false)
  const [showAll,     setShowAll]      = useState(false)
  const [toasts,      setToasts]       = useState<ToastMsg[]>([])
  const [parentsMsg,  setParentsMsg]   = useState('')
  const [savedAuthor, setSavedAuthor]  = useState('')
  const lastRtTs  = useRef<number>(0)
  const sentinelRef= useRef<HTMLDivElement>(null)
  const obsRef     = useRef<IntersectionObserver|null>(null)

  useEffect(()=>{
    if(typeof window==='undefined')return
    if(!localStorage.getItem('cha_visited'))setShowOnboard(true)
    setSavedAuthor(localStorage.getItem('cha_author')?? '')
  },[])

  const fetchMedia=useCallback(async(cursor?:string)=>{
    const res=await fetch(cursor?`/api/photos?cursor=${cursor}`:'/api/photos')
    const data=await res.json()
    setMedia(prev=>cursor?[...prev,...(data.media??[])]:(data.media??[]))
    setNextCursor(data.nextCursor??null)
    setLoading(false)
  },[])

  useEffect(()=>{fetchMedia()},[fetchMedia])

  useEffect(()=>{
    if(!sentinelRef.current||!nextCursor)return
    obsRef.current?.disconnect()
    const obs=new IntersectionObserver(entries=>{if(entries[0].isIntersecting)fetchMedia(nextCursor!)},{rootMargin:'400px'})
    obs.observe(sentinelRef.current); obsRef.current=obs
    return()=>obs.disconnect()
  },[nextCursor,fetchMedia])

  useEffect(()=>{
    fetch('/api/admin/message').then(r=>r.json()).then(d=>setParentsMsg(d.message??''))
    const t=setInterval(()=>fetch('/api/admin/message').then(r=>r.json()).then(d=>setParentsMsg(d.message??'')),30000)
    return()=>clearInterval(t)
  },[])

  useEffect(()=>{
    fetch('/api/realtime').then(r=>r.json()).then(({data})=>{if(data?.ts)lastRtTs.current=data.ts})
    const poll=async()=>{
      try{
        const {data}=await(await fetch('/api/realtime')).json()
        if(data?.ts&&data.ts>lastRtTs.current&&data.ts>Date.now()-30000){
          lastRtTs.current=data.ts
          const id=Math.random().toString(36).slice(2)
          const text=data.author!=='Convidado'?`${data.author} adicionou uma foto! 📷`:'Nova foto adicionada! 📷'
          setToasts(prev=>[...prev.slice(-2),{id,text,thumb:data.thumbUrl}])
          setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),4500)
          setTimeout(()=>fetchMedia(),2000)
        }
      }catch{}
    }
    const t=setInterval(poll,10000); return()=>clearInterval(t)
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
    // Optimistic update
    setMedia(prev=>prev.map(m=>m.id===id?{...m,reactions:{...m.reactions,[emoji]:(m.reactions[emoji]??0)+1}}:m))
    try{
      await fetch('/api/react',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,emoji})})
    }catch{}
  },[])

  const handleUploadSuccess=(author:string,thumb:string)=>{
    if(author&&author!=='Convidado'){localStorage.setItem('cha_author',author);setSavedAuthor(author)}
    addToast('Foto enviada ao álbum! 🌸',thumb)
    setTimeout(()=>fetchMedia(),2500)
  }

  return (
    <>
      {[['5%','18s','0s'],['88%','22s','7s'],['48%','20s','13s']].map(([l,d,delay],i)=>(
        <div key={i} className="balloon" style={{left:l,animationDuration:d,animationDelay:delay}}>🎈</div>
      ))}

      {showOnboard&&<Onboarding onDone={()=>{localStorage.setItem('cha_visited','1');setShowOnboard(false)}}/>}

      {/* Hero */}
      <section className="hero">
        <p className="hero-tag">✦ Chá de Bebê ✦</p>
        <span className="hero-bear">🐻</span>
        <h1 className="hero-name">José Augusto</h1>
        <div className="hero-divider"/>
        <p className="hero-date">25 de Abril · 2026</p>
        <p className="hero-sub">Sábado, às 17 horas</p>
        <div className="hero-cta">
          <a href="#galeria" className="btn-primary">📷 Ver o álbum</a>
          <button className="btn-secondary" onClick={()=>setShowUpload(true)}>🌿 Compartilhar</button>
        </div>
        {media.length>0&&(
          <div className="online-badge" style={{marginTop:20}}>
            <span className="online-dot"/>
            {media.length} {media.length===1?'foto':'fotos'} no álbum
          </div>
        )}
      </section>

      <div className="leaves">🌿 🌸 🌿 🌸 🌿</div>

      {parentsMsg&&(
        <div className="parents-section reveal">
          <p className="section-label">✦ Uma mensagem de amor ✦</p>
          <div className="parents-card">
            <p className="parents-quote">{parentsMsg}</p>
            <p className="parents-sig">— papai e mamãe</p>
          </div>
        </div>
      )}

      <div className="leaves" style={{opacity:.3,marginTop:8}}>· · · ✦ · · ·</div>

      {/* Gallery */}
      <section className="carousel-section reveal" id="galeria">
        <div className="carousel-header">
          <p className="section-label">✦ Álbum ao vivo ✦</p>
          <h2 className="section-title">Momentos <em>especiais</em></h2>
        </div>

        {loading&&(
          <div style={{padding:'0 16px'}}>
            <div className="skel-grid">{Array.from({length:6}).map((_,i)=><div key={i} className="skel-item"/>)}</div>
          </div>
        )}

        {!loading&&media.length===0&&(
          <div style={{textAlign:'center',padding:'60px 24px',color:'var(--text-md)',fontStyle:'italic'}}>
            <div style={{fontSize:'3rem',marginBottom:16}}>📷</div>
            <p style={{fontWeight:600}}>As fotos aparecerão aqui assim que forem enviadas.</p>
            <button className="btn-secondary" style={{marginTop:24}} onClick={()=>setShowUpload(true)}>🌸 Seja o primeiro a compartilhar</button>
          </div>
        )}

        {!loading&&media.length>0&&!showAll&&(
          <>
            <Carousel3D items={media} onOpenLightbox={setLbIdx}/>
            <div style={{textAlign:'center',marginTop:8}}>
              <button className="view-all-btn" onClick={()=>setShowAll(true)}>
                ⊞ Ver todas as {media.length} fotos
              </button>
            </div>
          </>
        )}

        {!loading&&media.length>0&&showAll&&(
          <div className="grid-section">
            <div style={{textAlign:'center',marginBottom:20}}>
              <button className="view-all-btn" onClick={()=>setShowAll(false)}>
                ↩ Voltar ao carrossel
              </button>
            </div>
            <div className="gallery-grid">
              {media.map((item,i)=>(
                <div key={item.id} className="gallery-card" style={{animationDelay:`${(i%8)*0.055}s`}} onClick={()=>setLbIdx(i)}>
                  <div style={{position:'relative',aspectRatio:'1',overflow:'hidden'}}>
                    <img src={item.thumbUrl} alt={item.author} loading="lazy"
                      style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                    {item.type==='video'&&(
                      <>
                        <div className="gallery-card-type">▶ Vídeo</div>
                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,.8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem'}}>▶</div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="gallery-card-footer"><span className="gallery-card-author">{item.type==='video'?'🎥':'📷'} {item.author}</span></div>
                  <ReactionBar item={item} onReact={handleReact}/>
                </div>
              ))}
            </div>
            <div ref={sentinelRef} style={{height:40}}/>
          </div>
        )}
      </section>

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

      <footer className="reveal">
        <span className="footer-bear">🐻</span>
        <p className="footer-text">Bem-vindo ao mundo, José Augusto</p>
        <div style={{width:80,height:1.5,background:'linear-gradient(to right,transparent,var(--accent),transparent)',margin:'16px auto'}}/>
        <p className="footer-sub">com muito amor · papai e mamãe</p>
        <div style={{display:'flex',justifyContent:'center',gap:24,marginTop:24}}>
          <a href="/tv" className="tv-footer-link">📺 Modo TV</a>
          <a href="/admin" style={{fontSize:'.72rem',color:'var(--text-lo)',textDecoration:'none',letterSpacing:'.12em',opacity:.5}}>⚙ admin</a>
        </div>
      </footer>

      <button className="fab" onClick={()=>setShowUpload(true)} aria-label="Enviar foto">
        📤<span className="fab-tooltip">Enviar foto ou vídeo</span>
      </button>

      {lbIdx!==null&&(
        <Lightbox items={media} index={lbIdx} onClose={()=>setLbIdx(null)}
          onNav={d=>setLbIdx(prev=>prev!==null?Math.max(0,Math.min(media.length-1,prev+d)):null)}
          onReact={handleReact}/>
      )}

      {showUpload&&<UploadModal authorDefault={savedAuthor} onClose={()=>setShowUpload(false)} onSuccess={handleUploadSuccess}/>}

      <ToastManager toasts={toasts} onRemove={id=>setToasts(prev=>prev.filter(t=>t.id!==id))}/>
      <PWABanner/>
    </>
  )
}
