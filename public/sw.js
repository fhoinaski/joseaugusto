const CACHE = 'cha-v2'
const STATIC = ['/', '/manifest.json']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)))
  // Force activate immediately — auto-update
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
  // Notify all open tabs to reload for new version
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
  })
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('/api/')) return
  if (e.request.url.includes('fonts.googleapis') || e.request.url.includes('fonts.gstatic')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached =>
          cached || fetch(e.request).then(r => { cache.put(e.request, r.clone()); return r })
        )
      )
    )
    return
  }
  // Network first, fallback to cache
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})
