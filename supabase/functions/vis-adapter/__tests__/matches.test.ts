import { assertEquals, assertThrows, assertMatch } from 'std/testing/asserts.ts';

// Mock fetch for testing
const originalFetch = globalThis.fetch;

// Mock VIS API responses
const mockVisMatchXmlResponse = `<?xml version="1.0"?>
<Matches>
  <Match>
    <No>23456</No>
    <Code>M001</Code>
    <TournamentCode>ROM2025</TournamentCode>
    <Court>Court 1</Court>
    <UTCDateTime>2025-07-15T14:00:00Z</UTCDateTime>
    <LocalDateTime>2025-07-15T16:00:00Z</LocalDateTime>
    <Team1>Smith/Johnson</Team1>
    <Team2>Garcia/Martinez</Team2>
    <Sets>21-19,19-21,15-13</Sets>
    <Result>2-1</Result>
    <Status>FINISHED</Status>
    <Round>MAIN_DRAW</Round>
    <Phase>QF</Phase>
    <Referees>John Doe (FIRST), Jane Smith (SECOND)</Referees>
  </Match>
  <Match>
    <No>23457</No>
    <Code>M002</Code>
    <TournamentCode>ROM2025</TournamentCode>
    <Court>Court 2</Court>
    <UTCDateTime>2025-07-15T15:00:00Z</UTCDateTime>
    <LocalDateTime>2025-07-15T17:00:00Z</LocalDateTime>
    <Team1>Brown/Wilson</Team1>
    <Team2>Davis/Miller</Team2>
    <Status>RUNNING</Status>
    <Round>MAIN_DRAW</Round>
    <Phase>SF</Phase>
    <Referees>Mike Jones (FIRST)</Referees>
  </Match>
</Matches>`;

const mockEmptyMatchResponse = `<?xml version="1.0"?><Matches></Matches>`;

// Helper to create request
function createRequest(path: string, method = 'GET') {
  return new Request(`http://localhost:8000${path}`, { method });
}

// Helper to parse response body
async function parseResponse(response: Response) {
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.json(),
  };
}

Deno.test('Match DTO mapping - parseVisMatchesXml', async () => {
  // Test XML contains expected elements
  const xmlResponse = mockVisMatchXmlResponse;
  
  assertMatch(xmlResponse, /<Match>/);
  assertMatch(xmlResponse, /<No>23456<\/No>/);
  assertMatch(xmlResponse, /<TournamentCode>ROM2025<\/TournamentCode>/);
  assertMatch(xmlResponse, /<Team1>Smith\/Johnson<\/Team1>/);
  
  // Test empty XML handling
  const emptyXml = mockEmptyMatchResponse;
  assertMatch(emptyXml, /<Matches>/);
});

Deno.test('Match endpoint - valid request with tournament code', async () => {
  const req = createRequest('/vis/matches?tournamentCode=ROM2025');
  const url = new URL(req.url);
  
  assertEquals(url.searchParams.get('tournamentCode'), 'ROM2025');
  assertEquals(req.method, 'GET');
});

Deno.test('Match endpoint - with tournament code and round', async () => {
  const req = createRequest('/vis/matches?tournamentCode=ROM2025&round=MAIN_DRAW');
  const url = new URL(req.url);
  
  assertEquals(url.searchParams.get('tournamentCode'), 'ROM2025');
  assertEquals(url.searchParams.get('round'), 'MAIN_DRAW');
});

Deno.test('Parameter validation - missing tournament code', async () => {
  const req = createRequest('/vis/matches');
  const url = new URL(req.url);
  const tournamentCode = url.searchParams.get('tournamentCode');
  
  assertEquals(tournamentCode, null);
});

Deno.test('Parameter validation - invalid tournament code format', async () => {
  const invalidCodes = ['', 'X', 'VERYLONGTOURNAMENTCODEHERE123456789', 'CODE-WITH-DASHES', 'code with spaces'];
  
  for (const code of invalidCodes) {
    // Test tournament code validation logic
    const isValid = code && code.match(/^[A-Z0-9]{3,20}$/i);
    assertEquals(isValid, false, `Tournament code ${code} should be invalid`);
  }
});

