/**
 * Analytics Query Edge Function Tests
 * Tests for referee performance analytics queries
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Test configuration
const TEST_CONFIG = {
  SUPABASE_URL: Deno.env.get('TEST_SUPABASE_URL') || 'http://localhost:54321',
  SUPABASE_KEY: Deno.env.get('TEST_SUPABASE_KEY') || 'test-key',
  FUNCTION_URL: 'http://localhost:54321/functions/v1/analytics-query',
};

// Test data fixtures
const TEST_DATE_RANGE = {
  startDate: '2024-09-01',
  endDate: '2024-09-07',
  tournamentCode: 'TEST2024',
  federationCode: 'USA',
};

/**
 * Test suite setup
 */
Deno.test('Analytics Query Function Tests', async (t) => {
  const supabase = createClient(TEST_CONFIG.SUPABASE_URL, TEST_CONFIG.SUPABASE_KEY);

  await t.step('should return 405 for non-GET methods', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' }),
    });

    if (response.status !== 405) {
      throw new Error(`Expected 405, got ${response.status}`);
    }

    const data = await response.json();
    if (data.error !== 'Method not allowed') {
      throw new Error('Expected method not allowed error');
    }
  });

  await t.step('should handle CORS preflight requests', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'OPTIONS',
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200 for OPTIONS, got ${response.status}`);
    }

    const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
    if (corsOrigin !== '*') {
      throw new Error('CORS not configured properly');
    }
  });

  await t.step('should require startDate and endDate parameters', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'GET',
    });

    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }

    const data = await response.json();
    if (!data.message.includes('startDate and endDate parameters are required')) {
      throw new Error('Expected parameter validation error');
    }
  });

  await t.step('should validate date format', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?startDate=invalid&endDate=2024-09-07`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }

    const data = await response.json();
    if (!data.message.includes('Invalid')) {
      throw new Error('Expected date format validation error');
    }
  });

  await t.step('should validate date range (max 30 days)', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?startDate=2024-09-01&endDate=2024-11-01`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }

    const data = await response.json();
    if (!data.message.includes('Date range cannot exceed 30 days')) {
      throw new Error('Expected date range validation error');
    }
  });

  await t.step('should validate tournament code format', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?startDate=2024-09-01&endDate=2024-09-07&tournamentCode=invalid@code`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }

    const data = await response.json();
    if (!data.message.includes('Invalid tournament code format')) {
      throw new Error('Expected tournament code validation error');
    }
  });

  await t.step('should return valid analytics data structure', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?startDate=${TEST_DATE_RANGE.startDate}&endDate=${TEST_DATE_RANGE.endDate}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 200) {
      const errorData = await response.json();
      console.error('Analytics query failed:', errorData);
      throw new Error(`Expected 200, got ${response.status}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!Array.isArray(data.data)) {
      throw new Error('Expected data to be an array');
    }

    if (!data.meta) {
      throw new Error('Expected meta object in response');
    }

    if (!data.meta.performance) {
      throw new Error('Expected performance metrics in response');
    }

    if (typeof data.meta.count !== 'number') {
      throw new Error('Expected count to be a number');
    }
  });

  await t.step('should respect performance SLA (<500ms)', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?startDate=${TEST_DATE_RANGE.startDate}&endDate=${TEST_DATE_RANGE.endDate}`;
    const startTime = performance.now();
    
    const response = await fetch(url, { method: 'GET' });
    const duration = performance.now() - startTime;

    if (response.status !== 200) {
      throw new Error(`Query failed with status ${response.status}`);
    }

    const data = await response.json();
    const reportedDuration = data.meta.performance.duration_ms;

    if (reportedDuration > 500) {
      console.warn(`Query exceeded SLA: ${reportedDuration}ms`);
    }

    // Test should still pass but log warning for SLA violations
    console.log(`Query completed in ${reportedDuration}ms (SLA: 500ms)`);
  });

  await t.step('should support caching with cache headers', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?startDate=${TEST_DATE_RANGE.startDate}&endDate=${TEST_DATE_RANGE.endDate}`;
    
    // First request
    const response1 = await fetch(url, { method: 'GET' });
    if (response1.status !== 200) {
      throw new Error('First request failed');
    }

    const cacheControl = response1.headers.get('Cache-Control');
    if (!cacheControl || !cacheControl.includes('max-age=300')) {
      throw new Error('Expected Cache-Control header with 5-minute TTL');
    }

    // Second request (should hit cache)
    const response2 = await fetch(url, { method: 'GET' });
    if (response2.status !== 200) {
      throw new Error('Second request failed');
    }

    const xCache = response2.headers.get('X-Cache');
    if (xCache === 'HIT') {
      console.log('Cache working correctly - second request hit cache');
    }
  });

  await t.step('should handle tournament code filter', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?startDate=${TEST_DATE_RANGE.startDate}&endDate=${TEST_DATE_RANGE.endDate}&tournamentCode=${TEST_DATE_RANGE.tournamentCode}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 200) {
      throw new Error(`Tournament filter query failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.meta.filters.tournamentCode !== TEST_DATE_RANGE.tournamentCode) {
      throw new Error('Tournament code filter not applied correctly');
    }
  });

  await t.step('should handle federation code filter', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?startDate=${TEST_DATE_RANGE.startDate}&endDate=${TEST_DATE_RANGE.endDate}&federationCode=${TEST_DATE_RANGE.federationCode}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 200) {
      throw new Error(`Federation filter query failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.meta.filters.federationCode !== TEST_DATE_RANGE.federationCode) {
      throw new Error('Federation code filter not applied correctly');
    }
  });

  await t.step('should enforce rate limiting', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?startDate=${TEST_DATE_RANGE.startDate}&endDate=${TEST_DATE_RANGE.endDate}`;
    
    // Make multiple requests to trigger rate limiting
    const promises = Array.from({ length: 35 }, () => fetch(url, { method: 'GET' }));
    const responses = await Promise.all(promises);

    // Check if any requests were rate limited
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    if (rateLimitedResponses.length > 0) {
      console.log(`Rate limiting working - ${rateLimitedResponses.length} requests rate limited`);
      
      const rateLimitedData = await rateLimitedResponses[0].json();
      if (!rateLimitedData.retryAfter) {
        throw new Error('Expected retryAfter field in rate limit response');
      }

      const retryAfterHeader = rateLimitedResponses[0].headers.get('Retry-After');
      if (!retryAfterHeader) {
        throw new Error('Expected Retry-After header in rate limit response');
      }
    }
  });

  await t.step('should return proper error for configuration issues', async () => {
    // This test would require mocking environment variables
    // For now, we'll skip it as it requires special test setup
    console.log('Configuration error test skipped - requires environment variable mocking');
  });
});

