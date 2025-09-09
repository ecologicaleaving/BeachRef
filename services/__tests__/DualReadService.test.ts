import { DualReadService, ReadStrategy, DualReadConfig } from '../DualReadService';
import { NetworkMonitor } from '../NetworkMonitor';
import { ErrorLogger } from '../ErrorLogger';

// Mock dependencies
jest.mock('../NetworkMonitor', () => ({
  NetworkMonitor: {
    getInstance: jest.fn()
  }
}));

jest.mock('../ErrorLogger', () => ({
  ErrorLogger: {
    getInstance: jest.fn()
  }
}));

jest.mock('../ConnectionCircuitBreaker', () => ({
  ConnectionCircuitBreaker: {
    getInstance: jest.fn()
  }
}));

jest.mock('../CacheService', () => ({
  CacheService: {
    getInstance: jest.fn()
  }
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis()
      }))
    }))
  }))
}));

// Mock fetch
global.fetch = jest.fn();

// Mock environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.EXPO_PUBLIC_EDGE_URL = 'https://test-edge.supabase.co';

describe('DualReadService', () => {
  let dualReadService: DualReadService;
  let mockNetworkMonitor: any;
  let mockErrorLogger: any;
  let mockSupabase: any;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock NetworkMonitor
    mockNetworkMonitor = {
      isConnected: jest.fn(() => true),
      addListener: jest.fn(),
      removeListener: jest.fn()
    };
    
    // Mock ErrorLogger
    mockErrorLogger = {
      logError: jest.fn().mockResolvedValue(undefined)
    };

    // Mock CacheService
    const mockCacheService = {
      clearCache: jest.fn().mockResolvedValue(undefined)
    };
    
    (NetworkMonitor.getInstance as jest.Mock).mockReturnValue(mockNetworkMonitor);
    (ErrorLogger.getInstance as jest.Mock).mockReturnValue(mockErrorLogger);
    
    const { CacheService } = require('../CacheService');
    (CacheService.getInstance as jest.Mock).mockReturnValue(mockCacheService);

    const { ConnectionCircuitBreaker } = require('../ConnectionCircuitBreaker');
    (ConnectionCircuitBreaker.getInstance as jest.Mock).mockReturnValue({
      execute: jest.fn((fn) => fn())
    });

    // Setup Supabase mock
    const { createClient } = require('@supabase/supabase-js');
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis()
        }))
      }))
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Mock fetch
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;

    // Reset singleton
    (DualReadService as any).instance = null;
    dualReadService = DualReadService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DualReadService.getInstance();
      const instance2 = DualReadService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Configuration', () => {
    it('should configure read strategy', () => {
      const config: Partial<DualReadConfig> = {
        readStrategy: 'api_first',
        fallbackEnabled: false,
        dbTimeoutMs: 3000
      };

      dualReadService.configure(config);
      
      const currentConfig = dualReadService.getConfig();
      expect(currentConfig.readStrategy).toBe('api_first');
      expect(currentConfig.fallbackEnabled).toBe(false);
      expect(currentConfig.dbTimeoutMs).toBe(3000);
    });
  });

  describe('Database First Strategy', () => {
    beforeEach(() => {
      dualReadService.configure({
        readStrategy: 'db_first',
        fallbackEnabled: true
      });
    });

    it('should try database first for tournaments', async () => {
      // Mock successful database response
      const mockDbQuery = {
        eq: jest.fn().mockReturnThis(),
        data: [
          {
            id: 1,
            vis_tournament_no: 12345,
            tournament_code: 'TEST2024',
            name: 'Test Tournament',
            gender: 'M',
            type: 'FIVB',
            status: 'active',
            country: 'Italy',
            city: 'Rome'
          }
        ],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockDbQuery)
      });
      
      // Make eq() return the query with data
      mockDbQuery.eq.mockImplementation(() => Promise.resolve(mockDbQuery));

      const result = await dualReadService.getTournaments({ season: 2024 });

      expect(result.source).toBe('database');
      expect(result.data).toBeTruthy();
      expect(result.data).toHaveLength(1);
      expect(result.performance.fallbackUsed).toBe(false);
    });

    it('should fallback to API when database fails', async () => {
      // Mock database failure
      const mockDbQuery = {
        eq: jest.fn().mockReturnThis()
      };
      mockDbQuery.eq.mockImplementation(() => Promise.reject(new Error('DB Error')));

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockDbQuery)
      });

      // Mock successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            visNo: '12345',
            code: 'TEST2024',
            name: 'Test Tournament',
            gender: 'M',
            tournamentType: 'FIVB',
            status: 'ACTIVE',
            country: 'Italy'
          }
        ])
      } as any);

      const result = await dualReadService.getTournaments({ season: 2024 });

      expect(result.source).toBe('api');
      expect(result.data).toBeTruthy();
      expect(result.performance.fallbackUsed).toBe(true);
      expect(mockErrorLogger.logError).toHaveBeenCalled();
    });
  });

  describe('API First Strategy', () => {
    beforeEach(() => {
      dualReadService.configure({
        readStrategy: 'api_first',
        fallbackEnabled: true
      });
    });

    it('should try API first for matches', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            visNo: '98765',
            matchCode: 'M001',
            tournamentCode: 'TEST2024',
            round: 'R1',
            status: 'FINISHED',
            court: {
              courtNumber: '1',
              courtName: 'Court 1'
            },
            team1: {
              teamName: 'Team A',
              countryCode: 'ITA'
            },
            team2: {
              teamName: 'Team B',
              countryCode: 'GER'
            }
          }
        ])
      } as any);

      const result = await dualReadService.getMatches({ tournamentCode: 'TEST2024' });

      expect(result.source).toBe('api');
      expect(result.data).toBeTruthy();
      expect(result.data).toHaveLength(1);
      expect(result.performance.fallbackUsed).toBe(false);
    });

    it('should fallback to database when API fails', async () => {
      // Mock API failure
      mockFetch.mockRejectedValue(new Error('API Error'));

      // Mock successful database response
      const mockDbQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        data: [
          {
            id: 1,
            vis_match_no: 98765,
            tournament_code: 'TEST2024',
            round_code: 'R1',
            status: 'finished',
            court: 'Court 1',
            team_a_name: 'Team A',
            team_b_name: 'Team B',
            sets: JSON.stringify([{ a: 21, b: 19 }]),
            result: JSON.stringify({ winnerRank: 1 })
          }
        ],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockDbQuery)
      });

      mockDbQuery.eq.mockImplementation(() => Promise.resolve(mockDbQuery));

      const result = await dualReadService.getMatches({ tournamentCode: 'TEST2024' });

      expect(result.source).toBe('database');
      expect(result.data).toBeTruthy();
      expect(result.performance.fallbackUsed).toBe(true);
      expect(mockErrorLogger.logError).toHaveBeenCalled();
    });
  });

  describe('Database Only Strategy', () => {
    beforeEach(() => {
      dualReadService.configure({
        readStrategy: 'db_only',
        fallbackEnabled: false
      });
    });

    it('should only query database', async () => {
      // Mock successful database response
      const mockDbQuery = {
        eq: jest.fn().mockReturnThis(),
        data: [
          {
            id: 1,
            vis_event_no: 77777,
            event_code: 'TEST_EVENT',
            tournament_id: 1,
            gender: 'M',
            phase: 'Main Draw',
            name: 'Test Event',
            country: 'Italy'
          }
        ],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockDbQuery)
      });

      mockDbQuery.eq.mockImplementation(() => Promise.resolve(mockDbQuery));

      const result = await dualReadService.getEvents({ tournamentCode: 'TEST2024' });

      expect(result.source).toBe('database');
      expect(result.data).toBeTruthy();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not fallback to API when database fails', async () => {
      // Mock database failure
      const mockDbQuery = {
        eq: jest.fn().mockReturnThis()
      };
      mockDbQuery.eq.mockImplementation(() => Promise.reject(new Error('DB Error')));

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockDbQuery)
      });

      const result = await dualReadService.getEvents({ tournamentCode: 'TEST2024' });

      expect(result.source).toBe('database');
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('API Only Strategy', () => {
    beforeEach(() => {
      dualReadService.configure({
        readStrategy: 'api_only',
        fallbackEnabled: false
      });
    });

    it('should only query API', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            visNo: '12345',
            code: 'TEST2024',
            name: 'Test Tournament',
            gender: 'M',
            tournamentType: 'FIVB'
          }
        ])
      } as any);

      const result = await dualReadService.getTournaments({ season: 2024 });

      expect(result.source).toBe('api');
      expect(result.data).toBeTruthy();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Network State Handling', () => {
    it('should not try API when network is disconnected', async () => {
      mockNetworkMonitor.isConnected.mockReturnValue(false);

      dualReadService.configure({
        readStrategy: 'api_first',
        fallbackEnabled: false
      });

      const result = await dualReadService.getTournaments({ season: 2024 });

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fallback to database when network is disconnected', async () => {
      mockNetworkMonitor.isConnected.mockReturnValue(false);

      dualReadService.configure({
        readStrategy: 'db_first',
        fallbackEnabled: true
      });

      // Mock successful database response
      const mockDbQuery = {
        eq: jest.fn().mockReturnThis(),
        data: [{ id: 1, vis_tournament_no: 12345, tournament_code: 'TEST2024' }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockDbQuery)
      });

      mockDbQuery.eq.mockImplementation(() => Promise.resolve(mockDbQuery));

      const result = await dualReadService.getTournaments({ season: 2024 });

      expect(result.source).toBe('database');
      expect(result.data).toBeTruthy();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      dualReadService.configure({
        enablePerformanceMonitoring: true
      });
    });

    it('should track performance metrics', async () => {
      // Mock successful database response
      const mockDbQuery = {
        eq: jest.fn().mockReturnThis(),
        data: [{ id: 1, vis_tournament_no: 12345 }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockDbQuery)
      });

      mockDbQuery.eq.mockImplementation(() => Promise.resolve(mockDbQuery));

      await dualReadService.getTournaments({ season: 2024 });

      const metrics = dualReadService.getPerformanceMetrics();
      expect(metrics.has('tournaments')).toBe(true);
    });

    it('should clear performance metrics', () => {
      dualReadService.clearPerformanceMetrics();
      const metrics = dualReadService.getPerformanceMetrics();
      expect(metrics.size).toBe(0);
    });
  });

  describe('Data Transformation', () => {
    it('should transform database tournaments to DTO format', async () => {
      const mockDbQuery = {
        eq: jest.fn().mockReturnThis(),
        data: [
          {
            id: 1,
            vis_tournament_no: 12345,
            tournament_code: 'TEST2024',
            name: 'Test Tournament',
            gender: 'M',
            type: 'FIVB',
            status: 'active',
            country: 'Italy',
            city: 'Rome',
            start_qualification: '2024-06-01',
            start_main_draw: '2024-06-03'
          }
        ],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockDbQuery)
      });

      mockDbQuery.eq.mockImplementation(() => Promise.resolve(mockDbQuery));

      const result = await dualReadService.getTournaments({ season: 2024 });

      expect(result.data).toBeTruthy();
      expect(result.data![0]).toHaveProperty('visNo', '12345');
      expect(result.data![0]).toHaveProperty('code', 'TEST2024');
      expect(result.data![0]).toHaveProperty('tournamentType', 'FIVB');
      expect(result.data![0].dates).toHaveProperty('startDateQualification');
    });

    it('should transform database matches to DTO format', async () => {
      const mockDbQuery = {
        eq: jest.fn().mockReturnThis(),
        data: [
          {
            id: 1,
            vis_match_no: 98765,
            tournament_code: 'TEST2024',
            round_code: 'R1',
            status: 'finished',
            court: 'Court 1',
            team_a_name: 'Team A',
            team_b_name: 'Team B',
            team_a_fed: 'ITA',
            team_b_fed: 'GER',
            sets: JSON.stringify([{ a: 21, b: 19 }, { a: 18, b: 21 }]),
            result: JSON.stringify({ winnerRank: 1, forfeit: false })
          }
        ],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockDbQuery)
      });

      mockDbQuery.eq.mockImplementation(() => Promise.resolve(mockDbQuery));

      const result = await dualReadService.getMatches({ tournamentCode: 'TEST2024' });

      expect(result.data).toBeTruthy();
      expect(result.data![0]).toHaveProperty('visNo', '98765');
      expect(result.data![0]).toHaveProperty('matchCode', 'M98765');
      expect(result.data![0].result).toHaveProperty('setScores');
      expect(result.data![0].result!.setScores).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle API timeout errors', async () => {
      // Mock API timeout
      mockFetch.mockRejectedValue(new Error('TimeoutError'));

      dualReadService.configure({
        readStrategy: 'api_only',
        apiTimeoutMs: 1000
      });

      const result = await dualReadService.getTournaments();

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(mockErrorLogger.logError).toHaveBeenCalled();
    });

    it('should handle database connection errors', async () => {
      const mockDbQuery = {
        eq: jest.fn().mockImplementation(() => Promise.reject(new Error('Connection failed')))
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockDbQuery)
      });

      dualReadService.configure({
        readStrategy: 'db_only'
      });

      const result = await dualReadService.getTournaments();

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(mockErrorLogger.logError).toHaveBeenCalled();
    });
  });

  describe('Cache Integration', () => {
    it('should invalidate cache when requested', async () => {
      const { CacheService } = require('../CacheService');
      const mockCacheService = CacheService.getInstance();

      await dualReadService.invalidateCache('tournaments');

      expect(mockCacheService.clearCache).toHaveBeenCalledWith(['tournaments']);
    });
  });
});