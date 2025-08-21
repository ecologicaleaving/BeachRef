/**
 * @fileoverview Unit tests for useDataTransformation hook
 * Tests data transformation between core and legacy types with memoization and error handling
 */

import { renderHook } from '@testing-library/react-native';
import { 
  useDataTransformation, 
  useTournamentTransformation,
  useMatchTransformation,
  useBatchTransformation,
  clearTransformationCache,
  getTransformationCacheStats
} from '../../hooks/useDataTransformation';
import { DataTransformationService } from '../../services/DataTransformationService';

// Mock DataTransformationService
jest.mock('../../services/DataTransformationService');

const MockDataTransformationService = DataTransformationService as jest.MockedClass<typeof DataTransformationService>;

describe('useDataTransformation', () => {
  let mockTransformationService: jest.Mocked<DataTransformationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    clearTransformationCache();
    
    mockTransformationService = {
      transformTournamentCoreToLegacy: jest.fn(),
      transformLegacyToTournamentCore: jest.fn(),
      transformBeachMatchCoreToLegacy: jest.fn(),
      transformLegacyToBeachMatchCore: jest.fn()
    } as any;

    MockDataTransformationService.mockImplementation(() => mockTransformationService);
  });

  describe('Basic transformation functionality', () => {
    it('should transform TournamentCore to Tournament', () => {
      const mockTournamentCore = { 
        id: '1', 
        visNo: 'T001', 
        name: 'Test Tournament',
        gender: 'M' as const,
        tournamentType: 'FIVB' as const
      };
      const mockLegacyTournament = { No: 'T001', Name: 'Test Tournament' };

      mockTransformationService.transformTournamentCoreToLegacy.mockReturnValue(mockLegacyTournament);

      const { result } = renderHook(() =>
        useDataTransformation(mockTournamentCore, 'coreToLegacy')
      );

      expect(result.current.success).toBe(true);
      expect(result.current.data).toEqual(mockLegacyTournament);
      expect(result.current.error).toBeNull();
      expect(mockTransformationService.transformTournamentCoreToLegacy).toHaveBeenCalledWith(mockTournamentCore);
    });

    it('should transform Tournament to TournamentCore', () => {
      const mockLegacyTournament = { No: 'T001', Name: 'Test Tournament' };
      const mockTournamentCore = { 
        id: '1', 
        visNo: 'T001', 
        name: 'Test Tournament',
        gender: 'M' as const,
        tournamentType: 'FIVB' as const
      };

      mockTransformationService.transformLegacyToTournamentCore.mockReturnValue(mockTournamentCore);

      const { result } = renderHook(() =>
        useDataTransformation(mockLegacyTournament, 'legacyToCore')
      );

      expect(result.current.success).toBe(true);
      expect(result.current.data).toEqual(mockTournamentCore);
      expect(result.current.error).toBeNull();
      expect(mockTransformationService.transformLegacyToTournamentCore).toHaveBeenCalledWith(mockLegacyTournament);
    });

    it('should transform BeachMatchCore to BeachMatch', () => {
      const mockMatchCore = { 
        matchId: '1', 
        tournamentId: 'T001',
        matchNo: 'M001'
      };
      const mockLegacyMatch = { MatchNo: 'M001', TournamentNo: 'T001' };

      mockTransformationService.transformBeachMatchCoreToLegacy.mockReturnValue(mockLegacyMatch);

      const { result } = renderHook(() =>
        useDataTransformation(mockMatchCore, 'coreToLegacy')
      );

      expect(result.current.success).toBe(true);
      expect(result.current.data).toEqual(mockLegacyMatch);
      expect(result.current.error).toBeNull();
      expect(mockTransformationService.transformBeachMatchCoreToLegacy).toHaveBeenCalledWith(mockMatchCore);
    });

    it('should transform BeachMatch to BeachMatchCore', () => {
      const mockLegacyMatch = { MatchNo: 'M001', TournamentNo: 'T001' };
      const mockMatchCore = { 
        matchId: '1', 
        tournamentId: 'T001',
        matchNo: 'M001'
      };

      mockTransformationService.transformLegacyToBeachMatchCore.mockReturnValue(mockMatchCore);

      const { result } = renderHook(() =>
        useDataTransformation(mockLegacyMatch, 'legacyToCore')
      );

      expect(result.current.success).toBe(true);
      expect(result.current.data).toEqual(mockMatchCore);
      expect(result.current.error).toBeNull();
      expect(mockTransformationService.transformLegacyToBeachMatchCore).toHaveBeenCalledWith(mockLegacyMatch);
    });
  });

  describe('Array transformations', () => {
    it('should transform array of TournamentCore to Tournament[]', () => {
      const mockTournamentCores = [
        { id: '1', visNo: 'T001', name: 'Tournament 1', gender: 'M' as const, tournamentType: 'FIVB' as const },
        { id: '2', visNo: 'T002', name: 'Tournament 2', gender: 'W' as const, tournamentType: 'BPT' as const }
      ];
      const mockLegacyTournaments = [
        { No: 'T001', Name: 'Tournament 1' },
        { No: 'T002', Name: 'Tournament 2' }
      ];

      mockTransformationService.transformTournamentCoreToLegacy
        .mockReturnValueOnce(mockLegacyTournaments[0])
        .mockReturnValueOnce(mockLegacyTournaments[1]);

      const { result } = renderHook(() =>
        useDataTransformation(mockTournamentCores, 'coreToLegacy')
      );

      expect(result.current.success).toBe(true);
      expect(result.current.data).toEqual(mockLegacyTournaments);
      expect(result.current.metadata.sourceType).toBe('Object[]');
      expect(result.current.metadata.targetType).toBe('Tournament[]');
    });

    it('should transform array of Tournament to TournamentCore[]', () => {
      const mockLegacyTournaments = [
        { No: 'T001', Name: 'Tournament 1' },
        { No: 'T002', Name: 'Tournament 2' }
      ];
      const mockTournamentCores = [
        { id: '1', visNo: 'T001', name: 'Tournament 1', gender: 'M' as const, tournamentType: 'FIVB' as const },
        { id: '2', visNo: 'T002', name: 'Tournament 2', gender: 'W' as const, tournamentType: 'BPT' as const }
      ];

      mockTransformationService.transformLegacyToTournamentCore
        .mockReturnValueOnce(mockTournamentCores[0])
        .mockReturnValueOnce(mockTournamentCores[1]);

      const { result } = renderHook(() =>
        useDataTransformation(mockLegacyTournaments, 'legacyToCore')
      );

      expect(result.current.success).toBe(true);
      expect(result.current.data).toEqual(mockTournamentCores);
      expect(result.current.metadata.targetType).toBe('TournamentCore[]');
    });
  });

  describe('Null and undefined handling', () => {
    it('should handle null data gracefully when skipIfEmpty is true', () => {
      const { result } = renderHook(() =>
        useDataTransformation(null, 'coreToLegacy', { skipIfEmpty: true })
      );

      expect(result.current.success).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.metadata.sourceType).toBe('null');
      expect(result.current.metadata.transformationTime).toBe(0);
    });

    it('should handle undefined data gracefully when skipIfEmpty is true', () => {
      const { result } = renderHook(() =>
        useDataTransformation(undefined, 'legacyToCore', { skipIfEmpty: true })
      );

      expect(result.current.success).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should attempt transformation on null when skipIfEmpty is false', () => {
      const { result } = renderHook(() =>
        useDataTransformation(null, 'coreToLegacy', { skipIfEmpty: false })
      );

      expect(result.current.success).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('Caching functionality', () => {
    it('should cache transformation results', () => {
      const mockData = { id: '1', name: 'Test' };
      const mockTransformed = { No: '1', Name: 'Test' };

      mockTransformationService.transformTournamentCoreToLegacy.mockReturnValue(mockTransformed);

      // First call
      const { result: result1 } = renderHook(() =>
        useDataTransformation(mockData, 'coreToLegacy', { enableCache: true })
      );

      // Second call with same data
      const { result: result2 } = renderHook(() =>
        useDataTransformation(mockData, 'coreToLegacy', { enableCache: true })
      );

      expect(result1.current.data).toEqual(mockTransformed);
      expect(result2.current.data).toEqual(mockTransformed);
      expect(result1.current.metadata.cached).toBe(false);
      expect(result2.current.metadata.cached).toBe(true);
      expect(mockTransformationService.transformTournamentCoreToLegacy).toHaveBeenCalledTimes(1);
    });

    it('should use custom cache key when provided', () => {
      const mockData = { id: '1', name: 'Test' };
      const mockTransformed = { No: '1', Name: 'Test' };

      mockTransformationService.transformTournamentCoreToLegacy.mockReturnValue(mockTransformed);

      const { result } = renderHook(() =>
        useDataTransformation(mockData, 'coreToLegacy', { 
          enableCache: true, 
          cacheKey: 'custom_key_123' 
        })
      );

      expect(result.current.data).toEqual(mockTransformed);
      expect(result.current.metadata.cached).toBe(false);

      // Verify cache stats
      const stats = getTransformationCacheStats();
      expect(stats.keys).toContain('custom_key_123');
    });

    it('should bypass cache when enableCache is false', () => {
      const mockData = { id: '1', name: 'Test' };
      const mockTransformed = { No: '1', Name: 'Test' };

      mockTransformationService.transformTournamentCoreToLegacy.mockReturnValue(mockTransformed);

      // Two calls with cache disabled
      renderHook(() =>
        useDataTransformation(mockData, 'coreToLegacy', { enableCache: false })
      );
      renderHook(() =>
        useDataTransformation(mockData, 'coreToLegacy', { enableCache: false })
      );

      expect(mockTransformationService.transformTournamentCoreToLegacy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should handle transformation service errors', () => {
      const mockData = { id: '1', name: 'Test' };
      const mockError = new Error('Transformation failed');

      mockTransformationService.transformTournamentCoreToLegacy.mockImplementation(() => {
        throw mockError;
      });

      const { result } = renderHook(() =>
        useDataTransformation(mockData, 'coreToLegacy')
      );

      expect(result.current.success).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toEqual(mockError);
    });

    it('should handle unsupported data types', () => {
      const unsupportedData = { unsupported: 'data' };

      const { result } = renderHook(() =>
        useDataTransformation(unsupportedData, 'coreToLegacy')
      );

      expect(result.current.success).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('Unsupported transformation');
    });
  });

  describe('Performance monitoring', () => {
    it('should track transformation time in metadata', () => {
      const mockData = { id: '1', name: 'Test' };
      const mockTransformed = { No: '1', Name: 'Test' };

      mockTransformationService.transformTournamentCoreToLegacy.mockReturnValue(mockTransformed);

      const { result } = renderHook(() =>
        useDataTransformation(mockData, 'coreToLegacy', { enablePerformanceMonitoring: true })
      );

      expect(result.current.metadata.transformationTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.current.metadata.transformationTime).toBe('number');
    });

    it('should include source and target types in metadata', () => {
      const mockData = { id: '1', name: 'Test' };
      const mockTransformed = { No: '1', Name: 'Test' };

      mockTransformationService.transformTournamentCoreToLegacy.mockReturnValue(mockTransformed);

      const { result } = renderHook(() =>
        useDataTransformation(mockData, 'coreToLegacy')
      );

      expect(result.current.metadata.sourceType).toBe('Object');
      expect(result.current.metadata.targetType).toBe('Tournament');
    });
  });

  describe('Specialized hooks', () => {
    describe('useTournamentTransformation', () => {
      it('should transform tournament data correctly', () => {
        const mockTournament = { id: '1', name: 'Test Tournament' };
        const mockTransformed = { No: '1', Name: 'Test Tournament' };

        mockTransformationService.transformTournamentCoreToLegacy.mockReturnValue(mockTransformed);

        const { result } = renderHook(() =>
          useTournamentTransformation(mockTournament, 'coreToLegacy')
        );

        expect(result.current.success).toBe(true);
        expect(result.current.data).toEqual(mockTransformed);
      });
    });

    describe('useMatchTransformation', () => {
      it('should transform match data correctly', () => {
        const mockMatch = { matchId: '1', tournamentId: 'T001' };
        const mockTransformed = { MatchNo: '1', TournamentNo: 'T001' };

        mockTransformationService.transformBeachMatchCoreToLegacy.mockReturnValue(mockTransformed);

        const { result } = renderHook(() =>
          useMatchTransformation(mockMatch, 'coreToLegacy')
        );

        expect(result.current.success).toBe(true);
        expect(result.current.data).toEqual(mockTransformed);
      });
    });

    describe('useBatchTransformation', () => {
      it('should transform arrays in batches', () => {
        const mockDataArray = [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
          { id: '3', name: 'Item 3' }
        ];
        const mockTransformed = [
          { No: '1', Name: 'Item 1' },
          { No: '2', Name: 'Item 2' },
          { No: '3', Name: 'Item 3' }
        ];

        mockTransformationService.transformTournamentCoreToLegacy
          .mockReturnValueOnce(mockTransformed[0])
          .mockReturnValueOnce(mockTransformed[1])
          .mockReturnValueOnce(mockTransformed[2]);

        const { result } = renderHook(() =>
          useBatchTransformation(mockDataArray, 'coreToLegacy', { batchSize: 2 })
        );

        expect(result.current.success).toBe(true);
        expect(result.current.data).toEqual(mockTransformed);
        expect(result.current.progress).toBe(100);
        expect(result.current.metadata.totalItems).toBe(3);
        expect(result.current.metadata.successfulItems).toBe(3);
        expect(result.current.metadata.failedItems).toBe(0);
      });

      it('should handle batch transformation errors', () => {
        const mockDataArray = [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' }
        ];

        mockTransformationService.transformTournamentCoreToLegacy
          .mockReturnValueOnce({ No: '1', Name: 'Item 1' })
          .mockImplementationOnce(() => {
            throw new Error('Transformation failed');
          });

        const { result } = renderHook(() =>
          useBatchTransformation(mockDataArray, 'coreToLegacy')
        );

        expect(result.current.success).toBe(false);
        expect(result.current.data).toHaveLength(1);
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.metadata.successfulItems).toBe(1);
        expect(result.current.metadata.failedItems).toBe(1);
      });

      it('should handle empty arrays', () => {
        const { result } = renderHook(() =>
          useBatchTransformation([], 'coreToLegacy')
        );

        expect(result.current.success).toBe(true);
        expect(result.current.data).toEqual([]);
        expect(result.current.progress).toBe(100);
        expect(result.current.metadata.totalItems).toBe(0);
      });
    });
  });

  describe('Cache management', () => {
    it('should clear transformation cache', () => {
      const mockData = { id: '1', name: 'Test' };
      mockTransformationService.transformTournamentCoreToLegacy.mockReturnValue({ No: '1', Name: 'Test' });

      // Add something to cache
      renderHook(() =>
        useDataTransformation(mockData, 'coreToLegacy', { enableCache: true })
      );

      let stats = getTransformationCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      // Clear cache
      clearTransformationCache();

      stats = getTransformationCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide cache statistics', () => {
      const mockData1 = { id: '1', name: 'Test 1' };
      const mockData2 = { id: '2', name: 'Test 2' };

      mockTransformationService.transformTournamentCoreToLegacy
        .mockReturnValueOnce({ No: '1', Name: 'Test 1' })
        .mockReturnValueOnce({ No: '2', Name: 'Test 2' });

      // Add items to cache
      renderHook(() =>
        useDataTransformation(mockData1, 'coreToLegacy', { enableCache: true })
      );
      renderHook(() =>
        useDataTransformation(mockData2, 'coreToLegacy', { enableCache: true })
      );

      const stats = getTransformationCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toHaveLength(2);
    });
  });
});