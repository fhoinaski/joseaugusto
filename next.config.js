/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Cloudflare R2 public bucket (*.r2.dev or custom domain)
      { protocol: 'https', hostname: '*.r2.dev' },
      // If using a custom domain for R2, add it here:
      // { protocol: 'https', hostname: 'media.example.com' },
    ],
  },
}

module.exports = nextConfig
