/**
 * @fileoverview Unit tests for VIS-compliant parsing methods
 * Tests the new VIS-compliant match parsing functionality with proper numeric types
 * Part of VIS Data Structure Alignment Epic - Story 1.2
 */

import { VisResponseParser, VisParsingError } from '../VisResponseParser';
import { BeachMatchFormat, isVisCompliantMatch } from '../../../types/match-vis-compliant';

describe('VisResponseParser - VIS Compliant Methods', () => {
  describe('parseBeachMatchesVisCompliant', () => {
    const mockXmlResponse = `
      <BeachMatchList>
        <BeachMatch 
          No="123" 
          NoInTournament="45"
          MatchPointsA="2"
          MatchPointsB="1"
          TeamAName="Brazil Team A"
          TeamBName="USA Team B"
          TeamAFederationCode="BRA"
          TeamBFederationCode="USA"
          NoReferee1="101"
          NoReferee2="102"
          TeamARanking="5"
          TeamBRanking="8"
          LocalDate="2024-01-15"
          LocalTime="14:30"
          Court="Center Court"
          Status="Finished"
          PointsTeamASet1="21"
          PointsTeamBSet1="18"
          PointsTeamASet2="21"
          PointsTeamBSet2="15"
          DurationSet1Seconds="1800"
          DurationSet2Seconds="1500"
          Temperature="2450"
          Humidity="680"
          NbSpectators="1500"
        />
      </BeachMatchList>
    `;

    test('should parse VIS-compliant match data with proper numeric types', () => {
      const matches = VisResponseParser.parseBeachMatchesVisCompliant(mockXmlResponse, 'tournament-123');

      expect(matches).toHaveLength(1);
      
      const match = matches[0];
      expect(isVisCompliantMatch(match)).toBe(true);

      // Test required numeric fields
      expect(match.No).toBe(123);
      expect(typeof match.No).toBe('number');
      expect(match.NoInTournament).toBe(45);
      expect(typeof match.NoInTournament).toBe('number');
      expect(match.Format).toBe(BeachMatchFormat.BEST_OF_3);

      // Test optional numeric fields
      expect(match.MatchPointsA).toBe(2);
      expect(match.MatchPointsB).toBe(1);
      expect(match.NoReferee1).toBe(101);
      expect(match.NoReferee2).toBe(102);
      expect(match.TeamARanking).toBe(5);
      expect(match.TeamBRanking).toBe(8);
    });

    test('should parse VIS-compliant field names correctly', () => {
      const matches = VisResponseParser.parseBeachMatchesVisCompliant(mockXmlResponse, 'tournament-123');
      const match = matches[0];

      expect(match.TeamAFederationCode).toBe('BRA');
      expect(match.TeamBFederationCode).toBe('USA');
      expect(match.TeamAName).toBe('Brazil Team A');
      expect(match.TeamBName).toBe('USA Team B');
    });

    test('should handle VIS seconds-based duration fields', () => {
      const matches = VisResponseParser.parseBeachMatchesVisCompliant(mockXmlResponse, 'tournament-123');
      const match = matches[0];

      expect(match.DurationSet1Seconds).toBe(1800);
      expect(match.DurationSet2Seconds).toBe(1500);
      expect(match.DurationSet3Seconds).toBeUndefined(); // Not provided in XML
    });

    test('should parse environmental data with numeric types', () => {
      const matches = VisResponseParser.parseBeachMatchesVisCompliant(mockXmlResponse, 'tournament-123');
      const match = matches[0];

      expect(match.Temperature).toBe(2450); // 24.5°C in 1/100°C
      expect(match.Humidity).toBe(680); // 68% in 1/10%
      expect(match.NbSpectators).toBe(1500);
    });

    test('should parse set points with numeric validation', () => {
      const matches = VisResponseParser.parseBeachMatchesVisCompliant(mockXmlResponse, 'tournament-123');
      const match = matches[0];

      expect(match.PointsTeamASet1).toBe(21);
      expect(match.PointsTeamBSet1).toBe(18);
      expect(match.PointsTeamASet2).toBe(21);
      expect(match.PointsTeamBSet2).toBe(15);
      expect(match.PointsTeamASet3).toBeUndefined(); // Not provided
    });

    test('should handle fallback to legacy field names', () => {
      const legacyXmlResponse = `
        <BeachMatchList>
          <BeachMatch 
            No="123" 
            NoInTournament="45"
            TeamACountryCode="BRA"
            TeamBCountryCode="USA"
          />
        </BeachMatchList>
      `;

      const matches = VisResponseParser.parseBeachMatchesVisCompliant(legacyXmlResponse, 'tournament-123');
      const match = matches[0];

      expect(match.TeamAFederationCode).toBe('BRA'); // Should use legacy field as fallback
      expect(match.TeamBFederationCode).toBe('USA');
    });

    test('should handle invalid numeric conversions gracefully', () => {
      const invalidXmlResponse = `
        <BeachMatchList>
          <BeachMatch 
            No="invalid"
            NoInTournament="45"
          />
        </BeachMatchList>
      `;

      // Invalid match should be skipped, not throw an error
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const matches = VisResponseParser.parseBeachMatchesVisCompliant(invalidXmlResponse, 'tournament-123');
      
      expect(matches).toHaveLength(0); // No valid matches parsed
      expect(consoleSpy).toHaveBeenCalled(); // Error should be logged
      
      consoleSpy.mockRestore();
    });

    test('should handle empty XML response', () => {
      const emptyXmlResponse = '<BeachMatchList></BeachMatchList>';
      const matches = VisResponseParser.parseBeachMatchesVisCompliant(emptyXmlResponse, 'tournament-123');
      
      expect(matches).toHaveLength(0);
    });

    test('should filter out negative numeric values', () => {
      const negativeXmlResponse = `
        <BeachMatchList>
          <BeachMatch 
            No="123" 
            NoInTournament="45"
            MatchPointsA="-1"
            TeamARanking="-5"
            Temperature="-100"
          />
        </BeachMatchList>
      `;

      const matches = VisResponseParser.parseBeachMatchesVisCompliant(negativeXmlResponse, 'tournament-123');
      const match = matches[0];

      expect(match.MatchPointsA).toBeUndefined(); // Negative values filtered out
      expect(match.TeamARanking).toBeUndefined();
      expect(match.Temperature).toBeUndefined();
    });

    test('should handle missing required fields', () => {
      const missingFieldsXmlResponse = `
        <BeachMatchList>
          <BeachMatch 
            NoInTournament="45"
          />
        </BeachMatchList>
      `;

      const matches = VisResponseParser.parseBeachMatchesVisCompliant(missingFieldsXmlResponse, 'tournament-123');
      expect(matches).toHaveLength(0); // Should be filtered out due to missing No field
    });

    test('should preserve tournament context fields', () => {
      const contextXmlResponse = `
        <BeachMatchList>
          <BeachMatch 
            No="123" 
            NoInTournament="45"
            TournamentGender="M"
            TournamentCode="FIVB"
            TournamentCountry="BRA"
          />
        </BeachMatchList>
      `;

      const matches = VisResponseParser.parseBeachMatchesVisCompliant(contextXmlResponse, 'tournament-123');
      const match = matches[0];

      expect(match.tournamentGender).toBe('M');
      expect(match.tournamentNo).toBe('tournament-123'); // From parameter
      expect(match.tournamentCode).toBe('FIVB');
      expect(match.tournamentCountry).toBe('BRA');
    });

    test('should handle malformed XML gracefully', () => {
      const malformedXml = '<BeachMatchList><BeachMatch No="123"'; // Unclosed tag

      // Should not throw an error, but return empty array since regex won't match incomplete tags
      const matches = VisResponseParser.parseBeachMatchesVisCompliant(malformedXml, 'tournament-123');
      expect(matches).toHaveLength(0);
    });

    test('should continue parsing after individual match errors', () => {
      const mixedXmlResponse = `
        <BeachMatchList>
          <BeachMatch 
            No="invalid" 
            NoInTournament="45"
          />
          <BeachMatch 
            No="124" 
            NoInTournament="46"
          />
        </BeachMatchList>
      `;

      // Should log warning for first match but continue with second
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const matches = VisResponseParser.parseBeachMatchesVisCompliant(mixedXmlResponse, 'tournament-123');
      
      expect(matches).toHaveLength(1); // Only valid match parsed
      expect(matches[0].No).toBe(124);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse VIS-compliant match:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});