/**
 * @fileoverview Match Repository Unit Tests
 * Comprehensive test coverage for match repository with referee support
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.2
 */

import { MatchRepository } from '../../repositories/MatchRepository';
import { BaseRepositoryConfig } from '../../repositories/base/BaseRepository';
import { DataTransformationService } from '../../services/DataTransformationService';
import { BeachMatchCore, MatchStatus } from '../../types/match-v2';
import { BeachMatch } from '../../types/match';
import { VisResponseParser } from '../../services/parsing/VisResponseParser';

// Mock the VisResponseParser
jest.mock('../../services/parsing/VisResponseParser', () => ({
  VisResponseParser: {
    parseBeachMatches: jest.fn()
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
  getBeachMatchList: jest.fn()
};

const mockNetworkMonitor = {
  isConnected: jest.fn(() => true)
};

const mockErrorLogger = {
  logError: jest.fn()
};

const mockTransformationService = {
  matchCoreToLegacy: jest.fn()
} as any;

describe('MatchRepository', () => {
  let repository: MatchRepository;
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

    repository = new MatchRepository(config, mockTransformationService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockMatch: BeachMatchCore = {
    id: '12345_fivb2024m001_m_fivb_court1_2024-01-01_match001',
    visNo: 'M001',
    version: 1,
    lastUpdated: '2024-01-01T00:00:00Z',
    tournamentId: '12345_fivb2024m001_m_fivb',
    matchCode: 'M001',
    round: 'Pool Play',
    phaseCode: 'PP',
    status: MatchStatus.SCHEDULED,
    court: {
      courtNumber: '1',
      courtName: 'Center Court',
      surface: 'Sand',
      location: 'Main Arena'
    },
    scheduledDateTime: '2024-01-01T10:00:00Z',
    team1: {
      teamNumber: 1,
      teamName: 'Team A',
      player1Name: 'Player A1',
      player2Name: 'Player A2',
      countryCode: 'USA'
    },
    team2: {
      teamNumber: 2,
      teamName: 'Team B',
      player1Name: 'Player B1',
      player2Name: 'Player B2',
      countryCode: 'BRA'
    },
    refereeAssignments: [
      {
        refereeId: 'ref001',
        refereeName: 'John Referee',
        function: 'Main Referee',
        status: 'ASSIGNED'
      }
    ],
    importance: 'MEDIUM'
  };

  describe('getByIdAsync', () => {
    it('should return cached match when available', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: mockMatch,
        tier: 1
      });

      // Act
      const result = await repository.getByIdAsync(mockMatch.id);

      // Assert
      expect(result.data).toEqual(mockMatch);
      expect(result.source).toBe('cache');
      expect(result.metrics.cacheHit).toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalledWith(`match:${mockMatch.id}`);
    });

    it('should fetch from tournament matches when not cached', async () => {
      // Arrange
      mockCacheManager.get.mockImplementation((key) => {
        // Mock cache miss for direct match lookup, but hit for tournament matches
        if (key.startsWith('match:')) {
          return Promise.resolve(null);
        }
        if (key.startsWith('tournament:')) {
          return Promise.resolve({
            data: [mockMatch],
            tier: 1
          });
        }
        return Promise.resolve(null);
      });

      // Act
      const result = await repository.getByIdAsync(mockMatch.id);

      // Assert
      expect(result.data).toEqual(mockMatch);
      expect(result.source).toBe('cache'); // From tournament cache
    });

    it('should handle invalid match ID format', async () => {
      // Act & Assert
      await expect(repository.getByIdAsync('invalid-id')).rejects.toThrow();
    });
  });

  describe('getByTournamentAsync', () => {
    const tournamentId = '12345_fivb2024m001_m_fivb';
    const mockMatches = [mockMatch];

    it('should return cached tournament matches when available', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: mockMatches,
        tier: 1
      });

      // Act
      const result = await repository.getByTournamentAsync(tournamentId);

      // Assert
      expect(result.data).toEqual(mockMatches);
      expect(result.source).toBe('cache');
      expect(result.metrics.cacheHit).toBe(true);
    });

    it('should fetch from API when not cached', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);
      mockApiClient.getBeachMatchList.mockResolvedValue({
        success: true,
        xmlData: '<matches><match><No>M001</No></match></matches>'
      });
      mockVisResponseParser.parseBeachMatches.mockReturnValue(mockMatches);

      // Act
      const result = await repository.getByTournamentAsync(tournamentId);

      // Assert
      expect(result.data).toEqual(mockMatches);
      expect(result.source).toBe('api');
      expect(mockApiClient.getBeachMatchList).toHaveBeenCalledWith({
        tournamentNo: '12345',
        courtNo: undefined,
        status: undefined,
        startDate: undefined,
        endDate: undefined,
        includeResults: true,
        includeReferees: true
      });
    });

    it('should apply filters correctly', async () => {
      // Arrange
      const matchWithRefs = { ...mockMatch, refereeAssignments: [mockMatch.refereeAssignments![0]] };
      const matchWithoutRefs = { ...mockMatch, id: 'different-id', refereeAssignments: [] };
      
      mockCacheManager.get.mockResolvedValue(null);
      mockApiClient.getBeachMatchList.mockResolvedValue({
        success: true,
        xmlData: '<matches></matches>'
      });
      mockVisResponseParser.parseBeachMatches.mockReturnValue([matchWithRefs, matchWithoutRefs]);

      const filters = {
        withRefereeAssignments: true,
        round: 'pool',
        maxResults: 1
      };

      // Act
      const result = await repository.getByTournamentAsync(tournamentId, filters);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].refereeAssignments).toHaveLength(1);
    });

    it('should handle API failures', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);
      mockApiClient.getBeachMatchList.mockResolvedValue({
        success: false,
        error: 'API Error'
      });

      // Act & Assert
      await expect(repository.getByTournamentAsync(tournamentId)).rejects.toThrow();
    });

    it('should handle invalid tournament ID', async () => {
      // Act & Assert
      await expect(repository.getByTournamentAsync('invalid-id')).rejects.toThrow();
    });
  });

  describe('getByCourtAsync', () => {
    const tournamentId = '12345_fivb2024m001_m_fivb';
    
    it('should filter matches by court number', async () => {
      // Arrange
      const court1Match = { ...mockMatch, court: { ...mockMatch.court, courtNumber: '1' } };
      const court2Match = { ...mockMatch, id: 'different-id', court: { ...mockMatch.court, courtNumber: '2' } };
      
      mockCacheManager.get.mockResolvedValue({
        data: [court1Match, court2Match],
        tier: 1
      });

      const courtFilters = { courtNumbers: ['1'] };
      const dateFilters = { tournamentId };

      // Act
      const result = await repository.getByCourtAsync(courtFilters, dateFilters);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].court.courtNumber).toBe('1');
    });

    it('should filter matches by surface type', async () => {
      // Arrange
      const sandMatch = { ...mockMatch, court: { ...mockMatch.court, surface: 'Sand' } };
      const hardMatch = { ...mockMatch, id: 'different-id', court: { ...mockMatch.court, surface: 'Hard Court' } };
      
      mockCacheManager.get.mockResolvedValue({
        data: [sandMatch, hardMatch],
        tier: 1
      });

      const courtFilters = { surface: 'sand' };
      const dateFilters = { tournamentId };

      // Act
      const result = await repository.getByCourtAsync(courtFilters, dateFilters);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].court.surface).toBe('Sand');
    });

    it('should require tournament ID', async () => {
      // Act & Assert
      await expect(repository.getByCourtAsync({})).rejects.toThrow();
    });
  });

  describe('searchAsync', () => {
    const tournamentId = '12345_fivb2024m001_m_fivb';

    it('should search matches by team name', async () => {
      // Arrange
      const teamAMatch = { ...mockMatch, team1: { ...mockMatch.team1, teamName: 'Team Alpha' } };
      const teamBMatch = { ...mockMatch, id: 'different-id', team1: { ...mockMatch.team1, teamName: 'Team Beta' } };
      
      mockCacheManager.get.mockResolvedValue({
        data: [teamAMatch, teamBMatch],
        tier: 1
      });

      // Act
      const result = await repository.searchAsync('alpha', { tournamentId });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].team1.teamName).toBe('Team Alpha');
    });

    it('should search matches by player name', async () => {
      // Arrange
      const playerMatch = { ...mockMatch, team1: { ...mockMatch.team1, player1Name: 'John Smith' } };
      
      mockCacheManager.get.mockResolvedValue({
        data: [playerMatch],
        tier: 1
      });

      // Act
      const result = await repository.searchAsync('john', { tournamentId });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].team1.player1Name).toBe('John Smith');
    });

    it('should require tournament ID', async () => {
      // Act & Assert
      await expect(repository.searchAsync('query')).rejects.toThrow();
    });
  });

  describe('getLegacyListAsync', () => {
    const mockLegacyMatch: BeachMatch = {
      No: 'M001',
      MatchNo: 'M001',
      Round: 'Pool Play',
      Status: 'Scheduled',
      Court: '1',
      Team1: 'Team A',
      Team2: 'Team B'
    } as BeachMatch;

    it('should transform matches to legacy format', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: [mockMatch],
        tier: 1
      });
      mockTransformationService.matchCoreToLegacy.mockReturnValue(mockLegacyMatch);

      // Act
      const result = await repository.getLegacyListAsync('12345');

      // Assert
      expect(result.data).toEqual([mockLegacyMatch]);
      expect(result.source).toBe('transformation');
      expect(mockTransformationService.matchCoreToLegacy).toHaveBeenCalledWith(mockMatch);
    });

    it('should require tournament number', async () => {
      // Act & Assert
      await expect(repository.getLegacyListAsync()).rejects.toThrow();
    });
  });

  describe('getLegacyByIdAsync', () => {
    it('should throw error as legacy single match retrieval is not supported', async () => {
      // Act & Assert
      await expect(repository.getLegacyByIdAsync('M001')).rejects.toThrow();
    });
  });

  describe('Cache Management', () => {
    it('should invalidate specific match cache', async () => {
      // Act
      await repository.invalidateMatchCache('match123');

      // Assert
      expect(mockCacheManager.delete).toHaveBeenCalledWith('match:match123');
    });

    it('should invalidate tournament match cache', async () => {
      // Act
      await repository.invalidateMatchCache(undefined, '12345_fivb2024m001_m_fivb');

      // Assert
      expect(mockCacheManager.clear).toHaveBeenCalledWith('tournament:12345_fivb2024m001_m_fivb:matches:*');
    });

    it('should clear all match cache when no parameters provided', async () => {
      // Act
      await repository.invalidateMatchCache();

      // Assert
      expect(mockCacheManager.clear).toHaveBeenCalledWith('match:*');
      expect(mockCacheManager.clear).toHaveBeenCalledWith('tournament:*:matches:*');
    });

    it('should refresh match data by invalidating cache first', async () => {
      // Arrange
      mockCacheManager.get.mockImplementation((key) => {
        if (key.startsWith('match:')) return Promise.resolve(null); // Cache miss after invalidation
        if (key.startsWith('tournament:')) {
          return Promise.resolve({
            data: [mockMatch],
            tier: 1
          });
        }
        return Promise.resolve(null);
      });

      // Act
      const result = await repository.refreshMatchData(mockMatch.id);

      // Assert
      expect(mockCacheManager.delete).toHaveBeenCalledWith(`match:${mockMatch.id}`);
      expect(result.data).toEqual(mockMatch);
    });

    it('should warm cache for tournament', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);
      mockApiClient.getBeachMatchList.mockResolvedValue({
        success: true,
        xmlData: '<matches></matches>'
      });
      mockVisResponseParser.parseBeachMatches.mockReturnValue([]);

      // Act
      await repository.warmCacheForTournament('12345_fivb2024m001_m_fivb');

      // Assert
      expect(mockApiClient.getBeachMatchList).toHaveBeenCalled();
    });

    it('should return cache metrics', () => {
      // Act
      const metrics = repository.getCacheMetrics();

      // Assert
      expect(metrics).toEqual({ hitRate: 0.95, totalRequests: 100 });
    });
  });

  describe('Referee Assignment Operations', () => {
    it('should get matches with referee assignments', async () => {
      // Arrange
      const matchWithRefs = { ...mockMatch, refereeAssignments: [mockMatch.refereeAssignments![0]] };
      const matchWithoutRefs = { ...mockMatch, id: 'different-id', refereeAssignments: [] };
      
      mockCacheManager.get.mockResolvedValue(null);
      mockApiClient.getBeachMatchList.mockResolvedValue({
        success: true,
        xmlData: '<matches></matches>'
      });
      mockVisResponseParser.parseBeachMatches.mockReturnValue([matchWithRefs, matchWithoutRefs]);

      // Act
      const result = await repository.getMatchesWithRefereeAssignments('12345_fivb2024m001_m_fivb');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].refereeAssignments).toHaveLength(1);
    });

    it('should throw error for referee-based queries without tournament context', async () => {
      // Act & Assert
      await expect(repository.getMatchesByReferee('ref001')).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', async () => {
      // Arrange
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      // Act & Assert
      await expect(repository.getByIdAsync(mockMatch.id)).rejects.toThrow();
      expect(mockErrorLogger.logError).toHaveBeenCalled();
    });

    it('should handle transformation errors', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: [mockMatch],
        tier: 1
      });
      mockTransformationService.matchCoreToLegacy.mockImplementation(() => {
        throw new Error('Transformation failed');
      });

      // Act & Assert
      await expect(repository.getLegacyListAsync('12345')).rejects.toThrow();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics for cache hits', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: mockMatch,
        tier: 1
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act - Advance time to simulate operation duration
      const resultPromise = repository.getByIdAsync(mockMatch.id);
      jest.advanceTimersByTime(10);
      const result = await resultPromise;

      // Assert
      expect(result.metrics.durationMs).toBeGreaterThanOrEqual(10);
      expect(result.metrics.cacheHit).toBe(true);
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
      mockApiClient.getBeachMatchList.mockResolvedValue({
        success: true,
        xmlData: '<matches></matches>'
      });
      mockVisResponseParser.parseBeachMatches.mockReturnValue([]);

      // Act - Advance time to simulate API call duration
      const resultPromise = repository.getByTournamentAsync('12345_fivb2024m001_m_fivb');
      jest.advanceTimersByTime(20);
      const result = await resultPromise;

      // Assert
      expect(result.metrics.cacheHit).toBe(false);
      expect(result.metrics.apiCalls).toBe(1);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate correct cache keys for different filter combinations', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue({
        data: [],
        tier: 1
      });

      const filters = {
        courtNo: '1',
        status: MatchStatus.SCHEDULED,
        round: 'Final',
        withRefereeAssignments: true
      };

      // Act
      await repository.getByTournamentAsync('12345_fivb2024m001_m_fivb', filters);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'tournament:12345_fivb2024m001_m_fivb:matches_court:1_status:SCHEDULED_round:Final_with-refs'
      );
    });
  });
});