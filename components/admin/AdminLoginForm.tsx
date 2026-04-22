'use client'

import { useState } from 'react'

export function AdminLoginForm({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (loading) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        onLogin()
        return
      }

      const data = await res.json().catch(() => null) as { error?: string } | null
      setError(data?.error || 'Nao foi possivel entrar. Verifique a senha e tente novamente.')
    } catch {
      setError('Falha de rede. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div className="admin-login-mark" aria-hidden="true">Admin</div>
        <h1 id="admin-login-title">Area Admin</h1>
        <p>Cha do Jose Augusto</p>

        {error && (
          <div className="admin-login-alert" role="alert">
            {error}
          </div>
        )}

        <label className="admin-login-field">
          <span>Senha</span>
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && submit()}
            autoComplete="current-password"
            autoFocus
          />
        </label>

        <button className="btn-primary admin-login-submit" onClick={submit} disabled={loading || !password}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </section>
    </main>
  )
}
