/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for modern deployment
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['@neondatabase/serverless'],
  },
  
  // Environment variables
  env: {
    DATABASE_PLATFORM: process.env.DATABASE_PLATFORM || 'neon',
    DEPLOYMENT_PLATFORM: process.env.DEPLOYMENT_PLATFORM || 'vercel',
  },
  
  // API routes configuration
  async rewrites() {
    return [
      // Rewrite API routes to maintain compatibility
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  
  // Headers for better security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration for compatibility
  webpack: (config, { isServer }) => {
    // Handle node modules that need special treatment
    if (isServer) {
      config.externals.push('@neondatabase/serverless');
    }
    
    return config;
  },
  
  // Output configuration for static export (if needed)
  output: process.env.NEXT_EXPORT === 'true' ? 'export' : 'standalone',
  trailingSlash: false,
  
  // Images configuration
  images: {
    domains: [
      'images.unsplash.com',
      'via.placeholder.com',
      'scontent.cdninstagram.com',
      'scontent-*.cdninstagram.com',
      'lookaside.fbsbx.com',
      '*.fbcdn.net',
    ],
    unoptimized: process.env.NEXT_EXPORT === 'true',
  },
};

module.exports = nextConfig;
