/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
    webVitalsAttribution: ['CLS', 'LCP'],
    optimizeCss: true
  },

  // Image optimization configuration
  images: {
    // Configure external image domains for flag CDN
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        pathname: '/**'
      }
    ],
    // Optimize flag images
    deviceSizes: [640, 768, 1024, 1280, 1600],
    imageSizes: [16, 20, 32, 48, 64, 96],
    formats: ['image/webp', 'image/avif']
  },

  // Additional security headers (primary security headers are in vercel.json)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: https://flagcdn.com",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ]
      }
    ];
  },

  // Performance optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production'
  },

  // Build optimizations
  swcMinify: true,
  
  // Output configuration for static export if needed
  trailingSlash: false,
  
  // Webpack configuration for better bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups.commons = {
        name: 'commons',
        chunks: 'all',
        minChunks: 2,
        enforce: true
      };
    }

    return config;
  }
};

module.exports = nextConfig;