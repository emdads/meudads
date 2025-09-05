/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'images.unsplash.com',
      'via.placeholder.com',
      'scontent.fbsb10-1.fna.fbcdn.net',
      'scontent-sjc3-1.xx.fbcdn.net',
      'external.fbsb10-1.fna.fbcdn.net',
      'mocha-cdn.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
      },
      {
        protocol: 'https',
        hostname: '**.facebook.com',
      },
      {
        protocol: 'https',
        hostname: '**.instagram.com',
      }
    ]
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  async redirects() {
    return [
      {
        source: '/c/:slug',
        destination: '/c/:slug/creatives/active',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
