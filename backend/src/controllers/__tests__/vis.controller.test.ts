import request from 'supertest';
import express from 'express';
import { VISController, visController } from '../vis.controller';
import { visService } from '../../services/vis.service';
import { VISAPIError, TournamentLevel, TournamentStatus } from '../../types/vis.types';

// Mock VIS service
jest.mock('../../services/vis.service');
const mockedVISService = visService as jest.Mocked<typeof visService>;

describe('VIS Controller Integration Tests', () => {
  let app: express.Application;
  let controller: VISController;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    controller = new VISController();
    
    // Setup routes
    app.get('/api/vis/tournaments/count', controller.getTournamentCount.bind(controller));
    app.get('/api/vis/tournaments/:id', controller.getTournamentById.bind(controller));
    app.get('/api/vis/tournaments', controller.getTournaments.bind(controller));
    app.get('/api/vis/test-connectivity', controller.testConnectivity.bind(controller));
  });

  describe('Network Issues and Retry Logic', () => {
    it('should handle network timeouts with proper error response', async () => {
      const timeoutError = new VISAPIError('timeout of 5000ms exceeded', 0);
      mockedVISService.getTournamentCount.mockRejectedValue(timeoutError);

      const response = await request(app)
        .get('/api/vis/tournaments/count')
        .expect(503);

      expect(response.body).toMatchObject({
        error: 'VIS API Error',
        message: 'Failed to fetch tournament count',
        details: 'timeout of 5000ms exceeded'
      });
    });

    it('should handle connection refused errors', async () => {
      const connectionError = new VISAPIError('connect ECONNREFUSED 127.0.0.1:443', 0);
      mockedVISService.getTournaments.mockRejectedValue(connectionError);

      const response = await request(app)
        .get('/api/vis/tournaments')
        .expect(503);

      expect(response.body).toMatchObject({
        error: 'VIS API Error',
        message: 'Failed to fetch tournaments',
        details: 'connect ECONNREFUSED 127.0.0.1:443'
      });
    });

    it('should handle DNS resolution failures', async () => {
      const dnsError = new VISAPIError('getaddrinfo ENOTFOUND vis-api.fivb.com', 0);
      mockedVISService.getTournamentById.mockRejectedValue(dnsError);

      const response = await request(app)
        .get('/api/vis/tournaments/test-tournament-1')
        .expect(503);

      expect(response.body).toMatchObject({
        error: 'VIS API Error',
        message: 'Failed to fetch tournament',
        details: 'getaddrinfo ENOTFOUND vis-api.fivb.com'
      });
    });

    it('should simulate retry logic with eventual success', async () => {
      // First two calls fail, third succeeds
      mockedVISService.getTournamentCount
        .mockRejectedValueOnce(new VISAPIError('Network error', 503))
        .mockRejectedValueOnce(new VISAPIError('Network error', 503))
        .mockResolvedValue(42);

      // In reality, the service handles retries internally
      // This tests that the controller properly handles the final result
      const response = await request(app)
        .get('/api/vis/tournaments/count')
        .expect(200);

      expect(response.body).toEqual({ count: 42 });
    });

    it('should handle SSL/TLS certificate errors', async () => {
      const sslError = new VISAPIError('unable to verify the first certificate', 0);
      mockedVISService.healthCheck.mockRejectedValue(sslError);

      const response = await request(app)
        .get('/api/vis/test-connectivity')
        .expect(503);

      expect(response.body.error).toContain('connectivity');
    });

    it('should handle HTTP 502 Bad Gateway errors', async () => {
      const badGatewayError = new VISAPIError('Bad Gateway', 502);
      mockedVISService.getTournaments.mockRejectedValue(badGatewayError);

      const response = await request(app)
        .get('/api/vis/tournaments')
        .expect(502);

      expect(response.body).toMatchObject({
        error: 'VIS API Error',
        message: 'Failed to fetch tournaments',
        details: 'Bad Gateway'
      });
    });

    it('should handle HTTP 503 Service Unavailable', async () => {
      const serviceUnavailableError = new VISAPIError('Service Temporarily Unavailable', 503);
      mockedVISService.getTournaments.mockRejectedValue(serviceUnavailableError);

      const response = await request(app)
        .get('/api/vis/tournaments')
        .expect(503);

      expect(response.body).toMatchObject({
        error: 'VIS API Error',
        message: 'Failed to fetch tournaments',
        details: 'Service Temporarily Unavailable'
      });
    });
  });

  describe('Rate Limiting Scenarios', () => {
    it('should handle VIS API rate limit exceeded (429)', async () => {
      const rateLimitError = new VISAPIError('Too Many Requests', 429);
      mockedVISService.getTournaments.mockRejectedValue(rateLimitError);

      const response = await request(app)
        .get('/api/vis/tournaments')
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'VIS API Error',
        message: 'Failed to fetch tournaments',
        details: 'Too Many Requests'
      });
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = new VISAPIError('API quota exceeded', 429);
      mockedVISService.getTournamentCount.mockRejectedValue(quotaError);

      const response = await request(app)
        .get('/api/vis/tournaments/count')
        .expect(429);

      expect(response.body.details).toContain('quota');
    });
  });

  describe('Data Consistency and Error Recovery', () => {
    it('should handle partial data responses gracefully', async () => {
      // Simulate corrupted or incomplete data
      const partialTournaments = [
        {
          id: 'tournament-1',
          name: 'Complete Tournament',
          dates: {
            start: new Date('2025-07-01'),
            end: new Date('2025-07-07')
          },
          location: {
            city: 'Rio',
            country: 'Brazil'
          },
          level: TournamentLevel.WORLD_TOUR,
          status: TournamentStatus.ONGOING,
          matchCount: 16
        }
      ];

      mockedVISService.getTournaments.mockResolvedValue(partialTournaments);

      const response = await request(app)
        .get('/api/vis/tournaments')
        .expect(200);

      expect(response.body.tournaments).toHaveLength(1);
      expect(response.body.tournaments[0]).toMatchObject({
        id: 'tournament-1',
        name: 'Complete Tournament'
      });
    });

    it('should handle malformed tournament data', async () => {
      const malformedError = new VISAPIError('Invalid JSON response from VIS API', 500);
      mockedVISService.getTournaments.mockRejectedValue(malformedError);

      const response = await request(app)
        .get('/api/vis/tournaments')
        .expect(500);

      expect(response.body.details).toContain('Invalid JSON');
    });

    it('should handle empty responses appropriately', async () => {
      mockedVISService.getTournaments.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/vis/tournaments')
        .expect(200);

      expect(response.body).toEqual({
        tournaments: [],
        total: 0,
        page: 1,
        limit: 50
      });
    });

    it('should handle tournament not found scenarios', async () => {
      mockedVISService.getTournamentById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/vis/tournaments/non-existent-tournament')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Tournament not found',
        message: 'Tournament with ID non-existent-tournament not found'
      });
    });
  });

  describe('Performance and Load Testing Scenarios', () => {
    it('should handle high-frequency requests', async () => {
      mockedVISService.getTournamentCount.mockResolvedValue(100);

      // Simulate burst of requests
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/vis/tournaments/count')
      );

      const responses = await Promise.allSettled(requests);
      
      // All should either succeed or be rate limited
      responses.forEach(response => {
        if (response.status === 'fulfilled') {
          expect([200, 429]).toContain((response.value as any).status);
        }
      });
    });

    it('should handle concurrent requests to different endpoints', async () => {
      mockedVISService.getTournamentCount.mockResolvedValue(50);
      mockedVISService.getTournaments.mockResolvedValue([]);
      mockedVISService.healthCheck.mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: 150
      });

      const requests = [
        request(app).get('/api/vis/tournaments/count'),
        request(app).get('/api/vis/tournaments'),
        request(app).get('/api/vis/test-connectivity')
      ];

      const responses = await Promise.all(requests);
      
      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(200);
      expect(responses[2].status).toBe(200);
    });

    it('should handle timeout scenarios gracefully', async () => {
      // Simulate a very slow response that times out
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new VISAPIError('Request timeout', 408)), 100);
      });

      mockedVISService.getTournaments.mockImplementation(() => timeoutPromise as any);

      const response = await request(app)
        .get('/api/vis/tournaments')
        .expect(408);

      expect(response.body.details).toContain('timeout');
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should handle circuit breaker open state', async () => {
      const circuitOpenError = new VISAPIError('Circuit breaker is OPEN', 503);
      mockedVISService.getTournaments.mockRejectedValue(circuitOpenError);

      const response = await request(app)
        .get('/api/vis/tournaments')
        .expect(503);

      expect(response.body.details).toContain('Circuit breaker');
    });

    it('should allow requests when circuit breaker is closed', async () => {
      const mockTournaments = [
        {
          id: 'test-tournament',
          name: 'Test Tournament',
          dates: {
            start: new Date('2025-07-01'),
            end: new Date('2025-07-07')
          },
          location: {
            city: 'Test City',
            country: 'Test Country'
          },
          level: TournamentLevel.NATIONAL,
          status: TournamentStatus.UPCOMING,
          matchCount: 8
        }
      ];

      mockedVISService.getTournaments.mockResolvedValue(mockTournaments);

      const response = await request(app)
        .get('/api/vis/tournaments')
        .expect(200);

      expect(response.body.tournaments).toHaveLength(1);
    });
  });

  describe('Authentication and Authorization Errors', () => {
    it('should handle authentication failures', async () => {
      const authError = new VISAPIError('Unauthorized', 401);
      mockedVISService.getTournaments.mockRejectedValue(authError);

      const response = await request(app)
        .get('/api/vis/tournaments')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'VIS API Error',
        message: 'Failed to fetch tournaments',
        details: 'Unauthorized'
      });
    });

    it('should handle forbidden access errors', async () => {
      const forbiddenError = new VISAPIError('Forbidden', 403);
      mockedVISService.getTournamentById.mockRejectedValue(forbiddenError);

      const response = await request(app)
        .get('/api/vis/tournaments/restricted-tournament')
        .expect(403);

      expect(response.body.details).toBe('Forbidden');
    });

    it('should handle API key errors', async () => {
      const apiKeyError = new VISAPIError('Invalid API key', 401);
      mockedVISService.healthCheck.mockRejectedValue(apiKeyError);

      const response = await request(app)
        .get('/api/vis/test-connectivity')
        .expect(503);

      expect(response.body.error).toContain('connectivity');
    });
  });

  describe('Data Validation and Filtering', () => {
    it('should handle invalid filter parameters gracefully', async () => {
      mockedVISService.getTournaments.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/vis/tournaments?level=invalid-level&status=unknown')
        .expect(200);

      expect(response.body.tournaments).toEqual([]);
    });

    it('should validate date range parameters', async () => {
      const response = await request(app)
        .get('/api/vis/tournaments?startDateFrom=invalid-date')
        .expect(400);

      expect(response.body.error).toContain('Invalid date');
    });

    it('should handle pagination parameters correctly', async () => {
      mockedVISService.getTournaments.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/vis/tournaments?limit=10&offset=20')
        .expect(200);

      expect(response.body).toMatchObject({
        tournaments: [],
        total: 0,
        page: 3, // offset 20 / limit 10 + 1
        limit: 10
      });
    });
  });

  describe('Recovery and Resilience', () => {
    it('should recover from temporary network issues', async () => {
      // Simulate network recovery
      mockedVISService.getTournamentCount
        .mockRejectedValueOnce(new VISAPIError('Network error', 0))
        .mockResolvedValue(25);

      // First request fails
      await request(app)
        .get('/api/vis/tournaments/count')
        .expect(503);

      // Second request succeeds after "recovery"
      const response = await request(app)
        .get('/api/vis/tournaments/count')
        .expect(200);

      expect(response.body.count).toBe(25);
    });

    it('should handle degraded service scenarios', async () => {
      // Simulate degraded performance with slow responses
      const slowResponse = new Promise(resolve => {
        setTimeout(() => resolve([]), 2000);
      });

      mockedVISService.getTournaments.mockImplementation(() => slowResponse as any);

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/vis/tournaments')
        .expect(200);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThan(1500); // Should take at least 1.5 seconds
      expect(response.body.tournaments).toEqual([]);
    }, 10000);
  });
});