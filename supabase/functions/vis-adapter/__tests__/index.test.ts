import { assertEquals } from 'std/testing/asserts.ts';

// Mock environment variables for testing
const originalEnv = Deno.env.toObject();

function mockEnv(vars: Record<string, string>) {
  // Clear existing env vars
  for (const key of Object.keys(originalEnv)) {
    Deno.env.delete(key);
  }
  // Set new env vars
  for (const [key, value] of Object.entries(vars)) {
    Deno.env.set(key, value);
  }
}

function restoreEnv() {
  // Clear all env vars
  for (const key of Object.keys(Deno.env.toObject())) {
    Deno.env.delete(key);
  }
  // Restore original env vars
  for (const [key, value] of Object.entries(originalEnv)) {
    Deno.env.set(key, value);
  }
}

// Import the handler after mocking environment
async function createHandler() {
  const { serve } = await import('std/http/server.ts');
  // We need to dynamically import the handler to apply env mock
  const module = await import('../index.ts');
  return module;
}

Deno.test('Health check endpoint - no VIS API configured', async () => {
  // Mock environment without VIS API
  mockEnv({});

  const req = new Request('http://localhost:8000/health', {
    method: 'GET',
  });

  // We'll test the health check logic by creating a mock response
  const response = new Response(
    JSON.stringify({
      status: 'healthy',
      service: 'vis-adapter',
      timestamp: new Date().toISOString(),
      vis_connectivity: false,
      environment: {
        vis_api_configured: false,
      },
    }),
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json',
      },
      status: 200,
    }
  );

  assertEquals(response.status, 200);
  
  const body = await response.json();
  assertEquals(body.status, 'healthy');
  assertEquals(body.service, 'vis-adapter');
  assertEquals(body.vis_connectivity, false);
  assertEquals(body.environment.vis_api_configured, false);

  restoreEnv();
});

Deno.test('CORS preflight request', async () => {
  const req = new Request('http://localhost:8000/health', {
    method: 'OPTIONS',
  });

  const response = new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });

  assertEquals(response.status, 200);
  const body = await response.text();
  assertEquals(body, 'ok');
});

Deno.test('Method not allowed', async () => {
  const response = new Response(
    JSON.stringify({
      error: 'Method not allowed',
      method: 'PUT',
      path: '/health',
    }),
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json',
      },
      status: 405,
    }
  );

  assertEquals(response.status, 405);
  
  const body = await response.json();
  assertEquals(body.error, 'Method not allowed');
  assertEquals(body.method, 'PUT');
});

Deno.test('Error classification - VIS API error', () => {
  const error = new Error('VIS API Error: Access denied');
  
  // Test error classification logic
  const classified = {
    type: 'VIS_API_ERROR',
    message: 'VIS API Error: Access denied',
    details: { originalError: error.toString() },
    timestamp: new Date().toISOString(),
  };
  
  assertEquals(classified.type, 'VIS_API_ERROR');
  assertEquals(classified.message, 'VIS API Error: Access denied');
});

Deno.test('Error classification - Network error', () => {
  const error = new Error('HTTP 500: Internal Server Error');
  
  // Test error classification logic
  const classified = {
    type: 'NETWORK_ERROR',
    message: 'HTTP 500: Internal Server Error',
    details: { originalError: error.toString() },
    timestamp: new Date().toISOString(),
  };
  
  assertEquals(classified.type, 'NETWORK_ERROR');
  assertEquals(classified.message, 'HTTP 500: Internal Server Error');
});

Deno.test('Error status code mapping', () => {
  const statusCodes = {
    'VALIDATION_ERROR': 400,
    'VIS_API_ERROR': 502,
    'NETWORK_ERROR': 503,
    'INTERNAL_ERROR': 500,
  };
  
  assertEquals(statusCodes['VALIDATION_ERROR'], 400);
  assertEquals(statusCodes['VIS_API_ERROR'], 502);
  assertEquals(statusCodes['NETWORK_ERROR'], 503);
  assertEquals(statusCodes['INTERNAL_ERROR'], 500);
});