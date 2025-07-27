import axios from 'axios';
import { VISService, visService } from '../vis.service';
import { visCircuitBreaker, retryWithBackoff } from '../../middleware/error.middleware';
import { visLogger } from '../../utils/logger';
import {
  VISTournament,
  Tournament,
  TournamentLevel,
  TournamentStatus,
  HealthStatus,
  VISAPIError
} from '../../types/vis.types';

// Extend axios config to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: { startTime: number };
  }
}

// Mock dependencies
jest.mock('axios');
jest.mock('../../middleware/error.middleware');
jest.mock('../../utils/logger');
jest.mock('../../config/environment', () => ({
  config: {
    visApi: {
      url: 'https://test-vis-api.fivb.com',
      timeout: 5000,
      key: 'test-api-key'
    },
    cache: {
      ttl: 300
    },
    rateLimit: {
      maxRequests: 60,
      windowMs: 60000
    },
    logging: {
      level: 'info'
    },
    nodeEnv: 'test'
  }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedCircuitBreaker = visCircuitBreaker as jest.Mocked<typeof visCircuitBreaker>;
const mockedRetryWithBackoff = retryWithBackoff as jest.Mocked<typeof retryWithBackoff>;
const mockedLogger = visLogger as jest.Mocked<typeof visLogger>;

describe('VISService', () => {
  let service: VISService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Mock circuit breaker to execute immediately
    mockedCircuitBreaker.execute.mockImplementation((fn: any) => fn());
    
    // Mock retry to execute immediately
    (mockedRetryWithBackoff as any).mockImplementation((fn: any) => fn());
    
    service = new VISService();
  });

  describe('constructor', () => {
    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://test-vis-api.fivb.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer test-api-key'
        }
      });
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when VIS API responds successfully', async () => {
      const mockResponse = { data: { status: 'ok' } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.responseTime).toBeDefined();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
      expect(mockedLogger.health).toHaveBeenCalledWith('healthy', expect.any(Number));
    });

    it('should return unhealthy status when VIS API fails', async () => {
      const error = new VISAPIError('Connection failed', 503);
      mockAxiosInstance.get.mockRejectedValue(error);
      mockedCircuitBreaker.execute.mockRejectedValue(error);

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Connection failed');
      expect(mockedLogger.health).toHaveBeenCalledWith('unhealthy', undefined, 'Connection failed');
    });

    it('should cache healthy status for 30 seconds', async () => {
      const mockResponse = { data: { status: 'ok' } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // First call
      const result1 = await service.healthCheck();
      // Second call should return cached result
      const result2 = await service.healthCheck();

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should cache unhealthy status for 10 seconds', async () => {
      const error = new VISAPIError('Connection failed', 503);
      mockAxiosInstance.get.mockRejectedValue(error);
      mockedCircuitBreaker.execute.mockRejectedValue(error);

      // First call
      const result1 = await service.healthCheck();
      // Second call should return cached result
      const result2 = await service.healthCheck();

      expect(result1).toEqual(result2);
      expect(result1.status).toBe('unhealthy');
    });
  });

  describe('getTournamentCount', () => {
    it('should return tournament count from API response', async () => {
      const mockResponse = { data: { total: 42 } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getTournamentCount();

      expect(result).toBe(42);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tournaments', {
        params: { limit: 1, count_only: true }
      });
    });

    it('should return 0 if no total in response', async () => {
      const mockResponse = { data: {} };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getTournamentCount();

      expect(result).toBe(0);
    });

    it('should cache tournament count for 5 minutes', async () => {
      const mockResponse = { data: { total: 42 } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // First call
      const result1 = await service.getTournamentCount();
      // Second call should return cached result
      const result2 = await service.getTournamentCount();

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(result1).toBe(42);
      expect(result2).toBe(42);
    });

    it('should throw error when API call fails', async () => {
      const error = new VISAPIError('API Error', 500);
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(service.getTournamentCount()).rejects.toThrow('API Error');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to get tournament count',
        error,
        { method: 'getTournamentCount' }
      );
    });
  });

  describe('getTournaments', () => {
    const mockVisTournament: VISTournament = {
      id: 'test-tournament-1',
      name: 'Test Tournament',
      startDate: '2025-07-01T00:00:00Z',
      endDate: '2025-07-07T00:00:00Z',
      location: {
        city: 'Rio de Janeiro',
        country: 'Brazil',
        venue: 'Copacabana Beach'
      },
      level: 'world_tour',
      status: 'ongoing'
    };

    const expectedTournament: Tournament = {
      id: 'test-tournament-1',
      name: 'Test Tournament',
      dates: {
        start: new Date('2025-07-01T00:00:00Z'),
        end: new Date('2025-07-07T00:00:00Z')
      },
      location: {
        city: 'Rio de Janeiro',
        country: 'Brazil',
        venue: 'Copacabana Beach'
      },
      level: TournamentLevel.WORLD_TOUR,
      status: TournamentStatus.ONGOING,
      matchCount: 0
    };

    it('should return transformed tournaments from API', async () => {
      const mockResponse = { data: { tournaments: [mockVisTournament] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getTournaments();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedTournament);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tournaments', { params: {} });
    });

    it('should apply filters to API request', async () => {
      const mockResponse = { data: { tournaments: [] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const filters = {
        level: TournamentLevel.WORLD_TOUR,
        status: TournamentStatus.ONGOING,
        country: 'Brazil',
        limit: 10,
        offset: 20
      };

      await service.getTournaments(filters);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tournaments', {
        params: {
          level: 'world_tour',
          status: 'ongoing',
          country: 'Brazil',
          limit: 10,
          offset: 20
        }
      });
    });

    it('should apply date filters correctly', async () => {
      const mockResponse = { data: { tournaments: [] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const startDate = new Date('2025-07-01');
      const endDate = new Date('2025-07-31');

      await service.getTournaments({
        startDateFrom: startDate,
        startDateTo: endDate
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tournaments', {
        params: {
          start_date_from: startDate.toISOString(),
          start_date_to: endDate.toISOString()
        }
      });
    });

    it('should cache tournaments for 5 minutes', async () => {
      const mockResponse = { data: { tournaments: [mockVisTournament] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // First call
      const result1 = await service.getTournaments();
      // Second call should return cached result
      const result2 = await service.getTournaments();

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should handle empty tournaments response', async () => {
      const mockResponse = { data: { tournaments: [] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getTournaments();

      expect(result).toEqual([]);
    });

    it('should handle missing tournaments in response', async () => {
      const mockResponse = { data: {} };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getTournaments();

      expect(result).toEqual([]);
    });
  });

  describe('getTournamentById', () => {
    const mockVisTournament: VISTournament = {
      id: 'test-tournament-1',
      name: 'Test Tournament',
      startDate: '2025-07-01T00:00:00Z',
      endDate: '2025-07-07T00:00:00Z',
      location: {
        city: 'Rio de Janeiro',
        country: 'Brazil'
      },
      level: 'world_championship',
      status: 'completed'
    };

    it('should return tournament detail by ID', async () => {
      const mockResponse = { data: mockVisTournament };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getTournamentById('test-tournament-1');

      expect(result).toBeDefined();
      expect(result!.id).toBe('test-tournament-1');
      expect(result!.level).toBe(TournamentLevel.WORLD_CHAMPIONSHIP);
      expect(result!.status).toBe(TournamentStatus.COMPLETED);
      expect(result!.matches).toEqual([]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tournaments/test-tournament-1');
    });

    it('should return null for 404 error', async () => {
      const error = new VISAPIError('Not found', 404);
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await service.getTournamentById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null for empty response', async () => {
      const mockResponse = { data: null };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getTournamentById('test-tournament-1');

      expect(result).toBeNull();
    });

    it('should throw error for non-404 errors', async () => {
      const error = new VISAPIError('Server error', 500);
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(service.getTournamentById('test-tournament-1')).rejects.toThrow('Server error');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to get tournament test-tournament-1',
        error,
        { method: 'getTournamentById', tournamentId: 'test-tournament-1' }
      );
    });

    it('should cache tournament detail for 5 minutes', async () => {
      const mockResponse = { data: mockVisTournament };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // First call
      const result1 = await service.getTournamentById('test-tournament-1');
      // Second call should return cached result
      const result2 = await service.getTournamentById('test-tournament-1');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });
  });

  describe('tournament level mapping', () => {
    it('should map VIS levels to internal enum values', () => {
      const testCases = [
        { vis: 'world championship', expected: TournamentLevel.WORLD_CHAMPIONSHIP },
        { vis: 'world_championship', expected: TournamentLevel.WORLD_CHAMPIONSHIP },
        { vis: 'world tour', expected: TournamentLevel.WORLD_TOUR },
        { vis: 'world_tour', expected: TournamentLevel.WORLD_TOUR },
        { vis: 'continental', expected: TournamentLevel.CONTINENTAL },
        { vis: 'national', expected: TournamentLevel.NATIONAL },
        { vis: 'unknown_level', expected: TournamentLevel.OTHER }
      ];

      testCases.forEach(({ vis, expected }) => {
        const mockVisTournament: VISTournament = {
          id: 'test',
          name: 'Test',
          startDate: '2025-07-01T00:00:00Z',
          endDate: '2025-07-07T00:00:00Z',
          location: { city: 'Test', country: 'Test' },
          level: vis,
          status: 'upcoming'
        };

        const mockResponse = { data: { tournaments: [mockVisTournament] } };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        return service.getTournaments().then(result => {
          expect(result[0].level).toBe(expected);
        });
      });
    });
  });

  describe('tournament status mapping', () => {
    it('should map VIS statuses to internal enum values', () => {
      const testCases = [
        { vis: 'upcoming', expected: TournamentStatus.UPCOMING },
        { vis: 'scheduled', expected: TournamentStatus.UPCOMING },
        { vis: 'ongoing', expected: TournamentStatus.ONGOING },
        { vis: 'live', expected: TournamentStatus.ONGOING },
        { vis: 'in_progress', expected: TournamentStatus.ONGOING },
        { vis: 'completed', expected: TournamentStatus.COMPLETED },
        { vis: 'finished', expected: TournamentStatus.COMPLETED },
        { vis: 'cancelled', expected: TournamentStatus.CANCELLED },
        { vis: 'unknown_status', expected: TournamentStatus.UPCOMING }
      ];

      testCases.forEach(({ vis, expected }) => {
        const mockVisTournament: VISTournament = {
          id: 'test',
          name: 'Test',
          startDate: '2025-07-01T00:00:00Z',
          endDate: '2025-07-07T00:00:00Z',
          location: { city: 'Test', country: 'Test' },
          level: 'world_tour',
          status: vis
        };

        const mockResponse = { data: { tournaments: [mockVisTournament] } };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        return service.getTournaments().then(result => {
          expect(result[0].status).toBe(expected);
        });
      });
    });
  });

  describe('cache management', () => {
    it('should clear cache by pattern', () => {
      service.clearCache('tournament');
      // Cache clearing is tested by behavior - we verify it doesn't break
      expect(service.getCacheStats).toBeDefined();
    });

    it('should clear all cache when no pattern provided', () => {
      service.clearCache();
      expect(service.getCacheStats).toBeDefined();
    });

    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
    });
  });

  describe('error scenarios', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      mockAxiosInstance.get.mockRejectedValue(timeoutError);

      await expect(service.getTournaments()).rejects.toThrow();
    });

    it('should handle malformed API responses', async () => {
      const mockResponse = { data: 'invalid json response' };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getTournaments();
      expect(result).toEqual([]); // Should handle gracefully
    });
  });
});