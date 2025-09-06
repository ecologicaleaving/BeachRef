import { RefereeAssignmentsService } from '../../services/RefereeAssignmentsService';
import { CacheService } from '../../services/CacheService';
import { TournamentRefereeData, OfficialStatus, OfficialType } from '../../types/referee-v2';
import { BeachMatch } from '../../types/match';
import { RefereeProfile } from '../../types/RefereeAssignments';

// Mock dependencies
jest.mock('../../services/CacheService');
jest.mock('../../services/ConnectionCircuitBreaker');

const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;

describe('RefereeAssignmentsService - Enhancement Methods', () => {
  let fetchMatchDataSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any spies
    jest.restoreAllMocks();
  });

  describe('getRefereeDataFromCache', () => {
    const mockTournamentRefereeData: TournamentRefereeData = {
      officials: [
        {
          federationCode: 'USA',
          firstName: 'John',
          lastName: 'Doe',
          gender: 'M',
          noOfficial: 'OFF001',
          role: 'Referee1' as any,
          status: OfficialStatus.ACTIVE,
          type: OfficialType.REFEREE
        }
      ],
      referees: [
        {
          federationCode: 'BRA',
          firstName: 'Maria',
          lastName: 'Silva',
          gender: 'W',
          noReferee: 'REF001',
          status: OfficialStatus.ACTIVE,
          type: OfficialType.REFEREE
        }
      ],
      eventNo: 'T001',
      timestamp: '2025-01-01T00:00:00Z',
      expiresAt: '2025-01-02T00:00:00Z'
    };

    it('should return referee data from cache when available', async () => {
      mockCacheService.getRefereeData.mockResolvedValue({
        data: mockTournamentRefereeData,
        source: 'cache',
        fromCache: true,
        timestamp: Date.now()
      });

      const result = await RefereeAssignmentsService.getRefereeDataFromCache('T001');

      expect(result).toEqual(mockTournamentRefereeData);
      expect(mockCacheService.getRefereeData).toHaveBeenCalledWith('T001');
    });

    it('should return null when cache service fails and no match data available', async () => {
      mockCacheService.getRefereeData.mockRejectedValue(new Error('Cache failed'));
      
      // Mock fetchMatchData to return empty array
      jest.spyOn(RefereeAssignmentsService as any, 'fetchMatchData').mockResolvedValue([]);

      const result = await RefereeAssignmentsService.getRefereeDataFromCache('T001');

      expect(result).toBeNull();
    });

    it('should create fallback referee data from matches when cache fails', async () => {
      mockCacheService.getRefereeData.mockRejectedValue(new Error('Cache failed'));
      
      const mockMatches: BeachMatch[] = [
        {
          No: 'M001',
          Referee1Name: 'John Doe',
          NoReferee1: 'REF001',
          Referee1FederationCode: 'USA',
          Referee2Name: 'Maria Silva',
          NoReferee2: 'REF002',
          Referee2FederationCode: 'BRA'
        } as BeachMatch
      ];

      jest.spyOn(RefereeAssignmentsService as any, 'fetchMatchData').mockResolvedValue(mockMatches);

      const result = await RefereeAssignmentsService.getRefereeDataFromCache('T001');

      expect(result).toBeDefined();
      expect(result?.referees).toHaveLength(2);
      expect(result?.referees[0].firstName).toBe('John');
      expect(result?.referees[0].lastName).toBe('Doe');
      expect(result?.referees[0].federationCode).toBe('USA');
      expect(result?.referees[1].firstName).toBe('Maria');
      expect(result?.referees[1].lastName).toBe('Silva');
      expect(result?.referees[1].federationCode).toBe('BRA');
    });
  });

  describe('getAllRefereesForTournament', () => {
    it('should return referees from cache when available', async () => {
      const mockTournamentRefereeData: TournamentRefereeData = {
        officials: [],
        referees: [
          {
            federationCode: 'BRA',
            firstName: 'Maria',
            lastName: 'Silva',
            gender: 'W',
            noReferee: 'REF001',
            status: OfficialStatus.ACTIVE,
            type: OfficialType.REFEREE
          }
        ],
        eventNo: 'T001',
        timestamp: '2025-01-01T00:00:00Z',
        expiresAt: '2025-01-02T00:00:00Z'
      };

      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(mockTournamentRefereeData);

      const result = await RefereeAssignmentsService.getAllRefereesForTournament('T001');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Maria Silva');
      expect(result[0].id).toBe('REF001');
      expect(result[0].federationCode).toBe('BRA');
    });

    it('should fallback to match data extraction when cache is empty', async () => {
      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(null);
      
      const mockReferees: RefereeProfile[] = [
        {
          name: 'John Doe',
          id: 'REF001',
          federationCode: 'USA'
        }
      ];

      jest.spyOn(RefereeAssignmentsService, 'extractRefereeDataFromMatches').mockResolvedValue(mockReferees);

      const result = await RefereeAssignmentsService.getAllRefereesForTournament('T001');

      expect(result).toEqual(mockReferees);
    });

    it('should return empty array when both cache and match extraction fail', async () => {
      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(null);
      jest.spyOn(RefereeAssignmentsService, 'extractRefereeDataFromMatches').mockResolvedValue([]);

      const result = await RefereeAssignmentsService.getAllRefereesForTournament('T001');

      expect(result).toEqual([]);
    });
  });

  describe('getRefereeProfile', () => {
    it('should return referee profile from cache when available', async () => {
      const mockTournamentRefereeData: TournamentRefereeData = {
        officials: [],
        referees: [
          {
            federationCode: 'BRA',
            firstName: 'Maria',
            lastName: 'Silva',
            gender: 'W',
            noReferee: 'REF001',
            status: OfficialStatus.ACTIVE,
            type: OfficialType.REFEREE
          }
        ],
        eventNo: 'T001',
        timestamp: '2025-01-01T00:00:00Z',
        expiresAt: '2025-01-02T00:00:00Z'
      };

      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(mockTournamentRefereeData);

      const result = await RefereeAssignmentsService.getRefereeProfile('REF001', 'T001');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Maria Silva');
      expect(result?.id).toBe('REF001');
      expect(result?.federationCode).toBe('BRA');
    });

    it('should fallback to match data when cache lookup fails', async () => {
      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(null);
      
      const mockReferees: RefereeProfile[] = [
        {
          name: 'John Doe',
          id: 'REF001',
          federationCode: 'USA'
        }
      ];

      jest.spyOn(RefereeAssignmentsService, 'extractRefereeDataFromMatches').mockResolvedValue(mockReferees);

      const result = await RefereeAssignmentsService.getRefereeProfile('REF001', 'T001');

      expect(result).toEqual(mockReferees[0]);
    });

    it('should return null when referee is not found anywhere', async () => {
      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(null);
      jest.spyOn(RefereeAssignmentsService, 'extractRefereeDataFromMatches').mockResolvedValue([]);

      const result = await RefereeAssignmentsService.getRefereeProfile('UNKNOWN', 'T001');

      expect(result).toBeNull();
    });
  });

  describe('extractRefereeDataFromMatches', () => {
    it('should extract referee data from match list', async () => {
      const mockMatches: BeachMatch[] = [
        {
          No: 'M001',
          Referee1Name: 'John Doe',
          NoReferee1: 'REF001',
          Referee1FederationCode: 'USA',
          Referee2Name: 'Maria Silva',
          NoReferee2: 'REF002',
          Referee2FederationCode: 'BRA'
        } as BeachMatch,
        {
          No: 'M002',
          Referee1Name: 'John Doe', // Duplicate referee should be handled
          NoReferee1: 'REF001',
          Referee1FederationCode: 'USA',
          Referee2Name: 'Carlos Rodriguez',
          NoReferee2: 'REF003',
          Referee2FederationCode: 'ESP'
        } as BeachMatch
      ];

      // Setup fresh spy for this test
      fetchMatchDataSpy = jest.spyOn(RefereeAssignmentsService as any, 'fetchMatchData');
      fetchMatchDataSpy.mockResolvedValue(mockMatches);

      const result = await RefereeAssignmentsService.extractRefereeDataFromMatches('T001');
      
      expect(result).toHaveLength(3); // Should deduplicate John Doe
      
      const johnDoe = result.find(r => r.name === 'John Doe');
      const mariaSilva = result.find(r => r.name === 'Maria Silva');
      const carlosRodriguez = result.find(r => r.name === 'Carlos Rodriguez');

      expect(johnDoe).toBeDefined();
      expect(johnDoe?.id).toBe('REF001');
      expect(johnDoe?.federationCode).toBe('USA');

      expect(mariaSilva).toBeDefined();
      expect(mariaSilva?.id).toBe('REF002');
      expect(mariaSilva?.federationCode).toBe('BRA');

      expect(carlosRodriguez).toBeDefined();
      expect(carlosRodriguez?.id).toBe('REF003');
      expect(carlosRodriguez?.federationCode).toBe('ESP');
    });

    it('should handle empty match list gracefully', async () => {
      jest.spyOn(RefereeAssignmentsService as any, 'fetchMatchData').mockResolvedValue([]);

      const result = await RefereeAssignmentsService.extractRefereeDataFromMatches('T001');

      expect(result).toEqual([]);
    });

    it('should handle matches without referee data gracefully', async () => {
      const mockMatches: BeachMatch[] = [
        {
          No: 'M001',
          // No referee data
        } as BeachMatch
      ];

      jest.spyOn(RefereeAssignmentsService as any, 'fetchMatchData').mockResolvedValue(mockMatches);

      const result = await RefereeAssignmentsService.extractRefereeDataFromMatches('T001');

      expect(result).toEqual([]);
    });
  });

  describe('getRefereeFromMatchData', () => {
    it('should extract referee1 data correctly', () => {
      const match: BeachMatch = {
        No: 'M001',
        Referee1Name: 'John Doe',
        NoReferee1: 'REF001',
        Referee1FederationCode: 'USA',
        Referee2Name: 'Maria Silva',
        NoReferee2: 'REF002',
        Referee2FederationCode: 'BRA'
      } as BeachMatch;

      const result = RefereeAssignmentsService.getRefereeFromMatchData(match, 'referee1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('John Doe');
      expect(result?.id).toBe('REF001');
      expect(result?.federationCode).toBe('USA');
    });

    it('should extract referee2 data correctly', () => {
      const match: BeachMatch = {
        No: 'M001',
        Referee1Name: 'John Doe',
        NoReferee1: 'REF001',
        Referee1FederationCode: 'USA',
        Referee2Name: 'Maria Silva',
        NoReferee2: 'REF002',
        Referee2FederationCode: 'BRA'
      } as BeachMatch;

      const result = RefereeAssignmentsService.getRefereeFromMatchData(match, 'referee2');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Maria Silva');
      expect(result?.id).toBe('REF002');
      expect(result?.federationCode).toBe('BRA');
    });

    it('should return null when referee data is missing', () => {
      const match: BeachMatch = {
        No: 'M001'
      } as BeachMatch;

      const result1 = RefereeAssignmentsService.getRefereeFromMatchData(match, 'referee1');
      const result2 = RefereeAssignmentsService.getRefereeFromMatchData(match, 'referee2');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should generate ID from name when NoReferee is missing', () => {
      const match: BeachMatch = {
        No: 'M001',
        Referee1Name: 'John Doe',
        Referee1FederationCode: 'USA'
        // NoReferee1 is missing
      } as BeachMatch;

      const result = RefereeAssignmentsService.getRefereeFromMatchData(match, 'referee1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('John Doe');
      expect(result?.id).toBe('referee1_John_Doe');
      expect(result?.federationCode).toBe('USA');
    });
  });
});