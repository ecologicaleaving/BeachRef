/**
 * @fileoverview Tournament Repository Unit Tests
 * Comprehensive test coverage for repository methods and cache integration
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.2
 */

import { TournamentRepository } from '../../repositories/TournamentRepository';
import { BaseRepositoryConfig, RepositoryError, RepositoryErrorType } from '../../repositories/base/BaseRepository';
import { DataTransformationService } from '../../services/DataTransformationService';
import { TournamentCore, GenderType, TournamentType, TournamentStatus } from '../../types/tournament-v2';
import { Tournament } from '../../types/tournament';
import { VisResponseParser } from '../../services/parsing/VisResponseParser';

// Mock the VisResponseParser
jest.mock('../../services/parsing/VisResponseParser', () => ({
  VisResponseParser: {
    parseEventList: jest.fn()
  }
}));

const mockVisResponseParser = VisResponseParser as jest.Mocked<typeof VisResponseParser>;

// Mock dependencies
const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  getMetrics: jest.fn(() => ({ hitRate: 0.95, totalRequests: 100 }))
};

const mockApiClient = {
  getEventList: jest.fn(),
  getBeachTournament: jest.fn(),
  testConnection: jest.fn()
};

const mockNetworkMonitor = {
  isConnected: jest.fn(() => true)
};

const mockErrorLogger = {
  logError: jest.fn()
};

const mockTransformationService = {
  tournamentCoreToLegacy: jest.fn(),
  tournamentLegacyToCore: jest.fn(),
  validateTransformation: jest.fn()
} as any;

