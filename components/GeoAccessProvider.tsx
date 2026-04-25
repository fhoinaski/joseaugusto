'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { emitToast } from '@/lib/ui-feedback'

export type GeoStatus = 'idle' | 'checking' | 'allowed' | 'observer' | 'key'

interface GeoAccessValue {
  geoStatus: GeoStatus
  canWrite: boolean
  unlockWithKey: (key: string) => Promise<boolean>
}

const GeoAccessContext = createContext<GeoAccessValue | null>(null)

const EVENT_LAT = parseFloat(process.env.NEXT_PUBLIC_EVENT_LAT ?? '-27.6133')
const EVENT_LNG = parseFloat(process.env.NEXT_PUBLIC_EVENT_LNG ?? '-48.5299')
const GEO_RADIUS_M = parseInt(process.env.NEXT_PUBLIC_GEO_RADIUS ?? '200', 10)

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const p1 = lat1 * Math.PI / 180
  const p2 = lat2 * Math.PI / 180
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function GeoAccessProvider({ children }: { children: React.ReactNode }) {
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [canWrite, setCanWrite] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    const timeoutId = setTimeout(() => ctrl.abort(), 5000)

    fetch('/api/settings', { signal: ctrl.signal })
      .then(r => r.json())
      .then(({ geoGateEnabled }: { geoGateEnabled?: boolean }) => {
        clearTimeout(timeoutId)
        if (!geoGateEnabled) {
          setGeoStatus('allowed')
          setCanWrite(true)
          return
        }

        try {
          const cached = localStorage.getItem('cha_geo')
          if (cached) {
            const { result, ts } = JSON.parse(cached) as { result: GeoStatus; ts: number }
            if (Date.now() - ts < 24 * 3600_000) {
              setGeoStatus(result)
              setCanWrite(result !== 'observer')
              return
            }
          }
        } catch {}

        if (!navigator.geolocation) {
          setGeoStatus('key')
          setCanWrite(false)
          return
        }

        setGeoStatus('checking')
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            const dist = haversine(coords.latitude, coords.longitude, EVENT_LAT, EVENT_LNG)
            const result: GeoStatus = dist <= GEO_RADIUS_M ? 'allowed' : 'observer'
            setGeoStatus(result)
            setCanWrite(result !== 'observer')
            try {
              localStorage.setItem('cha_geo', JSON.stringify({ result, ts: Date.now() }))
            } catch {}
          },
          () => {
            // Geo denied or unavailable — switch to access-key mode and inform the user
            setGeoStatus('key')
            setCanWrite(false)
            emitToast('Localização negada. Use sua chave de acesso para postar.')
          },
          { timeout: 8000, maximumAge: 60000 },
        )
      })
      .catch(() => {
        clearTimeout(timeoutId)
        setGeoStatus('allowed')
        setCanWrite(true)
      })

    return () => {
      clearTimeout(timeoutId)
      ctrl.abort()
    }
  }, [])

  const unlockWithKey = async (key: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim() }),
      })
      const { valid } = await res.json() as { valid?: boolean }
      if (valid) {
        setGeoStatus('allowed')
        setCanWrite(true)
        try {
          localStorage.setItem('cha_geo', JSON.stringify({ result: 'allowed', ts: Date.now() }))
        } catch {}
      }
      return Boolean(valid)
    } catch {
      return false
    }
  }

  const value = useMemo<GeoAccessValue>(() => ({ geoStatus, canWrite, unlockWithKey }), [geoStatus, canWrite])

  return <GeoAccessContext.Provider value={value}>{children}</GeoAccessContext.Provider>
}

export function useGeoAccess(): GeoAccessValue {
  const ctx = useContext(GeoAccessContext)
  if (!ctx) {
    return {
      geoStatus: 'allowed',
      canWrite: true,
      unlockWithKey: async () => false,
    }
  }
  return ctx
}
