import { DualReadService } from '../../services/DualReadService';
import { TournamentCodeResolver } from '../../services/TournamentCodeResolver';
import { CacheServiceCompatibility } from '../compatibility/CacheServiceCompatibility';
import { FeatureFlagManager, featureFlags } from '../compatibility/FeatureFlags';
import { FilterOptions } from '../../types/cache';

// Mock dependencies
jest.mock('../../services/DualReadService', () => ({
  DualReadService: {
    getInstance: jest.fn(() => ({
      configure: jest.fn(),
      getTournaments: jest.fn(),
      getMatches: jest.fn(),
      getReferees: jest.fn(),
      invalidateCache: jest.fn(),
      getPerformanceMetrics: jest.fn(() => new Map()),
    })),
  },
}));
jest.mock('../../lib/queryClient', () => ({
  queryClient: {
    removeQueries: jest.fn(),
    clear: jest.fn(),
  },
}));
jest.mock('../../lib/queryPerformance');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('../../services/TournamentCodeResolver', () => ({
  TournamentCodeResolver: {
    getInstance: jest.fn(() => ({
      resolve: jest.fn()
    })),
  },
}));

const mockDualReadService = DualReadService as jest.Mocked<typeof DualReadService>;
const mockTournamentCodeResolver = TournamentCodeResolver as jest.Mocked<typeof TournamentCodeResolver>;

// Test data
const mockTournamentDTO = {
  id: '1',
  visNo: 'VIS001',
  code: 'FIVB2024M001',
  name: 'Test Tournament',
  gender: 'M' as const,
  tournamentType: 'FIVB' as const,
  dates: {
    startDate: '2024-01-01',
    endDate: '2024-01-07',
    startDateQualification: '2023-12-30',
    startDateMainDraw: '2024-01-01',
  },
  status: 'ACTIVE' as const,
  city: 'Test City',
  country: 'Test Country',
  countryCode: 'TC',
  location: 'Test Location',
};

const mockMatchDTO = {
  id: '1',
  visNo: 'M001',
  tournamentCode: 'FIVB2024M001',
  matchCode: 'M001',
  round: 'Pool A',
  status: 'RUNNING' as const,
  court: { courtNumber: '1', courtName: 'Court 1' },
  scheduledDateTime: '2024-01-01T10:00:00Z',
  team1: { teamNumber: 1, teamName: 'Team A', player1Name: 'Player 1', player2Name: 'Player 2', countryCode: 'USA' },
  team2: { teamNumber: 2, teamName: 'Team B', player1Name: 'Player 3', player2Name: 'Player 4', countryCode: 'BRA' },
};

const mockRefereeDTO = {
  id: '1',
  refereeId: 'REF001',
  name: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  federationCode: 'USA',
  gender: 'M' as const,
  status: 'ACTIVE' as const,
  type: 'REFEREE' as const,
  role: 'Referee1' as const,
  assignments: [{
    id: '1',
    matchId: '1',
    matchNo: 'M001',
    refereeId: 'REF001',
    position: 'R1' as const,
    status: 'ASSIGNED' as const,
    tournamentCode: 'FIVB2024M001',
    court: 'Court 1',
    scheduledDateTime: '2024-01-01T10:00:00Z',
    team1Name: 'Team A',
    team2Name: 'Team B',
    round: 'Pool A',
    assignedAt: '2024-01-01T08:00:00Z',
  }]
};

