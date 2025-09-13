import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  database_connectivity: boolean;
  query_performance: {
    sample_query_ms: number;
    sla_met: boolean;
    sla_threshold_ms: number;
  };
  cache_status: {
    analytics_query_cache: boolean;
    export_cache: boolean;
  };
  feature_flags: {
    analytics_writes_disabled: boolean;
    disable_analytics_writes_env: string | null;
  };
  environment: {
    supabase_configured: boolean;
    service_key_present: boolean;
  };
  performance_metrics: {
    avg_response_time_ms?: number;
    total_requests?: number;
    error_rate_percent?: number;
  };
  timestamp: string;
  uptime_seconds: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Track service start time for uptime calculation
const serviceStartTime = Date.now();

/**
 * Test database connectivity with a simple query
 */
async function testDatabaseConnectivity(supabase: any): Promise<{ success: boolean; duration: number }> {
  const startTime = performance.now();
  
  try {
    // Simple query to test database connectivity
    const { data, error } = await supabase
      .from('referees')
      .select('id')
      .limit(1);

    const duration = Math.round(performance.now() - startTime);

    if (error) {
      console.warn('Database connectivity test failed:', error);
      return { success: false, duration };
    }

    return { success: true, duration };
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    console.error('Database connectivity test error:', error);
    return { success: false, duration };
  }
}

/**
 * Test analytics query performance with a sample query
 */
