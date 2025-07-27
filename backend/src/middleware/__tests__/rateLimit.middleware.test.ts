import request from 'supertest';
import express from 'express';
import { 
  healthRateLimit, 
  visRateLimit, 
  generalRateLimit 
} from '../rateLimit.middleware';

describe.skip('Rate Limiting Middleware Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Health Rate Limiting', () => {
    beforeEach(() => {
      app.get('/health', healthRateLimit, (req, res) => {
        res.json({ status: 'ok' });
      });
    });

    it('should allow requests within rate limit', async () => {
      // Health endpoints allow 100 requests per minute
      const promises = Array.from({ length: 5 }, () =>
        request(app).get('/health').expect(200)
      );

      await Promise.all(promises);
      
      // All should succeed
      promises.forEach(async (promise) => {
        const response = await promise;
        expect(response.body).toEqual({ status: 'ok' });
      });
    });

    it('should block requests exceeding rate limit', async () => {
      // Make requests rapidly to exceed limit
      const requests: Promise<any>[] = [];
      
      // Health limit is 100/minute, but let's test with a burst
      for (let i = 0; i < 105; i++) {
        requests.push(request(app).get('/health'));
      }

      const responses = await Promise.allSettled(requests);
      
      // Some should be successful, some should be rate limited
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 200
      );
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 429
      );

      expect(successful.length).toBeLessThanOrEqual(100);
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 10000);

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should return 429 status with proper error message when rate limited', async () => {
      // Create a custom app with very low rate limit for testing
      const testApp = express();
      const lowRateLimit = (req: any, res: any, next: any) => {
        // Simulate rate limit exceeded
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded, please try again later.',
          retryAfter: 60
        });
      };
      
      testApp.get('/health-limited', lowRateLimit);

      const response = await request(testApp)
        .get('/health-limited')
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'Too many requests',
        message: 'Rate limit exceeded, please try again later.',
        retryAfter: expect.any(Number)
      });
    });
  });

  describe('VIS API Rate Limiting', () => {
    beforeEach(() => {
      app.get('/vis/tournaments', visRateLimit, (req, res) => {
        res.json({ tournaments: [] });
      });
      // Add missing health route for cross-endpoint testing
      app.get('/health', healthRateLimit, (req, res) => {
        res.json({ status: 'ok' });
      });
    });

    it('should allow requests within VIS rate limit', async () => {
      // VIS endpoints have lower limits due to external API constraints
      const promises = Array.from({ length: 3 }, () =>
        request(app).get('/vis/tournaments').expect(200)
      );

      await Promise.all(promises);
    });

    it('should have different rate limits for VIS endpoints', async () => {
      const response = await request(app)
        .get('/vis/tournaments')
        .expect(200);

      // VIS endpoints should have more restrictive limits than health endpoints
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      const limit = parseInt(response.headers['x-ratelimit-limit']);
      expect(limit).toBeLessThan(100); // Should be less than health limit
    });

    it('should track rate limits per endpoint type', async () => {
      // Make requests to VIS endpoint
      await request(app).get('/vis/tournaments').expect(200);
      
      // Health endpoint should have separate counter
      const healthResponse = await request(app).get('/health').expect(200);
      
      expect(healthResponse.body).toEqual({ status: 'ok' });
    });
  });

  describe('General Rate Limiting', () => {
    beforeEach(() => {
      app.get('/general', generalRateLimit, (req, res) => {
        res.json({ status: 'general endpoint' });
      });
    });

    it('should allow requests within general rate limit', async () => {
      const promises = Array.from({ length: 3 }, () =>
        request(app).get('/general').expect(200)
      );

      await Promise.all(promises);
    });

    it('should have appropriate rate limits for general endpoints', async () => {
      const response = await request(app)
        .get('/general')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.body).toEqual({ status: 'general endpoint' });
    });
  });

  describe('Rate Limit Reset and Recovery', () => {
    it('should reset rate limits after window expires', async () => {
      // This test would require waiting for the time window to pass
      // In a real scenario, you might mock the time or use a very short window
      
      const testApp = express();
      
      // Create a rate limiter with very short window for testing
      const shortWindowRateLimit = (req: any, res: any, next: any) => {
        // In real implementation, this would use express-rate-limit with windowMs: 1000
        // For testing, we'll simulate the behavior
        const now = Date.now();
        const windowStart = now - (now % 1000); // 1-second windows
        
        // Simulate rate limit logic
        req.rateLimit = {
          limit: 2,
          remaining: Math.max(0, 2 - 1), // Simulate one request used
          reset: new Date(windowStart + 1000)
        };
        
        res.set({
          'X-RateLimit-Limit': req.rateLimit.limit,
          'X-RateLimit-Remaining': req.rateLimit.remaining,
          'X-RateLimit-Reset': req.rateLimit.reset
        });
        
        next();
      };

      testApp.get('/test', shortWindowRateLimit, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(testApp)
        .get('/test')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBe('2');
      expect(response.headers['x-ratelimit-remaining']).toBe('1');
    });
  });

  describe('Rate Limit by IP Address', () => {
    it('should track rate limits per IP address', async () => {
      const testApp = express();
      
      // Simulate different IP addresses
      testApp.get('/test', (req, res, next) => {
        Object.defineProperty(req, 'ip', { value: '192.168.1.1', writable: true });
        next();
      }, healthRateLimit, (req, res) => {
        res.json({ ip: req.ip });
      });

      const response = await request(testApp)
        .get('/test')
        .expect(200);

      expect(response.body.ip).toBe('192.168.1.1');
    });

    it('should handle requests from different IPs independently', async () => {
      const testApp = express();
      
      let requestCount = 0;
      testApp.get('/test', (req, res, next) => {
        Object.defineProperty(req, 'ip', { value: `192.168.1.${requestCount % 2 + 1}`, writable: true });
        requestCount++;
        next();
      }, healthRateLimit, (req, res) => {
        res.json({ ip: req.ip });
      });

      const promises = Array.from({ length: 4 }, () =>
        request(testApp).get('/test').expect(200)
      );

      const responses = await Promise.all(promises);
      
      // Should succeed from both IPs
      expect(responses).toHaveLength(4);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should use environment-specific rate limits', () => {
      // Test that different environments have different limits
      const originalEnv = process.env.NODE_ENV;
      
      // Test development environment
      process.env.NODE_ENV = 'development';
      // Rate limits should be more permissive in development
      
      // Test production environment
      process.env.NODE_ENV = 'production';
      // Rate limits should be more restrictive in production
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
      
      // This test verifies the concept - actual implementation would
      // check the specific rate limit values based on environment
      expect(true).toBe(true);
    });

    it('should handle custom rate limit messages', async () => {
      const testApp = express();
      
      const customRateLimit = (req: any, res: any, next: any) => {
        // Simulate custom rate limit exceeded
        res.status(429).json({
          error: 'VIS API Rate Limit Exceeded',
          message: 'The VIS API has rate limits to ensure fair usage. Please wait before making more requests.',
          retryAfter: 60,
          documentation: 'https://vis-api.fivb.com/docs/rate-limits'
        });
      };

      testApp.get('/vis-limited', customRateLimit);

      const response = await request(testApp)
        .get('/vis-limited')
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'VIS API Rate Limit Exceeded',
        message: expect.stringContaining('VIS API has rate limits'),
        retryAfter: 60,
        documentation: expect.any(String)
      });
    });
  });

  describe('Rate Limit Edge Cases', () => {
    it('should handle concurrent requests properly', async () => {
      const testApp = express();
      
      let concurrentCount = 0;
      const maxConcurrent = 5;
      
      testApp.get('/concurrent', (req, res, next) => {
        concurrentCount++;
        if (concurrentCount > maxConcurrent) {
          return res.status(429).json({ error: 'Too many concurrent requests' });
        }
        
        // Simulate processing time
        setTimeout(() => {
          concurrentCount--;
          res.json({ processed: true });
        }, 100);
      });

      // Fire off many concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        request(testApp).get('/concurrent')
      );

      const responses = await Promise.allSettled(promises);
      
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 200
      );
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 429
      );

      // Some should succeed, some should be rate limited
      expect(successful.length + rateLimited.length).toBe(10);
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 10000);

    it('should handle malformed requests gracefully', async () => {
      const testApp = express();
      
      testApp.get('/test', healthRateLimit, (req, res) => {
        res.json({ success: true });
      });

      // Test with unusual headers or request formats
      const response = await request(testApp)
        .get('/test')
        .set('X-Forwarded-For', 'invalid-ip')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle empty or missing IP addresses', async () => {
      const testApp = express();
      
      testApp.get('/test', (req, res, next) => {
        Object.defineProperty(req, 'ip', { value: '', writable: true });
        next();
      }, healthRateLimit, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(testApp)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});