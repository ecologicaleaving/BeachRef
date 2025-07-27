import { Request, Response } from 'express';
import { visService } from '../services/vis.service';
import { asyncHandler } from '../middleware/error.middleware';
import { ValidationError, NotFoundError } from '../middleware/error.middleware';
import { TournamentFilters, VISAPIError } from '../types/vis.types';
import { visLogger } from '../utils/logger';

export class VISController {
  // Get tournament count (basic connectivity test)
  getTournamentCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const count = await visService.getTournamentCount();
      const responseTime = Date.now() - startTime;
      
      visLogger.performance('getTournamentCount', responseTime, { count });
      
      res.status(200).json({
        count,
        timestamp: new Date().toISOString(),
        responseTime
      });
    } catch (error) {
      visLogger.error('Failed to get tournament count', error as Error);
      
      if (error instanceof VISAPIError) {
        res.status(error.statusCode || 503).json({
          error: 'VIS API Error',
          message: 'Failed to fetch tournament count',
          details: error.message
        });
        return;
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch tournament count',
        details: (error as Error).message
      });
    }
  });

  // Get tournaments with filtering
  getTournaments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const filters: TournamentFilters = this.buildFiltersFromQuery(req.query);
      const tournaments = await visService.getTournaments(filters);
      const responseTime = Date.now() - startTime;
      
      visLogger.performance('getTournaments', responseTime, { 
        count: tournaments.length,
        filters 
      });
      
      res.status(200).json({
        tournaments,
        total: tournaments.length,
        page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
        limit: filters.limit || 50,
        filters,
        timestamp: new Date().toISOString(),
        responseTime
      });
    } catch (error) {
      visLogger.error('Failed to get tournaments', error as Error, { query: req.query });
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: error.message,
          message: 'Invalid request parameters'
        });
        return;
      }
      
      if (error instanceof VISAPIError) {
        res.status(error.statusCode || 503).json({
          error: 'VIS API Error',
          message: 'Failed to fetch tournaments',
          details: error.message
        });
        return;
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch tournaments',
        details: (error as Error).message
      });
    }
  });

  // Get tournament by ID
  getTournamentById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const { id } = req.params;
    
    if (!id) {
      throw new ValidationError('Tournament ID is required');
    }
    
    try {
      const tournament = await visService.getTournamentById(id);
      const responseTime = Date.now() - startTime;
      
      if (!tournament) {
        res.status(404).json({
          error: 'Tournament not found',
          message: `Tournament with ID ${id} not found`
        });
        return;
      }
      
      visLogger.performance('getTournamentById', responseTime, { id });
      
      res.status(200).json({
        tournament,
        timestamp: new Date().toISOString(),
        responseTime
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: 'Tournament not found',
          message: `Tournament with ID ${id} not found`
        });
        return;
      }
      
      visLogger.error('Failed to get tournament by ID', error as Error, { id });
      
      if (error instanceof VISAPIError) {
        res.status(error.statusCode || 503).json({
          error: 'VIS API Error',
          message: 'Failed to fetch tournament',
          details: error.message
        });
        return;
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch tournament',
        details: (error as Error).message
      });
    }
  });

  // Test VIS API connectivity
  testConnectivity = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // Run multiple tests to verify connectivity
      const [healthStatus, tournamentCount] = await Promise.all([
        visService.healthCheck(),
        visService.getTournamentCount().catch(() => -1) // Don't fail if tournament count fails
      ]);
      
      const responseTime = Date.now() - startTime;
      
      const connectivityTest = {
        overall: {
          status: healthStatus.status === 'healthy' ? 'connected' : 'disconnected',
          responseTime
        },
        health: healthStatus,
        dataAccess: {
          tournamentCount: tournamentCount >= 0 ? tournamentCount : 'unavailable',
          status: tournamentCount >= 0 ? 'accessible' : 'inaccessible'
        },
        timestamp: new Date().toISOString()
      };
      
      visLogger.performance('testConnectivity', responseTime, connectivityTest);
      
      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(connectivityTest);
    } catch (error) {
      visLogger.error('Connectivity test failed', error as Error);
      
      res.status(503).json({
        overall: {
          status: 'disconnected',
          responseTime: Date.now() - startTime
        },
        error: 'VIS API connectivity test failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get cache statistics
  getCacheStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = visService.getCacheStats();
      
      res.status(200).json({
        cache: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      visLogger.error('Failed to get cache stats', error as Error);
      throw error;
    }
  });

  private buildFiltersFromQuery(query: any): TournamentFilters {
    const filters: TournamentFilters = {};
    
    if (query.level) {
      filters.level = query.level;
    }
    
    if (query.status) {
      filters.status = query.status;
    }
    
    if (query.country) {
      filters.country = query.country;
    }
    
    if (query.startDateFrom) {
      filters.startDateFrom = new Date(query.startDateFrom);
      if (isNaN(filters.startDateFrom.getTime())) {
        throw new ValidationError('Invalid date format for startDateFrom parameter');
      }
    }
    
    if (query.startDateTo) {
      filters.startDateTo = new Date(query.startDateTo);
      if (isNaN(filters.startDateTo.getTime())) {
        throw new ValidationError('Invalid date format for startDateTo parameter');
      }
    }
    
    if (query.limit) {
      const limit = parseInt(query.limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }
      filters.limit = limit;
    }
    
    if (query.offset) {
      const offset = parseInt(query.offset);
      if (isNaN(offset) || offset < 0) {
        throw new ValidationError('Offset must be a non-negative number');
      }
      filters.offset = offset;
    }
    
    return filters;
  }
}

export const visController = new VISController();