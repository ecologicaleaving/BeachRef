import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Analytics Performance Test Edge Function
 * Story 001.2: Index Optimization and Performance Validation
 * 
 * This function tests the effectiveness of the strategic analytics indexes
 * created in migration 20240911120000_analytics_performance_indexes.sql
 */

interface PerformanceTestResult {
  test_name: string;
  execution_time_ms: number;
  sla_met: boolean;
  query_plan?: any;
  index_usage?: string[];
  rows_examined: number;
  rows_returned: number;
}

interface PerformanceTestSuite {
  suite_name: string;
  timestamp: string;
  total_tests: number;
  tests_passed: number;
  avg_response_time_ms: number;
  sla_compliance_rate: number;
  tests: PerformanceTestResult[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLA_THRESHOLD_MS = 500; // Target performance SLA

/**
 * Execute a query with performance monitoring
 */
async function executePerformanceTest(
  supabase: any,
  testName: string,
  query: string,
  params: any[] = [],
  includeExplain = false
): Promise<PerformanceTestResult> {
  const startTime = performance.now();
  
  try {
    let result;
    let queryPlan = null;
    
    if (includeExplain) {
      // Get query execution plan for analysis
      const explainQuery = `EXPLAIN (ANALYZE true, BUFFERS true, FORMAT JSON) ${query}`;
      const { data: planData, error: planError } = await supabase.rpc('exec_raw_query', {
        query_text: explainQuery,
        query_params: params
      });
      
      if (!planError && planData) {
        queryPlan = planData[0]?.['QUERY PLAN'];
      }
    }
    
    // Execute the actual query
    const { data, error } = await supabase.rpc('exec_raw_query', {
      query_text: query,
      query_params: params
    });
    
    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
    
    result = data || [];
    const executionTime = Math.round(performance.now() - startTime);
    
    return {
      test_name: testName,
      execution_time_ms: executionTime,
      sla_met: executionTime <= SLA_THRESHOLD_MS,
      query_plan: queryPlan,
      index_usage: extractIndexUsage(queryPlan),
      rows_examined: queryPlan ? extractRowsExamined(queryPlan) : 0,
      rows_returned: Array.isArray(result) ? result.length : 0
    };
    
  } catch (error) {
    const executionTime = Math.round(performance.now() - startTime);
    
    return {
      test_name: testName,
      execution_time_ms: executionTime,
      sla_met: false,
      rows_examined: 0,
      rows_returned: 0
    };
  }
}

/**
 * Extract index usage from query plan
 */
function extractIndexUsage(queryPlan: any): string[] {
  if (!queryPlan) return [];
  
  const indexes: string[] = [];
  
  function findIndexes(node: any) {
    if (!node) return;
    
    if (node['Node Type'] === 'Index Scan' || node['Node Type'] === 'Index Only Scan') {
      if (node['Index Name']) {
        indexes.push(node['Index Name']);
      }
    }
    
    if (node.Plans) {
      node.Plans.forEach(findIndexes);
    }
  }
  
  if (Array.isArray(queryPlan)) {
    queryPlan.forEach(findIndexes);
  } else {
    findIndexes(queryPlan);
  }
  
  return [...new Set(indexes)]; // Remove duplicates
}

/**
 * Extract rows examined from query plan
 */
function extractRowsExamined(queryPlan: any): number {
  if (!queryPlan) return 0;
  
  let totalRows = 0;
  
  function sumRows(node: any) {
    if (!node) return;
    
    if (node['Actual Rows']) {
      totalRows += node['Actual Rows'];
    }
    
    if (node.Plans) {
      node.Plans.forEach(sumRows);
    }
  }
  
  if (Array.isArray(queryPlan)) {
    queryPlan.forEach(sumRows);
  } else {
    sumRows(queryPlan);
  }
  
  return totalRows;
}

/**
 * Test Case 1: Basic time-range analytics query (most common)
 */
async function testTimeRangeQuery(supabase: any): Promise<PerformanceTestResult> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const query = `
    SELECT 
      r.id as referee_id,
      r.first_name || ' ' || r.last_name as referee_name,
      r.federation_code,
      COUNT(mr.id) as total_assignments,
      COUNT(CASE WHEN mr.role = 'FIRST' THEN 1 END) as first_referee_count,
      COUNT(CASE WHEN mr.role = 'SECOND' THEN 1 END) as second_referee_count,
      COUNT(CASE WHEN mr.role = 'CHALLENGE' THEN 1 END) as challenge_referee_count,
      ARRAY_AGG(DISTINCT m.tournament_code) as tournaments_worked
    FROM referees r
    LEFT JOIN match_referees mr ON r.id = mr.referee_id
    LEFT JOIN matches m ON mr.match_id = m.id
    WHERE m.utc_datetime >= $1 AND m.utc_datetime <= $2
    GROUP BY r.id, r.first_name, r.last_name, r.federation_code
    HAVING COUNT(mr.id) > 0
    ORDER BY total_assignments DESC, referee_name ASC
    LIMIT 50
  `;
  
  return executePerformanceTest(
    supabase,
    'time_range_query_7_days',
    query,
    [startDate.toISOString(), endDate.toISOString()],
    true
  );
}

/**
 * Test Case 2: Tournament-filtered analytics query
 */
async function testTournamentFilteredQuery(supabase: any): Promise<PerformanceTestResult> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days
  
