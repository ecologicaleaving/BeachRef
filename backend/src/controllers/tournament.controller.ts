import { Request, Response } from 'express';
import { tournamentService } from '../services/tournament.service';
import { TournamentQueryParams } from '../types/tournament.types';
import { visLogger } from '../utils/logger';

export class TournamentController {
  async getTournaments(req: Request, res: Response): Promise<void> {
    try {
      const params: TournamentQueryParams = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        location: req.query.location as string,
        type: req.query.type as string,
        search: req.query.search as string,
        // Enhanced filter parameters
        locations: req.query.locations as string,
        types: req.query.types as string,
        surface: req.query.surface as string,
        gender: req.query.gender as string,
        statuses: req.query.statuses as string
      };

      // Validate parameters using extracted method
      const validationError = this.validateTournamentParams(params);
      if (validationError) {
        res.status(400).json(validationError);
        return;
      }

      const result = await tournamentService.getTournaments(params);
      
      visLogger.info('Tournament list request successful', {
        requestId: req.headers['x-request-id'],
        params,
        resultCount: result.tournaments.length
      });

      res.status(200).json(result);
    } catch (error) {
      visLogger.error('Tournament list request failed', error as Error, {
        requestId: req.headers['x-request-id'],
        params: req.query
      });

      res.status(500).json(this.createErrorResponse(500, 'Failed to retrieve tournaments'));
    }
  }

  async getTournamentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        res.status(400).json(this.createErrorResponse(400, 'Tournament ID is required'));
        return;
      }

      const tournamentDetail = await tournamentService.getTournamentById(id);
      
      if (!tournamentDetail) {
        res.status(404).json(this.createErrorResponse(404, 'Tournament not found'));
        return;
      }

      visLogger.info('Tournament detail request successful', {
        requestId: req.headers['x-request-id'],
        tournamentId: id,
        matchCount: tournamentDetail.matches.length
      });

      res.status(200).json(tournamentDetail);
    } catch (error) {
      visLogger.error('Tournament detail request failed', error as Error, {
        requestId: req.headers['x-request-id'],
        tournamentId: req.params.id
      });

      res.status(500).json(this.createErrorResponse(500, 'Failed to retrieve tournament'));
    }
  }

  private validateTournamentParams(params: TournamentQueryParams) {
    const errorResponse = {
      error: 'Bad Request',
      statusCode: 400,
      timestamp: new Date().toISOString()
    };

    // Validate pagination parameters
    if (params.page !== undefined && (params.page < 1 || !Number.isInteger(params.page))) {
      return { ...errorResponse, message: 'Page must be a positive integer' };
    }

    if (params.limit !== undefined && (params.limit < 1 || params.limit > 50 || !Number.isInteger(params.limit))) {
      return { ...errorResponse, message: 'Limit must be an integer between 1 and 50' };
    }

    // Validate date parameters
    if (params.dateFrom && isNaN(Date.parse(params.dateFrom))) {
      return { ...errorResponse, message: 'dateFrom must be a valid ISO date string' };
    }

    if (params.dateTo && isNaN(Date.parse(params.dateTo))) {
      return { ...errorResponse, message: 'dateTo must be a valid ISO date string' };
    }

    // Validate filter parameters
    if (params.surface && !['Sand', 'Indoor'].includes(params.surface)) {
      return { ...errorResponse, message: 'surface must be either Sand or Indoor' };
    }

    if (params.gender && !['Men', 'Women', 'Mixed'].includes(params.gender)) {
      return { ...errorResponse, message: 'gender must be Men, Women, or Mixed' };
    }

    if (params.types) {
      const validTypes = ['World Tour', 'Continental', 'National', 'Regional'];
      const types = params.types.split(',');
      for (const type of types) {
        if (!validTypes.includes(type.trim())) {
          return { ...errorResponse, message: `Invalid tournament type: ${type}. Valid types are: ${validTypes.join(', ')}` };
        }
      }
    }

    if (params.statuses) {
      const validStatuses = ['Upcoming', 'Live', 'Completed', 'Cancelled'];
      const statuses = params.statuses.split(',');
      for (const status of statuses) {
        if (!validStatuses.includes(status.trim())) {
          return { ...errorResponse, message: `Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}` };
        }
      }
    }

    return null;
  }

  private createErrorResponse(status: number, message: string) {
    return {
      error: status === 400 ? 'Bad Request' : status === 404 ? 'Not Found' : 'Internal Server Error',
      message,
      statusCode: status,
      timestamp: new Date().toISOString()
    };
  }
}

export const tournamentController = new TournamentController();