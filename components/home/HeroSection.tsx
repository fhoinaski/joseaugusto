'use client'

interface HeroPreviewItem {
  thumbUrl: string
  author: string
}

export default function HeroSection({
  media,
  savedAuthor,
  canWrite,
}: {
  media: HeroPreviewItem[]
  savedAuthor?: string
  canWrite?: boolean
}) {
  const helperText = canWrite
    ? savedAuthor
      ? `Toque em enviar foto para compartilhar com o nome ${savedAuthor}.`
      : 'Toque em enviar foto para compartilhar fotos, videos e mensagens de voz.'
    : 'Voce pode acompanhar o album agora. Para enviar, use a chave do evento.'

  return (
    <section className="hero">
      <p className="hero-tag">Cha de Bebe</p>
      <span className="hero-bear">🧸</span>
      <h1 className="hero-name">Jose Augusto</h1>
      <div className="hero-divider" />
      <p className="hero-date">25 de Abril · 2026</p>
      <p className="hero-sub">Sabado, as 17 horas</p>
      <p className="hero-helper">{helperText}</p>
      {media.length > 0 && (
        <div className="online-badge hero-live-badge">
          <span className="online-dot" />
          {media.length} {media.length === 1 ? 'midia nova no album' : 'midias novas no album'}
        </div>
      )}
    </section>
  )
}
