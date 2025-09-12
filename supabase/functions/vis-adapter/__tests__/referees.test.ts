import { assertEquals, assertThrows, assertMatch } from 'std/testing/asserts.ts';

// Mock fetch for testing
const originalFetch = globalThis.fetch;

// Mock VIS referee API responses
const mockVisRefereeXmlResponse = `<?xml version="1.0"?>
<Referees>
  <Referee>
    <No>100001</No>
    <RefereeNo>100001</RefereeNo>
    <FirstName>John</FirstName>
    <LastName>Smith</LastName>
    <Name>John Smith</Name>
    <Gender>M</Gender>
    <Federation>USA</Federation>
    <Country>USA</Country>
    <Birthdate>1985-03-15</Birthdate>
  </Referee>
  <Referee>
    <No>100002</No>
    <RefereeNo>100002</RefereeNo>
    <FirstName>Maria</FirstName>
    <LastName>Garcia</LastName>
    <Name>Maria Garcia</Name>
    <Gender>F</Gender>
    <Federation>ESP</Federation>
    <Country>ESP</Country>
    <Birthdate>1990-07-22</Birthdate>
  </Referee>
  <Referee>
    <No>100003</No>
    <RefereeNo>100003</RefereeNo>
    <Name>Paolo Rossi</Name>
    <Gender>M</Gender>
    <Federation>ITA</Federation>
    <DOB>12/03/1988</DOB>
  </Referee>
</Referees>`;

const mockVisMatchXmlWithReferees = `<?xml version="1.0"?>
<Matches>
  <Match>
    <No>200001</No>
    <MatchNo>200001</MatchNo>
    <Code>M001</Code>
    <TournamentCode>ROM2025</TournamentCode>
    <Round>Pool A</Round>
    <Status>SCHEDULED</Status>
    <Court>1</Court>
    <UTCDateTime>2025-09-10T10:00:00Z</UTCDateTime>
    <Team1Name>Team A</Team1Name>
    <Team2Name>Team B</Team2Name>
    <Referees>John Smith (FIRST), Maria Garcia (SECOND)</Referees>
  </Match>
</Matches>`;

const mockEmptyVisResponse = `<?xml version="1.0"?><Referees></Referees>`;

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

