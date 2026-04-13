if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      setInterval(() => reg.update(), 60_000)

      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data?.type === 'SW_UPDATED') {
          window.location.reload()
        }
        // Background sync completed an upload — trigger gallery refresh
        if (e.data?.type === 'UPLOAD_SYNCED') {
          window.dispatchEvent(new CustomEvent('cha:upload-synced', { detail: { name: e.data.name } }))
          window.dispatchEvent(new CustomEvent('cha:toast', {
            detail: {
              text: `Upload enviado: ${e.data.name}`,
              duration: 3800,
            },
          }))
        }
      })
    } catch(err) {
      console.log('[SW] Registration failed', err)
    }
  })
}

// Helper called by the app to queue an upload for background sync
window.__chaQueueUpload = async function(blob, name, author) {
  if (!('serviceWorker' in navigator)) return false
  try {
    const IDB_DB    = 'cha-pending'
    const IDB_STORE = 'uploads'
    await new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_DB, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE))
          req.result.createObjectStore(IDB_STORE, { keyPath: 'id', autoIncrement: true })
      }
      req.onsuccess = () => {
        const db  = req.result
        const put = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).add({ blob, name, author })
        put.onsuccess = () => resolve()
        put.onerror   = () => reject(put.error)
      }
      req.onerror = () => reject(req.error)
    })
    const registration = await navigator.serviceWorker.ready
    if ('sync' in registration) {
      await registration.sync.register('upload-sync')
      return true
    }
  } catch(err) {
    console.log('[SW] Queue failed', err)
  }
  return false
}
