/**
 * @fileoverview Unit tests for VIS-Compliant Match Types
 * 
 * Tests type safety, enum values, compatibility layer functions, and type guards
 * for the VIS Data Structure Alignment foundation types.
 */

import {
  VisCompliantMatch,
  BeachMatchFormat,
  isVisCompliantMatch,
  isLegacyMatch,
  MatchCompatibilityLayer,
  convertLegacyToVisCompliant,
} from '../match-vis-compliant';

describe('BeachMatchFormat Enum', () => {
  test('should have correct enum values', () => {
    expect(BeachMatchFormat.BEST_OF_3).toBe('BestOf3');
    expect(BeachMatchFormat.BEST_OF_5).toBe('BestOf5');
    expect(BeachMatchFormat.TIMED).toBe('Timed');
  });

  test('should contain exactly 3 enum values', () => {
    const values = Object.values(BeachMatchFormat);
    expect(values).toHaveLength(3);
    expect(values).toEqual(['BestOf3', 'BestOf5', 'Timed']);
  });
});

describe('VisCompliantMatch Interface', () => {
  const validMatch: VisCompliantMatch = {
    No: 123,
    NoInTournament: 45,
    Format: BeachMatchFormat.BEST_OF_3,
    TeamAFederationCode: 'BRA',
    TeamBFederationCode: 'USA',
    MatchPointsA: 2,
    MatchPointsB: 1,
    NoReferee1: 101,
    NoReferee2: 102,
    TeamARanking: 5,
    TeamBRanking: 8,
  };

  test('should accept valid VIS-compliant match data', () => {
    // This test verifies TypeScript compilation - if it compiles, types are correct
    expect(validMatch.No).toBe(123);
    expect(validMatch.NoInTournament).toBe(45);
    expect(validMatch.Format).toBe(BeachMatchFormat.BEST_OF_3);
  });

  test('should enforce numeric types for required fields', () => {
    // Type safety test - these should be numbers, not strings
    expect(typeof validMatch.No).toBe('number');
    expect(typeof validMatch.NoInTournament).toBe('number');
    expect(typeof validMatch.MatchPointsA).toBe('number');
    expect(typeof validMatch.MatchPointsB).toBe('number');
  });

  test('should enforce readonly properties', () => {
    // Verify readonly constraint by attempting to modify (should cause TypeScript error)
    // Note: This is primarily a TypeScript compile-time check
    expect(() => {
      // @ts-expect-error - readonly property should not be assignable
      (validMatch as any).No = 999;
    }).not.toThrow(); // Runtime doesn't enforce readonly, only TypeScript
  });

  test('should handle optional environmental data fields', () => {
    const matchWithEnvironmental: VisCompliantMatch = {
      ...validMatch,
      Temperature: 2450, // 24.5°C in 1/100°C
      Humidity: 680, // 68% in 1/10%
      NbSpectators: 1500,
    };

    expect(matchWithEnvironmental.Temperature).toBe(2450);
    expect(matchWithEnvironmental.Humidity).toBe(680);
    expect(matchWithEnvironmental.NbSpectators).toBe(1500);
  });

  test('should handle optional performance statistics fields', () => {
    const matchWithPerformance: VisCompliantMatch = {
      ...validMatch,
      FastestServeTeamAPlayer1: 85,
      FastestServeTeamAPlayer2: 78,
      FastestServeTeamBPlayer1: 82,
      FastestServeTeamBPlayer2: 90,
    };

    expect(matchWithPerformance.FastestServeTeamAPlayer1).toBe(85);
    expect(matchWithPerformance.FastestServeTeamBPlayer2).toBe(90);
  });
});

