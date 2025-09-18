/**
 * Integration tests for VIS API Timezone Enhancement
 * Tests end-to-end timezone functionality with VIS API integration
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

// Mock VIS API responses for testing
const mockVISMatchResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Matches>
  <Match>
    <No>12345</No>
    <Code>M001</Code>
    <TournamentCode>TOUR2025</TournamentCode>
    <BeginDateTimeUtc>2025-01-15T18:00:00Z</BeginDateTimeUtc>
    <EndDateTimeUtc>2025-01-15T20:00:00Z</EndDateTimeUtc>
    <LocalDate>2025-01-15</LocalDate>
    <LocalTime>15:00:00</LocalTime>
    <LocalTimeOffset>-03:00</LocalTimeOffset>
    <TimeZone>America/Sao_Paulo</TimeZone>
    <Team1>Player1A/Player1B</Team1>
    <Team2>Player2A/Player2B</Team2>
    <Status>SCHEDULED</Status>
    <Court>Court 1</Court>
  </Match>
  <Match>
    <No>12346</No>
    <Code>M002</Code>
    <TournamentCode>TOUR2025</TournamentCode>
    <UtcDate>2025-01-15</UtcDate>
    <UtcTime>19:00:00</UtcTime>
    <LocalDate>2025-01-15</LocalDate>
    <LocalTime>16:00:00</LocalTime>
    <TimeZone>America/Sao_Paulo</TimeZone>
    <Team1>Player3A/Player3B</Team1>
    <Team2>Player4A/Player4B</Team2>
    <Status>SCHEDULED</Status>
    <Court>Court 2</Court>
  </Match>
  <Match>
    <No>12347</No>
    <Code>M003</Code>
    <TournamentCode>TOUR2025</TournamentCode>
    <LocalDate>2025-01-15</LocalDate>
    <LocalTime>17:00:00</LocalTime>
    <Team1>Player5A/Player5B</Team1>
    <Team2>Player6A/Player6B</Team2>
    <Status>SCHEDULED</Status>
    <Court>Court 3</Court>
  </Match>
</Matches>`;

const mockVISTournamentResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Tournaments>
  <Event>
    <No>2025</No>
    <Code>TOUR2025</Code>
    <Name>Brazil Open 2025</Name>
    <Country>Brazil</Country>
    <City>Rio de Janeiro</City>
    <DefaultTimeZone>America/Sao_Paulo</DefaultTimeZone>
    <DefaultLocalTimeOffset>-03:00</DefaultLocalTimeOffset>
    <StartDate>2025-01-15</StartDate>
    <EndDate>2025-01-20</EndDate>
  </Event>
</Tournaments>`;

// Mock the VIS API client
const mockVisClient = {
  makeRequest: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
};

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    upsert: jest.fn().mockResolvedValue({ error: null }),
  })),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('VIS API Timezone Enhancement Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('processes timezone fields from VIS API match response', async () => {
    // Mock VIS API response
    mockVisClient.makeRequest.mockResolvedValue(mockVISMatchResponse);

    // Simulate the vis-adapter processing
    const { parseVisMatchesXml } = await import('../../supabase/functions/vis-adapter/index.ts');

    const matches = parseVisMatchesXml(mockVISMatchResponse);

    expect(matches).toHaveLength(3);

    // Test high-priority UTC timestamp match (M001)
    const match1 = matches.find(m => m.matchCode === 'M001');
    expect(match1).toBeDefined();
    expect(match1?.utcStart).toBe('2025-01-15T18:00:00Z');
    expect(match1?.utcEnd).toBe('2025-01-15T20:00:00Z');
    expect(match1?.timezoneSource).toBe('BeginDateTimeUtc');
    expect(match1?.timezoneReliable).toBe(true);
    expect(match1?.timezone).toBe('America/Sao_Paulo');
    expect(match1?.timezoneOffset).toBe('-03:00');

    // Test UTC date/time components match (M002)
    const match2 = matches.find(m => m.matchCode === 'M002');
    expect(match2).toBeDefined();
    expect(match2?.utcStart).toBe('2025-01-15T19:00:00Z');
    expect(match2?.timezoneSource).toBe('UtcDateTime');
    expect(match2?.timezoneReliable).toBe(true);

    // Test fallback match (M003)
    const match3 = matches.find(m => m.matchCode === 'M003');
    expect(match3).toBeDefined();
    expect(match3?.utcStart).toBeNull();
    expect(match3?.timezoneSource).toBe('fallback');
    expect(match3?.timezoneReliable).toBe(false);
  });

  test('processes tournament timezone defaults', async () => {
    mockVisClient.makeRequest.mockResolvedValue(mockVISTournamentResponse);

    const { parseVisTournamentsXml } = await import('../../supabase/functions/vis-adapter/index.ts');

    const tournaments = parseVisTournamentsXml(mockVISTournamentResponse);

    expect(tournaments).toHaveLength(1);

    const tournament = tournaments[0];
    expect(tournament.defaultTimeZone).toBe('America/Sao_Paulo');
    expect(tournament.defaultLocalTimeOffset).toBe('-03:00');
    expect(tournament.code).toBe('TOUR2025');
    expect(tournament.name).toBe('Brazil Open 2025');
  });

  test('handles VIS API response variations gracefully', async () => {
    // Test with incomplete timezone data
    const incompleteResponse = `<?xml version="1.0" encoding="UTF-8"?>
    <Matches>
      <Match>
        <No>12348</No>
        <Code>M004</Code>
        <TournamentCode>TOUR2025</TournamentCode>
        <LocalDate>2025-01-15</LocalDate>
        <LocalTime>18:00:00</LocalTime>
        <Team1>PlayerA/PlayerB</Team1>
        <Team2>PlayerC/PlayerD</Team2>
        <Status>SCHEDULED</Status>
      </Match>
    </Matches>`;

    const { parseVisMatchesXml } = await import('../../supabase/functions/vis-adapter/index.ts');

    // Should not throw and should handle gracefully
    const matches = parseVisMatchesXml(incompleteResponse);

    expect(matches).toHaveLength(1);
    expect(matches[0].utcStart).toBeNull();
    expect(matches[0].timezoneSource).toBe('fallback');
    expect(matches[0].timezoneReliable).toBe(false);
  });

  test('validates UTC conversion accuracy across different regions', () => {
    const testCases = [
      {
        region: 'Brazil',
        localTime: '15:00:00',
        offset: '-03:00',
        expectedUtc: '2025-01-15T18:00:00.000Z',
      },
      {
        region: 'Europe',
        localTime: '18:00:00',
        offset: '+01:00',
        expectedUtc: '2025-01-15T17:00:00.000Z',
      },
      {
        region: 'Asia',
        localTime: '10:00:00',
        offset: '+09:00',
        expectedUtc: '2025-01-15T01:00:00.000Z',
      },
    ];

    testCases.forEach(({ region, localTime, offset, expectedUtc }) => {
      // Import would normally be at top, but for test isolation we import here
      const enhancer = new (require('../../supabase/functions/vis-adapter/timezone-processor.ts').VISApiTimezoneEnhancer)();

      const fields = {
        LocalDate: '2025-01-15',
        LocalTime: localTime,
        LocalTimeOffset: offset,
      };

      const result = enhancer.convertToUtc(fields);

      expect(result.utcStart).toBe(expectedUtc);
      expect(result.timezoneSource).toBe('LocalDateTime');
    });
  });

  test('maintains existing VIS API functionality when timezone enhancement fails', async () => {
    // Test with malformed timezone data that should not break existing parsing
    const malformedTimezoneResponse = `<?xml version="1.0" encoding="UTF-8"?>
    <Matches>
      <Match>
        <No>12349</No>
        <Code>M005</Code>
        <TournamentCode>TOUR2025</TournamentCode>
        <LocalDate>2025-01-15</LocalDate>
        <LocalTime>invalid-time</LocalTime>
        <LocalTimeOffset>invalid-offset</LocalTimeOffset>
        <Team1>PlayerA/PlayerB</Team1>
        <Team2>PlayerC/PlayerD</Team2>
        <Status>SCHEDULED</Status>
        <Court>Court 1</Court>
      </Match>
    </Matches>`;

    const { parseVisMatchesXml } = await import('../../supabase/functions/vis-adapter/index.ts');

    // Should still parse the match successfully, just with fallback timezone handling
    const matches = parseVisMatchesXml(malformedTimezoneResponse);

    expect(matches).toHaveLength(1);

    const match = matches[0];
    expect(match.visNo).toBe('12349');
    expect(match.matchCode).toBe('M005');
    expect(match.tournamentCode).toBe('TOUR2025');
    expect(match.team1.teamName).toBe('PlayerA/PlayerB');
    expect(match.team2.teamName).toBe('PlayerC/PlayerD');

    // Timezone fields should show fallback/error state
    expect(match.utcStart).toBeNull();
    expect(match.timezoneSource).toBe('fallback');
    expect(match.timezoneReliable).toBe(false);
  });

  test('verifies database integration stores timezone data correctly', async () => {
    const { storeMatchTimezoneData } = await import('../../supabase/functions/vis-adapter/index.ts');

    const testMatches = [
      {
        visNo: '12345',
        matchCode: 'M001',
        tournamentCode: 'TOUR2025',
        utcStart: '2025-01-15T18:00:00Z',
        utcEnd: '2025-01-15T20:00:00Z',
        timezone: 'America/Sao_Paulo',
        timezoneOffset: '-03:00',
        timezoneSource: 'BeginDateTimeUtc' as const,
        timezoneReliable: true,
      },
    ];

    const result = await storeMatchTimezoneData(
      testMatches,
      'mock-supabase-url',
      'mock-supabase-key'
    );

    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);

    // Verify Supabase upsert was called with correct data
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('matches');
    expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        no: '12345',
        tournament_no: 'TOUR2025',
        utc_start: '2025-01-15T18:00:00Z',
        utc_end: '2025-01-15T20:00:00Z',
        timezone_source: 'BeginDateTimeUtc',
        timezone_accuracy: 'high',
        timezone_fallback_used: false,
      }),
      expect.objectContaining({
        onConflict: 'no',
        ignoreDuplicates: false,
      })
    );
  });

  test('verifies cache performance is not impacted by timezone processing', async () => {
    const startTime = Date.now();

    // Simulate processing a large number of matches
    const { parseVisMatchesXml } = await import('../../supabase/functions/vis-adapter/index.ts');

    // Create a large XML response for performance testing
    const largeMatchResponse = `<?xml version="1.0" encoding="UTF-8"?><Matches>` +
      Array.from({ length: 100 }, (_, i) => `
        <Match>
          <No>${12350 + i}</No>
          <Code>M${i.toString().padStart(3, '0')}</Code>
          <TournamentCode>TOUR2025</TournamentCode>
          <BeginDateTimeUtc>2025-01-15T${(18 + (i % 6)).toString().padStart(2, '0')}:00:00Z</BeginDateTimeUtc>
          <TimeZone>America/Sao_Paulo</TimeZone>
          <Team1>Player${i}A/Player${i}B</Team1>
          <Team2>Player${i}C/Player${i}D</Team2>
          <Status>SCHEDULED</Status>
        </Match>
      `).join('') +
      '</Matches>';

    const matches = parseVisMatchesXml(largeMatchResponse);

    const processingTime = Date.now() - startTime;

    expect(matches).toHaveLength(100);
    expect(processingTime).toBeLessThan(200); // <200ms requirement

    // Verify all matches have timezone data processed
    matches.forEach(match => {
      expect(match.utcStart).toBeTruthy();
      expect(match.timezoneSource).toBe('BeginDateTimeUtc');
      expect(match.timezoneReliable).toBe(true);
    });
  });
});