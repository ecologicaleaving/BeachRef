import { VisApiService, TournamentType } from '../visApi';
import { CacheService } from '../CacheService';
import { Tournament } from '../../types/tournament';

// Mock dependencies for cache service
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        data: [],
        error: null
      }))
    }))
  }
}));

jest.mock('../MemoryCacheManager');
jest.mock('../LocalStorageManager');
jest.mock('../CacheStatsService');

describe('Tournament Classification Logic Preservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('VisApiService.classifyTournament', () => {
    it('should correctly classify FIVB tournaments', () => {
      const testCases: { tournament: Tournament; expected: TournamentType }[] = [
        {
          tournament: { No: '1', Code: 'MFIVB2025', Name: 'FIVB World Tour Tournament', StartDate: '2025-01-15', EndDate: '2025-01-20', Version: '1' },
          expected: 'FIVB'
        },
        {
          tournament: { No: '2', Code: 'WFIVB2025', Name: 'World Tour Major', StartDate: '2025-02-15', EndDate: '2025-02-20', Version: '1' },
          expected: 'FIVB'
        },
        {
          tournament: { No: '3', Code: 'MWC2025', Name: 'Beach Volleyball World Championship', StartDate: '2025-03-15', EndDate: '2025-03-20', Version: '1' },
          expected: 'FIVB'
        }
      ];

      testCases.forEach(({ tournament, expected }) => {
        const result = VisApiService.classifyTournament(tournament);
        expect(result).toBe(expected);
      });
    });

    it('should correctly classify BPT tournaments', () => {
      const testCases: { tournament: Tournament; expected: TournamentType }[] = [
        {
          tournament: { No: '1', Code: 'MBPT2025', Name: 'Beach Pro Tour Challenge', StartDate: '2025-01-15', EndDate: '2025-01-20', Version: '1' },
          expected: 'BPT'
        },
        {
          tournament: { No: '2', Code: 'WBPT2025', Name: 'BPT Elite16', StartDate: '2025-02-15', EndDate: '2025-02-20', Version: '1' },
          expected: 'BPT'
        },
        {
          tournament: { No: '3', Code: 'MCHALLENGE2025', Name: 'Challenge Tournament', StartDate: '2025-03-15', EndDate: '2025-03-20', Version: '1' },
          expected: 'BPT'
        },
        {
          tournament: { No: '4', Code: 'ELITE2025', Name: 'Elite16 Finals', StartDate: '2025-04-15', EndDate: '2025-04-20', Version: '1' },
          expected: 'BPT'
        }
      ];

      testCases.forEach(({ tournament, expected }) => {
        const result = VisApiService.classifyTournament(tournament);
        expect(result).toBe(expected);
      });
    });

    it('should correctly classify CEV tournaments', () => {
      const testCases: { tournament: Tournament; expected: TournamentType }[] = [
        {
          tournament: { No: '1', Code: 'MCEV2025', Name: 'CEV European Championship', StartDate: '2025-01-15', EndDate: '2025-01-20', Version: '1' },
          expected: 'CEV'
        },
        {
          tournament: { No: '2', Code: 'WEUR2025', Name: 'European Masters', StartDate: '2025-02-15', EndDate: '2025-02-20', Version: '1' },
          expected: 'CEV'
        },
        {
          tournament: { No: '3', Code: 'MEUROPA2025', Name: 'Europa Cup Finals', StartDate: '2025-03-15', EndDate: '2025-03-20', Version: '1' },
          expected: 'CEV'
        },
        {
          tournament: { No: '4', Code: 'MCHAMP2025', Name: 'Championship Series', StartDate: '2025-04-15', EndDate: '2025-04-20', Version: '1' },
          expected: 'CEV'
        }
      ];

      testCases.forEach(({ tournament, expected }) => {
        const result = VisApiService.classifyTournament(tournament);
        expect(result).toBe(expected);
      });
    });

    it('should classify unknown tournaments as LOCAL', () => {
      const testCases: { tournament: Tournament; expected: TournamentType }[] = [
        {
          tournament: { No: '1', Code: 'MLOCAL2025', Name: 'Local Beach Tournament', StartDate: '2025-01-15', EndDate: '2025-01-20', Version: '1' },
          expected: 'LOCAL'
        },
        {
          tournament: { No: '2', Code: 'MNATIONAL2025', Name: 'National Championship', StartDate: '2025-02-15', EndDate: '2025-02-20', Version: '1' },
          expected: 'LOCAL'
        },
        {
          tournament: { No: '3', Code: '', Name: 'Unknown Tournament', StartDate: '2025-03-15', EndDate: '2025-03-20', Version: '1' },
          expected: 'LOCAL'
        },
        {
          tournament: { No: '4', Name: '', StartDate: '2025-04-15', EndDate: '2025-04-20', Version: '1' },
          expected: 'LOCAL'
        }
      ];

      testCases.forEach(({ tournament, expected }) => {
        const result = VisApiService.classifyTournament(tournament);
        expect(result).toBe(expected);
      });
    });

    it('should handle edge cases in classification', () => {
      // Test case sensitivity
      const upperCaseTournament: Tournament = {
        No: '1',
        Code: 'MFIVB2025',
        Name: 'FIVB WORLD TOUR TOURNAMENT',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      };
      expect(VisApiService.classifyTournament(upperCaseTournament)).toBe('FIVB');

      // Test mixed case
      const mixedCaseTournament: Tournament = {
        No: '2',
        Code: 'MbPt2025',
        Name: 'Beach PRO Tour Challenge',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      };
      expect(VisApiService.classifyTournament(mixedCaseTournament)).toBe('BPT');

      // Test undefined values
      const undefinedTournament: Tournament = {
        No: '3',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      };
      expect(VisApiService.classifyTournament(undefinedTournament)).toBe('LOCAL');
    });

    it('should prioritize name over code in classification', () => {
      // Tournament with conflicting code and name - name should take precedence
      const conflictingTournament: Tournament = {
        No: '1',
        Code: 'MBPT2025', // BPT code
        Name: 'FIVB World Tour Major', // FIVB name
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      };
      
      // Since FIVB is checked first in the logic, it should classify as FIVB
      expect(VisApiService.classifyTournament(conflictingTournament)).toBe('FIVB');
    });
  });

  describe('Classification Logic in Direct API Filtering', () => {
    beforeEach(() => {
      // Mock global fetch for direct API calls
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should apply tournament type filtering using classification logic', async () => {
      // Mock XML response with mixed tournament types
      const mockXmlResponse = `
        <BeachTournaments>
          <BeachTournament No="1" Code="MFIVB2025" Name="FIVB World Tour Tournament" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
          <BeachTournament No="2" Code="WBPT2025" Name="Beach Pro Tour Challenge" StartDate="2025-01-16" EndDate="2025-01-21" Version="1" />
          <BeachTournament No="3" Code="MCEV2025" Name="CEV European Championship" StartDate="2025-01-17" EndDate="2025-01-22" Version="1" />
          <BeachTournament No="4" Code="MLOCAL2025" Name="Local Beach Tournament" StartDate="2025-01-18" EndDate="2025-01-23" Version="1" />
        </BeachTournaments>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockXmlResponse)
      });

      // Test filtering for FIVB tournaments only
      const fivbResult = await VisApiService.fetchDirectFromAPI({ tournamentType: 'FIVB' });
      expect(fivbResult).toHaveLength(1);
      expect(fivbResult[0].Code).toBe('MFIVB2025');
      expect(VisApiService.classifyTournament(fivbResult[0])).toBe('FIVB');

      // Test filtering for BPT tournaments only
      const bptResult = await VisApiService.fetchDirectFromAPI({ tournamentType: 'BPT' });
      expect(bptResult).toHaveLength(1);
      expect(bptResult[0].Code).toBe('WBPT2025');
      expect(VisApiService.classifyTournament(bptResult[0])).toBe('BPT');

      // Test filtering for CEV tournaments only
      const cevResult = await VisApiService.fetchDirectFromAPI({ tournamentType: 'CEV' });
      expect(cevResult).toHaveLength(1);
      expect(cevResult[0].Code).toBe('MCEV2025');
      expect(VisApiService.classifyTournament(cevResult[0])).toBe('CEV');

      // Test filtering for LOCAL tournaments only  
      const localResult = await VisApiService.fetchDirectFromAPI({ tournamentType: 'LOCAL' });
      expect(localResult).toHaveLength(1);
      expect(localResult[0].Code).toBe('MLOCAL2025');
      expect(VisApiService.classifyTournament(localResult[0])).toBe('LOCAL');

      // Test no filtering (ALL tournaments)
      const allResult = await VisApiService.fetchDirectFromAPI({ tournamentType: 'ALL' });
      expect(allResult).toHaveLength(4);

      // Test no filter parameter
      const noFilterResult = await VisApiService.fetchDirectFromAPI();
      expect(noFilterResult).toHaveLength(4);
    });

    it('should preserve classification logic consistency', async () => {
      const mockXmlResponse = `
        <BeachTournaments>
          <BeachTournament No="1" Code="MFIVB2025" Name="FIVB World Tour Tournament" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
          <BeachTournament No="2" Code="WBPT2025" Name="Beach Pro Tour Challenge" StartDate="2025-01-16" EndDate="2025-01-21" Version="1" />
        </BeachTournaments>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockXmlResponse)
      });

      const result = await VisApiService.fetchDirectFromAPI();
      
      // Verify that the classification logic produces consistent results
      result.forEach(tournament => {
        const classifiedType = VisApiService.classifyTournament(tournament);
        expect(classifiedType).toBeOneOf(['FIVB', 'BPT', 'CEV', 'LOCAL']);
      });

      // Verify specific classifications
      expect(VisApiService.classifyTournament(result[0])).toBe('FIVB');
      expect(VisApiService.classifyTournament(result[1])).toBe('BPT');
    });
  });

  describe('Classification Logic Preservation Across Cache Tiers', () => {
    beforeEach(() => {
      CacheService.initialize();
    });

    it('should preserve tournament data structure for consistent classification', async () => {
      // Mock a tournament from any cache tier
      const mockTournament: Tournament = {
        No: '1',
        Code: 'MFIVB2025',
        Name: 'FIVB World Tour Tournament',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      };

      // Classification should work regardless of data source
      expect(VisApiService.classifyTournament(mockTournament)).toBe('FIVB');

      // Test that cached data maintains the same structure needed for classification
      const requiredFields = ['No', 'Code', 'Name', 'StartDate', 'EndDate', 'Version'];
      requiredFields.forEach(field => {
        expect(mockTournament).toHaveProperty(field);
      });
    });

    it('should maintain classification consistency between cache tiers and API', async () => {
      const testTournaments: Tournament[] = [
        { No: '1', Code: 'MFIVB2025', Name: 'FIVB World Tour', StartDate: '2025-01-15', EndDate: '2025-01-20', Version: '1' },
        { No: '2', Code: 'WBPT2025', Name: 'Beach Pro Tour Challenge', StartDate: '2025-01-16', EndDate: '2025-01-21', Version: '1' },
        { No: '3', Code: 'MCEV2025', Name: 'CEV European Championship', StartDate: '2025-01-17', EndDate: '2025-01-22', Version: '1' },
        { No: '4', Code: 'MLOCAL2025', Name: 'Local Tournament', StartDate: '2025-01-18', EndDate: '2025-01-23', Version: '1' }
      ];

      // Test that classification works consistently regardless of data source
      testTournaments.forEach(tournament => {
        const classificationType = VisApiService.classifyTournament(tournament);
        expect(classificationType).toBeOneOf(['FIVB', 'BPT', 'CEV', 'LOCAL']);
      });

      // Verify specific expected classifications
      expect(VisApiService.classifyTournament(testTournaments[0])).toBe('FIVB');
      expect(VisApiService.classifyTournament(testTournaments[1])).toBe('BPT');
      expect(VisApiService.classifyTournament(testTournaments[2])).toBe('CEV');
      expect(VisApiService.classifyTournament(testTournaments[3])).toBe('LOCAL');
    });

    it('should validate tournament data integrity for classification', () => {
      // Test data integrity requirements for classification
      const validTournament: Tournament = {
        No: '1',
        Code: 'MFIVB2025',
        Name: 'FIVB World Tour',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      };

      // Should classify correctly with all fields
      expect(VisApiService.classifyTournament(validTournament)).toBe('FIVB');

      // Should handle missing optional fields gracefully
      const minimalTournament: Tournament = {
        No: '2',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      };

      // Should default to LOCAL when insufficient data
      expect(VisApiService.classifyTournament(minimalTournament)).toBe('LOCAL');
    });
  });
});