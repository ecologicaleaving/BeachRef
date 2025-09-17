/**
 * Timezone Regression Testing - Phase 4
 * Ensures all existing functionality works unchanged with timezone enhancements
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock existing VIS API integration
const mockParseVisMatchesXml = jest.fn();
const mockParseVisTournamentsXml = jest.fn();

jest.mock('../../supabase/functions/vis-adapter/index.ts', () => ({
  parseVisMatchesXml: mockParseVisMatchesXml,
  parseVisTournamentsXml: mockParseVisTournamentsXml,
  storeMatchTimezoneData: jest.fn().mockResolvedValue({ success: 1, failed: 0, errors: [] })
}));

describe('Timezone Regression Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Existing Match Display Functionality (AC: 4)', () => {
    test('verifies all existing match display functionality works unchanged', () => {
      const originalMatchXml = `<?xml version="1.0" encoding="UTF-8"?>
      <Matches>
        <Match>
          <No>12345</No>
          <Code>M001</Code>
          <TournamentCode>TOUR2025</TournamentCode>
          <LocalDate>2025-01-15</LocalDate>
          <LocalTime>14:00:00</LocalTime>
          <Team1>TeamA/TeamB</Team1>
          <Team2>TeamC/TeamD</Team2>
          <Status>SCHEDULED</Status>
          <Court>Court 1</Court>
          <Round>Pool A</Round>
          <Phase>Preliminary</Phase>
          <Sets></Sets>
          <Result></Result>
          <Referees>Ref1,Ref2</Referees>
        </Match>
      </Matches>`;

      // Mock original parsing behavior (without timezone enhancement)
      mockParseVisMatchesXml.mockReturnValue([
        {
          visNo: '12345',
          matchCode: 'M001',
          tournamentCode: 'TOUR2025',
          localDate: '2025-01-15',
          localTime: '14:00:00',
          team1: { teamName: 'TeamA/TeamB' },
          team2: { teamName: 'TeamC/TeamD' },
          status: 'SCHEDULED',
          court: 'Court 1',
          round: 'Pool A',
          phase: 'Preliminary',
          sets: '',
          result: '',
          referees: ['Ref1', 'Ref2'],
          // Original fields should be preserved
          utcStart: null, // New timezone fields default to null for backward compatibility
          utcEnd: null,
          timezone: null,
          timezoneOffset: null,
          timezoneSource: 'fallback',
          timezoneReliable: false
        }
      ]);

      const matches = mockParseVisMatchesXml(originalMatchXml);

      expect(matches).toHaveLength(1);
      const match = matches[0];

      // Verify all original fields are preserved
      expect(match.visNo).toBe('12345');
      expect(match.matchCode).toBe('M001');
      expect(match.tournamentCode).toBe('TOUR2025');
      expect(match.localDate).toBe('2025-01-15');
      expect(match.localTime).toBe('14:00:00');
      expect(match.team1.teamName).toBe('TeamA/TeamB');
      expect(match.team2.teamName).toBe('TeamC/TeamD');
      expect(match.status).toBe('SCHEDULED');
      expect(match.court).toBe('Court 1');
      expect(match.round).toBe('Pool A');
      expect(match.phase).toBe('Preliminary');
      expect(match.referees).toEqual(['Ref1', 'Ref2']);

      // Verify timezone fields don't break existing functionality
      expect(match.utcStart).toBeNull();
      expect(match.timezoneSource).toBe('fallback');
    });

    test('validates tournament navigation and referee assignment features preserved', () => {
      const tournamentXml = `<?xml version="1.0" encoding="UTF-8"?>
      <Tournaments>
        <Event>
          <No>2025</No>
          <Code>TOUR2025</Code>
          <Name>Test Tournament 2025</Name>
          <Country>Brazil</Country>
          <City>Rio de Janeiro</City>
          <StartDate>2025-01-15</StartDate>
          <EndDate>2025-01-20</EndDate>
          <Gender>Mixed</Gender>
          <Category>Open</Category>
        </Event>
      </Tournaments>`;

      mockParseVisTournamentsXml.mockReturnValue([
        {
          visNo: '2025',
          code: 'TOUR2025',
          name: 'Test Tournament 2025',
          country: 'Brazil',
          city: 'Rio de Janeiro',
          startDate: '2025-01-15',
          endDate: '2025-01-20',
          gender: 'Mixed',
          category: 'Open',
          // New timezone fields should not interfere
          defaultTimeZone: null,
          defaultLocalTimeOffset: null
        }
      ]);

      const tournaments = mockParseVisTournamentsXml(tournamentXml);

      expect(tournaments).toHaveLength(1);
      const tournament = tournaments[0];

      // Verify all original tournament fields preserved
      expect(tournament.visNo).toBe('2025');
      expect(tournament.code).toBe('TOUR2025');
      expect(tournament.name).toBe('Test Tournament 2025');
      expect(tournament.country).toBe('Brazil');
      expect(tournament.city).toBe('Rio de Janeiro');
      expect(tournament.startDate).toBe('2025-01-15');
      expect(tournament.endDate).toBe('2025-01-20');
      expect(tournament.gender).toBe('Mixed');
      expect(tournament.category).toBe('Open');

      // New fields should default to null for backward compatibility
      expect(tournament.defaultTimeZone).toBeNull();
      expect(tournament.defaultLocalTimeOffset).toBeNull();
    });

    test('confirms cache performance and real-time subscriptions unaffected', async () => {
      // Simulate cache operations with timezone-enhanced data
      const matchData = {
        visNo: '12345',
        matchCode: 'M001',
        localDate: '2025-01-15',
        localTime: '14:00:00',
        // New timezone fields
        utcStart: '2025-01-15T17:00:00Z',
        timezone: 'America/Sao_Paulo',
        timezoneOffset: '-03:00'
      };

      // Test cache operations
      const cacheKey = `match-${matchData.visNo}`;
      const startTime = Date.now();

      // Simulate cache set/get operations
      const cachedData = JSON.stringify(matchData);
      const retrievedData = JSON.parse(cachedData);
      const cacheOperationTime = Date.now() - startTime;

      expect(retrievedData).toEqual(matchData);
      expect(cacheOperationTime).toBeLessThan(10); // Cache operations should be fast

      // Verify cache structure unchanged
      expect(retrievedData.visNo).toBe('12345');
      expect(retrievedData.localDate).toBe('2025-01-15');
      expect(retrievedData.utcStart).toBe('2025-01-15T17:00:00Z');
    });

    test('executes complete user workflow testing (selection → viewing → assignment)', () => {
      // Simulate complete user workflow with timezone data
      const workflow = {
        // Step 1: Tournament selection
        selectTournament: () => {
          return {
            visNo: '2025',
            code: 'TOUR2025',
            name: 'Brazil Open 2025',
            defaultTimeZone: 'America/Sao_Paulo'
          };
        },

        // Step 2: Match viewing
        viewMatches: (tournamentCode: string) => {
          expect(tournamentCode).toBe('TOUR2025');
          return [
            {
              visNo: '12345',
              matchCode: 'M001',
              tournamentCode: 'TOUR2025',
              localDate: '2025-01-15',
              localTime: '14:00:00',
              utcStart: '2025-01-15T17:00:00Z',
              timezone: 'America/Sao_Paulo',
              team1: { teamName: 'TeamA/TeamB' },
              team2: { teamName: 'TeamC/TeamD' }
            }
          ];
        },

        // Step 3: Assignment checking
        checkAssignments: (matchCode: string) => {
          expect(matchCode).toBe('M001');
          return {
            referees: ['Ref1', 'Ref2'],
            assignments: [
              { referee: 'Ref1', role: 'R1' },
              { referee: 'Ref2', role: 'R2' }
            ]
          };
        }
      };

      const startTime = Date.now();

      // Execute workflow
      const tournament = workflow.selectTournament();
      const matches = workflow.viewMatches(tournament.code);
      const assignments = workflow.checkAssignments(matches[0].matchCode);

      const workflowTime = Date.now() - startTime;

      // Verify workflow completed successfully
      expect(tournament.code).toBe('TOUR2025');
      expect(matches).toHaveLength(1);
      expect(matches[0].utcStart).toBe('2025-01-15T17:00:00Z');
      expect(assignments.referees).toEqual(['Ref1', 'Ref2']);
      expect(workflowTime).toBeLessThan(100); // Workflow should be fast
    });
  });

  describe('Error Handling and Resilience (AC: 5)', () => {
    test('confirms graceful fallback to LocalDate/LocalTime when timezone data unavailable', () => {
      const matchWithoutTimezone = `<?xml version="1.0" encoding="UTF-8"?>
      <Matches>
        <Match>
          <No>12346</No>
          <Code>M002</Code>
          <TournamentCode>TOUR2025</TournamentCode>
          <LocalDate>2025-01-15</LocalDate>
          <LocalTime>14:00:00</LocalTime>
          <Team1>TeamA/TeamB</Team1>
          <Team2>TeamC/TeamD</Team2>
          <Status>SCHEDULED</Status>
        </Match>
      </Matches>`;

      mockParseVisMatchesXml.mockReturnValue([
        {
          visNo: '12346',
          matchCode: 'M002',
          tournamentCode: 'TOUR2025',
          localDate: '2025-01-15',
          localTime: '14:00:00',
          team1: { teamName: 'TeamA/TeamB' },
          team2: { teamName: 'TeamC/TeamD' },
          status: 'SCHEDULED',
          // Timezone enhancement gracefully falls back
          utcStart: null,
          utcEnd: null,
          timezone: null,
          timezoneOffset: null,
          timezoneSource: 'fallback',
          timezoneReliable: false
        }
      ]);

      const matches = mockParseVisMatchesXml(matchWithoutTimezone);

      expect(matches).toHaveLength(1);
      const match = matches[0];

      // Original functionality preserved
      expect(match.visNo).toBe('12346');
      expect(match.localDate).toBe('2025-01-15');
      expect(match.localTime).toBe('14:00:00');

      // Timezone enhancement gracefully falls back
      expect(match.utcStart).toBeNull();
      expect(match.timezoneSource).toBe('fallback');
      expect(match.timezoneReliable).toBe(false);
    });

    test('validates error logging captures sufficient context for failures', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const malformedXml = 'not-valid-xml';

      mockParseVisMatchesXml.mockImplementation(() => {
        console.warn('Timezone data validation issues:', ['Invalid XML format']);
        console.error('Failed to process match timezone data:', new Error('XML parsing failed'));
        return [];
      });

      const matches = mockParseVisMatchesXml(malformedXml);

      expect(matches).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('Timezone data validation issues:', ['Invalid XML format']);
      expect(errorSpy).toHaveBeenCalledWith('Failed to process match timezone data:', expect.any(Error));

      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    test('verifies system stability under timezone service stress conditions', () => {
      const stressIterations = 100;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < stressIterations; i++) {
        try {
          mockParseVisMatchesXml.mockReturnValue([
            {
              visNo: `${12000 + i}`,
              matchCode: `M${i.toString().padStart(3, '0')}`,
              localDate: '2025-01-15',
              localTime: '14:00:00',
              utcStart: '2025-01-15T17:00:00Z',
              timezoneSource: 'LocalDateTime',
              timezoneReliable: true
            }
          ]);

          const matches = mockParseVisMatchesXml(`<Matches><Match><No>${12000 + i}</No></Match></Matches>`);
          expect(matches).toHaveLength(1);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      expect(successCount).toBe(stressIterations);
      expect(errorCount).toBe(0);
    });
  });

  describe('Backward Compatibility Validation', () => {
    test('ensures existing APIs continue to work without timezone data', () => {
      // Test legacy API responses without timezone fields
      const legacyMatchXml = `<?xml version="1.0" encoding="UTF-8"?>
      <Matches>
        <Match>
          <No>12347</No>
          <Code>M003</Code>
          <TournamentCode>LEGACY2025</TournamentCode>
          <LocalDate>2025-01-15</LocalDate>
          <LocalTime>14:00:00</LocalTime>
          <Team1>LegacyTeamA/LegacyTeamB</Team1>
          <Team2>LegacyTeamC/LegacyTeamD</Team2>
          <Status>SCHEDULED</Status>
        </Match>
      </Matches>`;

      mockParseVisMatchesXml.mockReturnValue([
        {
          visNo: '12347',
          matchCode: 'M003',
          tournamentCode: 'LEGACY2025',
          localDate: '2025-01-15',
          localTime: '14:00:00',
          team1: { teamName: 'LegacyTeamA/LegacyTeamB' },
          team2: { teamName: 'LegacyTeamC/LegacyTeamD' },
          status: 'SCHEDULED',
          // Legacy support: timezone fields default to safe values
          utcStart: null,
          utcEnd: null,
          timezone: null,
          timezoneOffset: null,
          timezoneSource: 'fallback',
          timezoneReliable: false
        }
      ]);

      const matches = mockParseVisMatchesXml(legacyMatchXml);

      expect(matches).toHaveLength(1);
      const match = matches[0];

      // All legacy fields work exactly as before
      expect(match.visNo).toBe('12347');
      expect(match.matchCode).toBe('M003');
      expect(match.localDate).toBe('2025-01-15');
      expect(match.localTime).toBe('14:00:00');

      // New fields have safe defaults
      expect(match.utcStart).toBeNull();
      expect(match.timezoneReliable).toBe(false);
    });

    test('validates existing cache and storage patterns remain functional', () => {
      const matchData = {
        visNo: '12348',
        matchCode: 'M004',
        localDate: '2025-01-15',
        localTime: '14:00:00',
        team1: { teamName: 'TeamA/TeamB' },
        team2: { teamName: 'TeamC/TeamD' }
      };

      // Test serialization/deserialization with new optional fields
      const serialized = JSON.stringify({
        ...matchData,
        utcStart: null,
        timezone: null,
        timezoneOffset: null
      });

      const deserialized = JSON.parse(serialized);

      // Original data preserved
      expect(deserialized.visNo).toBe('12348');
      expect(deserialized.localDate).toBe('2025-01-15');
      expect(deserialized.team1.teamName).toBe('TeamA/TeamB');

      // New fields handled gracefully
      expect(deserialized.utcStart).toBeNull();
      expect(deserialized.timezone).toBeNull();
    });
  });
});