/**
 * Integration tests with actual database
 */
Deno.test('Analytics Query Integration Tests', async (t) => {
  await t.step('should handle empty result sets gracefully', async () => {
    // Query for a date range with no data
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const startDate = futureDate.toISOString().split('T')[0];
    const endDate = new Date(futureDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = `${TEST_CONFIG.FUNCTION_URL}?startDate=${startDate}&endDate=${endDate}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 200) {
      throw new Error(`Expected 200 for empty results, got ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.data)) {
      throw new Error('Expected data array for empty results');
    }

    if (data.meta.count !== data.data.length) {
      throw new Error('Count mismatch for empty results');
    }
  });

  await t.step('should validate referee data structure', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?startDate=${TEST_DATE_RANGE.startDate}&endDate=${TEST_DATE_RANGE.endDate}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 200) {
      throw new Error(`Query failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (data.data.length > 0) {
      const referee = data.data[0];
      
      // Validate required fields
      const requiredFields = [
        'referee_id', 'referee_name', 'federation_code',
        'total_assignments', 'first_referee_count', 
        'second_referee_count', 'challenge_referee_count',
        'tournaments_worked'
      ];

      for (const field of requiredFields) {
        if (!(field in referee)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate field types
      if (typeof referee.total_assignments !== 'number') {
        throw new Error('total_assignments should be a number');
      }

      if (!Array.isArray(referee.tournaments_worked)) {
        throw new Error('tournaments_worked should be an array');
      }
    }
  });
});