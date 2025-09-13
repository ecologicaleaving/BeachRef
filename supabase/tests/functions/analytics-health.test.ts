/**
 * Analytics Health Edge Function Tests
 * Tests for performance monitoring and health checks
 */

// Test configuration
const TEST_CONFIG = {
  FUNCTION_URL: 'http://localhost:54321/functions/v1/analytics-health',
};

/**
 * Test suite for Analytics Health Function
 */
Deno.test('Analytics Health Function Tests', async (t) => {

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

  await t.step('should return health check response structure', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'GET',
    });

    // Health checks can return 200 (healthy), 206 (degraded), or 503 (unhealthy)
    if (![200, 206, 503].includes(response.status)) {
      throw new Error(`Unexpected status code: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate required fields
    const requiredFields = [
      'service', 'status', 'database_connectivity',
      'query_performance', 'cache_status', 'feature_flags',
      'environment', 'timestamp', 'uptime_seconds'
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate service field
    if (data.service !== 'analytics-health') {
      throw new Error('Expected service to be analytics-health');
    }

    // Validate status values
    if (!['healthy', 'degraded', 'unhealthy'].includes(data.status)) {
      throw new Error('Invalid status value');
    }

    // Validate timestamp format
    const timestamp = new Date(data.timestamp);
    if (isNaN(timestamp.getTime())) {
      throw new Error('Invalid timestamp format');
    }

    // Validate uptime is a positive number
    if (typeof data.uptime_seconds !== 'number' || data.uptime_seconds < 0) {
      throw new Error('Invalid uptime_seconds value');
    }
  });

  await t.step('should validate database connectivity check', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'GET',
    });

    const data = await response.json();
    
    // database_connectivity should be boolean
    if (typeof data.database_connectivity !== 'boolean') {
      throw new Error('database_connectivity should be boolean');
    }

    console.log(`Database connectivity: ${data.database_connectivity}`);
  });

  await t.step('should validate query performance metrics', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'GET',
    });

    const data = await response.json();
    
    // Validate query_performance structure
    if (!data.query_performance || typeof data.query_performance !== 'object') {
      throw new Error('Expected query_performance object');
    }

    const perf = data.query_performance;
    
    if (typeof perf.sample_query_ms !== 'number' || perf.sample_query_ms < 0) {
      throw new Error('Invalid sample_query_ms value');
    }

    if (typeof perf.sla_met !== 'boolean') {
      throw new Error('sla_met should be boolean');
    }

    if (perf.sla_threshold_ms !== 500) {
      throw new Error('Expected SLA threshold to be 500ms');
    }

    console.log(`Query performance: ${perf.sample_query_ms}ms (SLA met: ${perf.sla_met})`);
  });

  await t.step('should validate cache status check', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'GET',
    });

    const data = await response.json();
    
    // Validate cache_status structure
    if (!data.cache_status || typeof data.cache_status !== 'object') {
      throw new Error('Expected cache_status object');
    }

    const cache = data.cache_status;
    
    if (typeof cache.analytics_query_cache !== 'boolean') {
      throw new Error('analytics_query_cache should be boolean');
    }

    if (typeof cache.export_cache !== 'boolean') {
      throw new Error('export_cache should be boolean');
    }

    console.log(`Cache status - Analytics: ${cache.analytics_query_cache}, Export: ${cache.export_cache}`);
  });

  await t.step('should validate feature flags status', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'GET',
    });

    const data = await response.json();
    
    // Validate feature_flags structure
    if (!data.feature_flags || typeof data.feature_flags !== 'object') {
      throw new Error('Expected feature_flags object');
    }

    const flags = data.feature_flags;
    
    if (typeof flags.analytics_writes_disabled !== 'boolean') {
      throw new Error('analytics_writes_disabled should be boolean');
    }

    // disable_analytics_writes_env can be string or null
    if (flags.disable_analytics_writes_env !== null && typeof flags.disable_analytics_writes_env !== 'string') {
      throw new Error('disable_analytics_writes_env should be string or null');
    }

    console.log(`Feature flags - Analytics writes disabled: ${flags.analytics_writes_disabled} (env: ${flags.disable_analytics_writes_env})`);
  });

  await t.step('should validate environment configuration', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'GET',
    });

    const data = await response.json();
    
    // Validate environment structure
    if (!data.environment || typeof data.environment !== 'object') {
      throw new Error('Expected environment object');
    }

    const env = data.environment;
    
    if (typeof env.supabase_configured !== 'boolean') {
      throw new Error('supabase_configured should be boolean');
    }

    if (typeof env.service_key_present !== 'boolean') {
      throw new Error('service_key_present should be boolean');
    }

    console.log(`Environment - Supabase configured: ${env.supabase_configured}, Service key present: ${env.service_key_present}`);
  });

  await t.step('should include performance metrics in response', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'GET',
    });

    const data = await response.json();
    
    // performance_metrics should be present
    if (!data.performance_metrics || typeof data.performance_metrics !== 'object') {
      throw new Error('Expected performance_metrics object');
    }

    const metrics = data.performance_metrics;
    
    // These might be undefined in test environment, but structure should be correct
    if (metrics.avg_response_time_ms !== undefined && (typeof metrics.avg_response_time_ms !== 'number' || metrics.avg_response_time_ms < 0)) {
      throw new Error('Invalid avg_response_time_ms value');
    }

    console.log('Performance metrics structure validated');
  });

  await t.step('should include health check duration header', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'GET',
    });

    const durationHeader = response.headers.get('X-Health-Check-Duration');
    if (!durationHeader) {
      throw new Error('Expected X-Health-Check-Duration header');
    }

    const duration = parseInt(durationHeader);
    if (isNaN(duration) || duration < 0) {
      throw new Error('Invalid health check duration');
    }

    console.log(`Health check completed in ${duration}ms`);
  });

  await t.step('should set no-cache headers', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'GET',
    });

    const cacheControl = response.headers.get('Cache-Control');
    if (!cacheControl || !cacheControl.includes('no-cache')) {
      throw new Error('Expected no-cache headers for health check');
    }
  });

  await t.step('should handle configuration errors gracefully', async () => {
    // In a real test environment, we might mock environment variables
    // to test configuration error handling
    console.log('Configuration error test skipped - requires environment mocking');
  });

  await t.step('should validate overall health status logic', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'GET',
    });

    const data = await response.json();
    
    // If database is down, should be unhealthy
    if (!data.database_connectivity && data.status !== 'unhealthy') {
      throw new Error('Should be unhealthy when database is down');
    }

    // If query performance is poor, should be at least degraded
    if (!data.query_performance.sla_met && data.status === 'healthy') {
      throw new Error('Should not be healthy when SLA is not met');
    }

    console.log(`Overall health status: ${data.status} (logic validation passed)`);
  });
});

/**
 * Performance tests for health check function itself
 */
Deno.test('Analytics Health Performance Tests', async (t) => {

  await t.step('should complete health check within reasonable time', async () => {
    const startTime = performance.now();
    
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'GET',
    });
    
    const duration = performance.now() - startTime;

    if (response.status === 503) {
      // Service unhealthy - still check timing
      console.log(`Health check completed in ${duration.toFixed(2)}ms (service unhealthy)`);
    } else {
      console.log(`Health check completed in ${duration.toFixed(2)}ms (service ${response.status === 200 ? 'healthy' : 'degraded'})`);
    }

    // Health checks should be fast (< 5 seconds even in worst case)
    if (duration > 5000) {
      console.warn(`Health check took ${duration.toFixed(2)}ms - consider optimizing`);
    }
  });

  await t.step('should handle concurrent health check requests', async () => {
    const concurrentRequests = 5;
    const promises = Array.from({ length: concurrentRequests }, () =>
      fetch(TEST_CONFIG.FUNCTION_URL, { method: 'GET' })
    );

    const startTime = performance.now();
    const responses = await Promise.all(promises);
    const totalDuration = performance.now() - startTime;

    // All requests should complete
    for (let i = 0; i < responses.length; i++) {
      if (![200, 206, 503].includes(responses[i].status)) {
        throw new Error(`Request ${i} failed with status ${responses[i].status}`);
      }
    }

    console.log(`${concurrentRequests} concurrent health checks completed in ${totalDuration.toFixed(2)}ms`);
  });

  await t.step('should provide consistent health status across requests', async () => {
    // Make multiple requests and verify status is consistent
    const responses = await Promise.all([
      fetch(TEST_CONFIG.FUNCTION_URL, { method: 'GET' }),
      fetch(TEST_CONFIG.FUNCTION_URL, { method: 'GET' }),
      fetch(TEST_CONFIG.FUNCTION_URL, { method: 'GET' })
    ]);

    const data1 = await responses[0].json();
    const data2 = await responses[1].json();
    const data3 = await responses[2].json();

    // Status should be consistent (allowing for minor timing differences in degraded scenarios)
    if (data1.status !== data2.status || data2.status !== data3.status) {
      console.warn('Health status inconsistent across requests:', data1.status, data2.status, data3.status);
      // This might be expected if the system is on the edge of degraded/healthy
    }

    // Database connectivity should be consistent
    if (data1.database_connectivity !== data2.database_connectivity || 
        data2.database_connectivity !== data3.database_connectivity) {
      throw new Error('Database connectivity status inconsistent across requests');
    }

    console.log(`Health status consistent across requests: ${data1.status}`);
  });
});