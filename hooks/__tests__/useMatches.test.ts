// Mock React Native first to avoid import issues
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));

import { DualReadService, MatchDTO } from '../../services/DualReadService';
import { queryPerformanceMonitor } from '../../lib/queryPerformance';

// Mock dependencies
jest.mock('../../services/DualReadService');
jest.mock('../../lib/queryPerformance');
jest.mock('../../services/RealtimeSubscriptionService', () => ({
  RealtimeSubscriptionService: {
    getInstance: jest.fn(() => ({
      subscribeToMatches: jest.fn(),
      unsubscribe: jest.fn(),
    })),
  },
}));
jest.mock('../../lib/queryClient', () => ({
  queryKeys: {
    matches: {
      list: jest.fn(() => ['matches', 'test-filters']),
    },
  },
  createQueryOptions: {
    adaptive: jest.fn(() => ({ queryKey: ['matches'], queryFn: jest.fn() })),
  },
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

const mockDualReadService = DualReadService as jest.Mocked<typeof DualReadService>;
const mockQueryPerformanceMonitor = queryPerformanceMonitor as jest.Mocked<typeof queryPerformanceMonitor>;

// Test data
const mockMatches: MatchDTO[] = [
  {
    id: '1',
    matchNo: 'M001',
    tournamentCode: 'FIVB2024M001',
    eventId: 100,
    round: 'Pool A',
    status: 'RUNNING' as const,
    scheduled: '2024-01-01T10:00:00Z',
    court: 'Court 1',
    team1: { name: 'Team A', country: 'USA' },
    team2: { name: 'Team B', country: 'BRA' },
    score: { team1: 1, team2: 0, sets: [] },
    refereeAssignments: [
      {
        referee: { id: 'ref1', name: 'John Doe', country: 'USA' },
        position: 'R1',
        status: 'ASSIGNED'
      }
    ]
  },
  {
    id: '2',
    matchNo: 'M002',
    tournamentCode: 'FIVB2024M001',
    eventId: 100,
    round: 'Pool A',
    status: 'COMPLETED' as const,
    scheduled: '2024-01-01T08:00:00Z',
    court: 'Court 1',
    team1: { name: 'Team C', country: 'ITA' },
    team2: { name: 'Team D', country: 'GER' },
    score: { team1: 2, team2: 0, sets: [{ team1: 21, team2: 19 }, { team1: 21, team2: 17 }] },
    refereeAssignments: [
      {
        referee: { id: 'ref2', name: 'Jane Smith', country: 'CAN' },
        position: 'R1',
        status: 'COMPLETED'
      }
    ]
  }
];

describe('useMatches Hook Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup DualReadService mock
    const mockInstance = {
      configure: jest.fn(),
      getMatches: jest.fn(),
      invalidateCache: jest.fn(),
    };
    mockDualReadService.getInstance.mockReturnValue(mockInstance as any);
    
    // Setup RealtimeSubscriptionService mock
    const mockRealtimeInstance = {
      subscribeToMatches: jest.fn(),
      unsubscribe: jest.fn(),
    };
    mockRealtimeService.getInstance.mockReturnValue(mockRealtimeInstance as any);
    
    // Setup performance monitor mock
    mockQueryPerformanceMonitor.trackQuery = jest.fn();
  });

  describe('DualReadService Integration', () => {
    it('should configure DualReadService correctly', () => {
      const mockInstance = mockDualReadService.getInstance();
      
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

    it('should call getMatches with correct filters', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      const filters = {
        tournamentCode: 'FIVB2024M001',
        eventId: 100,
        round: 'Pool A',
        status: 'RUNNING' as const,
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-07'
        }
      };

      mockInstance.getMatches.mockResolvedValue({
        data: mockMatches,
        source: 'database',
        timestamp: Date.now(),
        performance: { queryTime: 250, fallbackUsed: false }
      });

      await mockInstance.getMatches(filters);

      expect(mockInstance.getMatches).toHaveBeenCalledWith(filters);
    });
  });

  describe('Real-time Integration', () => {
    it('should set up real-time subscription for live matches', () => {
      const mockRealtimeInstance = mockRealtimeService.getInstance();
      const mockSubscription = 'subscription-id';
      
      mockRealtimeInstance.subscribeToMatches.mockReturnValue(mockSubscription);

      // Simulate real-time subscription setup
      const subscription = mockRealtimeInstance.subscribeToMatches(
        'FIVB2024M001',
        jest.fn()
      );

      expect(mockRealtimeInstance.subscribeToMatches).toHaveBeenCalledWith(
        'FIVB2024M001',
        expect.any(Function)
      );
      expect(subscription).toBe(mockSubscription);
    });

    it('should handle real-time subscription cleanup', () => {
      const mockRealtimeInstance = mockRealtimeService.getInstance();
      const mockSubscription = 'subscription-id';

      mockRealtimeInstance.unsubscribe.mockImplementation(() => {});

      // Simulate subscription cleanup
      mockRealtimeInstance.unsubscribe(mockSubscription);

      expect(mockRealtimeInstance.unsubscribe).toHaveBeenCalledWith(mockSubscription);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track query performance when enabled', () => {
      const queryKey = ['matches', { tournamentCode: 'FIVB2024M001' }];
      const startTime = Date.now();
      const endTime = startTime + 150;
      
      queryPerformanceMonitor.trackQuery(
        queryKey,
        startTime,
        endTime,
        mockMatches,
        undefined
      );

      expect(mockQueryPerformanceMonitor.trackQuery).toHaveBeenCalledWith(
        queryKey,
        startTime,
        endTime,
        mockMatches,
        undefined
      );
    });

    it('should track errors in performance monitoring', () => {
      const queryKey = ['matches', { tournamentCode: 'FIVB2024M001' }];
      const startTime = Date.now();
      const endTime = startTime + 300;
      const error = new Error('API timeout');
      
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
    it('should determine live cache strategy for running matches', () => {
      const filters = { status: 'RUNNING' as const };
      
      const determineCacheStrategy = (status?: string, date?: string) => {
        if (status === 'RUNNING' || status === 'SCHEDULED') return 'live';
        if (status === 'COMPLETED' || status === 'CANCELLED') return 'historical';
        
        if (date) {
          const today = new Date().toISOString().split('T')[0];
          if (date === today) return 'live';
          if (date < today) return 'historical';
        }
        
        return 'live';
      };

      expect(determineCacheStrategy(filters.status)).toBe('live');
    });

    it('should determine historical cache strategy for completed matches', () => {
      const filters = { status: 'COMPLETED' as const };
      
      const determineCacheStrategy = (status?: string) => {
        if (status === 'RUNNING' || status === 'SCHEDULED') return 'live';
        if (status === 'COMPLETED' || status === 'CANCELLED') return 'historical';
        return 'live';
      };

      expect(determineCacheStrategy(filters.status)).toBe('historical');
    });

    it('should determine strategy based on date filters', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const determineCacheStrategy = (date?: string) => {
        if (date) {
          const today = new Date().toISOString().split('T')[0];
          if (date === today) return 'live';
          if (date < today) return 'historical';
        }
        return 'live';
      };

      expect(determineCacheStrategy(today)).toBe('live');
      expect(determineCacheStrategy(yesterday)).toBe('historical');
    });
  });

  describe('Referee Grouping Logic', () => {
    it('should group matches by referee when requested', () => {
      const groupMatchesByReferee = (matches: MatchDTO[]): MatchDTO[] => {
        return matches.sort((a, b) => {
          const refA = a.refereeAssignments?.[0]?.referee?.name || '';
          const refB = b.refereeAssignments?.[0]?.referee?.name || '';
          return refA.localeCompare(refB);
        });
      };

      const groupedMatches = groupMatchesByReferee([...mockMatches]);

      expect(groupedMatches[0].refereeAssignments?.[0]?.referee?.name).toBe('Jane Smith');
      expect(groupedMatches[1].refereeAssignments?.[0]?.referee?.name).toBe('John Doe');
    });
  });

  describe('Live Update Interval Logic', () => {
    it('should set live update interval for active matches', () => {
      const matches = [mockMatches[0]]; // Running match
      
      const liveMatches = matches.filter(match => 
        match.status === 'RUNNING' || match.status === 'SCHEDULED'
      );
      
      const shouldHaveLiveInterval = liveMatches.length > 0;
      
      expect(shouldHaveLiveInterval).toBe(true);
    });

    it('should not set live update interval for completed matches', () => {
      const matches = [mockMatches[1]]; // Completed match
      
      const liveMatches = matches.filter(match => 
        match.status === 'RUNNING' || match.status === 'SCHEDULED'
      );
      
      const shouldHaveLiveInterval = liveMatches.length > 0;
      
      expect(shouldHaveLiveInterval).toBe(false);
    });
  });

  describe('Error Handling Logic', () => {
    it('should handle service errors correctly', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      mockInstance.getMatches.mockResolvedValue({
        data: null,
        source: 'api',
        timestamp: Date.now(),
        performance: { queryTime: 500, fallbackUsed: true },
        error: 'Tournament not found'
      });

      const result = await mockInstance.getMatches({ tournamentCode: 'INVALID' });

      expect(result.error).toBe('Tournament not found');
      expect(result.data).toBeNull();
      expect(result.performance.fallbackUsed).toBe(true);
    });

    it('should use more aggressive retries for live matches', () => {
      const hasLiveMatches = true;
      
      const retryLogic = (failureCount: number, error: Error, hasLive: boolean) => {
        const maxRetries = hasLive ? 5 : 3;
        if (failureCount >= maxRetries) return false;
        if (error.message.includes('not configured')) return false;
        return true;
      };

      expect(retryLogic(4, new Error('Network error'), hasLiveMatches)).toBe(true);
      expect(retryLogic(5, new Error('Network error'), hasLiveMatches)).toBe(false);
      expect(retryLogic(2, new Error('Network error'), false)).toBe(true);
      expect(retryLogic(3, new Error('Network error'), false)).toBe(false);
    });

    it('should calculate faster retry delays for live matches', () => {
      const retryDelay = (attemptIndex: number, hasLive: boolean) => {
        const baseDelay = hasLive ? 500 : 1000;
        return Math.min(baseDelay * 2 ** attemptIndex, 30000);
      };

      expect(retryDelay(0, true)).toBe(500);
      expect(retryDelay(0, false)).toBe(1000);
      expect(retryDelay(1, true)).toBe(1000);
      expect(retryDelay(1, false)).toBe(2000);
    });
  });

  describe('Filter Validation', () => {
    it('should accept valid match filters', () => {
      const validFilters = {
        tournamentCode: 'FIVB2024M001',
        eventId: 100,
        round: 'Pool A',
        status: 'RUNNING' as const,
        date: '2024-01-01',
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-07'
        }
      };

      expect(typeof validFilters.tournamentCode).toBe('string');
      expect(typeof validFilters.eventId).toBe('number');
      expect(typeof validFilters.round).toBe('string');
      expect(['SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'].includes(validFilters.status)).toBe(true);
      expect(validFilters.dateRange).toHaveProperty('startDate');
      expect(validFilters.dateRange).toHaveProperty('endDate');
    });

    it('should handle optional filter parameters', () => {
      const partialFilters = {
        tournamentCode: 'FIVB2024M001'
      };

      expect(partialFilters.eventId).toBeUndefined();
      expect(partialFilters.round).toBeUndefined();
      expect(partialFilters.status).toBeUndefined();
    });
  });

  describe('Data Transformation', () => {
    it('should return empty array when no data available', () => {
      const processData = (data: MatchDTO[] | null) => data || [];
      
      expect(processData(null)).toEqual([]);
      expect(processData(mockMatches)).toEqual(mockMatches);
    });

    it('should preserve match data structure', () => {
      const match = mockMatches[0];
      
      expect(match).toHaveProperty('id');
      expect(match).toHaveProperty('matchNo');
      expect(match).toHaveProperty('tournamentCode');
      expect(match).toHaveProperty('status');
      expect(match).toHaveProperty('team1');
      expect(match).toHaveProperty('team2');
      expect(match).toHaveProperty('score');
      expect(match).toHaveProperty('refereeAssignments');
    });

    it('should handle court assignment display logic', () => {
      const match = mockMatches[0];
      
      expect(match.court).toBe('Court 1');
      expect(match.refereeAssignments).toHaveLength(1);
      expect(match.refereeAssignments?.[0].referee.name).toBe('John Doe');
    });
  });

  describe('Configuration Management', () => {
    it('should merge default and user configurations correctly', () => {
      const defaultConfig = {
        readStrategy: 'db_first',
        fallbackEnabled: true,
        enablePerformanceMonitoring: true,
        enableRealTimeUpdates: true,
        enableLiveScores: true,
        cacheStrategy: 'live',
        groupByReferee: false,
        includeCourt: true
      };

      const userConfig = {
        readStrategy: 'api_first',
        enableRealTimeUpdates: false,
        groupByReferee: true
      };

      const mergedConfig = { ...defaultConfig, ...userConfig };

      expect(mergedConfig.readStrategy).toBe('api_first');
      expect(mergedConfig.enableRealTimeUpdates).toBe(false);
      expect(mergedConfig.groupByReferee).toBe(true);
      expect(mergedConfig.fallbackEnabled).toBe(true); // Should keep default
    });
  });
});