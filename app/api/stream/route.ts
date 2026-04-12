import { dbGetConfig } from '@/lib/db'
import { getRealtimeDataR2 } from '@/lib/r2'

export const dynamic     = 'force-dynamic'
export const maxDuration = 30 // Vercel Pro / self-hosted; hobby closes at ~10s (EventSource reconnects)

export async function GET() {
  const encoder = new TextEncoder()
  let closed    = false
  let interval: ReturnType<typeof setInterval>
  let timeout:  ReturnType<typeof setTimeout>

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch { closed = true }
      }

      // Confirm connection — client clears its 5s fallback timer on this
      send('ping', { ts: Date.now() })

      // Snapshot initial state so we only emit on real changes
      let lastRtTs = 0
      let lastMsg  = ''
      try {
        const rt = await getRealtimeDataR2()
        if (rt?.ts) lastRtTs = rt.ts
        lastMsg = await dbGetConfig('parents_message')
      } catch {}

      // Poll every 8s, emit only when something changed
      interval = setInterval(async () => {
        if (closed) return
        try {
          const rt = await getRealtimeDataR2()
          if (rt?.ts && rt.ts > lastRtTs) {
            lastRtTs = rt.ts
            send('new-photo', rt)
          }

          const msg = await dbGetConfig('parents_message')
          if (msg !== lastMsg) {
            lastMsg = msg
            send('message-update', { message: msg })
          }
        } catch {}
      }, 8000)

      // Close after ~28s — prevents zombie connections; EventSource reconnects automatically
      timeout = setTimeout(() => {
        closed = true
        clearInterval(interval)
        try { controller.close() } catch {}
      }, 28000)
    },

    cancel() {
      closed = true
      clearInterval(interval)
      clearTimeout(timeout)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