async function testQueryPerformance(supabase: any): Promise<{ duration: number; success: boolean }> {
  const startTime = performance.now();
  
  try {
    // Sample analytics query - last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const query = `
      SELECT 
        r.id as referee_id,
        COUNT(mr.id) as total_assignments
      FROM referees r
      LEFT JOIN match_referees mr ON r.id = mr.referee_id
      LEFT JOIN matches m ON mr.match_id = m.id
      WHERE m.utc_datetime >= $1 AND m.utc_datetime <= $2
      GROUP BY r.id
      LIMIT 10
    `;

    const { data, error } = await supabase.rpc('exec_raw_query', {
      query_text: query,
      query_params: [startDate.toISOString(), endDate.toISOString()]
    });

    const duration = Math.round(performance.now() - startTime);

    if (error) {
      console.warn('Query performance test failed:', error);
      return { duration, success: false };
    }

    return { duration, success: true };
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    console.error('Query performance test error:', error);
    return { duration, success: false };
  }
}

/**
 * Check cache health by attempting to access cache endpoints
 */
async function testCacheHealth(): Promise<{ analytics_query_cache: boolean; export_cache: boolean }> {
  try {
    // In a real implementation, this would test actual cache instances
    // For now, we'll simulate cache health checks
    
    // Test if analytics-query service is responsive
    const analyticsHealthy = await testServiceHealth('/analytics-query');
    
    // Test if analytics-export service is responsive
    const exportHealthy = await testServiceHealth('/analytics-export');
    
    return {
      analytics_query_cache: analyticsHealthy,
      export_cache: exportHealthy
    };
  } catch (error) {
    console.warn('Cache health check error:', error);
    return {
      analytics_query_cache: false,
      export_cache: false
    };
  }
}

/**
 * Test if a service endpoint is healthy
 */
async function testServiceHealth(endpoint: string): Promise<boolean> {
  try {
    // For this implementation, we'll assume services are healthy if we can reach this health endpoint
    // In a production setup, this would make actual HTTP calls to test service health
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check feature flag status
 */
function checkFeatureFlags(): { analytics_writes_disabled: boolean; disable_analytics_writes_env: string | null } {
  const disableAnalyticsWrites = Deno.env.get('DISABLE_ANALYTICS_WRITES');
  const analyticsWritesDisabled = disableAnalyticsWrites === 'true' || disableAnalyticsWrites === '1';
  
  return {
    analytics_writes_disabled: analyticsWritesDisabled,
    disable_analytics_writes_env: disableAnalyticsWrites
  };
}

/**
 * Check environment configuration
 */
function checkEnvironment(): { supabase_configured: boolean; service_key_present: boolean } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  return {
    supabase_configured: !!supabaseUrl,
    service_key_present: !!supabaseServiceKey
  };
}

/**
 * Calculate overall health status
 */
function calculateHealthStatus(
  dbConnectivity: boolean,
  queryPerformance: { duration: number; success: boolean },
  cacheStatus: { analytics_query_cache: boolean; export_cache: boolean }
): 'healthy' | 'degraded' | 'unhealthy' {
  // Critical: Database connectivity
  if (!dbConnectivity) {
    return 'unhealthy';
  }

  // Critical: Query performance within SLA (500ms)
  if (!queryPerformance.success || queryPerformance.duration > 500) {
    return 'degraded';
  }

  // Degraded: Cache issues
  if (!cacheStatus.analytics_query_cache || !cacheStatus.export_cache) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Calculate service uptime in seconds
 */
function getUptimeSeconds(): number {
  return Math.floor((Date.now() - serviceStartTime) / 1000);
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const healthCheckStart = performance.now();

  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          message: 'Only GET requests are supported',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405,
        }
      );
    }

    // Check environment configuration first
    const environment = checkEnvironment();
    
    if (!environment.supabase_configured || !environment.service_key_present) {
      const result: HealthCheckResult = {
        service: 'analytics-health',
        status: 'unhealthy',
        database_connectivity: false,
        query_performance: {
          sample_query_ms: 0,
          sla_met: false,
          sla_threshold_ms: 500
        },
        cache_status: {
          analytics_query_cache: false,
          export_cache: false
        },
        feature_flags: checkFeatureFlags(),
        environment,
        performance_metrics: {},
        timestamp: new Date().toISOString(),
        uptime_seconds: getUptimeSeconds()
      };

      return new Response(
        JSON.stringify(result, null, 2),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503, // Service Unavailable
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Perform health checks in parallel
    const [dbTest, perfTest, cacheTest] = await Promise.all([
      testDatabaseConnectivity(supabase),
      testQueryPerformance(supabase),
      testCacheHealth()
    ]);

    // Calculate overall health status
    const overallStatus = calculateHealthStatus(
      dbTest.success,
      perfTest,
      cacheTest
    );

    // Build health check result
    const result: HealthCheckResult = {
      service: 'analytics-health',
      status: overallStatus,
      database_connectivity: dbTest.success,
      query_performance: {
        sample_query_ms: perfTest.duration,
        sla_met: perfTest.success && perfTest.duration <= 500,
        sla_threshold_ms: 500
      },
      cache_status: cacheTest,
      feature_flags: checkFeatureFlags(),
      environment,
      performance_metrics: {
        // In a production setup, these would be tracked over time
        avg_response_time_ms: (dbTest.duration + perfTest.duration) / 2,
        total_requests: undefined, // Would require persistent storage
        error_rate_percent: undefined // Would require persistent storage
      },
      timestamp: new Date().toISOString(),
      uptime_seconds: getUptimeSeconds()
    };

    const totalDuration = Math.round(performance.now() - healthCheckStart);
    
    // Log health check results
    console.log(`Analytics health check completed in ${totalDuration}ms - Status: ${overallStatus}`);
    
    // Return appropriate HTTP status based on health
    let httpStatus = 200;
    if (overallStatus === 'degraded') {
      httpStatus = 206; // Partial Content
    } else if (overallStatus === 'unhealthy') {
      httpStatus = 503; // Service Unavailable
    }

    return new Response(
      JSON.stringify(result, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Health-Check-Duration': totalDuration.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        status: httpStatus,
      }
    );

  } catch (error) {
    const totalDuration = Math.round(performance.now() - healthCheckStart);
    console.error('Health check error:', error);

    const result: HealthCheckResult = {
      service: 'analytics-health',
      status: 'unhealthy',
      database_connectivity: false,
      query_performance: {
        sample_query_ms: 0,
        sla_met: false,
        sla_threshold_ms: 500
      },
      cache_status: {
        analytics_query_cache: false,
        export_cache: false
      },
      feature_flags: checkFeatureFlags(),
      environment: checkEnvironment(),
      performance_metrics: {},
      timestamp: new Date().toISOString(),
      uptime_seconds: getUptimeSeconds()
    };

    return new Response(
      JSON.stringify({
        ...result,
        error: error.message || 'Health check failed',
      }, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Health-Check-Duration': totalDuration.toString(),
        },
        status: 503, // Service Unavailable
      }
    );
  }
});