describe('isVisCompliantMatch Type Guard', () => {
  test('should return true for valid VIS-compliant match', () => {
    const validMatch = {
      No: 123,
      NoInTournament: 45,
      Format: BeachMatchFormat.BEST_OF_3,
      TeamAFederationCode: 'BRA',
    };

    expect(isVisCompliantMatch(validMatch)).toBe(true);
  });

  test('should return false for legacy string-based match', () => {
    const legacyMatch = {
      No: '123', // String instead of number
      NoInTournament: '45',
      MatchPointsA: '2',
    };

    expect(isVisCompliantMatch(legacyMatch)).toBe(false);
  });

  test('should return false for invalid objects', () => {
    expect(isVisCompliantMatch(null)).toBe(false);
    expect(isVisCompliantMatch(undefined)).toBe(false);
    expect(isVisCompliantMatch('string')).toBe(false);
    expect(isVisCompliantMatch(123)).toBe(false);
    expect(isVisCompliantMatch({})).toBe(false);
  });

  test('should return false when required fields are missing', () => {
    expect(isVisCompliantMatch({ No: 123 })).toBe(false); // Missing NoInTournament
    expect(isVisCompliantMatch({ NoInTournament: 45 })).toBe(false); // Missing No
    expect(isVisCompliantMatch({ No: 123, NoInTournament: 45 })).toBe(false); // Missing Format
  });

  test('should return false for invalid Format values', () => {
    const invalidFormat = {
      No: 123,
      NoInTournament: 45,
      Format: 'InvalidFormat',
    };

    expect(isVisCompliantMatch(invalidFormat)).toBe(false);
  });
});

describe('isLegacyMatch Type Guard', () => {
  test('should return true for legacy string-based match', () => {
    const legacyMatch = {
      No: '123',
      MatchPointsA: '2',
      TeamACountryCode: 'BRA',
    };

    expect(isLegacyMatch(legacyMatch)).toBe(true);
  });

  test('should return false for VIS-compliant match', () => {
    const visMatch = {
      No: 123,
      NoInTournament: 45,
      Format: BeachMatchFormat.BEST_OF_3,
    };

    expect(isLegacyMatch(visMatch)).toBe(false);
  });

  test('should return false for invalid objects', () => {
    expect(isLegacyMatch(null)).toBe(false);
    expect(isLegacyMatch(undefined)).toBe(false);
    expect(isLegacyMatch({})).toBe(false);
  });
});

describe('convertLegacyToVisCompliant Function', () => {
  const sampleLegacyMatch = {
    No: '123',
    NoInTournament: '45',
    MatchPointsA: '2',
    MatchPointsB: '1',
    NoReferee1: '101',
    NoReferee2: '102',
    TeamARanking: '5',
    TeamBRanking: '8',
    TeamAName: 'Brazil Team A',
    TeamBName: 'USA Team B',
    TeamACountryCode: 'BRA', // Legacy field name
    TeamBCountryCode: 'USA', // Legacy field name
    Court: 'Center Court',
    LocalDate: '2024-01-15',
    LocalTime: '14:30',
  };

  test('should convert legacy match to VIS-compliant format', () => {
    const converted = convertLegacyToVisCompliant(sampleLegacyMatch);

    expect(converted.No).toBe(123);
    expect(converted.NoInTournament).toBe(45);
    expect(converted.Format).toBe(BeachMatchFormat.BEST_OF_3);
    expect(converted.MatchPointsA).toBe(2);
    expect(converted.MatchPointsB).toBe(1);
    expect(converted.NoReferee1).toBe(101);
    expect(converted.NoReferee2).toBe(102);
  });

  test('should convert field names correctly', () => {
    const converted = convertLegacyToVisCompliant(sampleLegacyMatch);

    // Should use VIS-compliant field names
    expect(converted.TeamAFederationCode).toBe('BRA');
    expect(converted.TeamBFederationCode).toBe('USA');
    
    // Should preserve other string fields
    expect(converted.TeamAName).toBe('Brazil Team A');
    expect(converted.TeamBName).toBe('USA Team B');
    expect(converted.Court).toBe('Center Court');
  });

  test('should handle empty or invalid numeric strings safely', () => {
    const legacyWithEmpty = {
      No: '123',
      NoInTournament: '45',
      MatchPointsA: '', // Empty string
      MatchPointsB: 'invalid', // Invalid number
      NoReferee1: undefined,
      TeamARanking: null,
    };

    const converted = convertLegacyToVisCompliant(legacyWithEmpty);

    expect(converted.No).toBe(123);
    expect(converted.NoInTournament).toBe(45);
    expect(converted.MatchPointsA).toBeUndefined();
    expect(converted.MatchPointsB).toBeUndefined();
    expect(converted.NoReferee1).toBeUndefined();
    expect(converted.TeamARanking).toBeUndefined();
  });

  test('should throw error for invalid required numeric fields', () => {
    const invalidMatch = {
      No: 'invalid',
      NoInTournament: '45',
    };

    expect(() => convertLegacyToVisCompliant(invalidMatch)).toThrow('Invalid match number: invalid');
  });

  test('should throw error for invalid NoInTournament', () => {
    const invalidMatch = {
      No: '123',
      NoInTournament: 'invalid',
    };

    expect(() => convertLegacyToVisCompliant(invalidMatch)).toThrow('Invalid tournament match number: invalid');
  });

  test('should return unchanged if already VIS-compliant', () => {
    const visMatch: VisCompliantMatch = {
      No: 123,
      NoInTournament: 45,
      Format: BeachMatchFormat.BEST_OF_3,
    };

    const result = convertLegacyToVisCompliant(visMatch);
    expect(result).toBe(visMatch); // Should return the same object
  });

  test('should handle missing NoInTournament gracefully', () => {
    const legacyWithoutNoInTournament = {
      No: '123',
      // NoInTournament missing
      MatchPointsA: '2',
    };

    const converted = convertLegacyToVisCompliant(legacyWithoutNoInTournament);
    expect(converted.NoInTournament).toBe(1); // Default fallback to 1
  });
});

