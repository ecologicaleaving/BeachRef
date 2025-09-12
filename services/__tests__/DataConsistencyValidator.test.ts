import { DataConsistencyValidator } from '../DataConsistencyValidator';
import { VisApiClient } from '../api/VisApiClient';
import { ErrorLogger } from '../ErrorLogger';
import { NetworkMonitor } from '../NetworkStateManager';

// Mock dependencies
jest.mock('../api/VisApiClient', () => ({
  VisApiClient: {
    getInstance: jest.fn(() => ({
      getTournaments: jest.fn(),
      getEvents: jest.fn(),
      getMatches: jest.fn()
    }))
  }
}));

jest.mock('../ErrorLogger', () => ({
  ErrorLogger: {
    getInstance: jest.fn(() => ({
      log: jest.fn(),
      logError: jest.fn()
    }))
  }
}));

jest.mock('../NetworkStateManager', () => ({
  NetworkMonitor: {
    getInstance: jest.fn(() => ({
      isOnline: true,
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    }))
  }
}));
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        data: [],
        error: null
      }))
    }))
  }))
}));

// Mock Node.js crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123'),
  createHash: jest.fn((algorithm: string) => ({
    update: jest.fn(),
    digest: jest.fn(() => `mocked-${algorithm.toLowerCase()}-hash`)
  }))
}));

// Mock environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

