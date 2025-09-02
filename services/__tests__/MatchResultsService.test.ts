import { MatchResultsService } from '../MatchResultsService';
// import { VisApiService } from '../VisApiService'; // Deprecated - use VIS-compliant test instead
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MatchResult } from '../../types/MatchResults';

// Mock dependencies
// jest.mock('../VisApiService'); // Deprecated - VisApiService no longer used
jest.mock('@react-native-async-storage/async-storage');

// const mockVisApiService = VisApiService as jest.Mocked<typeof VisApiService>; // Deprecated
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe.skip('MatchResultsService - Legacy Tests (Deprecated)', () => {
  const mockTournamentNo = 'T001';
  
  const mockMatches = [
    {
      No: 'M001',
      tournamentNo: 'T001',
      Status: 'Running',
      TeamAName: 'Team Alpha',
      TeamBName: 'Team Beta',
      LocalDate: '2025-08-08',
      LocalTime: '10:00',
      Court: 'Court 1',
      Round: 'Round 1',
      MatchPointsA: '2',
      MatchPointsB: '1',
      PointsTeamASet1: '21',
      PointsTeamBSet1: '15',
      PointsTeamASet2: '18',
      PointsTeamBSet2: '21',
      PointsTeamASet3: '15',
      PointsTeamBSet3: '12',
      DurationSet1: '25:30',
      DurationSet2: '28:45',
      DurationSet3: '18:20',
    },
    {
      No: 'M002',
      tournamentNo: 'T001',
      Status: 'Finished',
      TeamAName: 'Team Gamma',
      TeamBName: 'Team Delta',
      LocalDate: '2025-08-08',
      LocalTime: '11:00',
      Court: 'Court 2',
      Round: 'Round 1',
      MatchPointsA: '2',
      MatchPointsB: '0',
      PointsTeamASet1: '21',
      PointsTeamBSet1: '18',
      PointsTeamASet2: '21',
      PointsTeamBSet2: '16',
      DurationSet1: '22:15',
      DurationSet2: '24:30',
    },
    {
      No: 'M003',
      tournamentNo: 'T001',
      Status: 'Scheduled',
      TeamAName: 'Team Echo',
      TeamBName: 'Team Foxtrot',
      LocalDate: '2025-08-08',
      LocalTime: '12:00',
      Court: 'Court 3',
      Round: 'Round 2',
      MatchPointsA: '0',
      MatchPointsB: '0',
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMatchResults', () => {
    beforeEach(() => {
      mockVisApiService.getBeachMatchList.mockResolvedValue(mockMatches);
    });

    it('should fetch and categorize matches correctly', async () => {
      const result = await MatchResultsService.getMatchResults(mockTournamentNo);

      expect(result.live).toHaveLength(1);
      expect(result.live[0].status).toBe('Running');
      expect(result.live[0].teamAName).toBe('Team Alpha');

      expect(result.completed).toHaveLength(1);
      expect(result.completed[0].status).toBe('Finished');
      expect(result.completed[0].teamAName).toBe('Team Gamma');

      expect(result.scheduled).toHaveLength(1);
      expect(result.scheduled[0].status).toBe('Scheduled');
      expect(result.scheduled[0].teamAName).toBe('Team Echo');
    });

    it('should transform match data correctly', async () => {
      const result = await MatchResultsService.getMatchResults(mockTournamentNo);
      const liveMatch = result.live[0];

      expect(liveMatch.matchPointsA).toBe(2);
      expect(liveMatch.matchPointsB).toBe(1);
      expect(liveMatch.pointsTeamASet1).toBe(21);
      expect(liveMatch.pointsTeamBSet1).toBe(15);
      expect(liveMatch.durationSet1).toBe('25:30');
    });

    it('should handle API errors gracefully', async () => {
      mockVisApiService.getBeachMatchList.mockRejectedValue(new Error('API Error'));
      
      await expect(
        MatchResultsService.getMatchResults(mockTournamentNo)
      ).rejects.toThrow('API Error');
    });

    it('should use cached data when not forcing refresh', async () => {
      const cacheKey = `@match_results_cache_${mockTournamentNo}`;
      const cachedData = {
        data: { live: [], completed: [], scheduled: [] },
        timestamp: Date.now(),
        tournamentNo: mockTournamentNo
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await MatchResultsService.getMatchResults(mockTournamentNo, false);
      
      expect(result).toEqual(cachedData.data);
      expect(mockVisApiService.getBeachMatchList).not.toHaveBeenCalled();
    });

    it('should not use expired cache', async () => {
      const expiredCache = {
        data: { live: [], completed: [], scheduled: [] },
        timestamp: Date.now() - (10 * 60 * 1000), // 10 minutes ago
        tournamentNo: mockTournamentNo
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(expiredCache));

      await MatchResultsService.getMatchResults(mockTournamentNo);
      
      expect(mockVisApiService.getBeachMatchList).toHaveBeenCalled();
    });
  });

  describe('getLiveMatches', () => {
    it('should return only live matches', async () => {
      mockVisApiService.getBeachMatchList.mockResolvedValue(mockMatches);

      const result = await MatchResultsService.getLiveMatches(mockTournamentNo);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Running');
    });
  });

  describe('getCompletedMatches', () => {
    it('should return only completed matches', async () => {
      mockVisApiService.getBeachMatchList.mockResolvedValue(mockMatches);

      const result = await MatchResultsService.getCompletedMatches(mockTournamentNo);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Finished');
    });
  });

  describe('normalizeMatchStatus', () => {
    it('should normalize various status formats', () => {
      const testCases = [
        { input: 'running', expected: 'Running' },
        { input: 'LIVE', expected: 'Running' },
        { input: 'active', expected: 'Running' },
        { input: 'finished', expected: 'Finished' },
        { input: 'FINAL', expected: 'Finished' },
        { input: 'complete', expected: 'Finished' },
        { input: 'cancelled', expected: 'Cancelled' },
        { input: 'postponed', expected: 'Cancelled' },
        { input: 'scheduled', expected: 'Scheduled' },
        { input: '', expected: 'Scheduled' },
        { input: undefined, expected: 'Scheduled' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (MatchResultsService as any).normalizeMatchStatus(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('getRefreshInterval', () => {
    it('should return 30 seconds for live matches', () => {
      const resultsWithLive = {
        live: [mockMatches[0] as any],
        completed: [],
        scheduled: []
      };

      const interval = MatchResultsService.getRefreshInterval(resultsWithLive);
      expect(interval).toBe(30000);
    });

    it('should return 5 minutes for only scheduled matches', () => {
      const resultsWithScheduled = {
        live: [],
        completed: [],
        scheduled: [mockMatches[2] as any]
      };

      const interval = MatchResultsService.getRefreshInterval(resultsWithScheduled);
      expect(interval).toBe(300000);
    });

    it('should return 30 minutes for only completed matches', () => {
      const resultsWithCompleted = {
        live: [],
        completed: [mockMatches[1] as any],
        scheduled: []
      };

      const interval = MatchResultsService.getRefreshInterval(resultsWithCompleted);
      expect(interval).toBe(1800000);
    });
  });

  describe('formatScore', () => {
    it('should format complete 3-set match score', () => {
      const match: MatchResult = {
        no: 'M001',
        tournamentNo: 'T001',
        teamAName: 'Team A',
        teamBName: 'Team B',
        status: 'Finished',
        matchPointsA: 2,
        matchPointsB: 1,
        pointsTeamASet1: 21,
        pointsTeamBSet1: 15,
        pointsTeamASet2: 18,
        pointsTeamBSet2: 21,
        pointsTeamASet3: 15,
        pointsTeamBSet3: 12,
        durationSet1: '',
        durationSet2: '',
        durationSet3: '',
        localDate: new Date(),
        localTime: '10:00',
        court: 'Court 1',
        round: 'Round 1',
      };

      const score = MatchResultsService.formatScore(match);
      expect(score).toBe('21-15, 18-21, 15-12');
    });

    it('should format 2-set match score', () => {
      const match: MatchResult = {
        no: 'M002',
        tournamentNo: 'T001',
        teamAName: 'Team A',
        teamBName: 'Team B',
        status: 'Finished',
        matchPointsA: 2,
        matchPointsB: 0,
        pointsTeamASet1: 21,
        pointsTeamBSet1: 18,
        pointsTeamASet2: 21,
        pointsTeamBSet2: 16,
        pointsTeamASet3: 0,
        pointsTeamBSet3: 0,
        durationSet1: '',
        durationSet2: '',
        durationSet3: '',
        localDate: new Date(),
        localTime: '10:00',
        court: 'Court 1',
        round: 'Round 1',
      };

      const score = MatchResultsService.formatScore(match);
      expect(score).toBe('21-18, 21-16');
    });

    it('should handle unplayed match', () => {
      const match: MatchResult = {
        no: 'M003',
        tournamentNo: 'T001',
        teamAName: 'Team A',
        teamBName: 'Team B',
        status: 'Scheduled',
        matchPointsA: 0,
        matchPointsB: 0,
        pointsTeamASet1: 0,
        pointsTeamBSet1: 0,
        pointsTeamASet2: 0,
        pointsTeamBSet2: 0,
        pointsTeamASet3: 0,
        pointsTeamBSet3: 0,
        durationSet1: '',
        durationSet2: '',
        durationSet3: '',
        localDate: new Date(),
        localTime: '12:00',
        court: 'Court 1',
        round: 'Round 1',
      };

      const score = MatchResultsService.formatScore(match);
      expect(score).toBe('0-0');
    });
  });

  describe('getMatchDuration', () => {
    it('should format match duration', () => {
      const match: MatchResult = {
        no: 'M001',
        tournamentNo: 'T001',
        teamAName: 'Team A',
        teamBName: 'Team B',
        status: 'Finished',
        matchPointsA: 2,
        matchPointsB: 1,
        pointsTeamASet1: 21,
        pointsTeamBSet1: 15,
        pointsTeamASet2: 18,
        pointsTeamBSet2: 21,
        pointsTeamASet3: 15,
        pointsTeamBSet3: 12,
        durationSet1: '25:30',
        durationSet2: '28:45',
        durationSet3: '18:20',
        localDate: new Date(),
        localTime: '10:00',
        court: 'Court 1',
        round: 'Round 1',
      };

      const duration = MatchResultsService.getMatchDuration(match);
      expect(duration).toBe('Duration: 25:30, 28:45, 18:20');
    });

    it('should handle no duration data', () => {
      const match: MatchResult = {
        no: 'M001',
        tournamentNo: 'T001',
        teamAName: 'Team A',
        teamBName: 'Team B',
        status: 'Scheduled',
        matchPointsA: 0,
        matchPointsB: 0,
        pointsTeamASet1: 0,
        pointsTeamBSet1: 0,
        pointsTeamASet2: 0,
        pointsTeamBSet2: 0,
        pointsTeamASet3: 0,
        pointsTeamBSet3: 0,
        durationSet1: '',
        durationSet2: '',
        durationSet3: '',
        localDate: new Date(),
        localTime: '12:00',
        court: 'Court 1',
        round: 'Round 1',
      };

      const duration = MatchResultsService.getMatchDuration(match);
      expect(duration).toBe('');
    });
  });

  describe('cache management', () => {
    it('should cache match results data', async () => {
      mockVisApiService.getBeachMatchList.mockResolvedValue(mockMatches);
      
      await MatchResultsService.getMatchResults(mockTournamentNo);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        `@match_results_cache_${mockTournamentNo}`,
        expect.stringContaining('"live"')
      );
    });

    it('should clear specific tournament cache', async () => {
      await MatchResultsService.clearMatchResultsCache(mockTournamentNo);
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        `@match_results_cache_${mockTournamentNo}`
      );
    });

    it('should clear all match results caches', async () => {
      const mockKeys = ['@match_results_cache_T001', '@match_results_cache_T002', 'other_key'];
      mockAsyncStorage.getAllKeys.mockResolvedValue(mockKeys);

      await MatchResultsService.clearMatchResultsCache();
      
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@match_results_cache_T001',
        '@match_results_cache_T002'
      ]);
    });
  });
});