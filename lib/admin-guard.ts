import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'

export function requireAdmin(req?: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  if (req) {
    const origin = req.headers.get('origin')
    const host = req.headers.get('host')
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json({ error: 'Origem nao autorizada' }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: 'Origem invalida' }, { status: 403 })
      }
    }
  }

  return null
}
