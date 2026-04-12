// Service Worker — Chá · José Augusto
const CACHE     = 'cha-jose-v3'
const STATIC    = ['/', '/manifest.json']
const SYNC_TAG  = 'upload-sync'
const IDB_DB    = 'cha-pending'
const IDB_STORE = 'uploads'

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
  })
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('/api/')) return

  // Google Fonts + R2 media — cache-first
  if (e.request.url.includes('fonts.googleapis') ||
      e.request.url.includes('fonts.gstatic') ||
      e.request.url.includes('.r2.dev')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached =>
          cached || fetch(e.request).then(r => {
            if (r.ok) cache.put(e.request, r.clone())
            return r
          }).catch(() => new Response('', { status: 503 }))
        )
      )
    )
    return
  }

  // App shell — network first, fallback to cache
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && res.type === 'basic') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === SYNC_TAG) {
    e.waitUntil(retryPendingUploads())
  }
})

async function retryPendingUploads() {
  let items
  try { items = await idbGetAll() } catch { return }
  if (!items.length) return

  for (const item of items) {
    try {
      const fd = new FormData()
      fd.append('media', item.blob, item.name)
      fd.append('author', item.author || 'Convidado')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        await idbDelete(item.id)
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        clients.forEach(c => c.postMessage({ type: 'UPLOAD_SYNCED', name: item.name }))
      }
    } catch {
      // Will retry on next connectivity event
    }
  }
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

async function idbGetAll() {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

async function idbDelete(id) {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}