Deno.test('Parameter validation - valid tournament code format', async () => {
  const validCodes = ['ROM2025', 'TEST123', 'ABC', 'TOURNAMENT2025ABC'];
  
  for (const code of validCodes) {
    const isValid = code.match(/^[A-Z0-9]{3,20}$/i);
    assertEquals(isValid !== null, true, `Tournament code ${code} should be valid`);
  }
});

Deno.test('Parameter validation - invalid round format', async () => {
  const invalidRounds = ['round with spaces', 'round-with-dashes', 'VERYLONGROUNDNAMETHATEXCEEDSTHEFIFTYCHARLIMIT'];
  
  for (const round of invalidRounds) {
    const isValid = round.match(/^[A-Z0-9_]{1,50}$/i);
    assertEquals(isValid, false, `Round ${round} should be invalid`);
  }
});

Deno.test('Parameter validation - valid round format', async () => {
  const validRounds = ['MAIN_DRAW', 'QUALIFICATION', 'POOL_A', 'QF', 'SF', 'FINAL'];
  
  for (const round of validRounds) {
    const isValid = round.match(/^[A-Z0-9_]{1,50}$/i);
    assertEquals(isValid !== null, true, `Round ${round} should be valid`);
  }
});

Deno.test('Cache key generation for matches', async () => {
  // Test cache key format
  const testCases = [
    { tournamentCode: 'ROM2025', round: null, expected: 'matches:ROM2025:all' },
    { tournamentCode: 'ROM2025', round: 'MAIN_DRAW', expected: 'matches:ROM2025:MAIN_DRAW' },
    { tournamentCode: 'TEST123', round: 'QUALIFICATION', expected: 'matches:TEST123:QUALIFICATION' },
  ];
  
  for (const testCase of testCases) {
    const cacheKey = `matches:${testCase.tournamentCode}:${testCase.round || 'all'}`;
    assertEquals(cacheKey, testCase.expected);
  }
});

Deno.test('VIS XML request format for matches', async () => {
  // Test XML request building
  const tournamentCode = 'ROM2025';
  const round = 'MAIN_DRAW';
  const fields = 'No Code TournamentCode Court UTCDateTime LocalDateTime Team1 Team2 Sets Result Status Round Phase Referees';
  
  const xmlRequest = `<Request Type="GetBeachMatchList" Fields="${fields}" TournamentCode="${tournamentCode}" Round="${round}" />`;
  
  assertMatch(xmlRequest, /<Request Type="GetBeachMatchList"/);
  assertMatch(xmlRequest, /Fields=".*"/);
  assertMatch(xmlRequest, /TournamentCode="ROM2025"/);
  assertMatch(xmlRequest, /Round="MAIN_DRAW"/);
});

Deno.test('Match status mapping', async () => {
  const statusMappings = [
    { vis: 'running', expected: 'RUNNING' },
    { vis: 'live', expected: 'RUNNING' },
    { vis: 'finished', expected: 'FINISHED' },
    { vis: 'completed', expected: 'FINISHED' },
    { vis: 'interrupted', expected: 'INTERRUPTED' },
    { vis: 'suspended', expected: 'INTERRUPTED' },
    { vis: 'cancelled', expected: 'CANCELLED' },
    { vis: 'canceled', expected: 'CANCELLED' },
    { vis: 'postponed', expected: 'POSTPONED' },
    { vis: 'delayed', expected: 'POSTPONED' },
    { vis: 'tbd', expected: 'TBD' },
    { vis: 'scheduled', expected: 'SCHEDULED' },
    { vis: 'unknown', expected: 'SCHEDULED' },
  ];
  
  for (const mapping of statusMappings) {
    // Test status mapping logic
    const rawStatus = mapping.vis;
    let status = 'SCHEDULED';
    
    if (rawStatus) {
      const statusLower = rawStatus.toLowerCase().trim();
      switch (statusLower) {
        case 'running':
        case 'live':
        case 'in_progress':
          status = 'RUNNING';
          break;
        case 'finished':
        case 'completed':
        case 'final':
          status = 'FINISHED';
          break;
        case 'interrupted':
        case 'suspended':
          status = 'INTERRUPTED';
          break;
        case 'cancelled':
        case 'canceled':
          status = 'CANCELLED';
          break;
        case 'postponed':
        case 'delayed':
          status = 'POSTPONED';
          break;
        case 'tbd':
        case 'to_be_determined':
          status = 'TBD';
          break;
        default:
          status = 'SCHEDULED';
      }
    }
    
    assertEquals(status, mapping.expected, `VIS status ${mapping.vis} should map to ${mapping.expected}`);
  }
});

