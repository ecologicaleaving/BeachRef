import { Request, Response } from 'express';
import { tournamentController } from '../tournament.controller';
import { tournamentService } from '../../services/tournament.service';
import { Tournament, PaginatedTournamentResponse, TournamentDetailResponse } from '../../types/tournament.types';

// Mock the tournament service
jest.mock('../../services/tournament.service');
const mockTournamentService = tournamentService as jest.Mocked<typeof tournamentService>;

describe('TournamentController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      headers: { 'x-request-id': 'test-request-id' }
    };
    
    jsonSpy = jest.fn().mockReturnThis();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    
    res = {
      status: statusSpy as any,
      json: jsonSpy as any
    };

    jest.clearAllMocks();
  });

  describe('getTournaments', () => {
    const mockTournament: Tournament = {
      id: '1',
      name: 'Test Tournament',
      dates: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-07')
      },
      location: {
        city: 'Rio de Janeiro',
        country: 'Brazil',
        venue: 'Copacabana Beach'
      },
      level: 'World Tour',
      status: 'Upcoming',
      matchCount: 32,
      prizeMoney: 100000,
      surface: 'Sand',
      gender: 'Men'
    };

    const mockResponse: PaginatedTournamentResponse = {
      tournaments: [mockTournament],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    };

    it('should return tournaments successfully with default pagination', async () => {
      mockTournamentService.getTournaments.mockResolvedValue(mockResponse);

      await tournamentController.getTournaments(req as Request, res as Response);

      expect(mockTournamentService.getTournaments).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        location: undefined,
        type: undefined,
        search: undefined
      });
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith(mockResponse);
    });

    it('should return tournaments with custom pagination', async () => {
      req.query = { page: '2', limit: '25' };
      mockTournamentService.getTournaments.mockResolvedValue(mockResponse);

      await tournamentController.getTournaments(req as Request, res as Response);

      expect(mockTournamentService.getTournaments).toHaveBeenCalledWith({
        page: 2,
        limit: 25,
        dateFrom: undefined,
        dateTo: undefined,
        location: undefined,
        type: undefined,
        search: undefined
      });
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith(mockResponse);
    });

    it('should return tournaments with filters', async () => {
      req.query = {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        location: 'Brazil',
        search: 'volleyball'
      };
      mockTournamentService.getTournaments.mockResolvedValue(mockResponse);

      await tournamentController.getTournaments(req as Request, res as Response);

      expect(mockTournamentService.getTournaments).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        location: 'Brazil',
        type: undefined,
        search: 'volleyball'
      });
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith(mockResponse);
    });

    it('should return 400 for invalid page parameter', async () => {
      req.query = { page: '0' };

      await tournamentController.getTournaments(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Page must be a positive integer',
        statusCode: 400,
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for invalid limit parameter', async () => {
      req.query = { limit: '100' };

      await tournamentController.getTournaments(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Limit must be an integer between 1 and 50',
        statusCode: 400,
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for invalid dateFrom parameter', async () => {
      req.query = { dateFrom: 'invalid-date' };

      await tournamentController.getTournaments(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'dateFrom must be a valid ISO date string',
        statusCode: 400,
        timestamp: expect.any(String)
      });
    });

    it('should return 500 on service error', async () => {
      mockTournamentService.getTournaments.mockRejectedValue(new Error('Service error'));

      await tournamentController.getTournaments(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to retrieve tournaments',
        statusCode: 500,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getTournamentById', () => {
    const mockTournament: Tournament = {
      id: '1',
      name: 'Test Tournament',
      dates: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-07')
      },
      location: {
        city: 'Rio de Janeiro',
        country: 'Brazil',
        venue: 'Copacabana Beach'
      },
      level: 'World Tour',
      status: 'Upcoming',
      matchCount: 32,
      prizeMoney: 100000,
      surface: 'Sand',
      gender: 'Men'
    };

    const mockTournamentDetailResponse: TournamentDetailResponse = {
      tournament: mockTournament,
      matches: [],
      statistics: {
        totalMatches: 0,
        completedMatches: 0,
        upcomingMatches: 0,
        liveMatches: 0
      }
    };

    it('should return tournament successfully', async () => {
      req.params = { id: '1' };
      mockTournamentService.getTournamentById.mockResolvedValue(mockTournamentDetailResponse);

      await tournamentController.getTournamentById(req as Request, res as Response);

      expect(mockTournamentService.getTournamentById).toHaveBeenCalledWith('1');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith(mockTournamentDetailResponse);
    });

    it('should return 404 when tournament not found', async () => {
      req.params = { id: '999' };
      mockTournamentService.getTournamentById.mockResolvedValue(null);

      await tournamentController.getTournamentById(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Tournament not found',
        statusCode: 404,
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for missing ID parameter', async () => {
      req.params = {};

      await tournamentController.getTournamentById(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Tournament ID is required',
        statusCode: 400,
        timestamp: expect.any(String)
      });
    });

    it('should return 500 on service error', async () => {
      req.params = { id: '1' };
      mockTournamentService.getTournamentById.mockRejectedValue(new Error('Service error'));

      await tournamentController.getTournamentById(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to retrieve tournament',
        statusCode: 500,
        timestamp: expect.any(String)
      });
    });
  });
});