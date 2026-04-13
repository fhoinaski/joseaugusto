import type { Metadata, Viewport } from 'next'
import './globals.css'
import { GeoAccessProvider } from '@/components/GeoAccessProvider'
import GlobalInstagramNav from '@/components/GlobalInstagramNav'

export const metadata: Metadata = {
  title: 'Chá · José Augusto',
  description: 'Registre e compartilhe os momentos especiais do Chá de Bebê do José Augusto',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Chá · José Augusto' },
  other: { 'mobile-web-app-capable': 'yes' },
  icons: { apple: '/icon-192.png' },
}

export const viewport: Viewport = {
  themeColor: '#f9f3eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Dancing+Script:wght@500;700&display=swap" rel="stylesheet" />
        <script src="/sw-register.js" defer></script>
      </head>
      <body>
        <GeoAccessProvider>
          <div className="ig-app-shell">
            <GlobalInstagramNav />
            <div className="ig-app-content">{children}</div>
          </div>
        </GeoAccessProvider>
      </body>
    </html>
  )
}