describe('TournamentRepository', () => {
  let repository: TournamentRepository;
  let config: BaseRepositoryConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
    
    config = {
      cacheManager: mockCacheManager as any,
      apiClient: mockApiClient as any,
      networkMonitor: mockNetworkMonitor as any,
      errorLogger: mockErrorLogger as any,
      enablePerformanceMonitoring: true
    };

    repository = new TournamentRepository(config, mockTransformationService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getByIdAsync', () => {
    const mockTournament: TournamentCore = {
      id: '12345_fivb2024m001_m_fivb',
      visNo: '12345',
      version: 1,
      lastUpdated: '2024-01-01T00:00:00Z',
      code: 'FIVB2024M001',
      name: 'Test Tournament',
      gender: GenderType.M,
      tournamentType: TournamentType.FIVB,
      status: TournamentStatus.UPCOMING,
      dates: {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-03T00:00:00Z'
      }
    };

    it('should return cached tournament when available', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: mockTournament,
        tier: 1
      });

      // Act
      const result = await repository.getByIdAsync('12345_fivb2024m001_m_fivb');

      // Assert
      expect(result.data).toEqual(mockTournament);
      expect(result.source).toBe('cache');
      expect(result.metrics.cacheHit).toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalledWith('tournament:12345_fivb2024m001_m_fivb');
      expect(mockApiClient.getEventList).not.toHaveBeenCalled();
    });

    it('should fetch from API when not cached', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);
      mockApiClient.getEventList.mockResolvedValue({
        success: true,
        xmlData: '<tournaments><tournament><No>12345</No><Name>Test Tournament</Name></tournament></tournaments>'
      });

      // Mock the parser
      mockVisResponseParser.parseEventList.mockReturnValue([mockTournament]);

      // Act
      const result = await repository.getByIdAsync('12345_fivb2024m001_m_fivb');

      // Assert
      expect(result.data).toEqual(mockTournament);
      expect(result.source).toBe('api');
      expect(result.metrics.cacheHit).toBe(false);
      expect(mockApiClient.getEventList).toHaveBeenCalledWith({
        maxResults: 1,
        fields: expect.arrayContaining(['No', 'Name', 'Code'])
      });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'tournament:12345_fivb2024m001_m_fivb',
        mockTournament,
        { ttl: 3600000 }
      );
    });

    it('should handle invalid tournament ID format', async () => {
      // Act & Assert
      await expect(repository.getByIdAsync('invalid-id')).rejects.toThrow(RepositoryError);
      await expect(repository.getByIdAsync('invalid-id')).rejects.toThrow('Invalid tournament ID format');
    });

    it('should handle API failures gracefully', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);
      mockApiClient.getEventList.mockResolvedValue({
        success: false,
        error: 'Network error'
      });

      // Act & Assert
      await expect(repository.getByIdAsync('12345_fivb2024m001_m_fivb')).rejects.toThrow(RepositoryError);
      expect(mockErrorLogger.logError).toHaveBeenCalled();
    });
  });

  describe('getListAsync', () => {
    const mockTournaments: TournamentCore[] = [
      {
        id: '12345_fivb2024m001_m_fivb',
        visNo: '12345',
        version: 1,
        lastUpdated: '2024-01-01T00:00:00Z',
        code: 'FIVB2024M001',
        name: 'Test Tournament 1',
        gender: GenderType.M,
        tournamentType: TournamentType.FIVB,
        status: TournamentStatus.UPCOMING,
        dates: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-03T00:00:00Z'
        }
      }
    ];

    it('should return cached tournament list when available', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: mockTournaments,
        tier: 1
      });

      // Act
      const result = await repository.getListAsync();

      // Assert
      expect(result.data).toEqual(mockTournaments);
      expect(result.source).toBe('cache');
      expect(result.metrics.cacheHit).toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalledWith('tournaments');
    });

    it('should fetch from API with filters', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);
      mockApiClient.getEventList.mockResolvedValue({
        success: true,
        xmlData: '<tournaments><tournament><No>12345</No></tournament></tournaments>'
      });

      mockVisResponseParser.parseEventList.mockReturnValue(mockTournaments);

      const filters = {
        tournamentType: TournamentType.FIVB,
        gender: GenderType.M,
        maxResults: 50
      };

      // Act
      const result = await repository.getListAsync(filters);

      // Assert
      expect(result.data).toEqual(mockTournaments);
      expect(result.source).toBe('api');
      expect(mockApiClient.getEventList).toHaveBeenCalledWith({
        tournamentType: TournamentType.FIVB,
        gender: GenderType.M,
        status: undefined,
        countryCode: undefined,
        startDate: undefined,
        endDate: undefined,
        maxResults: 50,
        fields: expect.arrayContaining(['No', 'Name', 'Code'])
      });
    });

    it('should generate correct cache keys for filters', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: mockTournaments,
        tier: 1
      });

      const filters = {
        tournamentType: TournamentType.FIVB,
        gender: GenderType.W,
        status: TournamentStatus.ACTIVE
      };

      // Act
      await repository.getListAsync(filters);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'tournaments_type:FIVB_gender:W_status:ACTIVE'
      );
    });
  });

  describe('searchAsync', () => {
    const mockTournaments: TournamentCore[] = [
      {
        id: '12345_fivb2024m001_m_fivb',
        visNo: '12345',
        version: 1,
        lastUpdated: '2024-01-01T00:00:00Z',
        code: 'FIVB2024M001',
        name: 'Beach Tournament Brazil',
        gender: GenderType.M,
        tournamentType: TournamentType.FIVB,
        status: TournamentStatus.UPCOMING,
        dates: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-03T00:00:00Z'
        },
        city: 'Rio de Janeiro',
        country: 'Brazil'
      },
      {
        id: '12346_fivb2024w001_w_fivb',
        visNo: '12346',
        version: 1,
        lastUpdated: '2024-01-01T00:00:00Z',
        code: 'FIVB2024W001',
        name: 'Beach Tournament Germany',
        gender: GenderType.W,
        tournamentType: TournamentType.FIVB,
        status: TournamentStatus.UPCOMING,
        dates: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-03T00:00:00Z'
        },
        city: 'Hamburg',
        country: 'Germany'
      }
    ];

    it('should filter tournaments by search query', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: mockTournaments,
        tier: 1
      });

      // Act
      const result = await repository.searchAsync('brazil');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].country).toBe('Brazil');
      expect(result.source).toBe('cache');
    });

    it('should search across multiple fields', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: mockTournaments,
        tier: 1
      });

      // Act
      const result = await repository.searchAsync('hamburg');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].city).toBe('Hamburg');
    });
  });

  describe('getLegacyByIdAsync', () => {
    const mockTournament: TournamentCore = {
      id: '12345_fivb2024m001_m_fivb',
      visNo: '12345',
      version: 1,
      lastUpdated: '2024-01-01T00:00:00Z',
      code: 'FIVB2024M001',
      name: 'Test Tournament',
      gender: GenderType.M,
      tournamentType: TournamentType.FIVB,
      status: TournamentStatus.UPCOMING,
      dates: {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-03T00:00:00Z'
      }
    };

    const mockLegacyTournament: Tournament = {
      No: '12345',
      Name: 'Test Tournament',
      Code: 'FIVB2024M001',
      Status: 'Upcoming'
    };

    it('should transform core tournament to legacy format', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: [mockTournament],
        tier: 1
      });
      mockTransformationService.tournamentCoreToLegacy.mockReturnValue(mockLegacyTournament);

      // Act - Advance time to simulate transformation duration
      const resultPromise = repository.getLegacyByIdAsync('12345');
      jest.advanceTimersByTime(5); // Advance by 5ms for transformation
      const result = await resultPromise;

      // Assert
      expect(result.data).toEqual(mockLegacyTournament);
      expect(result.source).toBe('transformation');
      expect(mockTransformationService.tournamentCoreToLegacy).toHaveBeenCalledWith(mockTournament);
      expect(result.metrics.transformationMs).toBeDefined();
    });

    it('should return null when tournament not found', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: [],
        tier: 1
      });

      // Act
      const result = await repository.getLegacyByIdAsync('nonexistent');

      // Assert
      expect(result.data).toBeNull();
    });
  });

  describe('getLegacyListAsync', () => {
    const mockTournaments: TournamentCore[] = [
      {
        id: '12345_fivb2024m001_m_fivb',
        visNo: '12345',
        version: 1,
        lastUpdated: '2024-01-01T00:00:00Z',
        code: 'FIVB2024M001',
        name: 'Test Tournament',
        gender: GenderType.M,
        tournamentType: TournamentType.FIVB,
        status: TournamentStatus.UPCOMING,
        dates: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-03T00:00:00Z'
        }
      }
    ];

    const mockLegacyTournaments: Tournament[] = [
      {
        No: '12345',
        Name: 'Test Tournament',
        Code: 'FIVB2024M001',
        Status: 'Upcoming'
      }
    ];

    it('should transform all tournaments to legacy format', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: mockTournaments,
        tier: 1
      });
      mockTransformationService.tournamentCoreToLegacy.mockReturnValue(mockLegacyTournaments[0]);

      // Act
      const result = await repository.getLegacyListAsync();

      // Assert
      expect(result.data).toEqual(mockLegacyTournaments);
      expect(result.source).toBe('transformation');
      expect(mockTransformationService.tournamentCoreToLegacy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Management', () => {
    it('should invalidate specific tournament cache', async () => {
      // Act
      await repository.invalidateCache('12345_fivb2024m001_m_fivb');

      // Assert
      expect(mockCacheManager.delete).toHaveBeenCalledWith('tournament:12345_fivb2024m001_m_fivb');
    });

    it('should clear all tournament cache when no ID provided', async () => {
      // Act
      await repository.invalidateCache();

      // Assert
      expect(mockCacheManager.clear).toHaveBeenCalledWith('tournament:*');
    });

    it('should warm cache by fetching data', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);
      mockApiClient.getEventList.mockResolvedValue({
        success: true,
        xmlData: '<tournaments></tournaments>'
      });

      mockVisResponseParser.parseEventList.mockReturnValue([]);

      // Act
      await repository.warmCache();

      // Assert
      expect(mockApiClient.getEventList).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return cache metrics', () => {
      // Act
      const metrics = repository.getCacheMetrics();

      // Assert
      expect(metrics).toEqual({ hitRate: 0.95, totalRequests: 100 });
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', async () => {
      // Arrange
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      // Act & Assert
      await expect(repository.getByIdAsync('12345_fivb2024m001_m_fivb')).rejects.toThrow(RepositoryError);
      expect(mockErrorLogger.logError).toHaveBeenCalled();
    });

    it('should handle transformation errors', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: [{ id: '12345_fivb2024m001_m_fivb', visNo: '12345' }],
        tier: 1
      });
      mockTransformationService.tournamentCoreToLegacy.mockImplementation(() => {
        throw new Error('Transformation failed');
      });

      // Act & Assert
      await expect(repository.getLegacyByIdAsync('12345')).rejects.toThrow(RepositoryError);
    });

    it('should properly categorize different error types', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);
      mockApiClient.getEventList.mockRejectedValue(new Error('Network timeout'));

      // Act & Assert
      await expect(repository.getByIdAsync('12345_fivb2024m001_m_fivb')).rejects.toThrow(RepositoryError);
      expect(mockErrorLogger.logError).toHaveBeenCalledWith(
        expect.any(RepositoryError),
        expect.objectContaining({
          operation: 'getByIdAsync'
        })
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics for cache hits', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: { id: 'test' },
        tier: 1
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act - Advance time to simulate operation duration
      const resultPromise = repository.getByIdAsync('12345_fivb2024m001_m_fivb');
      jest.advanceTimersByTime(10); // Advance by 10ms
      const result = await resultPromise;

      // Assert
      expect(result.metrics.durationMs).toBeGreaterThanOrEqual(10);
      expect(result.metrics.cacheHit).toBe(true);
      expect(result.metrics.cacheTier).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Repository Performance [getByIdAsync[cached]]:',
        expect.objectContaining({
          cacheHit: true,
          cacheTier: 1
        })
      );

      consoleSpy.mockRestore();
    });

    it('should track API call metrics', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);
      mockApiClient.getEventList.mockResolvedValue({
        success: true,
        xmlData: '<tournaments></tournaments>'
      });

      mockVisResponseParser.parseEventList.mockReturnValue([]);

      // Act - Advance time to simulate API call duration
      const resultPromise = repository.getByIdAsync('12345_fivb2024m001_m_fivb');
      jest.advanceTimersByTime(20); // Advance by 20ms for API call
      const result = await resultPromise;

      // Assert
      expect(result.metrics.cacheHit).toBe(false);
      expect(result.metrics.apiCalls).toBe(1);
    });
  });
});