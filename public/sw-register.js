if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      // Check for updates every 60s
      setInterval(() => reg.update(), 60000)
      // Listen for SW_UPDATED message and reload silently
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data?.type === 'SW_UPDATED') {
          window.location.reload()
        }
      })
    } catch(e) {
      console.log('SW registration failed', e)
    }
  })
}