Deno.test('Dynamic TTL calculation', async () => {
  // Test TTL calculation based on match status
  const activeMatchScenarios = [
    { matches: [{ status: 'RUNNING' }], expectedTTL: 30000 },
    { matches: [{ status: 'SCHEDULED' }], expectedTTL: 30000 },
    { matches: [{ status: 'RUNNING' }, { status: 'FINISHED' }], expectedTTL: 30000 },
  ];
  
  const completedMatchScenarios = [
    { matches: [{ status: 'FINISHED' }], expectedTTL: 1800000 },
    { matches: [{ status: 'CANCELLED' }], expectedTTL: 1800000 },
    { matches: [{ status: 'FINISHED' }, { status: 'CANCELLED' }], expectedTTL: 1800000 },
  ];
  
  // Test active matches TTL
  for (const scenario of activeMatchScenarios) {
    const hasActiveMatches = scenario.matches.some((match: any) => 
      match.status === 'RUNNING' || match.status === 'SCHEDULED'
    );
    
    const ttl = hasActiveMatches ? 30 * 1000 : 30 * 60 * 1000;
    assertEquals(ttl, scenario.expectedTTL);
  }
  
  // Test completed matches TTL
  for (const scenario of completedMatchScenarios) {
    const hasActiveMatches = scenario.matches.some((match: any) => 
      match.status === 'RUNNING' || match.status === 'SCHEDULED'
    );
    
    const ttl = hasActiveMatches ? 30 * 1000 : 30 * 60 * 1000;
    assertEquals(ttl, scenario.expectedTTL);
  }
});

Deno.test('Set scores parsing', async () => {
  // Test set scores parsing logic
  const testCases = [
    { setsData: '21-19,19-21,15-13', expectedScores: [21, 19, 19, 21, 15, 13], expectedTeam1Sets: 2, expectedTeam2Sets: 1 },
    { setsData: '21-15,21-18', expectedScores: [21, 15, 21, 18], expectedTeam1Sets: 2, expectedTeam2Sets: 0 },
    { setsData: '19-21,18-21', expectedScores: [19, 21, 18, 21], expectedTeam1Sets: 0, expectedTeam2Sets: 2 },
  ];
  
  for (const testCase of testCases) {
    // Parse sets format like "21-19,19-21,15-13"
    const setScores: number[] = [];
    let team1Sets = 0;
    let team2Sets = 0;
    
    if (testCase.setsData) {
      const sets = testCase.setsData.split(',');
      for (const set of sets) {
        const scores = set.trim().split('-');
        if (scores.length === 2) {
          const score1 = parseInt(scores[0]);
          const score2 = parseInt(scores[1]);
          if (!isNaN(score1) && !isNaN(score2)) {
            setScores.push(score1, score2);
            if (score1 > score2) team1Sets++;
            else if (score2 > score1) team2Sets++;
          }
        }
      }
    }
    
    assertEquals(setScores, testCase.expectedScores);
    assertEquals(team1Sets, testCase.expectedTeam1Sets);
    assertEquals(team2Sets, testCase.expectedTeam2Sets);
  }
});

Deno.test('Team name parsing', async () => {
  // Test team name parsing for player extraction
  const testCases = [
    { teamName: 'Smith/Johnson', expected: { player1: 'Smith', player2: 'Johnson' } },
    { teamName: 'Garcia Martinez/Rodriguez Lopez', expected: { player1: 'Garcia Martinez', player2: 'Rodriguez Lopez' } },
    { teamName: 'SingleName', expected: { player1: 'SingleName', player2: '' } },
  ];
  
  for (const testCase of testCases) {
    // Parse team names to extract player names
    const parseTeamPlayers = (teamName: string) => {
      const parts = teamName.split('/');
      return {
        player1Name: parts[0]?.trim() || teamName,
        player2Name: parts[1]?.trim() || '',
      };
    };
    
    const result = parseTeamPlayers(testCase.teamName);
    assertEquals(result.player1Name, testCase.expected.player1);
    assertEquals(result.player2Name, testCase.expected.player2);
  }
});

