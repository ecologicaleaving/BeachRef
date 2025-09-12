import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { AnalyticsMiddleware } from '../analytics-middleware.ts';

// Mock Supabase client for testing
const mockSupabaseClient = {
  from: (table: string) => ({
    insert: (data: any) => Promise.resolve({ error: null })
  })
};

// Mock createClient
const mockCreateClient = () => mockSupabaseClient;

// Mock Deno.env for test environment
const mockEnv = new Map([
  ['SUPABASE_URL', 'https://test.supabase.co'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'test-service-key'],
  ['ANALYTICS_SALT', 'test-salt']
]);

// Override Deno.env.get for testing
const originalEnvGet = Deno.env.get;
Deno.env.get = (key: string) => mockEnv.get(key);

// Mock crypto.subtle for testing
const mockCrypto = {
  subtle: {
    digest: (algorithm: string, data: Uint8Array) => {
      // Simple mock hash - returns consistent results for testing
      return Promise.resolve(new ArrayBuffer(32));
    }
  }
};
globalThis.crypto = mockCrypto as any;

Deno.test('AnalyticsMiddleware - initialization', () => {
  const middleware = new AnalyticsMiddleware();
  assertExists(middleware);
  
  const config = middleware.getConfig();
  assertEquals(config.enablePerformanceMonitoring, true);
  assertEquals(config.enableRequestLogging, true);
  assertEquals(config.enableErrorTracking, true);
  assertEquals(config.enableUserContextTracking, false);
});

Deno.test('AnalyticsMiddleware - custom configuration', () => {
  const customConfig = {
    enablePerformanceMonitoring: false,
    enableRequestLogging: false,
    enableUserContextTracking: true
  };
  
  const middleware = new AnalyticsMiddleware(customConfig);
  const config = middleware.getConfig();
  
  assertEquals(config.enablePerformanceMonitoring, false);
  assertEquals(config.enableRequestLogging, false);
  assertEquals(config.enableUserContextTracking, true);
});

Deno.test('AnalyticsMiddleware - trackTournamentRequest', async () => {
  const middleware = new AnalyticsMiddleware();
  
  const mockRequest = new Request('https://example.com/vis/tournaments?season=2024&gender=M&country=USA', {
    method: 'GET',
    headers: {
      'user-agent': 'TestAgent/1.0',
      'x-client-info': 'test-client'
    }
  });
  
  const mockParams = new URLSearchParams('season=2024&gender=M&country=USA');
  const mockResponseData = [
    { tournament_code: 'TEST2024', name: 'Test Tournament' }
  ];
  const mockPerformanceMetrics = { duration: 150, success: true };
  
  // Mock the logEvent method to test if it's called correctly
  let loggedEvent: any = null;
  const originalLogEvent = (middleware as any).logEvent;
  (middleware as any).logEvent = async (event: any) => {
    loggedEvent = event;
  };
  
  await middleware.trackTournamentRequest(
    mockRequest,
    mockParams,
    mockResponseData,
    mockPerformanceMetrics
  );
  
  assertExists(loggedEvent);
  assertEquals(loggedEvent.event_type, 'tournament_data_request');
  assertEquals(loggedEvent.event_data.endpoint, '/vis/tournaments');
  assertEquals(loggedEvent.event_data.method, 'GET');
  assertEquals(loggedEvent.event_data.parameters.season, '2024');
  assertEquals(loggedEvent.event_data.parameters.gender, 'M');
  assertEquals(loggedEvent.event_data.parameters.country, 'USA');
  assertEquals(loggedEvent.event_data.response_summary.tournament_count, 1);
  assertEquals(loggedEvent.event_data.performance, mockPerformanceMetrics);
  
  // Restore original method
  (middleware as any).logEvent = originalLogEvent;
});

Deno.test('AnalyticsMiddleware - trackMatchRequest', async () => {
  const middleware = new AnalyticsMiddleware();
  
  const mockRequest = new Request('https://example.com/vis/matches?tournamentCode=TEST2024&round=1&eventNo=123', {
    method: 'GET',
    headers: {
      'user-agent': 'TestAgent/1.0'
    }
  });
  
  const mockParams = new URLSearchParams('tournamentCode=TEST2024&round=1&eventNo=123');
  const mockResponseData = [
    { 
      match_id: '1', 
      refereeAssignments: [{ referee_id: '123', role: 'FIRST' }] 
    }
  ];
  
  let loggedEvent: any = null;
  (middleware as any).logEvent = async (event: any) => {
    loggedEvent = event;
  };
  
  await middleware.trackMatchRequest(mockRequest, mockParams, mockResponseData);
  
  assertExists(loggedEvent);
  assertEquals(loggedEvent.event_type, 'match_data_request');
  assertEquals(loggedEvent.event_data.endpoint, '/vis/matches');
  assertEquals(loggedEvent.event_data.parameters.tournamentCode, 'TEST2024');
  assertEquals(loggedEvent.event_data.response_summary.match_count, 1);
  assertEquals(loggedEvent.event_data.response_summary.has_referee_assignments, true);
});

