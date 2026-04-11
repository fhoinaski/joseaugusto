import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chá · José Augusto',
    short_name: 'Chá · JA',
    description: 'Álbum ao vivo do Chá de Bebê do José Augusto',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9f3eb',
    theme_color: '#f9f3eb',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
