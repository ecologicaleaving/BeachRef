import request from 'supertest';
import express from 'express';
import { HealthController, healthController } from '../health.controller';
import { visService } from '../../services/vis.service';
import { appLogger } from '../../utils/logger';
import { HealthStatus, VISHealthResponse } from '../../types/vis.types';

// Mock dependencies
jest.mock('../../services/vis.service');
jest.mock('../../utils/logger');

const mockedVISService = visService as jest.Mocked<typeof visService>;
const mockedLogger = appLogger as jest.Mocked<typeof appLogger>;

describe.skip('HealthController Integration Tests', () => {
  let app: express.Application;
  let controller: HealthController;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create Express app for testing
    app = express();
    app.use(express.json());
    
    controller = new HealthController();
    
    // Setup routes
    app.get('/api/health', controller.getHealth.bind(controller));
    app.get('/api/health/vis', controller.getVISHealth.bind(controller));
    app.get('/api/monitoring', controller.getMonitoring.bind(controller));
    app.delete('/api/cache/clear', controller.clearCache.bind(controller));
  });

  describe('GET /api/health', () => {
    it('should return healthy status with service information', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'VisConnect API',
        version: '1.0.0',
        environment: expect.any(String)
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully', async () => {
      // Mock process.uptime to throw an error
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Process error');
      });

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        error: 'Service health check failed'
      });
      expect(response.body.timestamp).toBeDefined();
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.any(Error),
        { endpoint: '/health' }
      );

      // Restore original function
      process.uptime = originalUptime;
    });
  });

  describe('GET /api/health/vis', () => {
    it('should return comprehensive health status when all services are healthy', async () => {
      const mockVISHealth: HealthStatus = {
        status: 'healthy',
        timestamp: '2025-07-27T10:00:00Z',
        responseTime: 150
      };

      const mockCacheStats = {
        keys: 5,
        hits: 10,
        misses: 2
      };

      mockedVISService.healthCheck.mockResolvedValue(mockVISHealth);
      mockedVISService.getCacheStats.mockReturnValue(mockCacheStats);

      const response = await request(app)
        .get('/api/health/vis')
        .expect(200);

      const expectedResponse: VISHealthResponse = {
        vis: mockVISHealth,
        database: {
          status: 'healthy',
          timestamp: expect.any(String),
          responseTime: 1
        },
        cache: {
          status: 'healthy',
          timestamp: expect.any(String),
          responseTime: 0
        },
        overall: {
          status: 'healthy',
          timestamp: expect.any(String),
          responseTime: expect.any(Number)
        }
      };

      expect(response.body).toMatchObject(expectedResponse);
    });

    it('should return degraded status when VIS is degraded', async () => {
      const mockVISHealth: HealthStatus = {
        status: 'degraded',
        timestamp: '2025-07-27T10:00:00Z',
        responseTime: 3000
      };

      mockedVISService.healthCheck.mockResolvedValue(mockVISHealth);
      mockedVISService.getCacheStats.mockReturnValue({ keys: 0, hits: 0, misses: 0 });

      const response = await request(app)
        .get('/api/health/vis')
        .expect(200);

      expect(response.body.overall.status).toBe('degraded');
      expect(response.body.vis.status).toBe('degraded');
    });

    it('should return unhealthy status when VIS is unhealthy', async () => {
      const mockVISHealth: HealthStatus = {
        status: 'unhealthy',
        timestamp: '2025-07-27T10:00:00Z',
        error: 'VIS API connection failed'
      };

      mockedVISService.healthCheck.mockResolvedValue(mockVISHealth);
      mockedVISService.getCacheStats.mockReturnValue({ keys: 0, hits: 0, misses: 0 });

      const response = await request(app)
        .get('/api/health/vis')
        .expect(503);

      expect(response.body.overall.status).toBe('unhealthy');
      expect(response.body.vis.status).toBe('unhealthy');
      expect(response.body.vis.error).toBe('VIS API connection failed');
    });

    it('should handle VIS service errors and return 503', async () => {
      const error = new Error('VIS service unavailable');
      mockedVISService.healthCheck.mockRejectedValue(error);

      const response = await request(app)
        .get('/api/health/vis')
        .expect(503);

      expect(response.body).toMatchObject({
        vis: {
          status: 'unhealthy',
          error: 'VIS service unavailable'
        },
        overall: {
          status: 'unhealthy',
          error: 'Health check failed'
        }
      });

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'VIS health check failed',
        error,
        { endpoint: '/health/vis' }
      );
    });

    it('should measure response time accurately', async () => {
      const mockVISHealth: HealthStatus = {
        status: 'healthy',
        timestamp: '2025-07-27T10:00:00Z',
        responseTime: 150
      };

      // Add delay to simulate processing time
      mockedVISService.healthCheck.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return mockVISHealth;
      });
      
      mockedVISService.getCacheStats.mockReturnValue({ keys: 0, hits: 0, misses: 0 });

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/health/vis')
        .expect(200);
      const endTime = Date.now();

      expect(response.body.overall.responseTime).toBeGreaterThan(0);
      expect(response.body.overall.responseTime).toBeLessThan(endTime - startTime + 100); // Allow some margin
    });
  });

  describe('GET /api/monitoring', () => {
    it('should return comprehensive monitoring data', async () => {
      const mockVISHealth: HealthStatus = {
        status: 'healthy',
        timestamp: '2025-07-27T10:00:00Z',
        responseTime: 120
      };

      const mockCacheStats = {
        keys: 10,
        hits: 15,
        misses: 3
      };

      mockedVISService.healthCheck.mockResolvedValue(mockVISHealth);
      mockedVISService.getCacheStats.mockReturnValue(mockCacheStats);

      const response = await request(app)
        .get('/api/monitoring')
        .expect(200);

      expect(response.body).toMatchObject({
        timestamp: expect.any(String),
        service: {
          name: 'VisConnect',
          version: '1.0.0',
          uptime: expect.any(Number),
          memory: expect.any(Object),
          environment: expect.any(String)
        },
        vis: {
          status: 'healthy',
          responseTime: 120,
          lastCheck: '2025-07-27T10:00:00Z'
        },
        cache: {
          status: 'healthy',
          stats: mockCacheStats,
          keys: 10,
          hitRate: '83.33%' // 15/(15+3) * 100
        },
        performance: {
          averageResponseTime: 120,
          requestsPerMinute: 0,
          errorRate: '0%'
        }
      });
    });

    it('should calculate cache hit rate correctly', async () => {
      const testCases = [
        { hits: 10, misses: 0, expected: '100.00%' },
        { hits: 0, misses: 10, expected: '0.00%' },
        { hits: 0, misses: 0, expected: '0%' },
        { hits: 7, misses: 3, expected: '70.00%' }
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        
        const mockVISHealth: HealthStatus = {
          status: 'healthy',
          timestamp: '2025-07-27T10:00:00Z',
          responseTime: 100
        };

        mockedVISService.healthCheck.mockResolvedValue(mockVISHealth);
        mockedVISService.getCacheStats.mockReturnValue({
          keys: testCase.hits + testCase.misses,
          hits: testCase.hits,
          misses: testCase.misses
        });

        const response = await request(app)
          .get('/api/monitoring')
          .expect(200);

        expect(response.body.cache.hitRate).toBe(testCase.expected);
      }
    });

    it('should handle monitoring errors gracefully', async () => {
      const error = new Error('Monitoring data collection failed');
      mockedVISService.healthCheck.mockRejectedValue(error);

      const response = await request(app)
        .get('/api/monitoring')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to collect monitoring data',
        timestamp: expect.any(String)
      });

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Monitoring data collection failed',
        error,
        { endpoint: '/monitoring' }
      );
    });

    it('should include memory usage information', async () => {
      const mockVISHealth: HealthStatus = {
        status: 'healthy',
        timestamp: '2025-07-27T10:00:00Z',
        responseTime: 100
      };

      mockedVISService.healthCheck.mockResolvedValue(mockVISHealth);
      mockedVISService.getCacheStats.mockReturnValue({ keys: 0, hits: 0, misses: 0 });

      const response = await request(app)
        .get('/api/monitoring')
        .expect(200);

      expect(response.body.service.memory).toMatchObject({
        rss: expect.any(Number),
        heapTotal: expect.any(Number),
        heapUsed: expect.any(Number),
        external: expect.any(Number)
      });
    });
  });

  describe('DELETE /api/cache/clear', () => {
    it('should clear all cache when no pattern provided', async () => {
      const response = await request(app)
        .delete('/api/cache/clear')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'All cache cleared',
        timestamp: expect.any(String)
      });

      expect(mockedVISService.clearCache).toHaveBeenCalledWith(undefined);
    });

    it('should clear cache with pattern when provided', async () => {
      const response = await request(app)
        .delete('/api/cache/clear?pattern=tournament')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Cache cleared for pattern: tournament',
        timestamp: expect.any(String)
      });

      expect(mockedVISService.clearCache).toHaveBeenCalledWith('tournament');
    });

    it('should handle cache clear errors', async () => {
      const error = new Error('Cache clear failed');
      mockedVISService.clearCache.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .delete('/api/cache/clear')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to clear cache',
        timestamp: expect.any(String)
      });

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Cache clear failed',
        error,
        { endpoint: '/cache/clear', pattern: undefined }
      );
    });

    it('should log pattern when cache clear fails with pattern', async () => {
      const error = new Error('Cache clear failed');
      mockedVISService.clearCache.mockImplementation(() => {
        throw error;
      });

      await request(app)
        .delete('/api/cache/clear?pattern=test')
        .expect(500);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Cache clear failed',
        error,
        { endpoint: '/cache/clear', pattern: 'test' }
      );
    });
  });

  describe('Health Status Logic', () => {
    it('should correctly determine overall status with mixed service health', () => {
      const testCases = [
        {
          name: 'all healthy',
          vis: 'healthy',
          expected: 'healthy'
        },
        {
          name: 'one degraded',
          vis: 'degraded',
          expected: 'degraded'
        },
        {
          name: 'one unhealthy',
          vis: 'unhealthy',
          expected: 'unhealthy'
        }
      ] as const;

      return Promise.all(testCases.map(async ({ name, vis, expected }) => {
        jest.clearAllMocks();
        
        const mockVISHealth: HealthStatus = {
          status: vis,
          timestamp: '2025-07-27T10:00:00Z',
          responseTime: 100
        };

        mockedVISService.healthCheck.mockResolvedValue(mockVISHealth);
        mockedVISService.getCacheStats.mockReturnValue({ keys: 0, hits: 0, misses: 0 });

        const response = await request(app)
          .get('/api/health/vis');

        expect(response.body.overall.status).toBe(expected);
      }));
    });
  });

  describe('Response Time Measurement', () => {
    it('should include response time in health checks', async () => {
      const mockVISHealth: HealthStatus = {
        status: 'healthy',
        timestamp: '2025-07-27T10:00:00Z',
        responseTime: 250
      };

      mockedVISService.healthCheck.mockResolvedValue(mockVISHealth);
      mockedVISService.getCacheStats.mockReturnValue({ keys: 0, hits: 0, misses: 0 });

      const response = await request(app)
        .get('/api/health/vis')
        .expect(200);

      expect(response.body.overall.responseTime).toBeGreaterThan(0);
      expect(response.body.vis.responseTime).toBe(250);
    });
  });
});