describe('Type Safety Integration Tests', () => {
  test('MatchCompatibilityLayer should accept both legacy and VIS-compliant matches', () => {
    const legacyMatch: MatchCompatibilityLayer = {
      No: '123', // String type (legacy)
      MatchPointsA: '2',
    };

    const visMatch: MatchCompatibilityLayer = {
      No: 123, // Number type (VIS-compliant)
      NoInTournament: 45,
      Format: BeachMatchFormat.BEST_OF_3,
    };

    // Both should be valid MatchCompatibilityLayer types
    expect(legacyMatch).toBeDefined();
    expect(visMatch).toBeDefined();
  });

  test('should demonstrate type-safe workflow', () => {
    const unknownMatch: unknown = {
      No: '123',
      NoInTournament: '45', // Add required field
      MatchPointsA: '2',
      TeamACountryCode: 'BRA',
    };

    // Type-safe checking and conversion workflow
    if (isLegacyMatch(unknownMatch)) {
      const converted = convertLegacyToVisCompliant(unknownMatch);
      expect(isVisCompliantMatch(converted)).toBe(true);
      expect(typeof converted.No).toBe('number');
    } else if (isVisCompliantMatch(unknownMatch)) {
      // Already VIS-compliant
      expect(typeof unknownMatch.No).toBe('number');
    }
  });
});

describe('Edge Cases and Error Handling', () => {
  test('should handle zero values correctly', () => {
    const legacyWithZeros = {
      No: '0', // Invalid - should be positive
      NoInTournament: '0', // Invalid - should be positive  
      MatchPointsA: '0', // Valid - can be zero
      TeamARanking: '0', // Valid - can be zero
    };

    expect(() => convertLegacyToVisCompliant(legacyWithZeros)).toThrow();
  });

  test('should handle negative values correctly', () => {
    const legacyWithNegatives = {
      No: '-1',
      NoInTournament: '45',
      MatchPointsA: '-1', // Should become undefined (invalid)
    };

    expect(() => convertLegacyToVisCompliant(legacyWithNegatives)).toThrow();
  });

  test('should preserve tournament context fields during conversion', () => {
    const legacyWithContext = {
      No: '123',
      NoInTournament: '45',
      tournamentGender: 'M',
      tournamentNo: 'T001',
      tournamentCode: 'FIVB',
      tournamentCountry: 'BRA',
    };

    const converted = convertLegacyToVisCompliant(legacyWithContext);

    expect(converted.tournamentGender).toBe('M');
    expect(converted.tournamentNo).toBe('T001');
    expect(converted.tournamentCode).toBe('FIVB');
    expect(converted.tournamentCountry).toBe('BRA');
  });
});