describe('DataConsistencyValidator', () => {
  let validator: DataConsistencyValidator;
  let mockVisApiClient: jest.Mocked<VisApiClient>;
  let mockErrorLogger: jest.Mocked<ErrorLogger>;
  let mockNetworkMonitor: jest.Mocked<NetworkMonitor>;
  let mockSupabaseFrom: jest.Mock;
  let mockSupabaseSelect: jest.Mock;

  const mockTournaments = [
    {
      tournament_code: 'T001',
      name: 'Test Tournament 1',
      start_date: '2024-01-01',
      end_date: '2024-01-05',
      venue: 'Test Venue 1'
    },
    {
      tournament_code: 'T002',
      name: 'Test Tournament 2',
      start_date: '2024-02-01',
      end_date: '2024-02-05',
      venue: 'Test Venue 2'
    }
  ];

  const mockApiTournaments = [
    {
      tournamentCode: 'T001',
      name: 'Test Tournament 1',
      startDate: '2024-01-01',
      endDate: '2024-01-05',
      venue: 'Test Venue 1'
    },
    {
      tournamentCode: 'T003',
      name: 'Test Tournament 3',
      startDate: '2024-03-01',
      endDate: '2024-03-05',
      venue: 'Test Venue 3'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (DataConsistencyValidator as any).instance = undefined;
    
    // Setup mocks
    mockVisApiClient = VisApiClient.getInstance() as jest.Mocked<VisApiClient>;
    mockErrorLogger = ErrorLogger.getInstance() as jest.Mocked<ErrorLogger>;
    mockNetworkMonitor = NetworkMonitor.getInstance() as jest.Mocked<NetworkMonitor>;
    
    mockVisApiClient.getTournaments.mockResolvedValue(mockApiTournaments);
    mockVisApiClient.getEvents.mockResolvedValue([]);
    mockVisApiClient.getMatches.mockResolvedValue([]);
    
    mockErrorLogger.log.mockImplementation(() => {});
    mockErrorLogger.logError.mockImplementation(() => {});

    // Setup Supabase mocks
    const { createClient } = require('@supabase/supabase-js');
    const mockSupabase = createClient();
    mockSupabaseFrom = mockSupabase.from;
    mockSupabaseSelect = jest.fn().mockReturnValue({
      data: mockTournaments,
      error: null
    });
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect
    });

    validator = DataConsistencyValidator.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const validator1 = DataConsistencyValidator.getInstance();
      const validator2 = DataConsistencyValidator.getInstance();
      expect(validator1).toBe(validator2);
    });
  });

  describe('Configuration', () => {
    it('should configure validation settings', () => {
      const config = {
        entityTypes: ['tournaments'] as const,
        checksumAlgorithm: 'md5' as const,
        toleranceThreshold: 0.1,
        batchSize: 50
      };

      validator.configure(config);
      expect(mockErrorLogger.log).toHaveBeenCalledWith(
        'DataConsistencyValidator configured',
        expect.objectContaining({ config: expect.objectContaining(config) })
      );
    });

    it('should configure drift detection', () => {
      const driftConfig = {
        enabled: true,
        scheduleIntervalMs: 60000,
        alertThreshold: 0.15
      };

      validator.configureDriftDetection(driftConfig);
      expect(mockErrorLogger.log).toHaveBeenCalledWith(
        'Drift detection configured',
        expect.objectContaining({ config: expect.objectContaining(driftConfig) })
      );
    });
  });

  describe('Tournament Validation', () => {
    it('should validate tournaments successfully', async () => {
      const result = await validator.validateTournaments();

      expect(result.isValid).toBe(false); // Should have discrepancies
      expect(result.discrepancies).toHaveLength(2); // T002 missing from API, T003 missing from DB
      expect(result.recordsCompared).toBe(3); // Total unique tournaments
      expect(result.checksum.database).toBeDefined();
      expect(result.checksum.api).toBeDefined();
    });

    it('should detect missing tournaments in database', async () => {
      const result = await validator.validateTournaments();

      const missingFromDb = result.discrepancies.find(d => d.type === 'missing_from_database');
      expect(missingFromDb).toBeDefined();
      expect(missingFromDb?.entityId).toBe('T003');
      expect(missingFromDb?.severity).toBe('high');
    });

    it('should detect missing tournaments in API', async () => {
      const result = await validator.validateTournaments();

      const missingFromApi = result.discrepancies.find(d => d.type === 'missing_from_api');
      expect(missingFromApi).toBeDefined();
      expect(missingFromApi?.entityId).toBe('T002');
      expect(missingFromApi?.severity).toBe('medium');
    });

    it('should handle database errors', async () => {
      mockSupabaseSelect.mockReturnValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      await expect(validator.validateTournaments()).rejects.toThrow(
        'Database query failed: Database connection failed'
      );
    });

    it('should handle API errors', async () => {
      mockVisApiClient.getTournaments.mockRejectedValue(new Error('API unavailable'));

      await expect(validator.validateTournaments()).rejects.toThrow('API unavailable');
    });
  });

  describe('Events Validation', () => {
    const mockEvents = [
      {
        event_no: 'E001',
        tournament_id: 1,
        name: 'Men Singles',
        tournaments: { tournament_code: 'T001' }
      }
    ];

    const mockApiEvents = [
      {
        eventNo: 'E001',
        tournamentCode: 'T001',
        name: 'Men Singles'
      }
    ];

    beforeEach(() => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: jest.fn().mockReturnValue({
              data: mockEvents,
              error: null
            })
          };
        }
        return mockSupabaseFrom.mockReturnValue({
          select: mockSupabaseSelect
        });
      });

      mockVisApiClient.getEvents.mockResolvedValue(mockApiEvents);
    });

    it('should validate events successfully', async () => {
      const result = await validator.validateEvents();

      expect(result.isValid).toBe(true);
      expect(result.discrepancies).toHaveLength(0);
      expect(result.recordsCompared).toBe(1);
    });

    it('should handle events API errors gracefully', async () => {
      mockVisApiClient.getEvents.mockRejectedValue(new Error('Events API failed'));

      // Should not throw, but log error and continue with empty API events
      const result = await validator.validateEvents();
      expect(mockErrorLogger.logError).toHaveBeenCalledWith(
        'Failed to fetch events for tournament',
        expect.any(Error),
        expect.objectContaining({ tournamentCode: expect.any(String) })
      );
    });
  });

  describe('Matches Validation', () => {
    const mockMatches = [
      {
        match_no: 'M001',
        event_id: 1,
        status: 'COMPLETED',
        events: { 
          event_no: 'E001', 
          tournaments: { tournament_code: 'T001' } 
        }
      }
    ];

    const mockApiMatches = [
      {
        matchNo: 'M001',
        eventNo: 'E001',
        status: 'COMPLETED'
      }
    ];

    beforeEach(() => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'matches') {
          return {
            select: jest.fn().mockReturnValue({
              data: mockMatches,
              error: null
            })
          };
        }
        return mockSupabaseFrom.mockReturnValue({
          select: mockSupabaseSelect
        });
      });

      mockVisApiClient.getMatches.mockResolvedValue(mockApiMatches);
    });

    it('should validate matches successfully', async () => {
      const result = await validator.validateMatches();

      expect(result.isValid).toBe(true);
      expect(result.discrepancies).toHaveLength(0);
      expect(result.recordsCompared).toBe(1);
    });
  });

  describe('Referee Assignments Validation', () => {
    const mockAssignments = [
      {
        match_id: 1,
        referee_id: 'R001',
        matches: { match_no: 'M001' }
      }
    ];

    const mockApiMatches = [
      {
        matchNo: 'M001',
        referees: [
          {
            id: 'R001',
            name: 'Test Referee'
          }
        ]
      }
    ];

    beforeEach(() => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'match_referees') {
          return {
            select: jest.fn().mockReturnValue({
              data: mockAssignments,
              error: null
            })
          };
        }
        return mockSupabaseFrom.mockReturnValue({
          select: mockSupabaseSelect
        });
      });

      mockVisApiClient.getMatches.mockResolvedValue(mockApiMatches);
    });

    it('should validate referee assignments successfully', async () => {
      const result = await validator.validateRefereeAssignments();

      expect(result.isValid).toBe(true);
      expect(result.discrepancies).toHaveLength(0);
      expect(result.recordsCompared).toBe(1);
    });
  });

  describe('Comprehensive Validation', () => {
    beforeEach(() => {
      // Configure validator for comprehensive testing
      validator.configure({
        entityTypes: ['tournaments', 'events', 'matches', 'referee_assignments'],
        toleranceThreshold: 0.1
      });
    });

    it('should perform comprehensive validation', async () => {
      const report = await validator.validateAll();

      expect(report.validationId).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.results.tournaments).toBeDefined();
      expect(report.results.events).toBeDefined();
      expect(report.results.matches).toBeDefined();
      expect(report.results.refereeAssignments).toBeDefined();
      expect(report.summary.validationDuration).toBeGreaterThan(0);
    });

    it('should determine overall status correctly', async () => {
      const report = await validator.validateAll();

      // Should be warning/failed due to tournament discrepancies
      expect(['warning', 'failed']).toContain(report.overallStatus);
      expect(report.summary.totalDiscrepancies).toBeGreaterThan(0);
    });

    it('should generate recommendations', async () => {
      const report = await validator.validateAll();

      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle validation errors gracefully', async () => {
      mockVisApiClient.getTournaments.mockRejectedValue(new Error('API failed'));

      const report = await validator.validateAll();
      expect(report.overallStatus).toBe('failed');
      expect(mockErrorLogger.logError).toHaveBeenCalledWith(
        'Validation failed for entity type',
        expect.any(Error),
        expect.objectContaining({ entityType: 'tournaments' })
      );
    });
  });

  describe('Drift Detection', () => {
    it('should get drift metrics for specified time window', () => {
      // Add some mock drift metrics
      const mockMetrics = [
        {
          timestamp: new Date().toISOString(),
          entityType: 'tournaments',
          discrepancyCount: 5,
          discrepancyPercentage: 0.05,
          trendDirection: 'stable' as const,
          severity: 'normal' as const
        }
      ];
      (validator as any).driftMetrics = mockMetrics;

      const metrics = validator.getDriftMetrics(24);
      expect(metrics).toEqual(mockMetrics);
    });

    it('should get validation history', () => {
      const mockReports = [
        {
          validationId: 'test-1',
          timestamp: new Date().toISOString(),
          overallStatus: 'passed' as const
        } as any
      ];
      (validator as any).validationHistory = mockReports;

      const history = validator.getValidationHistory(10);
      expect(history).toEqual(mockReports);
    });
  });

  describe('Checksum Generation', () => {
    it('should generate different checksums for different algorithms', async () => {
      const testData = [{ test: 'data' }];
      
      validator.configure({ checksumAlgorithm: 'md5' });
      const md5Checksum = await (validator as any).generateChecksum(testData);
      
      validator.configure({ checksumAlgorithm: 'sha256' });
      const sha256Checksum = await (validator as any).generateChecksum(testData);
      
      expect(md5Checksum).toContain('mocked-md5-hash');
      expect(sha256Checksum).toContain('mocked-sha256-hash');
      expect(md5Checksum).not.toBe(sha256Checksum);
    });
  });

  describe('Object Comparison', () => {
    it('should detect field mismatches in deep validation mode', () => {
      validator.configure({ deepValidation: true });
      
      const dbObject = { name: 'Test', status: 'active', updated_at: '2024-01-01' };
      const apiObject = { name: 'Test Updated', status: 'active' };
      
      const discrepancies = (validator as any).compareObjects(
        dbObject, 
        apiObject, 
        'test-id', 
        'test-entity'
      );
      
      expect(discrepancies.length).toBeGreaterThan(0);
      expect(discrepancies.some((d: any) => d.field === 'name')).toBe(true);
    });

    it('should ignore configured fields', () => {
      validator.configure({ 
        deepValidation: true,
        ignoreFields: ['updated_at', 'created_at']
      });
      
      const dbObject = { name: 'Test', updated_at: '2024-01-01' };
      const apiObject = { name: 'Test', updated_at: '2024-01-02' };
      
      const discrepancies = (validator as any).compareObjects(
        dbObject, 
        apiObject, 
        'test-id', 
        'test-entity'
      );
      
      expect(discrepancies).toHaveLength(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      validator.destroy();
      
      expect(mockErrorLogger.log).toHaveBeenCalledWith('DataConsistencyValidator destroyed');
    });
  });
});