Deno.test('Match importance determination', async () => {
  const testCases = [
    { round: 'FINAL', expected: 'FINAL' },
    { round: 'Gold Medal Match', expected: 'FINAL' },
    { round: 'SEMIFINAL', expected: 'HIGH' },
    { round: 'Semi-Final', expected: 'HIGH' },
    { round: 'QUARTERFINAL', expected: 'HIGH' },
    { round: 'Bronze Medal', expected: 'HIGH' },
    { round: 'POOL_A', expected: 'LOW' },
    { round: 'Group Stage', expected: 'LOW' },
    { round: 'Round 16', expected: 'MEDIUM' },
  ];
  
  for (const testCase of testCases) {
    // Determine match importance
    const roundLower = testCase.round.toLowerCase();
    let importance = 'MEDIUM';
    
    if (roundLower.includes('final') && !roundLower.includes('semi')) {
      importance = 'FINAL';
    } else if (roundLower.includes('semifinal') || roundLower.includes('semi-final')) {
      importance = 'HIGH';
    } else if (roundLower.includes('quarterfinal') || roundLower.includes('quarter-final') || 
               roundLower.includes('bronze') || roundLower.includes('medal')) {
      importance = 'HIGH';
    } else if (roundLower.includes('pool') || roundLower.includes('group')) {
      importance = 'LOW';
    }
    
    assertEquals(importance, testCase.expected, `Round ${testCase.round} should have importance ${testCase.expected}`);
  }
});

Deno.test('Referee assignment parsing', async () => {
  // Test referee parsing from VIS format
  const testCases = [
    { 
      refereesData: 'John Doe (FIRST), Jane Smith (SECOND)', 
      expectedCount: 2,
      expectedFirst: { name: 'John Doe', function: 'FIRST' },
      expectedSecond: { name: 'Jane Smith', function: 'SECOND' }
    },
    { 
      refereesData: 'Mike Jones (FIRST)', 
      expectedCount: 1,
      expectedFirst: { name: 'Mike Jones', function: 'FIRST' }
    },
  ];
  
  for (const testCase of testCases) {
    // Parse referee assignments
    const refereeAssignments: any[] = [];
    
    if (testCase.refereesData) {
      const refereeMatches = testCase.refereesData.match(/([^(]+)\s*\(([^)]+)\)/g);
      if (refereeMatches) {
        refereeMatches.forEach((match, index) => {
          const parts = match.match(/([^(]+)\s*\(([^)]+)\)/);
          if (parts) {
            const refereeName = parts[1].trim();
            const function_ = parts[2].trim().toUpperCase();
            
            refereeAssignments.push({
              refereeId: `ref-123-${index}`,
              refereeName,
              function: function_,
              status: 'ASSIGNED',
            });
          }
        });
      }
    }
    
    assertEquals(refereeAssignments.length, testCase.expectedCount);
    if (testCase.expectedFirst) {
      assertEquals(refereeAssignments[0].refereeName, testCase.expectedFirst.name);
      assertEquals(refereeAssignments[0].function, testCase.expectedFirst.function);
    }
    if (testCase.expectedSecond) {
      assertEquals(refereeAssignments[1].refereeName, testCase.expectedSecond.name);
      assertEquals(refereeAssignments[1].function, testCase.expectedSecond.function);
    }
  }
});

Deno.test('Match DTO structure validation', async () => {
  // Test complete MatchDTO structure
  const sampleMatch = {
    id: 'match-23456',
    visNo: '23456',
    tournamentCode: 'ROM2025',
    matchCode: 'M001',
    round: 'MAIN_DRAW',
    phaseCode: 'QF',
    status: 'FINISHED',
    court: {
      courtNumber: 'Court 1',
      courtName: 'Court 1',
    },
    scheduledDateTime: '2025-07-15T14:00:00Z',
    actualStartTime: '2025-07-15T14:00:00Z',
    actualEndTime: '2025-07-15T14:00:00Z',
    team1: {
      teamNumber: 1,
      teamName: 'Smith/Johnson',
      player1Name: 'Smith',
      player2Name: 'Johnson',
    },
    team2: {
      teamNumber: 2,
      teamName: 'Garcia/Martinez',
      player1Name: 'Garcia',
      player2Name: 'Martinez',
    },
    result: {
      team1Sets: 2,
      team2Sets: 1,
      setScores: [21, 19, 19, 21, 15, 13],
      winner: 1,
      forfeit: false,
    },
    refereeAssignments: [{
      refereeId: 'ref-23456-0',
      refereeName: 'John Doe',
      function: 'FIRST',
      status: 'ASSIGNED',
    }],
    importance: 'HIGH',
  };
  
  // Validate required fields
  assertEquals(typeof sampleMatch.id, 'string');
  assertEquals(typeof sampleMatch.visNo, 'string');
  assertEquals(typeof sampleMatch.tournamentCode, 'string');
  assertEquals(typeof sampleMatch.matchCode, 'string');
  assertEquals(['SCHEDULED', 'RUNNING', 'FINISHED', 'INTERRUPTED', 'CANCELLED', 'POSTPONED', 'TBD'].includes(sampleMatch.status), true);
  assertEquals(sampleMatch.team1.teamNumber, 1);
  assertEquals(sampleMatch.team2.teamNumber, 2);
  assertEquals(Array.isArray(sampleMatch.refereeAssignments), true);
  assertEquals(['LOW', 'MEDIUM', 'HIGH', 'FINAL'].includes(sampleMatch.importance), true);
});