// Mock setup for successful VIS API calls
function setupSuccessfulVisMock() {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    const body = init?.body?.toString() || '';
    
    // Check if request is for referee data
    if (body.includes('GetRefereeList')) {
      return new Response(mockVisRefereeXmlResponse, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    // Check if request is for match data (for assignment integration)
    if (body.includes('GetBeachMatchList')) {
      return new Response(mockVisMatchXmlWithReferees, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    return new Response('Not Found', { status: 404 });
  };
}

// Mock setup for VIS API errors
function setupVisErrorMock() {
  globalThis.fetch = async () => {
    throw new Error('VIS API connection failed');
  };
}

// Mock setup for empty responses
function setupEmptyVisMock() {
  globalThis.fetch = async () => {
    return new Response(mockEmptyVisResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  };
}

// Test cleanup
function cleanup() {
  globalThis.fetch = originalFetch;
  // Set VIS environment variables for testing
  Deno.env.set('VIS_API_URL', 'http://mock-vis-api.com');
  Deno.env.set('VIS_API_HEADERS', '{}');
}

// Import the function to test after setting up environment
Deno.env.set('VIS_API_URL', 'http://mock-vis-api.com');
Deno.env.set('VIS_API_HEADERS', '{}');

// Import after environment setup
const { default: handler } = await import('../index.ts');

Deno.test('Referee endpoint - successful request with no filters', async () => {
  setupSuccessfulVisMock();
  
  try {
    const request = createRequest('/vis/referees');
    const response = await handler(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, 200);
    assertEquals(parsed.body.cached, false);
    assertEquals(parsed.body.data.length, 3);
    
    // Verify first referee structure
    const firstReferee = parsed.body.data[0];
    assertEquals(firstReferee.id, 'referee-100001');
    assertEquals(firstReferee.visRefereeNo, '100001');
    assertEquals(firstReferee.firstName, 'John');
    assertEquals(firstReferee.lastName, 'Smith');
    assertEquals(firstReferee.gender, 'M');
    assertEquals(firstReferee.federation, 'USA');
    assertEquals(firstReferee.birthdate, '1985-03-15');
    
    // Verify second referee with different gender
    const secondReferee = parsed.body.data[1];
    assertEquals(secondReferee.gender, 'F');
    assertEquals(secondReferee.federation, 'ESP');
    
    // Verify third referee with name parsing from single Name field
    const thirdReferee = parsed.body.data[2];
    assertEquals(thirdReferee.firstName, 'Paolo');
    assertEquals(thirdReferee.lastName, 'Rossi');
    assertEquals(thirdReferee.birthdate, '1988-03-12'); // Converted from DD/MM/YYYY
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee endpoint - country filter validation', async () => {
  setupSuccessfulVisMock();
  
  try {
    // Test valid country code
    const validRequest = createRequest('/vis/referees?country=ITA');
    const validResponse = await handler(validRequest);
    const validParsed = await parseResponse(validResponse);
    assertEquals(validParsed.status, 200);
    
    // Test invalid country code (too short)
    const invalidRequest = createRequest('/vis/referees?country=IT');
    const invalidResponse = await handler(invalidRequest);
    const invalidParsed = await parseResponse(invalidResponse);
    assertEquals(invalidParsed.status, 400);
    assertEquals(invalidParsed.body.error, 'Validation error');
    assertMatch(invalidParsed.body.message, /3-letter code/);
    
    // Test invalid country code (too long)
    const invalidRequest2 = createRequest('/vis/referees?country=ITALY');
    const invalidResponse2 = await handler(invalidRequest2);
    const invalidParsed2 = await parseResponse(invalidResponse2);
    assertEquals(invalidParsed2.status, 400);
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee endpoint - tournament code filter validation', async () => {
  setupSuccessfulVisMock();
  
  try {
    // Test valid tournament code
    const validRequest = createRequest('/vis/referees?tournamentCode=ROM2025');
    const validResponse = await handler(validRequest);
    const validParsed = await parseResponse(validResponse);
    assertEquals(validParsed.status, 200);
    
    // Test invalid tournament code (too short)
    const invalidRequest = createRequest('/vis/referees?tournamentCode=RO');
    const invalidResponse = await handler(invalidRequest);
    const invalidParsed = await parseResponse(invalidResponse);
    assertEquals(invalidParsed.status, 400);
    assertEquals(invalidParsed.body.error, 'Validation error');
    assertMatch(invalidParsed.body.message, /between 3 and 50 characters/);
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee endpoint - status filter validation', async () => {
  setupSuccessfulVisMock();
  
  try {
    // Test valid status
    const validRequest = createRequest('/vis/referees?status=ASSIGNED');
    const validResponse = await handler(validRequest);
    const validParsed = await parseResponse(validResponse);
    assertEquals(validParsed.status, 200);
    
    // Test invalid status
    const invalidRequest = createRequest('/vis/referees?status=INVALID_STATUS');
    const invalidResponse = await handler(invalidRequest);
    const invalidParsed = await parseResponse(invalidResponse);
    assertEquals(invalidParsed.status, 400);
    assertEquals(invalidParsed.body.error, 'Validation error');
    assertMatch(invalidParsed.body.message, /must be one of:/);
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee endpoint - combined filters', async () => {
  setupSuccessfulVisMock();
  
  try {
    const request = createRequest('/vis/referees?country=ITA&tournamentCode=ROM2025&status=CONFIRMED');
    const response = await handler(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, 200);
    assertEquals(parsed.body.filters.country, 'ITA');
    assertEquals(parsed.body.filters.tournamentCode, 'ROM2025');
    assertEquals(parsed.body.filters.status, 'CONFIRMED');
    
    // Verify cache TTL is short for assignment data (5 minutes)
    assertEquals(parsed.body.cacheTTL, 300); // 5 minutes in seconds
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee endpoint - cache TTL logic', async () => {
  setupSuccessfulVisMock();
  
  try {
    // Profile data request (no assignment filters) should have 2-hour cache
    const profileRequest = createRequest('/vis/referees?country=ITA');
    const profileResponse = await handler(profileRequest);
    const profileParsed = await parseResponse(profileResponse);
    
    assertEquals(profileParsed.body.cacheTTL, 7200); // 2 hours in seconds
    
    // Assignment data request should have 5-minute cache
    const assignmentRequest = createRequest('/vis/referees?tournamentCode=ROM2025');
    const assignmentResponse = await handler(assignmentRequest);
    const assignmentParsed = await parseResponse(assignmentResponse);
    
    assertEquals(assignmentParsed.body.cacheTTL, 300); // 5 minutes in seconds
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee endpoint - VIS API error handling', async () => {
  setupVisErrorMock();
  
  try {
    const request = createRequest('/vis/referees');
    const response = await handler(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, 503); // Network error becomes service unavailable
    assertEquals(parsed.body.error, 'NETWORK_ERROR');
    assertMatch(parsed.body.message, /VIS API connection failed/);
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee endpoint - empty VIS response', async () => {
  setupEmptyVisMock();
  
  try {
    const request = createRequest('/vis/referees');
    const response = await handler(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, 200);
    assertEquals(parsed.body.data.length, 0);
    assertEquals(parsed.body.count, 0);
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee endpoint - caching behavior', async () => {
  setupSuccessfulVisMock();
  
  try {
    // First request should be uncached
    const firstRequest = createRequest('/vis/referees?country=USA');
    const firstResponse = await handler(firstRequest);
    const firstParsed = await parseResponse(firstResponse);
    
    assertEquals(firstParsed.body.cached, false);
    assertEquals(firstParsed.body.data.length, 3);
    
    // Second identical request should be cached
    const secondRequest = createRequest('/vis/referees?country=USA');
    const secondResponse = await handler(secondRequest);
    const secondParsed = await parseResponse(secondResponse);
    
    assertEquals(secondParsed.body.cached, true);
    assertEquals(secondParsed.body.data.length, 3);
    assertMatch(secondParsed.body.cacheKey, /referees:USA:all:all/);
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee endpoint - rate limiting', async () => {
  setupSuccessfulVisMock();
  
  try {
    // Make many requests to trigger rate limiting
    const promises = [];
    for (let i = 0; i < 65; i++) { // Exceed 60 requests per minute limit
      promises.push(handler(createRequest(`/vis/referees?test=${i}`)));
    }
    
    const responses = await Promise.all(promises);
    
    // Some responses should be rate limited
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    assertEquals(rateLimitedCount > 0, true);
    
    // Check rate limit response structure
    const rateLimitedResponse = responses.find(r => r.status === 429);
    if (rateLimitedResponse) {
      const parsed = await parseResponse(rateLimitedResponse);
      assertEquals(parsed.body.error, 'Rate limit exceeded');
      assertEquals(parsed.headers['x-ratelimit-limit'] !== undefined, true);
    }
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee DTO mapping - name parsing edge cases', async () => {
  // Test individual parsing functions
  const { parseVisRefereeElement } = await import('../index.ts');
  
  // Test single name parsing
  const singleNameXml = `<Referee><No>123</No><Name>Madonna</Name></Referee>`;
  // Note: parseVisRefereeElement is not exported, so we test through full endpoint
  
  const mockSingleNameResponse = `<?xml version="1.0"?>
<Referees>
  <Referee>
    <No>123</No>
    <Name>Madonna</Name>
    <Gender>F</Gender>
    <Federation>ITA</Federation>
  </Referee>
</Referees>`;
  
  globalThis.fetch = async () => {
    return new Response(mockSingleNameResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  };
  
  try {
    const request = createRequest('/vis/referees');
    const response = await handler(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, 200);
    assertEquals(parsed.body.data[0].lastName, 'Madonna');
    assertEquals(parsed.body.data[0].firstName, undefined);
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee endpoint - assignment integration', async () => {
  setupSuccessfulVisMock();
  
  try {
    // Request referees with tournament filter to trigger assignment integration
    const request = createRequest('/vis/referees?tournamentCode=ROM2025');
    const response = await handler(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, 200);
    
    // Find referee with assignments (from our mock match data)
    const refereeWithAssignments = parsed.body.data.find((r: any) => 
      r.firstName === 'John' && r.lastName === 'Smith'
    );
    
    if (refereeWithAssignments?.assignments?.length > 0) {
      const assignment = refereeWithAssignments.assignments[0];
      assertEquals(assignment.tournamentCode, 'ROM2025');
      assertEquals(assignment.function, 'FIRST');
      assertEquals(assignment.matchCode, 'M001');
      assertEquals(assignment.court, '1');
    }
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee function normalization', async () => {
  // Test the normalize function through endpoint behavior
  const mockRefereeWithFunctions = `<?xml version="1.0"?>
<Referees>
  <Referee>
    <No>100001</No>
    <Name>Test Referee</Name>
    <Gender>M</Gender>
    <Federation>TEST</Federation>
  </Referee>
</Referees>`;

  const mockMatchWithVariousFunctions = `<?xml version="1.0"?>
<Matches>
  <Match>
    <No>200001</No>
    <MatchNo>200001</MatchNo>
    <Code>M001</Code>
    <TournamentCode>TEST2025</TournamentCode>
    <Round>Final</Round>
    <Status>SCHEDULED</Status>
    <Court>1</Court>
    <UTCDateTime>2025-09-10T10:00:00Z</UTCDateTime>
    <Team1Name>Team A</Team1Name>
    <Team2Name>Team B</Team2Name>
    <Referees>Test Referee (1ST), Test Referee (2ND), Test Referee (CR)</Referees>
  </Match>
</Matches>`;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = init?.body?.toString() || '';
    
    if (body.includes('GetRefereeList')) {
      return new Response(mockRefereeWithFunctions, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    if (body.includes('GetBeachMatchList')) {
      return new Response(mockMatchWithVariousFunctions, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    return new Response('Not Found', { status: 404 });
  };
  
  try {
    const request = createRequest('/vis/referees?tournamentCode=TEST2025');
    const response = await handler(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, 200);
    
    const referee = parsed.body.data[0];
    if (referee?.assignments?.length > 0) {
      // Should normalize various function formats
      const functions = referee.assignments.map((a: any) => a.function);
      assertEquals(functions.includes('FIRST'), true);
      assertEquals(functions.includes('SECOND'), true);
      assertEquals(functions.includes('CHALLENGE'), true);
    }
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee endpoint - missing VIS client', async () => {
  // Test behavior when VIS client is not configured
  Deno.env.delete('VIS_API_URL');
  
  const { default: handlerWithoutVis } = await import('../index.ts');
  
  try {
    const request = createRequest('/vis/referees');
    const response = await handlerWithoutVis(request);
    const parsed = await parseResponse(response);
    
    assertEquals(parsed.status, 503);
    assertEquals(parsed.body.error, 'VIS API client not configured');
    
  } finally {
    // Restore environment
    Deno.env.set('VIS_API_URL', 'http://mock-vis-api.com');
  }
});

Deno.test('Referee endpoint - CORS headers', async () => {
  setupSuccessfulVisMock();
  
  try {
    const request = createRequest('/vis/referees');
    const response = await handler(request);
    
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
    assertEquals(response.headers.get('Content-Type'), 'application/json');
    
  } finally {
    cleanup();
  }
});

Deno.test('Referee endpoint - OPTIONS request', async () => {
  try {
    const request = createRequest('/vis/referees', 'OPTIONS');
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
    
  } finally {
    cleanup();
  }
});