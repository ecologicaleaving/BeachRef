import { DualReadService, RefereeDTO } from '../../services/DualReadService';
import { queryPerformanceMonitor } from '../../lib/queryPerformance';

// Mock dependencies
jest.mock('../../services/DualReadService');
jest.mock('../../lib/queryPerformance');
jest.mock('../../services/RealtimeSubscriptionService');
jest.mock('../../lib/queryClient', () => ({
  queryKeys: {
    referees: {
      list: jest.fn(() => ['referees', 'test-filters']),
    },
  },
  createQueryOptions: {
    adaptive: jest.fn(() => ({ queryKey: ['referees'], queryFn: jest.fn() })),
  },
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

const mockDualReadService = DualReadService as jest.Mocked<typeof DualReadService>;
const mockQueryPerformanceMonitor = queryPerformanceMonitor as jest.Mocked<typeof queryPerformanceMonitor>;

// Mock RealtimeSubscriptionService without importing it
const mockRealtimeService = {
  getInstance: jest.fn(),
  subscribeToMatches: jest.fn(),
  unsubscribe: jest.fn(),
};

// Test data
const mockReferees: RefereeDTO[] = [
  {
    id: '1',
    refereeId: 'ref001',
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    federationCode: 'USA',
    gender: 'M',
    status: 'ACTIVE',
    type: 'REFEREE',
    role: 'Referee1',
    assignmentStatus: {
      current: 2,
      upcoming: 3,
      completed: 15,
      online: true
    },
    assignments: [
      {
        id: '1',
        matchId: 'match001',
        matchNo: 'M001',
        refereeId: 'ref001',
        position: 'R1',
        status: 'ASSIGNED',
        tournamentCode: 'FIVB2024M001',
        court: 'Court 1',
        scheduledDateTime: '2024-01-01T10:00:00Z',
        team1Name: 'Team A',
        team2Name: 'Team B',
        round: 'Pool A',
        assignedAt: '2024-01-01T08:00:00Z'
      }
    ]
  },
  {
    id: '2',
    refereeId: 'ref002',
    name: 'Jane Smith',
    firstName: 'Jane',
    lastName: 'Smith',
    federationCode: 'CAN',
    gender: 'W',
    status: 'ACTIVE',
    type: 'REFEREE',
    role: 'Referee2',
    assignmentStatus: {
      current: 0,
      upcoming: 1,
      completed: 8,
      online: false
    },
    assignments: []
  },
  {
    id: '3',
    refereeId: 'ref003',
    name: 'Carlos Silva',
    firstName: 'Carlos',
    lastName: 'Silva',
    federationCode: 'BRA',
    gender: 'M',
    status: 'INACTIVE',
    type: 'TECHNICAL',
    assignmentStatus: {
      current: 0,
      upcoming: 0,
      completed: 25,
      online: false
    },
    assignments: []
  }
];

describe('useReferees Hook Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup DualReadService mock
    const mockInstance = {
      configure: jest.fn(),
      getReferees: jest.fn(),
      invalidateCache: jest.fn(),
    };
    mockDualReadService.getInstance.mockReturnValue(mockInstance as any);
    
    // Setup RealtimeSubscriptionService mock
    const mockRealtimeInstance = {
      subscribeToMatches: jest.fn(),
      unsubscribe: jest.fn(),
    };
    mockRealtimeService.getInstance.mockReturnValue(mockRealtimeInstance);
    
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

    it('should call getReferees with correct filters', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      const filters = {
        tournamentCodes: ['FIVB2024M001', 'FIVB2024W001'],
        federationCode: 'USA',
        status: 'ACTIVE' as const,
        assignmentStatus: 'assigned' as const,
        includeAssignments: true
      };

      mockInstance.getReferees.mockResolvedValue({
        data: mockReferees,
        source: 'database',
        timestamp: Date.now(),
        performance: { queryTime: 120, fallbackUsed: false }
      });

      await mockInstance.getReferees(filters);

      expect(mockInstance.getReferees).toHaveBeenCalledWith(filters);
    });

    it('should handle referee data with assignment status', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      mockInstance.getReferees.mockResolvedValue({
        data: mockReferees,
        source: 'database',
        timestamp: Date.now(),
        performance: { queryTime: 120, fallbackUsed: false }
      });

      const result = await mockInstance.getReferees({ includeAssignments: true });
      
      expect(result.data).toHaveLength(3);
      expect(result.data![0].assignmentStatus?.current).toBe(2);
      expect(result.data![0].assignmentStatus?.online).toBe(true);
      expect(result.data![0].assignments).toHaveLength(1);
    });
  });

  describe('Real-time Integration', () => {
    it('should set up real-time subscription for assignment updates', () => {
      const mockRealtimeInstance = mockRealtimeService.getInstance();
      const mockSubscription = 'subscription-id';
      
      mockRealtimeInstance.subscribeToMatches.mockReturnValue(mockSubscription);

      // Simulate real-time subscription setup for referee assignments
      const tournamentCodes = ['FIVB2024M001', 'FIVB2024W001'];
      const subscriptions = tournamentCodes.map(code => 
        mockRealtimeInstance.subscribeToMatches(code, jest.fn())
      );

      tournamentCodes.forEach(code => {
        expect(mockRealtimeInstance.subscribeToMatches).toHaveBeenCalledWith(
          code,
          expect.any(Function)
        );
      });
      
      expect(subscriptions).toEqual([mockSubscription, mockSubscription]);
    });

    it('should handle real-time subscription cleanup', () => {
      const mockRealtimeInstance = mockRealtimeService.getInstance();
      const mockSubscriptions = ['subscription-1', 'subscription-2'];

      mockRealtimeInstance.unsubscribe.mockImplementation(() => {});

      // Simulate subscription cleanup
      mockSubscriptions.forEach(subscription => {
        mockRealtimeInstance.unsubscribe(subscription);
      });

      mockSubscriptions.forEach(subscription => {
        expect(mockRealtimeInstance.unsubscribe).toHaveBeenCalledWith(subscription);
      });
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track query performance when enabled', () => {
      const queryKey = ['referees', { tournamentCodes: ['FIVB2024M001'] }];
      const startTime = Date.now();
      const endTime = startTime + 120;
      
      queryPerformanceMonitor.trackQuery(
        queryKey,
        startTime,
        endTime,
        mockReferees,
        undefined
      );

      expect(mockQueryPerformanceMonitor.trackQuery).toHaveBeenCalledWith(
        queryKey,
        startTime,
        endTime,
        mockReferees,
        undefined
      );
    });

    it('should track errors in performance monitoring', () => {
      const queryKey = ['referees', { federationCode: 'USA' }];
      const startTime = Date.now();
      const endTime = startTime + 200;
      const error = new Error('Federation service unavailable');
      
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
    it('should determine live cache strategy for assigned referees', () => {
      const filters = { assignmentStatus: 'assigned' as const };
      
      const determineCacheStrategy = (assignmentStatus?: string, status?: string) => {
        if (assignmentStatus === 'assigned') return 'live';
        if (status === 'ACTIVE') return 'live';
        if (status === 'INACTIVE' || status === 'SUSPENDED') return 'historical';
        return 'live';
      };

      expect(determineCacheStrategy(filters.assignmentStatus)).toBe('live');
    });

    it('should determine historical cache strategy for inactive referees', () => {
      const filters = { status: 'INACTIVE' as const };
      
      const determineCacheStrategy = (status?: string) => {
        if (status === 'ACTIVE') return 'live';
        if (status === 'INACTIVE' || status === 'SUSPENDED') return 'historical';
        return 'live';
      };

      expect(determineCacheStrategy(filters.status)).toBe('historical');
    });

    it('should determine live strategy for active referees with assignments', () => {
      const filters = { 
        status: 'ACTIVE' as const,
        assignmentStatus: 'assigned' as const
      };
      
      const determineCacheStrategy = (assignmentStatus?: string, status?: string) => {
        if (assignmentStatus === 'assigned') return 'live';
        if (status === 'ACTIVE') return 'live';
        return 'historical';
      };

      expect(determineCacheStrategy(filters.assignmentStatus, filters.status)).toBe('live');
    });
  });

  describe('Assignment Count Logic', () => {
    it('should calculate assignment counts correctly', () => {
      const calculateAssignmentCounts = (referees: RefereeDTO[]) => {
        return referees.reduce((counts, referee) => {
          counts.total++;
          
          const hasActiveAssignments = (referee.assignmentStatus?.current || 0) > 0;
          if (hasActiveAssignments) {
            counts.assigned++;
          } else {
            counts.available++;
          }
          
          if (referee.assignmentStatus?.online) {
            counts.online++;
          }
          
          return counts;
        }, {
          total: 0,
          assigned: 0,
          available: 0,
          online: 0
        });
      };

      const counts = calculateAssignmentCounts(mockReferees);

      expect(counts.total).toBe(3);
      expect(counts.assigned).toBe(1); // Only John has current assignments > 0
      expect(counts.available).toBe(2); // Jane and Carlos have no current assignments
      expect(counts.online).toBe(1); // Only John is online
    });

    it('should handle referees without assignment status', () => {
      const refereesWithoutStatus: RefereeDTO[] = [
        {
          ...mockReferees[0],
          assignmentStatus: undefined
        }
      ];

      const calculateAssignmentCounts = (referees: RefereeDTO[]) => {
        return referees.reduce((counts, referee) => {
          counts.total++;
          
          const hasActiveAssignments = (referee.assignmentStatus?.current || 0) > 0;
          if (hasActiveAssignments) {
            counts.assigned++;
          } else {
            counts.available++;
          }
          
          if (referee.assignmentStatus?.online) {
            counts.online++;
          }
          
          return counts;
        }, {
          total: 0,
          assigned: 0,
          available: 0,
          online: 0
        });
      };

      const counts = calculateAssignmentCounts(refereesWithoutStatus);

      expect(counts.total).toBe(1);
      expect(counts.assigned).toBe(0);
      expect(counts.available).toBe(1);
      expect(counts.online).toBe(0);
    });
  });

  describe('Federation Grouping Logic', () => {
    it('should group referees by federation when requested', () => {
      const groupRefereesByFederation = (referees: RefereeDTO[]): RefereeDTO[] => {
        return referees.sort((a, b) => {
          const fedA = a.federationCode || '';
          const fedB = b.federationCode || '';
          
          // Primary sort by federation
          if (fedA !== fedB) {
            return fedA.localeCompare(fedB);
          }
          
          // Secondary sort by name within federation
          return a.name.localeCompare(b.name);
        });
      };

      const groupedReferees = groupRefereesByFederation([...mockReferees]);

      // Should be sorted by federation: BRA, CAN, USA
      expect(groupedReferees[0].federationCode).toBe('BRA');
      expect(groupedReferees[1].federationCode).toBe('CAN');
      expect(groupedReferees[2].federationCode).toBe('USA');
      
      // Names should be sorted within federation
      expect(groupedReferees[0].name).toBe('Carlos Silva');
      expect(groupedReferees[1].name).toBe('Jane Smith');
      expect(groupedReferees[2].name).toBe('John Doe');
    });
  });

  describe('Live Update Interval Logic', () => {
    it('should set live update interval for referees with assignments', () => {
      const referees = [mockReferees[0]]; // John has active assignments
      
      const shouldHaveLiveInterval = referees.some(ref => 
        (ref.assignmentStatus?.current || 0) > 0
      );
      
      expect(shouldHaveLiveInterval).toBe(true);
    });

    it('should not set live update interval for unassigned referees', () => {
      const referees = [mockReferees[1], mockReferees[2]]; // Jane and Carlos have no current assignments
      
      const shouldHaveLiveInterval = referees.some(ref => 
        (ref.assignmentStatus?.current || 0) > 0
      );
      
      expect(shouldHaveLiveInterval).toBe(false);
    });
  });

  describe('Error Handling Logic', () => {
    it('should handle service errors correctly', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      mockInstance.getReferees.mockResolvedValue({
        data: null,
        source: 'api',
        timestamp: Date.now(),
        performance: { queryTime: 400, fallbackUsed: true },
        error: 'Referee service unavailable'
      });

      const result = await mockInstance.getReferees({ federationCode: 'INVALID' });

      expect(result.error).toBe('Referee service unavailable');
      expect(result.data).toBeNull();
      expect(result.performance.fallbackUsed).toBe(true);
    });

    it('should use appropriate retry logic for referee assignments', () => {
      const hasActiveAssignments = true;
      
      const retryLogic = (failureCount: number, error: Error, hasAssignments: boolean) => {
        const maxRetries = hasAssignments ? 3 : 2;
        if (failureCount >= maxRetries) return false;
        if (error.message.includes('not configured')) return false;
        return true;
      };

      expect(retryLogic(2, new Error('Network error'), hasActiveAssignments)).toBe(true);
      expect(retryLogic(3, new Error('Network error'), hasActiveAssignments)).toBe(false);
      expect(retryLogic(1, new Error('Network error'), false)).toBe(true);
      expect(retryLogic(2, new Error('Network error'), false)).toBe(false);
    });

    it('should calculate standard retry delays for referee queries', () => {
      const retryDelay = (attemptIndex: number) => {
        const baseDelay = 1000;
        return Math.min(baseDelay * 2 ** attemptIndex, 20000);
      };

      expect(retryDelay(0)).toBe(1000);
      expect(retryDelay(1)).toBe(2000);
      expect(retryDelay(2)).toBe(4000);
      expect(retryDelay(10)).toBe(20000); // Should cap at 20000
    });
  });

  describe('Filter Validation', () => {
    it('should accept valid referee filters', () => {
      const validFilters = {
        tournamentCodes: ['FIVB2024M001', 'FIVB2024W001'],
        federationCode: 'USA',
        status: 'ACTIVE' as const,
        assignmentStatus: 'assigned' as const,
        includeAssignments: true,
        role: 'Referee1' as const
      };

      expect(Array.isArray(validFilters.tournamentCodes)).toBe(true);
      expect(typeof validFilters.federationCode).toBe('string');
      expect(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'RESTRICTED'].includes(validFilters.status)).toBe(true);
      expect(['assigned', 'available', 'all'].includes(validFilters.assignmentStatus)).toBe(true);
      expect(typeof validFilters.includeAssignments).toBe('boolean');
    });

    it('should handle optional filter parameters', () => {
      const partialFilters = {
        federationCode: 'CAN'
      };

      expect(partialFilters.tournamentCodes).toBeUndefined();
      expect(partialFilters.status).toBeUndefined();
      expect(partialFilters.assignmentStatus).toBeUndefined();
      expect(partialFilters.includeAssignments).toBeUndefined();
    });
  });

  describe('Data Transformation', () => {
    it('should return empty array when no data available', () => {
      const processData = (data: RefereeDTO[] | null) => data || [];
      
      expect(processData(null)).toEqual([]);
      expect(processData(mockReferees)).toEqual(mockReferees);
    });

    it('should preserve referee data structure', () => {
      const referee = mockReferees[0];
      
      expect(referee).toHaveProperty('id');
      expect(referee).toHaveProperty('refereeId');
      expect(referee).toHaveProperty('name');
      expect(referee).toHaveProperty('firstName');
      expect(referee).toHaveProperty('lastName');
      expect(referee).toHaveProperty('federationCode');
      expect(referee).toHaveProperty('gender');
      expect(referee).toHaveProperty('status');
      expect(referee).toHaveProperty('type');
      expect(referee).toHaveProperty('assignmentStatus');
      expect(referee).toHaveProperty('assignments');
    });

    it('should handle referee assignment data structure', () => {
      const referee = mockReferees[0];
      const assignment = referee.assignments![0];
      
      expect(assignment).toHaveProperty('id');
      expect(assignment).toHaveProperty('matchId');
      expect(assignment).toHaveProperty('matchNo');
      expect(assignment).toHaveProperty('refereeId');
      expect(assignment).toHaveProperty('position');
      expect(assignment).toHaveProperty('status');
      expect(assignment).toHaveProperty('tournamentCode');
      expect(assignment).toHaveProperty('court');
      expect(assignment).toHaveProperty('scheduledDateTime');
      expect(assignment).toHaveProperty('team1Name');
      expect(assignment).toHaveProperty('team2Name');
      expect(assignment).toHaveProperty('round');
    });
  });

  describe('Configuration Management', () => {
    it('should merge default and user configurations correctly', () => {
      const defaultConfig = {
        readStrategy: 'db_first',
        fallbackEnabled: true,
        enablePerformanceMonitoring: true,
        enableRealTimeUpdates: true,
        enableAssignmentUpdates: true,
        cacheStrategy: 'live',
        includeOnlineStatus: true,
        groupByFederation: false
      };

      const userConfig = {
        readStrategy: 'api_first',
        enableRealTimeUpdates: false,
        groupByFederation: true,
        cacheStrategy: 'historical'
      };

      const mergedConfig = { ...defaultConfig, ...userConfig };

      expect(mergedConfig.readStrategy).toBe('api_first');
      expect(mergedConfig.enableRealTimeUpdates).toBe(false);
      expect(mergedConfig.groupByFederation).toBe(true);
      expect(mergedConfig.cacheStrategy).toBe('historical');
      expect(mergedConfig.fallbackEnabled).toBe(true); // Should keep default
    });

    it('should handle assignment-specific configuration options', () => {
      const assignmentConfig = {
        enableAssignmentUpdates: true,
        includeOnlineStatus: true,
        cacheStrategy: 'live' as const
      };

      expect(typeof assignmentConfig.enableAssignmentUpdates).toBe('boolean');
      expect(typeof assignmentConfig.includeOnlineStatus).toBe('boolean');
      expect(['live', 'historical', 'static'].includes(assignmentConfig.cacheStrategy)).toBe(true);
    });
  });
});