Deno.test('AnalyticsMiddleware - trackRefereeRequest', async () => {
  const middleware = new AnalyticsMiddleware();
  
  const mockRequest = new Request('https://example.com/vis/referees?tournamentCode=TEST2024&country=USA', {
    method: 'GET'
  });
  
  const mockParams = new URLSearchParams('tournamentCode=TEST2024&country=USA');
  const mockResponseData = [
    { 
      referee_id: '123', 
      name: 'Test Referee',
      assignments: [{ match_id: '1' }]
    }
  ];
  
  let loggedEvent: any = null;
  (middleware as any).logEvent = async (event: any) => {
    loggedEvent = event;
  };
  
  await middleware.trackRefereeRequest(mockRequest, mockParams, mockResponseData);
  
  assertExists(loggedEvent);
  assertEquals(loggedEvent.event_type, 'referee_data_request');
  assertEquals(loggedEvent.event_data.endpoint, '/vis/referees');
  assertEquals(loggedEvent.event_data.parameters.tournamentCode, 'TEST2024');
  assertEquals(loggedEvent.event_data.response_summary.referee_count, 1);
  assertEquals(loggedEvent.event_data.response_summary.has_assignments, true);
});

Deno.test('AnalyticsMiddleware - trackError', async () => {
  const middleware = new AnalyticsMiddleware();
  
  const mockRequest = new Request('https://example.com/vis/tournaments', {
    method: 'GET',
    headers: {
      'user-agent': 'TestAgent/1.0'
    }
  });
  
  const mockError = new Error('Test error message');
  const mockContext = {
    endpoint: '/vis/tournaments',
    parameters: { season: '2024' }
  };
  
  let loggedEvent: any = null;
  (middleware as any).logEvent = async (event: any) => {
    loggedEvent = event;
  };
  
  await middleware.trackError(mockRequest, mockError, mockContext);
  
  assertExists(loggedEvent);
  assertEquals(loggedEvent.event_type, 'api_error');
  assertEquals(loggedEvent.event_data.endpoint, '/vis/tournaments');
  assertEquals(loggedEvent.event_data.error_message, 'Test error message');
  assertEquals(loggedEvent.event_data.error_type, 'Error');
  assertEquals(loggedEvent.event_data.parameters, mockContext.parameters);
});

Deno.test('AnalyticsMiddleware - trackPerformanceMetric', async () => {
  const middleware = new AnalyticsMiddleware();
  
  let loggedEvent: any = null;
  (middleware as any).logEvent = async (event: any) => {
    loggedEvent = event;
  };
  
  await middleware.trackPerformanceMetric(
    '/vis/tournaments',
    'fetch_tournaments',
    250,
    true,
    { record_count: 15 }
  );
  
  assertExists(loggedEvent);
  assertEquals(loggedEvent.event_type, 'performance_metric');
  assertEquals(loggedEvent.event_data.endpoint, '/vis/tournaments');
  assertEquals(loggedEvent.event_data.operation, 'fetch_tournaments');
  assertEquals(loggedEvent.event_data.duration_ms, 250);
  assertEquals(loggedEvent.event_data.success, true);
  assertEquals(loggedEvent.event_data.record_count, 15);
});

Deno.test('AnalyticsMiddleware - createPerformanceTracker', () => {
  const middleware = new AnalyticsMiddleware();
  const tracker = middleware.createPerformanceTracker();
  
  assertExists(tracker);
  assertExists(tracker.finish);
  
  const result = tracker.finish(true);
  assertExists(result.duration);
  assertEquals(result.success, true);
  assertEquals(typeof result.duration, 'number');
});

Deno.test('AnalyticsMiddleware - wrapHandler success', async () => {
  const middleware = new AnalyticsMiddleware();
  
  const mockHandler = async (request: Request, params: URLSearchParams) => {
    return { data: 'test response' };
  };
  
  let trackedEvents: any[] = [];
  (middleware as any).trackTournamentRequest = async (...args: any[]) => {
    trackedEvents.push({ type: 'tournament', args });
  };
  
  const wrappedHandler = middleware.wrapHandler(mockHandler, 'tournament');
  
  const mockRequest = new Request('https://example.com/vis/tournaments');
  const mockParams = new URLSearchParams();
  
  const result = await wrappedHandler(mockRequest, mockParams);
  
  assertEquals(result, { data: 'test response' });
  assertEquals(trackedEvents.length, 1);
  assertEquals(trackedEvents[0].type, 'tournament');
});

