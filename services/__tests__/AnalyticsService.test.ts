import { AnalyticsService, AnalyticsAggregation, ValidationResult, CleanupResult } from '../AnalyticsService';
import { ErrorLogger } from '../ErrorLogger';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  rpc: jest.fn()
};

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

// Mock ErrorLogger
jest.mock('../ErrorLogger', () => ({
  ErrorLogger: {
    getInstance: jest.fn(() => ({
      logError: jest.fn()
    }))
  }
}));

// Mock performance.now for consistent testing
global.performance = {
  now: jest.fn(() => 1000)
} as any;

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockErrorLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (AnalyticsService as any).instance = null;
    
    mockErrorLogger = {
      logError: jest.fn()
    };
    (ErrorLogger.getInstance as jest.Mock).mockReturnValue(mockErrorLogger);
    
    analyticsService = AnalyticsService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AnalyticsService.getInstance();
      const instance2 = AnalyticsService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should accept configuration on first instantiation', () => {
      (AnalyticsService as any).instance = null;
      const config = { enableBackgroundAggregation: false };
      const service = AnalyticsService.getInstance(config);
      
      expect(service.getConfig().enableBackgroundAggregation).toBe(false);
    });
  });

  describe('aggregateRefereeAnalytics', () => {
    // Il `role` mancava del tutto nel dato di prova, mentre la query del
    // servizio lo seleziona e ci conta sopra: i totali per ruolo restavano a
    // zero e il test pretendeva 1 e 1. Un dato di prova che non ha le colonne
    // che la query chiede non prova il percorso che dichiara di provare.
    const mockAssignmentData = [
      {
        referee_id: '1',
        role: 'FIRST',
        matches: {
          id: 'match1',
          tournament_code: 'TOURNAMENT1',
          utc_datetime: '2024-01-01T10:00:00Z'
        }
      },
      {
        referee_id: '1',
        role: 'SECOND',
        matches: {
          id: 'match2',
          tournament_code: 'TOURNAMENT1',
          utc_datetime: '2024-01-01T14:00:00Z'
        }
      }
    ];

    beforeEach(() => {
      // Costruttore di query completo: incatenabile, attendibile, e con i
      // metodi MEMORIZZATI.
      //
      // Il doppio precedente appendeva il risultato a `.in()`, che il servizio
      // chiama solo quando gli si passano degli id: senza filtro la catena
      // finiva su `.lte()`, che restituiva un oggetto qualunque, e
      // `await` su quello dava un oggetto senza `data`. Il servizio
      // aggregava zero righe e il test vedeva un elenco vuoto.
      //
      // I metodi vanno memorizzati perche' un test riattraversa la catena
      // (`from().select().gte().lte().in`) per asserire sulle chiamate: se
      // ogni accesso creasse una jest.fn() nuova, quell'asserzione
      // guarderebbe un oggetto diverso da quello che il servizio ha usato.
      const metodi: Record<string, jest.Mock> = {};
      const query: any = new Proxy(
        {},
        {
          get: (_b, chiave: string) => {
            if (chiave === 'then') {
              return (ok: any, ko: any) =>
                Promise.resolve({ data: mockAssignmentData, error: null }).then(ok, ko);
            }
            if (!metodi[chiave]) metodi[chiave] = jest.fn(() => query);
            return metodi[chiave];
          },
        }
      );
      mockSupabaseClient.from.mockReturnValue(query);

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{
          first_referee_count: 1,
          second_referee_count: 1,
          challenge_referee_count: 0
        }],
        error: null
      });
    });

    it('should aggregate referee analytics successfully', async () => {
      const result = await analyticsService.aggregateRefereeAnalytics('2024-01-01', '2024-01-01');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        referee_id: '1',
        date: '2024-01-01',
        total_assignments: 2,
        first_referee_count: 1,
        second_referee_count: 1,
        challenge_referee_count: 0,
        tournaments_worked: ['TOURNAMENT1']
      });
    });

    it('should filter by referee IDs when provided', async () => {
      await analyticsService.aggregateRefereeAnalytics('2024-01-01', '2024-01-01', ['1', '2']);

      expect(mockSupabaseClient.from().select().gte().lte().in).toHaveBeenCalledWith('referee_id', ['1', '2']);
    });

    it('should handle database errors gracefully', async () => {
      const errorMessage = 'Database connection failed';
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: null,
              error: { message: errorMessage }
            })
          })
        })
      });

      await expect(analyticsService.aggregateRefereeAnalytics('2024-01-01', '2024-01-01'))
        .rejects.toThrow(`Failed to fetch assignment data: ${errorMessage}`);

      expect(mockErrorLogger.logError).toHaveBeenCalled();
    });

    it('should return empty array when no data found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      const result = await analyticsService.aggregateRefereeAnalytics('2024-01-01', '2024-01-01');
      expect(result).toEqual([]);
    });

    it('should handle individual assignment processing errors', async () => {
      const invalidAssignmentData = [
        {
          referee_id: '1',
          matches: null // Invalid match data
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: invalidAssignmentData,
              error: null
            })
          })
        })
      });

      const result = await analyticsService.aggregateRefereeAnalytics('2024-01-01', '2024-01-01');
      
      expect(mockErrorLogger.logError).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('storeAggregatedData', () => {
    const mockAggregations: AnalyticsAggregation[] = [
      {
        referee_id: '1',
        date: '2024-01-01',
        total_assignments: 2,
        first_referee_count: 1,
        second_referee_count: 1,
        challenge_referee_count: 0,
        tournaments_worked: ['TOURNAMENT1']
      }
    ];

    it('should store aggregated data successfully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null })
      });

      await analyticsService.storeAggregatedData(mockAggregations);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('referee_analytics');
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            referee_id: 1,
            date: '2024-01-01',
            total_assignments: 2
          })
        ]),
        expect.objectContaining({
          onConflict: 'referee_id,date',
          ignoreDuplicates: false
        })
      );
    });

    it('should handle empty aggregations array', async () => {
      await analyticsService.storeAggregatedData([]);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should handle database errors during storage', async () => {
      const errorMessage = 'Storage failed';
      mockSupabaseClient.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: { message: errorMessage } })
      });

      await expect(analyticsService.storeAggregatedData(mockAggregations))
        .rejects.toThrow(`Failed to store aggregated data: ${errorMessage}`);

      expect(mockErrorLogger.logError).toHaveBeenCalled();
    });
  });

  describe('validateAnalyticsData', () => {
    it('should return validation results successfully', async () => {
      const mockValidationResults: ValidationResult[] = [
        {
          validation_type: 'data_consistency',
          issue_count: 2,
          description: 'Found 2 inconsistent records'
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockValidationResults,
        error: null
      });

      const result = await analyticsService.validateAnalyticsData();

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('validate_analytics_data');
      expect(result).toEqual(mockValidationResults);
    });

    it('should handle validation errors', async () => {
      const errorMessage = 'Validation failed';
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: errorMessage }
      });

      await expect(analyticsService.validateAnalyticsData())
        .rejects.toThrow(`Data validation failed: ${errorMessage}`);

      expect(mockErrorLogger.logError).toHaveBeenCalled();
    });

    it('should return empty array when no validation results', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await analyticsService.validateAnalyticsData();
      expect(result).toEqual([]);
    });
  });

  describe('cleanupOldData', () => {
    it('should return cleanup results successfully', async () => {
      const mockCleanupResults: CleanupResult[] = [
        {
          cleanup_type: 'old_events',
          records_deleted: 150
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockCleanupResults,
        error: null
      });

      const result = await analyticsService.cleanupOldData();

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('cleanup_old_analytics_data');
      expect(result).toEqual(mockCleanupResults);
    });

    it('should handle cleanup errors', async () => {
      const errorMessage = 'Cleanup failed';
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: errorMessage }
      });

      await expect(analyticsService.cleanupOldData())
        .rejects.toThrow(`Data cleanup failed: ${errorMessage}`);
    });
  });

  describe('calculatePerformanceScore', () => {
    const mockAnalyticsData = [
      {
        total_assignments: 5,
        first_referee_count: 3,
        second_referee_count: 2,
        challenge_referee_count: 0,
        tournaments_worked: ['TOURNAMENT1', 'TOURNAMENT2']
      }
    ];

    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({
                data: mockAnalyticsData,
                error: null
              })
            })
          })
        })
      });
    });

    it('should calculate performance score correctly', async () => {
      const score = await analyticsService.calculatePerformanceScore('1', {
        start: '2024-01-01',
        end: '2024-01-07'
      });

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return 0 for referees with no analytics data', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      });

      const score = await analyticsService.calculatePerformanceScore('1', {
        start: '2024-01-01',
        end: '2024-01-07'
      });

      expect(score).toBe(0);
    });
  });

  describe('runDailyAggregation', () => {
    it('should run daily aggregation for specified date', async () => {
      const spy = jest.spyOn(analyticsService, 'aggregateRefereeAnalytics').mockResolvedValue([]);
      const storeSpy = jest.spyOn(analyticsService, 'storeAggregatedData').mockResolvedValue();
      const validateSpy = jest.spyOn(analyticsService, 'validateAnalyticsData').mockResolvedValue([]);

      await analyticsService.runDailyAggregation('2024-01-01');

      expect(spy).toHaveBeenCalledWith('2024-01-01 00:00:00', '2024-01-01 23:59:59');
      expect(storeSpy).toHaveBeenCalled();
      expect(validateSpy).toHaveBeenCalled();
    });

    it('should use current date when no date specified', async () => {
      const spy = jest.spyOn(analyticsService, 'aggregateRefereeAnalytics').mockResolvedValue([]);
      jest.spyOn(analyticsService, 'storeAggregatedData').mockResolvedValue();
      jest.spyOn(analyticsService, 'validateAnalyticsData').mockResolvedValue([]);

      // Mock current date
      const mockDate = new Date('2024-01-01');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      await analyticsService.runDailyAggregation();

      expect(spy).toHaveBeenCalledWith('2024-01-01 00:00:00', '2024-01-01 23:59:59');
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = { enableBackgroundAggregation: false };
      analyticsService.updateConfig(newConfig);

      expect(analyticsService.getConfig().enableBackgroundAggregation).toBe(false);
    });

    it('should return current configuration', () => {
      const config = analyticsService.getConfig();
      expect(config).toHaveProperty('enableBackgroundAggregation');
      expect(config).toHaveProperty('enableDataValidation');
      expect(config).toHaveProperty('enablePerformanceMonitoring');
    });
  });
});