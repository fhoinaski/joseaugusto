interface HeroPreviewItem {
  thumbUrl: string
  author: string
}

export default function HeroSection({ media }: { media: HeroPreviewItem[] }) {
  return (
    <section className="hero">
      <p className="hero-tag">✦ Chá de Bebê ✦</p>
      <span className="hero-bear">🧸</span>
      <h1 className="hero-name">José Augusto</h1>
      <div className="hero-divider"/>
      <p className="hero-date">25 de Abril · 2026</p>
      <p className="hero-sub">Sábado, às 17 horas</p>
      <div className="hero-cta">
        <a href="#galeria" className="btn-primary">📷 Ver o álbum</a>
      </div>
      {media[0]?.thumbUrl && (
        <div className="hero-preview-card">
          <img src={media[0].thumbUrl} alt={media[0].author} className="hero-preview-image" loading="lazy" />
          <p className="hero-preview-caption">Último momento enviado por {media[0].author}</p>
        </div>
      )}
      {media.length > 0 && (
        <div className="online-badge" style={{ marginTop: 20 }}>
          <span className="online-dot"/>
          {media.length} {media.length === 1 ? 'foto' : 'fotos'} no álbum
        </div>
      )}
    </section>
  )
}
