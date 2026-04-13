'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const AdminClient = dynamic(() => import('../../components/admin/AdminClient'), {
  ssr: false,
})

function AdminSkeleton() {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--warm)', padding: '24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div style={{ height: 56, borderRadius: 14, background: 'rgba(139,98,66,.12)' }} />
        <div style={{ height: 120, borderRadius: 14, background: 'rgba(139,98,66,.12)' }} />
        <div style={{ height: 360, borderRadius: 18, background: 'rgba(139,98,66,.1)' }} />
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminClient />
    </Suspense>
  )
}
