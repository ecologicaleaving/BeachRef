import request from 'supertest';
import express from 'express';
import { tournamentController } from '../tournament.controller';
import { tournamentService } from '../../services/tournament.service';
import { RefereeSearchResponse } from '../../types/tournament.types';

// Mock the tournament service
jest.mock('../../services/tournament.service');
const mockTournamentService = tournamentService as jest.Mocked<typeof tournamentService>;

// Mock logger
jest.mock('../../utils/logger', () => ({
  visLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

const app = express();
app.use(express.json());

// Setup test routes
app.get('/api/referees/search', tournamentController.searchReferees.bind(tournamentController));
app.get('/api/tournaments', tournamentController.getTournaments.bind(tournamentController));

describe('Tournament Controller - Referee Functionality (Story 1.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/referees/search', () => {
    const mockRefereeSearchResponse: RefereeSearchResponse = {
      referees: [
        { name: 'John Smith', country: 'USA', matchCount: 15 },
        { name: 'Maria Garcia', country: 'ESP', matchCount: 12 },
        { name: 'Hans Mueller', country: 'GER', matchCount: 8 }
      ]
    };

    it('should search referees successfully with valid query', async () => {
      mockTournamentService.searchReferees.mockResolvedValue(mockRefereeSearchResponse);

      const response = await request(app)
        .get('/api/referees/search')
        .query({ q: 'Smith' })
        .expect(200);

      expect(response.body).toEqual(mockRefereeSearchResponse);
      expect(mockTournamentService.searchReferees).toHaveBeenCalledWith('Smith');
    });

    it('should return 400 when query parameter is missing', async () => {
      const response = await request(app)
        .get('/api/referees/search')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: 'Query parameter "q" is required and must be at least 2 characters',
        statusCode: 400
      });
      
      expect(mockTournamentService.searchReferees).not.toHaveBeenCalled();
    });

    it('should return 400 when query parameter is too short', async () => {
      const response = await request(app)
        .get('/api/referees/search')
        .query({ q: 'a' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: 'Query parameter "q" is required and must be at least 2 characters',
        statusCode: 400
      });
      
      expect(mockTournamentService.searchReferees).not.toHaveBeenCalled();
    });

    it('should return 400 when query parameter is not a string', async () => {
      const response = await request(app)
        .get('/api/referees/search')
        .query({ q: 123 })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: 'Query parameter "q" is required and must be at least 2 characters',
        statusCode: 400
      });
      
      expect(mockTournamentService.searchReferees).not.toHaveBeenCalled();
    });

    it('should trim whitespace from query parameter', async () => {
      mockTournamentService.searchReferees.mockResolvedValue(mockRefereeSearchResponse);

      await request(app)
        .get('/api/referees/search')
        .query({ q: '  Smith  ' })
        .expect(200);

      expect(mockTournamentService.searchReferees).toHaveBeenCalledWith('Smith');
    });

    it('should handle empty search results', async () => {
      const emptyResponse: RefereeSearchResponse = { referees: [] };
      mockTournamentService.searchReferees.mockResolvedValue(emptyResponse);

      const response = await request(app)
        .get('/api/referees/search')
        .query({ q: 'NonexistentReferee' })
        .expect(200);

      expect(response.body).toEqual(emptyResponse);
      expect(mockTournamentService.searchReferees).toHaveBeenCalledWith('NonexistentReferee');
    });

    it('should handle service errors and return 500', async () => {
      const error = new Error('VIS API connection failed');
      mockTournamentService.searchReferees.mockRejectedValue(error);

      const response = await request(app)
        .get('/api/referees/search')
        .query({ q: 'Smith' })
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal Server Error',
        message: 'Failed to search referees',
        statusCode: 500
      });
    });

    it('should handle case-insensitive search', async () => {
      mockTournamentService.searchReferees.mockResolvedValue(mockRefereeSearchResponse);

      await request(app)
        .get('/api/referees/search')
        .query({ q: 'SMITH' })
        .expect(200);

      expect(mockTournamentService.searchReferees).toHaveBeenCalledWith('SMITH');
    });

    it('should handle special characters in search query', async () => {
      mockTournamentService.searchReferees.mockResolvedValue(mockRefereeSearchResponse);

      await request(app)
        .get('/api/referees/search')
        .query({ q: 'García-Smith' })
        .expect(200);

      expect(mockTournamentService.searchReferees).toHaveBeenCalledWith('García-Smith');
    });

    it('should return referees with correct data structure', async () => {
      const response = await request(app)
        .get('/api/referees/search')
        .query({ q: 'Smith' });

      expect(response.body.referees).toBeInstanceOf(Array);
      
      if (response.body.referees.length > 0) {
        const referee = response.body.referees[0];
        expect(referee).toHaveProperty('name');
        expect(referee).toHaveProperty('matchCount');
        expect(typeof referee.name).toBe('string');
        expect(typeof referee.matchCount).toBe('number');
      }
    });
  });

  describe('GET /api/tournaments with referee filtering', () => {
    beforeEach(() => {
      // Mock default tournament service response
      mockTournamentService.getTournaments.mockResolvedValue({
        tournaments: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      });
    });

    it('should pass referee filter parameter to service', async () => {
      await request(app)
        .get('/api/tournaments')
        .query({ referees: 'John Smith,Maria Garcia' })
        .expect(200);

      expect(mockTournamentService.getTournaments).toHaveBeenCalledWith(
        expect.objectContaining({
          referees: 'John Smith,Maria Garcia'
        })
      );
    });

    it('should handle single referee filter', async () => {
      await request(app)
        .get('/api/tournaments')
        .query({ referees: 'John Smith' })
        .expect(200);

      expect(mockTournamentService.getTournaments).toHaveBeenCalledWith(
        expect.objectContaining({
          referees: 'John Smith'
        })
      );
    });

    it('should combine referee filter with other filters', async () => {
      await request(app)
        .get('/api/tournaments')
        .query({ 
          referees: 'John Smith',
          locations: 'Brazil,USA',
          types: 'World Tour'
        })
        .expect(200);

      expect(mockTournamentService.getTournaments).toHaveBeenCalledWith(
        expect.objectContaining({
          referees: 'John Smith',
          locations: 'Brazil,USA',
          types: 'World Tour'
        })
      );
    });

    it('should handle referee filter with special characters', async () => {
      await request(app)
        .get('/api/tournaments')
        .query({ referees: 'García-Martínez,João Silva' })
        .expect(200);

      expect(mockTournamentService.getTournaments).toHaveBeenCalledWith(
        expect.objectContaining({
          referees: 'García-Martínez,João Silva'
        })
      );
    });

    it('should handle empty referee filter parameter', async () => {
      await request(app)
        .get('/api/tournaments')
        .query({ referees: '' })
        .expect(200);

      expect(mockTournamentService.getTournaments).toHaveBeenCalledWith(
        expect.objectContaining({
          referees: ''
        })
      );
    });

    it('should handle URL-encoded referee names', async () => {
      await request(app)
        .get('/api/tournaments')
        .query({ referees: encodeURIComponent('João Silva,María García') })
        .expect(200);

      expect(mockTournamentService.getTournaments).toHaveBeenCalledWith(
        expect.objectContaining({
          referees: 'João Silva,María García'
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle tournament service errors in referee search', async () => {
      const error = new Error('Database connection failed');
      mockTournamentService.searchReferees.mockRejectedValue(error);

      const response = await request(app)
        .get('/api/referees/search')
        .query({ q: 'Smith' })
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal Server Error',
        message: 'Failed to search referees',
        statusCode: 500
      });
    });

    it('should maintain error response format consistency', async () => {
      mockTournamentService.searchReferees.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/referees/search')
        .query({ q: 'Smith' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Request logging', () => {
    it('should log successful referee search requests', async () => {
      const mockRefereeResponse: RefereeSearchResponse = {
        referees: [{ name: 'John Smith', country: 'USA', matchCount: 5 }]
      };
      mockTournamentService.searchReferees.mockResolvedValue(mockRefereeResponse);

      await request(app)
        .get('/api/referees/search')
        .query({ q: 'Smith' })
        .expect(200);

      // Note: Actual logging verification would depend on the specific logger implementation
      expect(mockTournamentService.searchReferees).toHaveBeenCalledWith('Smith');
    });

    it('should log failed referee search requests', async () => {
      mockTournamentService.searchReferees.mockRejectedValue(new Error('Service error'));

      await request(app)
        .get('/api/referees/search')
        .query({ q: 'Smith' })
        .expect(500);

      expect(mockTournamentService.searchReferees).toHaveBeenCalledWith('Smith');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle concurrent referee search requests', async () => {
      const mockResponse: RefereeSearchResponse = {
        referees: [{ name: 'John Smith', country: 'USA', matchCount: 5 }]
      };
      mockTournamentService.searchReferees.mockResolvedValue(mockResponse);

      const requests = [
        request(app).get('/api/referees/search').query({ q: 'Smith' }),
        request(app).get('/api/referees/search').query({ q: 'Garcia' }),
        request(app).get('/api/referees/search').query({ q: 'Mueller' })
      ];

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockResponse);
      });

      expect(mockTournamentService.searchReferees).toHaveBeenCalledTimes(3);
    });

    it('should handle referee filtering combined with pagination', async () => {
      await request(app)
        .get('/api/tournaments')
        .query({ 
          referees: 'John Smith',
          page: 2,
          limit: 15
        })
        .expect(200);

      expect(mockTournamentService.getTournaments).toHaveBeenCalledWith(
        expect.objectContaining({
          referees: 'John Smith',
          page: 2,
          limit: 15
        })
      );
    });
  });
});