  // Get a tournament code for testing
  const { data: tournaments } = await supabase
    .from('matches')
    .select('tournament_code')
    .limit(1);
  
  const tournamentCode = tournaments?.[0]?.tournament_code || 'TEST_TOURNAMENT';
  
  const query = `
    SELECT 
      r.id as referee_id,
      r.first_name || ' ' || r.last_name as referee_name,
      r.federation_code,
      COUNT(mr.id) as total_assignments,
      COUNT(CASE WHEN mr.role = 'FIRST' THEN 1 END) as first_referee_count,
      COUNT(CASE WHEN mr.role = 'SECOND' THEN 1 END) as second_referee_count,
      COUNT(CASE WHEN mr.role = 'CHALLENGE' THEN 1 END) as challenge_referee_count,
      ARRAY_AGG(DISTINCT m.tournament_code) as tournaments_worked
    FROM referees r
    LEFT JOIN match_referees mr ON r.id = mr.referee_id
    LEFT JOIN matches m ON mr.match_id = m.id
    WHERE m.utc_datetime >= $1 
      AND m.utc_datetime <= $2
      AND m.tournament_code = $3
    GROUP BY r.id, r.first_name, r.last_name, r.federation_code
    HAVING COUNT(mr.id) > 0
    ORDER BY total_assignments DESC, referee_name ASC
  `;
  
  return executePerformanceTest(
    supabase,
    'tournament_filtered_query_14_days',
    query,
    [startDate.toISOString(), endDate.toISOString(), tournamentCode],
    true
  );
}

/**
 * Test Case 3: Federation-filtered analytics query
 */
async function testFederationFilteredQuery(supabase: any): Promise<PerformanceTestResult> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 21 * 24 * 60 * 60 * 1000); // 21 days
  
  // Get a federation code for testing
  const { data: referees } = await supabase
    .from('referees')
    .select('federation_code')
    .not('federation_code', 'is', null)
    .limit(1);
  
  const federationCode = referees?.[0]?.federation_code || 'ITA';
  
  const query = `
    SELECT 
      r.id as referee_id,
      r.first_name || ' ' || r.last_name as referee_name,
      r.federation_code,
      COUNT(mr.id) as total_assignments,
      COUNT(CASE WHEN mr.role = 'FIRST' THEN 1 END) as first_referee_count,
      COUNT(CASE WHEN mr.role = 'SECOND' THEN 1 END) as second_referee_count,
      COUNT(CASE WHEN mr.role = 'CHALLENGE' THEN 1 END) as challenge_referee_count,
      ARRAY_AGG(DISTINCT m.tournament_code) as tournaments_worked
    FROM referees r
    LEFT JOIN match_referees mr ON r.id = mr.referee_id
    LEFT JOIN matches m ON mr.match_id = m.id
    WHERE m.utc_datetime >= $1 
      AND m.utc_datetime <= $2
      AND r.federation_code = $3
    GROUP BY r.id, r.first_name, r.last_name, r.federation_code
    HAVING COUNT(mr.id) > 0
    ORDER BY total_assignments DESC, referee_name ASC
  `;
  
  return executePerformanceTest(
    supabase,
    'federation_filtered_query_21_days',
    query,
    [startDate.toISOString(), endDate.toISOString(), federationCode],
    true
  );
}

/**
 * Test Case 4: Maximum date range query (30 days - SLA limit)
 */
async function testMaxDateRangeQuery(supabase: any): Promise<PerformanceTestResult> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const query = `
    SELECT 
      r.id as referee_id,
      r.first_name || ' ' || r.last_name as referee_name,
      r.federation_code,
      COUNT(mr.id) as total_assignments,
      COUNT(CASE WHEN mr.role = 'FIRST' THEN 1 END) as first_referee_count,
      COUNT(CASE WHEN mr.role = 'SECOND' THEN 1 END) as second_referee_count,
      COUNT(CASE WHEN mr.role = 'CHALLENGE' THEN 1 END) as challenge_referee_count,
      ARRAY_AGG(DISTINCT m.tournament_code) as tournaments_worked
    FROM referees r
    LEFT JOIN match_referees mr ON r.id = mr.referee_id
    LEFT JOIN matches m ON mr.match_id = m.id
    WHERE m.utc_datetime >= $1 AND m.utc_datetime <= $2
    GROUP BY r.id, r.first_name, r.last_name, r.federation_code
    HAVING COUNT(mr.id) > 0
    ORDER BY total_assignments DESC, referee_name ASC
    LIMIT 100
  `;
  
  return executePerformanceTest(
    supabase,
    'max_date_range_query_30_days',
    query,
    [startDate.toISOString(), endDate.toISOString()],
    true
  );
}

