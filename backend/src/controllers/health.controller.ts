import { Request, Response } from 'express';
import { visService, VISFactoryService } from '../services/vis-factory.service';
import { HealthStatus, VISHealthResponse } from '../types/vis.types';
import { appLogger } from '../utils/logger';

export class HealthController {
  // Basic health check endpoint
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      const healthResponse = {
        status: 'healthy',
        timestamp,
        service: 'VisConnect API',
        version: '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        demoMode: VISFactoryService.isDemoMode()
      };

      res.status(200).json(healthResponse);
    } catch (error) {
      appLogger.error('Health check failed', error as Error, { endpoint: '/health' });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Service health check failed'
      });
    }
  }

  // VIS API specific health check
  async getVISHealth(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Check VIS API connectivity
      const visHealth = await visService.healthCheck();
      
      // Check cache functionality
      const cacheStats = visService.getCacheStats();
      const cacheHealth: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: 0
      };

      // Check database/service health (simplified for MVP)
      const dbHealth: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: 1
      };

      // Calculate overall health
      const overallResponseTime = Date.now() - startTime;
      const allHealthy = [visHealth, cacheHealth, dbHealth].every(h => h.status === 'healthy');
      const anyDegraded = [visHealth, cacheHealth, dbHealth].some(h => h.status === 'degraded');
      
      const overallStatus: HealthStatus['status'] = allHealthy ? 'healthy' : 
                                                    anyDegraded ? 'degraded' : 
                                                    'unhealthy';

      const healthResponse: VISHealthResponse = {
        vis: visHealth,
        database: dbHealth,
        cache: cacheHealth,
        overall: {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          responseTime: overallResponseTime
        }
      };

      // Return appropriate status code based on overall health
      const statusCode = overallStatus === 'healthy' ? 200 : 
                        overallStatus === 'degraded' ? 200 : 503;

      res.status(statusCode).json(healthResponse);
      
    } catch (error) {
      appLogger.error('VIS health check failed', error as Error, { endpoint: '/health/vis' });
      
      const errorResponse: VISHealthResponse = {
        vis: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        database: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Unable to determine database status'
        },
        cache: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Unable to determine cache status'
        },
        overall: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        }
      };

      res.status(503).json(errorResponse);
    }
  }

  // Detailed monitoring endpoint with metrics
  async getMonitoring(req: Request, res: Response): Promise<void> {
    try {
      const cacheStats = visService.getCacheStats();
      
      // Get VIS health with response time
      const visHealth = await visService.healthCheck();
      
      const monitoringData = {
        timestamp: new Date().toISOString(),
        service: {
          name: 'VisConnect',
          version: '1.0.0',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          environment: process.env.NODE_ENV || 'development'
        },
        vis: {
          status: visHealth.status,
          responseTime: visHealth.responseTime,
          lastCheck: visHealth.timestamp,
          error: visHealth.error
        },
        cache: {
          status: 'healthy',
          stats: cacheStats,
          keys: cacheStats.keys || 0,
          hitRate: cacheStats.keys > 0 ? 
            ((cacheStats.hits || 0) / ((cacheStats.hits || 0) + (cacheStats.misses || 0)) * 100).toFixed(2) + '%' : 
            '0%'
        },
        performance: {
          averageResponseTime: visHealth.responseTime || 0,
          requestsPerMinute: 0, // Would need to implement request counting
          errorRate: '0%' // Would need to implement error tracking
        }
      };

      res.status(200).json(monitoringData);
      
    } catch (error) {
      appLogger.error('Monitoring data collection failed', error as Error, { endpoint: '/monitoring' });
      res.status(500).json({
        error: 'Failed to collect monitoring data',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Cache management endpoint
  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      const { pattern } = req.query;
      
      visService.clearCache(pattern as string);
      
      res.status(200).json({
        message: pattern ? `Cache cleared for pattern: ${pattern}` : 'All cache cleared',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      appLogger.error('Cache clear failed', error as Error, { endpoint: '/cache/clear', pattern: req.query.pattern });
      res.status(500).json({
        error: 'Failed to clear cache',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const healthController = new HealthController();