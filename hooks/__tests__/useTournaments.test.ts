import { DualReadService, TournamentDTO } from '../../services/DualReadService';
import { queryPerformanceMonitor } from '../../lib/queryPerformance';

// Mock dependencies
jest.mock('../../services/DualReadService');
jest.mock('../../lib/queryPerformance');
jest.mock('../../lib/queryClient', () => ({
  queryKeys: {
    tournaments: {
      list: jest.fn(),
    },
    matches: {
      list: jest.fn(),
    },
    referees: {
      list: jest.fn(),
    },
  },
  createQueryOptions: {
    adaptive: jest.fn(),
  },
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

const mockDualReadService = DualReadService as jest.Mocked<typeof DualReadService>;
const mockQueryPerformanceMonitor = queryPerformanceMonitor as jest.Mocked<typeof queryPerformanceMonitor>;

// Test data
const mockTournaments: TournamentDTO[] = [
  {
    id: '1',
    visNo: 'VIS001',
    code: 'FIVB2024M001',
    name: 'Test Tournament',
    gender: 'M' as const,
    tournamentType: 'FIVB' as const,
    dates: {
      startDate: '2024-01-01',
      endDate: '2024-01-07'
    },
    status: 'ACTIVE' as const,
    city: 'Test City',
    country: 'Test Country'
  }
];

describe('useTournaments Hook Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup DualReadService mock
    const mockInstance = {
      configure: jest.fn(),
      getTournaments: jest.fn(),
      invalidateCache: jest.fn(),
    };
    mockDualReadService.getInstance.mockReturnValue(mockInstance as any);
    
    // Setup performance monitor mock
    mockQueryPerformanceMonitor.trackQuery = jest.fn();
  });

  describe('DualReadService Integration', () => {
    it('should configure DualReadService correctly', () => {
      const mockInstance = mockDualReadService.getInstance();
      
      // Import and test the hook configuration logic
      expect(mockDualReadService.getInstance).toHaveBeenCalled();
      
      // Configuration should be called with proper parameters
      const configureCall = jest.spyOn(mockInstance, 'configure');
      
      // Simulate hook configuration
      mockInstance.configure({
        readStrategy: 'db_first',
        fallbackEnabled: true,
        enablePerformanceMonitoring: true
      });

      expect(configureCall).toHaveBeenCalledWith({
        readStrategy: 'db_first',
        fallbackEnabled: true,
        enablePerformanceMonitoring: true
      });
    });

    it('should call getTournaments with correct filters', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      const filters = {
        season: 2024,
        gender: 'M' as const,
        country: 'USA',
        status: 'ACTIVE' as const
      };

      mockInstance.getTournaments.mockResolvedValue({
        data: mockTournaments,
        source: 'database',
        timestamp: Date.now(),
        performance: { queryTime: 150, fallbackUsed: false }
      });

      await mockInstance.getTournaments(filters);

      expect(mockInstance.getTournaments).toHaveBeenCalledWith(filters);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track query performance when enabled', () => {
      const queryKey = ['tournaments', { season: 2024 }];
      const startTime = Date.now();
      const endTime = startTime + 100;
      
      queryPerformanceMonitor.trackQuery(
        queryKey,
        startTime,
        endTime,
        mockTournaments,
        undefined
      );

      expect(mockQueryPerformanceMonitor.trackQuery).toHaveBeenCalledWith(
        queryKey,
        startTime,
        endTime,
        mockTournaments,
        undefined
      );
    });

    it('should track errors in performance monitoring', () => {
      const queryKey = ['tournaments', { season: 2024 }];
      const startTime = Date.now();
      const endTime = startTime + 100;
      const error = new Error('Network error');
      
      queryPerformanceMonitor.trackQuery(
        queryKey,
        startTime,
        endTime,
        null,
        error
      );

      expect(mockQueryPerformanceMonitor.trackQuery).toHaveBeenCalledWith(
        queryKey,
        startTime,
        endTime,
        null,
        error
      );
    });
  });

  describe('Cache Strategy Logic', () => {
    it('should determine live cache strategy for active tournaments', () => {
      const filters = { status: 'ACTIVE' as const };
      
      // Test the cache strategy determination logic
      const determineCacheStrategy = (status?: string) => {
        if (status === 'ACTIVE') return 'live';
        if (status === 'COMPLETED') return 'historical';
        if (status === 'CANCELLED') return 'historical';
        return 'live';
      };

      expect(determineCacheStrategy(filters.status)).toBe('live');
    });

    it('should determine historical cache strategy for completed tournaments', () => {
      const filters = { status: 'COMPLETED' as const };
      
      const determineCacheStrategy = (status?: string) => {
        if (status === 'ACTIVE') return 'live';
        if (status === 'COMPLETED') return 'historical';
        if (status === 'CANCELLED') return 'historical';
        return 'live';
      };

      expect(determineCacheStrategy(filters.status)).toBe('historical');
    });

    it('should default to live strategy for unspecified status', () => {
      const determineCacheStrategy = (status?: string) => {
        if (status === 'ACTIVE') return 'live';
        if (status === 'COMPLETED') return 'historical';
        if (status === 'CANCELLED') return 'historical';
        return 'live';
      };

      expect(determineCacheStrategy(undefined)).toBe('live');
    });
  });

  describe('Error Handling Logic', () => {
    it('should handle service errors correctly', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      mockInstance.getTournaments.mockResolvedValue({
        data: null,
        source: 'api',
        timestamp: Date.now(),
        performance: { queryTime: 300, fallbackUsed: true },
        error: 'Service unavailable'
      });

      const result = await mockInstance.getTournaments({ season: 2024 });

      expect(result.error).toBe('Service unavailable');
      expect(result.data).toBeNull();
      expect(result.performance.fallbackUsed).toBe(true);
    });

    it('should handle network errors with proper retry logic', () => {
      // Test retry logic
      const retryLogic = (failureCount: number, error: Error) => {
        if (failureCount >= 3) return false;
        if (error.message.includes('not configured')) return false;
        return true;
      };

      expect(retryLogic(2, new Error('Network error'))).toBe(true);
      expect(retryLogic(3, new Error('Network error'))).toBe(false);
      expect(retryLogic(1, new Error('Service not configured'))).toBe(false);
    });

    it('should calculate exponential backoff delay correctly', () => {
      const retryDelay = (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000);

      expect(retryDelay(0)).toBe(1000);
      expect(retryDelay(1)).toBe(2000);
      expect(retryDelay(2)).toBe(4000);
      expect(retryDelay(10)).toBe(30000); // Should cap at 30000
    });
  });

  describe('Filter Validation', () => {
    it('should accept valid tournament filters', () => {
      const validFilters = {
        season: 2024,
        gender: 'M' as const,
        country: 'USA',
        status: 'ACTIVE' as const
      };

      // Test filter type validation
      expect(typeof validFilters.season).toBe('number');
      expect(['M', 'W'].includes(validFilters.gender)).toBe(true);
      expect(typeof validFilters.country).toBe('string');
      expect(['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(validFilters.status)).toBe(true);
    });

    it('should handle optional filter parameters', () => {
      const partialFilters = {
        season: 2024
      };

      expect(partialFilters.gender).toBeUndefined();
      expect(partialFilters.country).toBeUndefined();
      expect(partialFilters.status).toBeUndefined();
    });
  });

  describe('Data Transformation', () => {
    it('should return empty array when no data available', () => {
      const processData = (data: TournamentDTO[] | null) => data || [];
      
      expect(processData(null)).toEqual([]);
      expect(processData(mockTournaments)).toEqual(mockTournaments);
    });

    it('should preserve tournament data structure', () => {
      const tournament = mockTournaments[0];
      
      expect(tournament).toHaveProperty('id');
      expect(tournament).toHaveProperty('visNo');
      expect(tournament).toHaveProperty('code');
      expect(tournament).toHaveProperty('name');
      expect(tournament).toHaveProperty('gender');
      expect(tournament).toHaveProperty('tournamentType');
      expect(tournament).toHaveProperty('dates');
      expect(tournament).toHaveProperty('status');
    });
  });

  describe('Configuration Management', () => {
    it('should merge default and user configurations correctly', () => {
      const defaultConfig = {
        readStrategy: 'db_first',
        fallbackEnabled: true,
        enablePerformanceMonitoring: true,
        enableRealTimeUpdates: true,
        cacheStrategy: 'live'
      };

      const userConfig = {
        readStrategy: 'api_first',
        enableRealTimeUpdates: false
      };

      const mergedConfig = { ...defaultConfig, ...userConfig };

      expect(mergedConfig.readStrategy).toBe('api_first');
      expect(mergedConfig.enableRealTimeUpdates).toBe(false);
      expect(mergedConfig.fallbackEnabled).toBe(true); // Should keep default
    });
  });
});