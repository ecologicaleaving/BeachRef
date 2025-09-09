import { assertEquals, assertThrows } from 'std/testing/asserts.ts';
import { VisClient } from '../vis-client.ts';

// Mock fetch for testing
const originalFetch = globalThis.fetch;

Deno.test('VisClient - successful request', async () => {
  // Mock successful VIS API response
  globalThis.fetch = async () => {
    return new Response('<?xml version="1.0"?><response>success</response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  };

  const client = new VisClient({
    baseUrl: 'https://test-vis-api.example.com',
    headers: { 'Authorization': 'Bearer test-token' },
  });

  const result = await client.makeRequest('<Request Type="Test" />');
  assertEquals(result, '<?xml version="1.0"?><response>success</response>');

  // Restore original fetch
  globalThis.fetch = originalFetch;
});

Deno.test('VisClient - VIS API error response', async () => {
  // Mock VIS API error response
  globalThis.fetch = async () => {
    return new Response('<Error>Access denied</Error>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  };

  const client = new VisClient({
    baseUrl: 'https://test-vis-api.example.com',
  });

  await assertThrows(
    async () => {
      await client.makeRequest('<Request Type="Test" />');
    },
    Error,
    'VIS API Error'
  );

  // Restore original fetch
  globalThis.fetch = originalFetch;
});

Deno.test('VisClient - HTTP error', async () => {
  // Mock HTTP error
  globalThis.fetch = async () => {
    return new Response('Not Found', {
      status: 404,
      statusText: 'Not Found',
    });
  };

  const client = new VisClient({
    baseUrl: 'https://test-vis-api.example.com',
  });

  await assertThrows(
    async () => {
      await client.makeRequest('<Request Type="Test" />');
    },
    Error,
    'HTTP 404: Not Found'
  );

  // Restore original fetch
  globalThis.fetch = originalFetch;
});

Deno.test('VisClient - test connection success', async () => {
  // Mock successful connection test
  globalThis.fetch = async () => {
    return new Response('<?xml version="1.0"?><Events><Event><No>1</No></Event></Events>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  };

  const client = new VisClient({
    baseUrl: 'https://test-vis-api.example.com',
  });

  const isConnected = await client.testConnection();
  assertEquals(isConnected, true);

  // Restore original fetch
  globalThis.fetch = originalFetch;
});

Deno.test('VisClient - test connection failure', async () => {
  // Mock connection failure
  globalThis.fetch = async () => {
    throw new Error('Network error');
  };

  const client = new VisClient({
    baseUrl: 'https://test-vis-api.example.com',
  });

  const isConnected = await client.testConnection();
  assertEquals(isConnected, false);

  // Restore original fetch
  globalThis.fetch = originalFetch;
});

Deno.test('VisClient - constructor validation', () => {
  // Test missing baseUrl
  assertThrows(
    () => {
      new VisClient({ baseUrl: '' });
    },
    Error,
    'baseUrl is required'
  );

  // Test invalid URL format
  assertThrows(
    () => {
      new VisClient({ baseUrl: 'not-a-url' });
    },
    Error,
    'must be a valid HTTP(S) URL'
  );
});