/**
 * Test Case 5: Export-style query (similar to analytics-export)
 */
async function testExportQuery(supabase: any): Promise<PerformanceTestResult> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const query = `
    SELECT 
      r.id as referee_id,
      r.first_name || ' ' || r.last_name as referee_name,
      r.federation_code,
      COUNT(mr.id) as total_assignments,
      COUNT(CASE WHEN mr.role = 'FIRST' THEN 1 END) as first_referee_count,
      COUNT(CASE WHEN mr.role = 'SECOND' THEN 1 END) as second_referee_count,
      COUNT(CASE WHEN mr.role = 'CHALLENGE' THEN 1 END) as challenge_referee_count,
      STRING_AGG(DISTINCT m.tournament_code, ', ') as tournaments_worked
    FROM referees r
    LEFT JOIN match_referees mr ON r.id = mr.referee_id
    LEFT JOIN matches m ON mr.match_id = m.id
    WHERE m.utc_datetime >= $1 AND m.utc_datetime <= $2
    GROUP BY r.id, r.first_name, r.last_name, r.federation_code
    HAVING COUNT(mr.id) > 0
    ORDER BY total_assignments DESC, referee_name ASC
  `;
  
  return executePerformanceTest(
    supabase,
    'export_query_7_days',
    query,
    [startDate.toISOString(), endDate.toISOString()],
    false // Don't include explain plan for export query
  );
}

/**
 * Test index health and usage
 */
async function testIndexHealth(supabase: any): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('check_analytics_indexes_health');
    
    if (error) {
      console.warn('Index health check failed:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('Index health check error:', error);
    return null;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const suiteStartTime = performance.now();

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: 'Configuration error',
          message: 'Supabase configuration not found',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    console.log('Starting analytics performance test suite...');

    // Execute all performance tests
    const [
      test1Result,
      test2Result,
      test3Result,
      test4Result,
      test5Result
    ] = await Promise.all([
      testTimeRangeQuery(supabase),
      testTournamentFilteredQuery(supabase),
      testFederationFilteredQuery(supabase),
      testMaxDateRangeQuery(supabase),
      testExportQuery(supabase)
    ]);

    // Get index health information
    const indexHealth = await testIndexHealth(supabase);

    const allTests = [test1Result, test2Result, test3Result, test4Result, test5Result];
    const testsPassed = allTests.filter(test => test.sla_met).length;
    const avgResponseTime = allTests.reduce((sum, test) => sum + test.execution_time_ms, 0) / allTests.length;
    const slaComplianceRate = (testsPassed / allTests.length) * 100;
    
    const totalDuration = Math.round(performance.now() - suiteStartTime);

    const testSuite: PerformanceTestSuite = {
      suite_name: 'Analytics Performance Index Validation',
      timestamp: new Date().toISOString(),
      total_tests: allTests.length,
      tests_passed: testsPassed,
      avg_response_time_ms: Math.round(avgResponseTime),
      sla_compliance_rate: Math.round(slaComplianceRate),
      tests: allTests
    };

    console.log(`Performance test suite completed in ${totalDuration}ms`);
    console.log(`SLA Compliance: ${slaComplianceRate}% (${testsPassed}/${allTests.length} tests passed)`);
    console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);

    // Return comprehensive results
    return new Response(
      JSON.stringify({
        performance_test_suite: testSuite,
        index_health: indexHealth,
        meta: {
          suite_duration_ms: totalDuration,
          sla_threshold_ms: SLA_THRESHOLD_MS,
          test_environment: 'analytics-performance-test',
          migration_version: '20240911120000_analytics_performance_indexes',
          story: '001.2'
        }
      }, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Test-Suite-Duration': totalDuration.toString(),
          'X-SLA-Compliance-Rate': slaComplianceRate.toString(),
        },
        status: 200,
      }
    );

  } catch (error) {
    const totalDuration = Math.round(performance.now() - suiteStartTime);
    console.error('Performance test suite error:', error);

    return new Response(
      JSON.stringify({
        error: 'Performance test failed',
        message: error.message || 'Test suite execution failed',
        duration_ms: totalDuration,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});