'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const TVClient = dynamic(() => import('../../components/tv/TVClient'), {
  ssr: false,
})

function TVSkeleton() {
  return (
    <div style={{ minHeight: '100svh', background: '#090909', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: 'min(90vw, 900px)', aspectRatio: '16/9', borderRadius: 24, background: 'linear-gradient(120deg, rgba(255,255,255,.05), rgba(255,255,255,.12), rgba(255,255,255,.05))', animation: 'pulse 1.4s ease-in-out infinite' }} />
    </div>
  )
}

export default function TVPage() {
  return (
    <Suspense fallback={<TVSkeleton />}>
      <TVClient />
    </Suspense>
  )
}