describe('Backward Compatibility Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Enable new hooks for testing
    CacheServiceCompatibility.enableNewHooks();
    
    // Setup DualReadService mock
    const mockInstance = {
      configure: jest.fn(),
      getTournaments: jest.fn(),
      getMatches: jest.fn(),
      getReferees: jest.fn(),
      invalidateCache: jest.fn(),
      getPerformanceMetrics: jest.fn(),
    };
    mockDualReadService.getInstance.mockReturnValue(mockInstance as any);
    (mockTournamentCodeResolver.getInstance as jest.Mock).mockReturnValue({
      resolve: jest.fn().mockResolvedValue(null)
    });
  });

  describe('CacheServiceCompatibility', () => {
    beforeEach(() => {
      // Enable new hooks for testing
      CacheServiceCompatibility.enableNewHooks();
    });

    it('should transform tournament data to legacy format', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      mockInstance.getTournaments.mockResolvedValue({
        data: [mockTournamentDTO],
        source: 'database',
        timestamp: Date.now(),
        performance: { queryTime: 150, fallbackUsed: false }
      });

      const result = await CacheServiceCompatibility.getTournaments();
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].TournamentNo).toBe('VIS001');
      expect(result.data[0].TournamentName).toBe('Test Tournament');
      expect(result.data[0].Gender).toBe('M');
      expect(result.source).toBe('supabase');
      expect(result.cached).toBe(true);
    });

    it('should transform match data to legacy format', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      mockInstance.getMatches.mockResolvedValue({
        data: [mockMatchDTO],
        source: 'api',
        timestamp: Date.now(),
        performance: { queryTime: 200, fallbackUsed: false }
      });

      const result = await CacheServiceCompatibility.getMatches('FIVB2024M001');
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].MatchNo).toBe('M001');
      expect(result.data[0].TournamentNo).toBe('FIVB2024M001');
      expect(result.data[0].Status).toBe('RUNNING');
      expect(result.source).toBe('api');
      expect(result.cached).toBe(false);
    });

    it('should resolve numeric tournament identifiers using eventNo and resolved tournamentCode', async () => {
      const mockInstance = mockDualReadService.getInstance();
      const resolverInstance = {
        resolve: jest.fn().mockResolvedValue('ROM2026M001')
      };
      (mockTournamentCodeResolver.getInstance as jest.Mock).mockReturnValue(resolverInstance);

      mockInstance.getMatches.mockResolvedValue({
        data: [mockMatchDTO],
        source: 'database',
        timestamp: Date.now(),
        performance: { queryTime: 120, fallbackUsed: false }
      });

      await CacheServiceCompatibility.getMatches('123456');

      expect(resolverInstance.resolve).toHaveBeenCalledWith({ visNo: '123456' });
      expect(mockInstance.getMatches).toHaveBeenCalledWith({
        eventNo: 123456,
        tournamentCode: 'ROM2026M001'
      });
    });

    it('should transform referee data to legacy format', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      mockInstance.getReferees.mockResolvedValue({
        data: [mockRefereeDTO],
        source: 'database',
        timestamp: Date.now(),
        performance: { queryTime: 100, fallbackUsed: false }
      });

      const result = await CacheServiceCompatibility.getRefereeData('FIVB2024M001');
      
      expect(result.data.tournamentNo).toBe('FIVB2024M001');
      expect(result.data.referees).toHaveLength(1);
      expect(result.data.referees[0].RefereeId).toBe('REF001');
      expect(result.source).toBe('supabase');
    });

    it('should handle errors gracefully', async () => {
      const mockInstance = mockDualReadService.getInstance();
      const error = new Error('Service unavailable');
      
      mockInstance.getTournaments.mockRejectedValue(error);

      await expect(CacheServiceCompatibility.getTournaments()).rejects.toThrow('Service unavailable');
    });

    it('should handle filter transformation correctly', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      mockInstance.getTournaments.mockResolvedValue({
        data: [mockTournamentDTO],
        source: 'database',
        timestamp: Date.now(),
        performance: { queryTime: 150, fallbackUsed: false }
      });

      const filters: FilterOptions = {
        year: 2024,
        gender: 'M',
        country: 'USA',
        status: 'active'
      };

      await CacheServiceCompatibility.getTournaments(filters);
      
      expect(mockInstance.getTournaments).toHaveBeenCalledWith({
        season: 2024,
        gender: 'M',
        country: 'USA',
        status: 'ACTIVE'
      });
    });

    it('should clear cache correctly', async () => {
      await CacheServiceCompatibility.clearCache(['tournaments']);
      
      // Verify both TanStack Query and DualReadService cache clearing
      expect(mockDualReadService.getInstance().invalidateCache).toHaveBeenCalledWith('tournaments');
    });

    it('should return correct cache stats', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      mockInstance.getPerformanceMetrics.mockReturnValue(new Map([
        ['tournaments', { totalRequests: 10, avgDbTime: 100, avgApiTime: 200 }],
        ['matches', { totalRequests: 20, avgDbTime: 150, avgApiTime: 250 }]
      ]));

      const stats = await CacheServiceCompatibility.getCacheStats();
      
      expect(stats.performance.totalRequests).toBe(30);
      expect(stats.performance.avgResponseTime).toBeGreaterThan(0);
    });

    it('should handle feature flag state correctly', () => {
      expect(CacheServiceCompatibility.isUsingNewHooks()).toBe(true);
      
      process.env.EXPO_PUBLIC_USE_NEW_HOOKS = 'false';
      // Note: In real implementation, this would need to be re-evaluated
    });
  });

  describe('FeatureFlagManager', () => {
    it('should get and set feature flags correctly', async () => {
      await featureFlags.setFlag('useNewTournamentsHook', true);
      expect(featureFlags.getFlag('useNewTournamentsHook')).toBe(true);
    });

    it('should enable new hook for component', async () => {
      await featureFlags.enableNewHookForComponent('TournamentList', 'tournaments');
      
      expect(featureFlags.shouldUseNewHook('TournamentList', 'tournaments')).toBe(true);
      
      const status = featureFlags.getMigrationStatus('TournamentList');
      expect(status?.usingNewHook).toBe(true);
      expect(status?.component).toBe('TournamentList');
    });

    it('should disable new hook on error threshold', async () => {
      const component = 'MatchList';
      
      // Enable the hook first
      await featureFlags.enableNewHookForComponent(component, 'matches');
      
      // Record multiple errors
      for (let i = 0; i < 6; i++) {
        await featureFlags.recordError(component, `Error ${i + 1}`);
      }
      
      // Should auto-rollback
      expect(featureFlags.shouldUseNewHook(component, 'matches')).toBe(false);
      
      const status = featureFlags.getMigrationStatus(component);
      expect(status?.errorCount).toBe(6);
      expect(status?.usingNewHook).toBe(false);
    });

    it('should record performance comparisons', async () => {
      await featureFlags.recordPerformanceComparison('TournamentList', 300, 200);
      
      const status = featureFlags.getMigrationStatus('TournamentList');
      expect(status?.performanceComparison?.oldSystemTime).toBe(300);
      expect(status?.performanceComparison?.newSystemTime).toBe(200);
      expect(status?.performanceComparison?.improvement).toBe(33.333333333333336);
    });

    it('should handle gradual rollout correctly', async () => {
      // Test 100% rollout
      await featureFlags.enableGradualRollout('tournaments', 100);
      expect(featureFlags.getFlag('useNewTournamentsHook')).toBe(true);
      
      // Test 0% rollout
      await featureFlags.enableGradualRollout('matches', 0);
      expect(featureFlags.getFlag('useNewMatchesHook')).toBe(false);
    });

    it('should reset error count', async () => {
      const component = 'RefereeCard';
      
      await featureFlags.recordError(component, 'Test error');
      expect(featureFlags.getMigrationStatus(component)?.errorCount).toBe(1);
      
      await featureFlags.resetErrorCount(component);
      expect(featureFlags.getMigrationStatus(component)?.errorCount).toBe(0);
    });

    it('should export and import configuration', async () => {
      // Set some test data
      await featureFlags.setFlag('useNewTournamentsHook', true);
      await featureFlags.enableNewHookForComponent('TestComponent', 'tournaments');
      
      const exported = featureFlags.exportConfiguration();
      expect(exported.flags.useNewTournamentsHook).toBe(true);
      expect(exported.migrationStatuses).toHaveLength(1);
      
      // Import different configuration
      const newConfig = {
        flags: { useNewMatchesHook: true },
        migrationStatuses: [
          {
            component: 'ImportedComponent',
            usingNewHook: true,
            errorCount: 0,
          }
        ]
      };
      
      await featureFlags.importConfiguration(newConfig);
      expect(featureFlags.getFlag('useNewMatchesHook')).toBe(true);
    });

    it('should get all migration statuses', async () => {
      await featureFlags.enableNewHookForComponent('Component1', 'tournaments');
      await featureFlags.enableNewHookForComponent('Component2', 'matches');
      
      const allStatuses = featureFlags.getAllMigrationStatuses();
      expect(allStatuses).toHaveLength(2);
      expect(allStatuses.find(s => s.component === 'Component1')).toBeTruthy();
      expect(allStatuses.find(s => s.component === 'Component2')).toBeTruthy();
    });
  });

  describe('Performance Validation', () => {
    it('should validate performance improvements', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      // Mock fast response
      mockInstance.getTournaments.mockResolvedValue({
        data: [mockTournamentDTO],
        source: 'database',
        timestamp: Date.now(),
        performance: { queryTime: 100, fallbackUsed: false }
      });

      const startTime = Date.now();
      const result = await CacheServiceCompatibility.getTournaments();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
      expect(result.performance.totalTime).toBe(100);
      expect(result.data).toHaveLength(1);
    });

    it('should track fallback usage correctly', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      mockInstance.getTournaments.mockResolvedValue({
        data: [mockTournamentDTO],
        source: 'api', // Fallback to API
        timestamp: Date.now(),
        performance: { queryTime: 300, fallbackUsed: true }
      });

      const result = await CacheServiceCompatibility.getTournaments();
      
      expect(result.source).toBe('api');
      expect(result.cached).toBe(false);
      expect(result.performance.totalTime).toBe(300);
    });

    it('should maintain data integrity during transformation', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      mockInstance.getTournaments.mockResolvedValue({
        data: [mockTournamentDTO],
        source: 'database',
        timestamp: Date.now(),
        performance: { queryTime: 150, fallbackUsed: false }
      });

      const result = await CacheServiceCompatibility.getTournaments();
      
      // Verify all essential fields are preserved
      const tournament = result.data[0];
      expect(tournament.TournamentNo).toBe(mockTournamentDTO.visNo);
      expect(tournament.TournamentName).toBe(mockTournamentDTO.name);
      expect(tournament.Gender).toBe(mockTournamentDTO.gender);
      expect(tournament.StartDate).toBe(mockTournamentDTO.dates.startDate);
      expect(tournament.EndDate).toBe(mockTournamentDTO.dates.endDate);
      expect(tournament.City).toBe(mockTournamentDTO.city);
      expect(tournament.Country).toBe(mockTournamentDTO.country);
      expect(tournament.Status).toBe(mockTournamentDTO.status);
    });
  });

  describe('Migration Safety', () => {
    it('should handle migration errors gracefully', async () => {
      const mockInstance = mockDualReadService.getInstance();
      
      // Simulate error in new system
      mockInstance.getTournaments.mockRejectedValue(new Error('New system error'));
      
      // Should throw the error for proper error handling
      await expect(CacheServiceCompatibility.getTournaments()).rejects.toThrow('New system error');
    });

    it('should provide rollback capability', async () => {
      // Enable new hook
      await featureFlags.enableNewHookForComponent('TestComponent', 'tournaments');
      expect(featureFlags.shouldUseNewHook('TestComponent', 'tournaments')).toBe(true);
      
      // Rollback
      await featureFlags.disableNewHookForComponent('TestComponent', 'tournaments', 'Manual rollback');
      expect(featureFlags.shouldUseNewHook('TestComponent', 'tournaments')).toBe(false);
      
      const status = featureFlags.getMigrationStatus('TestComponent');
      expect(status?.lastError).toBe('Manual rollback');
    });

    it('should respect error thresholds per component', async () => {
      const component = 'SafetyTestComponent';
      
      await featureFlags.enableNewHookForComponent(component, 'tournaments');
      
      // Record errors below threshold
      for (let i = 0; i < 3; i++) {
        await featureFlags.recordError(component, `Error ${i + 1}`);
      }
      
      // Should still use new hook (below default threshold of 5)
      expect(featureFlags.shouldUseNewHook(component, 'tournaments')).toBe(true);
      
      // Record more errors to exceed threshold
      for (let i = 3; i < 6; i++) {
        await featureFlags.recordError(component, `Error ${i + 1}`);
      }
      
      // Should now use legacy system
      expect(featureFlags.shouldUseNewHook(component, 'tournaments')).toBe(false);
    });
  });
});