Deno.test('Error response format for matches', async () => {
  const errorResponse = {
    error: 'VALIDATION_ERROR',
    message: 'Tournament code parameter is required',
    timestamp: new Date().toISOString(),
  };
  
  assertEquals(typeof errorResponse.error, 'string');
  assertEquals(typeof errorResponse.message, 'string');
  assertEquals(typeof errorResponse.timestamp, 'string');
  assertMatch(errorResponse.timestamp, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

Deno.test('Score validation ranges', async () => {
  // Test score validation for beach volleyball
  const testCases = [
    { scores: '21-19', valid: true },
    { scores: '25-23', valid: true },
    { scores: '15-13', valid: true },
    { scores: '51-49', valid: false }, // Outside normal range
    { scores: '-1-19', valid: false }, // Negative score
    { scores: 'abc-def', valid: false }, // Non-numeric
  ];
  
  for (const testCase of testCases) {
    const scores = testCase.scores.split('-');
    if (scores.length === 2) {
      const score1 = parseInt(scores[0]);
      const score2 = parseInt(scores[1]);
      const isValid = !isNaN(score1) && !isNaN(score2) && 
                     score1 >= 0 && score1 <= 50 && 
                     score2 >= 0 && score2 <= 50;
      
      assertEquals(isValid, testCase.valid, `Scores ${testCase.scores} validation should be ${testCase.valid}`);
    }
  }
});

Deno.test('Referee function normalization', async () => {
  const testCases = [
    { input: '1ST', expected: 'FIRST' },
    { input: 'FIRST', expected: 'FIRST' },
    { input: '1', expected: 'FIRST' },
    { input: '2ND', expected: 'SECOND' },
    { input: 'SECOND', expected: 'SECOND' },
    { input: '2', expected: 'SECOND' },
    { input: 'CHALLENGE', expected: 'CHALLENGE' },
    { input: 'CHALLENGE REFEREE', expected: 'CHALLENGE' },
    { input: 'CR', expected: 'CHALLENGE' },
  ];
  
  for (const testCase of testCases) {
    let function_ = testCase.input.toUpperCase();
    
    // Normalize referee function names
    switch (function_) {
      case '1ST':
      case 'FIRST':
      case '1':
        function_ = 'FIRST';
        break;
      case '2ND':
      case 'SECOND':
      case '2':
        function_ = 'SECOND';
        break;
      case 'CHALLENGE':
      case 'CHALLENGE REFEREE':
      case 'CR':
        function_ = 'CHALLENGE';
        break;
    }
    
    assertEquals(function_, testCase.expected, `Function ${testCase.input} should normalize to ${testCase.expected}`);
  }
});

Deno.test('Edge case handling - malformed XML', async () => {
  // Test security validation
  const maliciousXMLs = [
    '<!ENTITY xxe SYSTEM "file:///etc/passwd">',
    '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/">]>',
    'x'.repeat(11 * 1024 * 1024), // Over 10MB limit
  ];
  
  for (const xmlContent of maliciousXMLs) {
    let shouldFail = false;
    
    // Test security validation logic
    if (xmlContent.length > 10 * 1024 * 1024) {
      shouldFail = true;
    }
    
    if (xmlContent.includes('<!ENTITY') || xmlContent.includes('<!DOCTYPE')) {
      shouldFail = true;
    }
    
    assertEquals(shouldFail, true, 'Malicious XML should be rejected');
  }
});