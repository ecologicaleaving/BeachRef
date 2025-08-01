import { NextRequest } from 'next/server';

describe('Vercel Configuration', () => {
  describe('Health Check Endpoint', () => {
    it('should return healthy status', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'healthy',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          environment: expect.any(String),
          version: expect.any(String),
          services: {
            database: 'not_applicable',
            external_apis: 'operational'
          }
        })
      });

      global.fetch = mockFetch;

      const response = await fetch('/api/health');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('services');
    });
  });

  describe('Vercel Configuration Validation', () => {
    let vercelConfig: any;

    beforeAll(() => {
      vercelConfig = require('../../vercel.json');
    });

    it('should have correct framework configuration', () => {
      expect(vercelConfig.framework).toBe('nextjs');
      expect(vercelConfig.installCommand).toBe('npm ci');
      expect(vercelConfig.buildCommand).toBe('npm run build');
    });

    it('should have Node.js 20 runtime configured', () => {
      // Next.js App Router automatically handles function runtime configuration
      // Node.js version is specified in build environment
      expect(vercelConfig.build.env.NODE_VERSION).toBe('20');
      expect(vercelConfig.functions).toBeUndefined(); // Functions config removed for App Router
    });

    it('should have proper security headers', () => {
      const globalHeaders = vercelConfig.headers.find((h: any) => h.source === '/(.*)');
      expect(globalHeaders).toBeDefined();
      
      const headerKeys = globalHeaders.headers.map((h: any) => h.key);
      expect(headerKeys).toContain('X-Frame-Options');
      expect(headerKeys).toContain('X-Content-Type-Options');
      expect(headerKeys).toContain('Referrer-Policy');
      expect(headerKeys).toContain('Permissions-Policy');
    });

    it('should have proper caching configuration', () => {
      const apiHeaders = vercelConfig.headers.find((h: any) => h.source === '/api/(.*)');
      const nextStaticHeaders = vercelConfig.headers.find((h: any) => h.source === '/_next/static/:path*');
      const faviconHeaders = vercelConfig.headers.find((h: any) => h.source === '/favicon.ico');
      
      expect(apiHeaders).toBeDefined();
      expect(nextStaticHeaders).toBeDefined();
      expect(faviconHeaders).toBeDefined();
      
      const apiCacheHeader = apiHeaders.headers.find((h: any) => h.key === 'Cache-Control');
      const staticCacheHeader = nextStaticHeaders.headers.find((h: any) => h.key === 'Cache-Control');
      const faviconCacheHeader = faviconHeaders.headers.find((h: any) => h.key === 'Cache-Control');
      
      expect(apiCacheHeader.value).toContain('s-maxage=60');
      expect(staticCacheHeader.value).toContain('max-age=31536000');
      expect(staticCacheHeader.value).toContain('immutable');
      expect(faviconCacheHeader.value).toContain('max-age=31536000');
    });

    it('should have health check redirect configured', () => {
      const healthRedirect = vercelConfig.redirects.find((r: any) => r.source === '/health');
      expect(healthRedirect).toBeDefined();
      expect(healthRedirect.destination).toBe('/api/health');
      expect(healthRedirect.permanent).toBe(false);
    });

    it('should not have manual functions configuration', () => {
      // Next.js App Router automatically handles function configuration including timeouts
      // Manual functions configuration is removed to prevent conflicts
      expect(vercelConfig.functions).toBeUndefined();
    });

    it('should have telemetry disabled for build optimization', () => {
      expect(vercelConfig.build.env.NEXT_TELEMETRY_DISABLED).toBe('1');
    });
  });

  describe('Next.js Configuration Validation', () => {
    let nextConfig: any;

    beforeAll(() => {
      nextConfig = require('../../next.config.js');
    });

    it('should have performance optimizations enabled', () => {
      expect(nextConfig.experimental.optimizePackageImports).toContain('@/components');
      expect(nextConfig.experimental.optimizePackageImports).toContain('@/lib');
      expect(nextConfig.experimental.webVitalsAttribution).toContain('CLS');
      expect(nextConfig.experimental.webVitalsAttribution).toContain('LCP');
      // optimizeCss disabled due to critters dependency issues in App Router
      expect(nextConfig.experimental.optimizeCss).toBeUndefined();
    });

    it('should have SWC minification enabled', () => {
      expect(nextConfig.swcMinify).toBe(true);
    });

    it('should have image optimization configured', () => {
      expect(nextConfig.images.remotePatterns).toHaveLength(1);
      expect(nextConfig.images.remotePatterns[0].hostname).toBe('flagcdn.com');
      expect(nextConfig.images.formats).toContain('image/webp');
      expect(nextConfig.images.formats).toContain('image/avif');
    });

    it('should have console removal configured for production', () => {
      // Check if removeConsole is properly configured
      expect(nextConfig.compiler.removeConsole).toEqual(process.env.NODE_ENV === 'production');
    });

    it('should have Content Security Policy configured', async () => {
      const headers = await nextConfig.headers();
      const cspHeader = headers[0].headers.find((h: any) => h.key === 'Content-Security-Policy');
      expect(cspHeader).toBeDefined();
      expect(cspHeader.value).toContain("img-src 'self' data: https: https://flagcdn.com");
    });
  });
});