'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#f5ede0', color: '#3e2408', textAlign: 'center' }}>
      <div style={{ maxWidth: 560 }}>
        <p style={{ fontSize: 42, margin: 0 }}>⚠️</p>
        <h1 style={{ margin: '10px 0 8px', fontFamily: "'Playfair Display', serif" }}>Algo deu errado</h1>
        <p style={{ margin: '0 0 16px', opacity: 0.85 }}>
          Ocorreu uma falha inesperada. Tente recarregar este trecho da aplicação.
        </p>
        <button
          onClick={reset}
          style={{ border: '1px solid rgba(122,78,40,.45)', borderRadius: 999, background: '#fff', color: '#3e2408', padding: '10px 18px', cursor: 'pointer', fontWeight: 700 }}
        >
          Tentar novamente
        </button>
        {process.env.NODE_ENV !== 'production' && (
          <pre style={{ marginTop: 16, textAlign: 'left', whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,.65)', borderRadius: 12, padding: 12, fontSize: 12 }}>
            {error.message}
          </pre>
        )}
      </div>
    </div>
  )
}