Deno.test('AnalyticsMiddleware - wrapHandler error', async () => {
  const middleware = new AnalyticsMiddleware();
  
  const mockError = new Error('Handler error');
  const mockHandler = async (request: Request, params: URLSearchParams) => {
    throw mockError;
  };
  
  let trackedError: any = null;
  (middleware as any).trackError = async (request: Request, error: Error, context: any) => {
    trackedError = { request, error, context };
  };
  
  const wrappedHandler = middleware.wrapHandler(mockHandler, 'tournament');
  
  const mockRequest = new Request('https://example.com/vis/tournaments?season=2024');
  const mockParams = new URLSearchParams('season=2024');
  
  let thrownError: Error | null = null;
  try {
    await wrappedHandler(mockRequest, mockParams);
  } catch (error) {
    thrownError = error as Error;
  }
  
  assertEquals(thrownError, mockError);
  assertExists(trackedError);
  assertEquals(trackedError.error, mockError);
  assertEquals(trackedError.context.endpoint, '/vis/tournaments');
  assertEquals(trackedError.context.parameters.season, '2024');
});

Deno.test('AnalyticsMiddleware - user context tracking disabled by default', async () => {
  const middleware = new AnalyticsMiddleware();
  
  const mockRequest = new Request('https://example.com/vis/tournaments', {
    headers: {
      'x-forwarded-for': '192.168.1.1',
      'x-session-id': 'test-session'
    }
  });
  
  let loggedEvent: any = null;
  (middleware as any).logEvent = async (event: any) => {
    loggedEvent = event;
  };
  
  await middleware.trackTournamentRequest(
    mockRequest,
    new URLSearchParams(),
    [],
    { duration: 100, success: true }
  );
  
  assertExists(loggedEvent);
  assertEquals(loggedEvent.user_context, undefined);
});

Deno.test('AnalyticsMiddleware - user context tracking enabled', async () => {
  const middleware = new AnalyticsMiddleware({
    enableUserContextTracking: true
  });
  
  const mockRequest = new Request('https://example.com/vis/tournaments', {
    headers: {
      'x-forwarded-for': '192.168.1.1',
      'x-session-id': 'test-session'
    }
  });
  
  let loggedEvent: any = null;
  (middleware as any).logEvent = async (event: any) => {
    loggedEvent = event;
  };
  
  await middleware.trackTournamentRequest(
    mockRequest,
    new URLSearchParams(),
    [],
    { duration: 100, success: true }
  );
  
  assertExists(loggedEvent);
  assertExists(loggedEvent.user_context);
  assertExists(loggedEvent.user_context.ip_hash);
  assertEquals(loggedEvent.user_context.session_id, 'test-session');
});

Deno.test('AnalyticsMiddleware - IP hashing privacy compliance', async () => {
  const middleware = new AnalyticsMiddleware();
  
  const hash1 = await (middleware as any).hashIP('192.168.1.1');
  const hash2 = await (middleware as any).hashIP('192.168.1.1');
  const hash3 = await (middleware as any).hashIP('192.168.1.2');
  
  // Same IP should produce same hash
  assertEquals(hash1, hash2);
  // Different IPs should produce different hashes
  assertEquals(hash1 !== hash3, true);
  // Hash should be truncated to 12 characters for privacy
  assertEquals(hash1.length, 12);
  // Unknown IP should return 'unknown'
  assertEquals(await (middleware as any).hashIP(''), 'unknown');
});

Deno.test('AnalyticsMiddleware - graceful degradation on logging failure', async () => {
  // Test that analytics failures don't impact main functionality
  const middleware = new AnalyticsMiddleware();
  
  // Mock logEvent to throw error
  (middleware as any).logEvent = async () => {
    throw new Error('Database unavailable');
  };
  
  // Mock console.warn to capture warning
  let warningMessage = '';
  const originalWarn = console.warn;
  console.warn = (message: string, error?: any) => {
    warningMessage = message;
  };
  
  // This should not throw - it should handle the error gracefully
  await middleware.trackTournamentRequest(
    new Request('https://example.com/vis/tournaments'),
    new URLSearchParams(),
    []
  );
  
  assertEquals(warningMessage, 'Analytics event logging failed:');
  
  // Restore console.warn
  console.warn = originalWarn;
});

Deno.test('AnalyticsMiddleware - configuration updates', () => {
  const middleware = new AnalyticsMiddleware();
  
  const originalConfig = middleware.getConfig();
  assertEquals(originalConfig.enablePerformanceMonitoring, true);
  
  middleware.updateConfig({ enablePerformanceMonitoring: false });
  
  const updatedConfig = middleware.getConfig();
  assertEquals(updatedConfig.enablePerformanceMonitoring, false);
});

// Restore original Deno.env.get after tests
Deno.env.get = originalEnvGet;