/**
 * @fileoverview VIS API Integration Service Unit Tests
 * Tests for enhanced API integration with gender merging and optimization
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.2 Task 3
 */

import { VisApiIntegrationService, DEFAULT_FIELD_OPTIMIZATION, DEFAULT_GENDER_MERGING } from '../../../services/api/VisApiIntegrationService';
import { VisApiClient } from '../../../services/api/VisApiClient';
import { VisResponseParser } from '../../../services/parsing/VisResponseParser';
import { TournamentCore, GenderType, TournamentType, TournamentStatus } from '../../../types/tournament-v2';
import { VisApiEndpoint } from '../../../types/api-v2';

// Mock dependencies
jest.mock('../../../services/api/VisApiClient');
jest.mock('../../../services/parsing/VisResponseParser', () => ({
  VisResponseParser: {
    parseEventList: jest.fn(),
    parseBeachMatches: jest.fn()
  }
}));

describe('VisApiIntegrationService', () => {
  let service: VisApiIntegrationService;
  let mockApiClient: jest.Mocked<VisApiClient>;

  // Mock data

  const mockCoreTournament: TournamentCore = {
    id: '12345_mfivb2024001_m_fivb',
    visNo: '12345',
    version: 1,
    lastUpdated: '2024-01-01T10:00:00Z',
    code: 'MFIVB2024001',
    name: 'Test Tournament',
    gender: GenderType.M,
    tournamentType: TournamentType.FIVB,
    status: TournamentStatus.ACTIVE,
    dates: {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-03T00:00:00Z'
    },
    city: 'Rio de Janeiro',
    country: 'Brazil'
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockApiClient = new VisApiClient({
      baseUrl: 'http://test.com',
      timeoutMs: 5000
    }) as jest.Mocked<VisApiClient>;

    // Create service instance
    service = new VisApiIntegrationService(
      mockApiClient,
      DEFAULT_FIELD_OPTIMIZATION,
      DEFAULT_GENDER_MERGING
    );
  });

  describe('getTournamentsWithGenderMerging', () => {
    it('should fetch tournaments with optimized fields', async () => {
      // Arrange
      mockApiClient.getEventList.mockResolvedValue({
        success: true,
        xmlData: '<events></events>',
        timestamp: '2024-01-01T10:00:00Z',
        durationMs: 100,
        sizeBytes: 1000
      });

      (VisResponseParser.parseEventList as jest.Mock).mockReturnValue([mockCoreTournament]);

      // Act
      const result = await service.getTournamentsWithGenderMerging({
        maxResults: 10
      }, 'essential');

      // Assert
      expect(mockApiClient.getEventList).toHaveBeenCalledWith({
        maxResults: 10,
        fields: DEFAULT_FIELD_OPTIMIZATION.essentialFields
      });

      expect(result.tournaments).toHaveLength(1);
      expect(result.tournaments[0]).toEqual(mockCoreTournament);
      expect(result.metrics.endpoint).toBe(VisApiEndpoint.GET_EVENT_LIST);
      expect(result.metrics.success).toBe(true);
      expect(result.mergedVariants).toBe(0);
    });

    it('should use minimal fields when specified', async () => {
      // Arrange
      mockApiClient.getEventList.mockResolvedValue({
        success: true,
        xmlData: '<events></events>',
        timestamp: '2024-01-01T10:00:00Z',
        durationMs: 100,
        sizeBytes: 500
      });

      (VisResponseParser.parseEventList as jest.Mock).mockReturnValue([]);
      
      // Act
      await service.getTournamentsWithGenderMerging({
        maxResults: 5
      }, 'minimal');

      // Assert
      expect(mockApiClient.getEventList).toHaveBeenCalledWith({
        maxResults: 5,
        fields: DEFAULT_FIELD_OPTIMIZATION.minimalFields
      });
    });

    it('should merge gender variants correctly', async () => {
      // Arrange - Create male and female variants of same tournament
      const maleTournament = { ...mockCoreTournament, gender: GenderType.M };
      const femaleTournament = { 
        ...mockCoreTournament, 
        id: '12346_wfivb2024001_w_fivb',
        visNo: '12346',
        code: 'WFIVB2024001',
        gender: GenderType.W 
      };

      mockApiClient.getEventList.mockResolvedValue({
        success: true,
        xmlData: '<events></events>',
        timestamp: '2024-01-01T10:00:00Z',
        durationMs: 100,
        sizeBytes: 1000
      });

      (VisResponseParser.parseEventList as jest.Mock).mockReturnValue([
        maleTournament,
        femaleTournament
      ]);

      // Act
      const result = await service.getTournamentsWithGenderMerging({
        maxResults: 10
      });

      // Assert
      expect(result.tournaments).toHaveLength(1); // Should be merged
      expect(result.mergedVariants).toBe(1); // One variant was merged
    });

    it('should handle API failures gracefully', async () => {
      // Arrange
      mockApiClient.getEventList.mockResolvedValue({
        success: false,
        error: 'Network timeout',
        errorCode: 'TIMEOUT',
        timestamp: '2024-01-01T10:00:00Z',
        durationMs: 5000
      });

      // Act & Assert
      await expect(service.getTournamentsWithGenderMerging({
        maxResults: 10
      })).rejects.toThrow('API request failed: Network timeout');
    });
  });

  describe('getMatchesOptimized', () => {
    it('should fetch matches with optimized request', async () => {
      // Arrange
      mockApiClient.getBeachMatchList.mockResolvedValue({
        success: true,
        xmlData: '<matches></matches>',
        timestamp: '2024-01-01T10:00:00Z',
        durationMs: 150,
        sizeBytes: 2000
      });

      (VisResponseParser.parseBeachMatches as jest.Mock).mockReturnValue([]);
      
      // Act
      const result = await service.getMatchesOptimized({
        tournamentNo: '12345'
      }, false);

      // Assert
      expect(mockApiClient.getBeachMatchList).toHaveBeenCalledWith({
        tournamentNo: '12345',
        includeResults: true,
        includeReferees: false
      });

      expect(result.matches).toHaveLength(0);
      expect(result.metrics.endpoint).toBe(VisApiEndpoint.GET_BEACH_MATCH_LIST);
      expect(result.metrics.success).toBe(true);
    });

    it('should include referee data when requested', async () => {
      // Arrange
      mockApiClient.getBeachMatchList.mockResolvedValue({
        success: true,
        xmlData: '<matches></matches>',
        timestamp: '2024-01-01T10:00:00Z',
        durationMs: 200,
        sizeBytes: 3000
      });

      (VisResponseParser.parseBeachMatches as jest.Mock).mockReturnValue([]);
      
      // Act
      await service.getMatchesOptimized({
        tournamentNo: '12345'
      }, true);

      // Assert
      expect(mockApiClient.getBeachMatchList).toHaveBeenCalledWith({
        tournamentNo: '12345',
        includeResults: true,
        includeReferees: true
      });
    });
  });

  describe('getPerformanceAnalytics', () => {
    it('should return correct performance analytics', async () => {
      // Arrange - Use fake timers for predictable timing
      jest.useFakeTimers();

      mockApiClient.getEventList.mockResolvedValue({
        success: true,
        xmlData: '<events></events>',
        timestamp: '2024-01-01T10:00:00Z',
        durationMs: 100,
        sizeBytes: 1000
      });

      (VisResponseParser.parseEventList as jest.Mock).mockReturnValue([mockCoreTournament]);

      // Make multiple requests with time advancement
      const promise1 = service.getTournamentsWithGenderMerging({ maxResults: 10 });
      jest.advanceTimersByTime(100);
      await promise1;

      const promise2 = service.getTournamentsWithGenderMerging({ maxResults: 5 });
      jest.advanceTimersByTime(50);
      await promise2;

      jest.useRealTimers();

      // Act
      const analytics = service.getPerformanceAnalytics();

      // Assert
      expect(analytics.totalRequests).toBe(2);
      expect(analytics.successRate).toBe(1.0);
      expect(analytics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(analytics.endpointUsage[VisApiEndpoint.GET_EVENT_LIST]).toBe(2);
    });

    it('should calculate bandwidth savings correctly', async () => {
      // Arrange
      mockApiClient.getEventList.mockResolvedValue({
        success: true,
        xmlData: '<events></events>',
        timestamp: '2024-01-01T10:00:00Z',
        durationMs: 100,
        sizeBytes: 500
      });

      (VisResponseParser.parseEventList as jest.Mock).mockReturnValue([]);

      // Act - Use minimal field optimization
      await service.getTournamentsWithGenderMerging({ maxResults: 10 }, 'minimal');
      const analytics = service.getPerformanceAnalytics();

      // Assert
      expect(analytics.bandwidthSaved).toBeGreaterThan(0);
    });
  });

  describe('Field Optimization', () => {
    it('should use correct field sets for different optimization levels', async () => {
      // Arrange
      mockApiClient.getEventList.mockResolvedValue({
        success: true,
        xmlData: '<events></events>',
        timestamp: '2024-01-01T10:00:00Z',
        durationMs: 100,
        sizeBytes: 1000
      });

      (VisResponseParser.parseEventList as jest.Mock).mockReturnValue([]);

      // Test minimal
      await service.getTournamentsWithGenderMerging({ maxResults: 10 }, 'minimal');
      expect(mockApiClient.getEventList).toHaveBeenLastCalledWith(
        expect.objectContaining({
          fields: DEFAULT_FIELD_OPTIMIZATION.minimalFields
        })
      );

      // Test essential
      await service.getTournamentsWithGenderMerging({ maxResults: 10 }, 'essential');
      expect(mockApiClient.getEventList).toHaveBeenLastCalledWith(
        expect.objectContaining({
          fields: DEFAULT_FIELD_OPTIMIZATION.essentialFields
        })
      );

      // Test extended
      await service.getTournamentsWithGenderMerging({ maxResults: 10 }, 'extended');
      expect(mockApiClient.getEventList).toHaveBeenLastCalledWith(
        expect.objectContaining({
          fields: DEFAULT_FIELD_OPTIMIZATION.extendedFields
        })
      );
    });
  });

  describe('Gender Variant Merging', () => {
    it('should prefer mixed gender tournaments when merging', async () => {
      // Arrange
      const maleTournament = { ...mockCoreTournament, gender: GenderType.M };
      const mixedTournament = { 
        ...mockCoreTournament, 
        id: '12346_mixedfivb2024001_mixed_fivb',
        visNo: '12346',
        code: 'MIXEDFIVB2024001',
        gender: GenderType.MIXED 
      };

      mockApiClient.getEventList.mockResolvedValue({
        success: true,
        xmlData: '<events></events>',
        timestamp: '2024-01-01T10:00:00Z',
        durationMs: 100,
        sizeBytes: 1000
      });

      (VisResponseParser.parseEventList as jest.Mock).mockReturnValue([
        maleTournament,
        mixedTournament
      ]);

      // Act
      const result = await service.getTournamentsWithGenderMerging({ maxResults: 10 });

      // Assert
      expect(result.tournaments).toHaveLength(1);
      expect(result.tournaments[0].gender).toBe(GenderType.MIXED);
    });

    it('should prefer tournaments with more complete data', async () => {
      // Arrange
      const incompleteTournament = { ...mockCoreTournament };
      const completeTournament = { 
        ...mockCoreTournament,
        id: '12346_wfivb2024001_w_fivb',
        visNo: '12346',
        code: 'WFIVB2024001',
        gender: GenderType.W,
        location: 'Beach Arena',
        prizeMoney: '100000',
        website: 'https://example.com'
      };

      mockApiClient.getEventList.mockResolvedValue({
        success: true,
        xmlData: '<events></events>',
        timestamp: '2024-01-01T10:00:00Z',
        durationMs: 100,
        sizeBytes: 1000
      });

      (VisResponseParser.parseEventList as jest.Mock).mockReturnValue([
        incompleteTournament,
        completeTournament
      ]);

      // Act
      const result = await service.getTournamentsWithGenderMerging({ maxResults: 10 });

      // Assert
      expect(result.tournaments).toHaveLength(1);
      expect(result.tournaments[0].location).toBe('Beach Arena');
      expect(result.tournaments[0].website).toBe('https://example.com');
    });
  });

  describe('Error Handling', () => {
    it('should record failed request metrics', async () => {
      // Arrange
      mockApiClient.getEventList.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(service.getTournamentsWithGenderMerging({
        maxResults: 10
      })).rejects.toThrow('Network error');

      // Check metrics were recorded
      const analytics = service.getPerformanceAnalytics();
      expect(analytics.totalRequests).toBe(1);
      expect(analytics.successRate).toBe(0);
    });
  });

  describe('Metrics Management', () => {
    it('should clear metrics correctly', async () => {
      // Arrange
      mockApiClient.getEventList.mockResolvedValue({
        success: true,
        xmlData: '<events></events>',
        timestamp: '2024-01-01T10:00:00Z',
        durationMs: 100,
        sizeBytes: 1000
      });

      (VisResponseParser.parseEventList as jest.Mock).mockReturnValue([]);

      // Make a request
      await service.getTournamentsWithGenderMerging({ maxResults: 10 });
      
      // Verify metrics exist
      expect(service.getPerformanceAnalytics().totalRequests).toBe(1);

      // Act
      service.clearMetrics();

      // Assert
      expect(service.getPerformanceAnalytics().totalRequests).toBe(0);
    });
  });
});