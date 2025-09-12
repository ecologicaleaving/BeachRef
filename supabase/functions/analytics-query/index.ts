import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RefereeAnalyticsResult {
  referee_id: string;
  referee_name: string;
  federation_code: string;
  total_assignments: number;
  first_referee_count: number;
  second_referee_count: number;
  challenge_referee_count: number;
  tournaments_worked: string[];
}

interface AnalyticsQueryParams {
  startDate: string;
  endDate: string;
  tournamentCode?: string;
  federationCode?: string;
  refereeId?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// In-memory cache with TTL (5 minutes as specified in story)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class QueryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const analyticsCache = new QueryCache<RefereeAnalyticsResult[]>();

// Rate limiting with exponential backoff
interface RateLimitEntry {
  requests: number;
  resetTime: number;
  backoffLevel: number;
}

class RateLimiter {
  private clients = new Map<string, RateLimitEntry>();
  private readonly maxRequests = 30; // requests per window
  private readonly windowMs = 60 * 1000; // 1 minute
  private readonly maxBackoffLevel = 5;

  isAllowed(clientId: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    let entry = this.clients.get(clientId);

    if (!entry || now >= entry.resetTime) {
      entry = {
        requests: 0,
        resetTime: now + this.windowMs,
        backoffLevel: 0,
      };
      this.clients.set(clientId, entry);
    }

    entry.requests++;

    if (entry.requests > this.maxRequests) {
      // Apply exponential backoff
      entry.backoffLevel = Math.min(entry.backoffLevel + 1, this.maxBackoffLevel);
      const backoffMultiplier = Math.pow(2, entry.backoffLevel);
      const backoffMs = this.windowMs * backoffMultiplier;
      
      entry.resetTime = now + backoffMs;
      const retryAfter = Math.ceil(backoffMs / 1000);
      
      console.warn(`Rate limit exceeded for client ${clientId}, backoff level ${entry.backoffLevel}, retry after ${retryAfter}s`);
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  cleanup(): void {
    const now = Date.now();
    const expiredClients: string[] = [];
    
    // Collect expired clients first to avoid modifying map during iteration
    for (const [clientId, entry] of this.clients.entries()) {
      if (now >= entry.resetTime) {
        expiredClients.push(clientId);
      }
    }
    
    // Remove expired clients
    expiredClients.forEach(clientId => this.clients.delete(clientId));
    
    if (expiredClients.length > 0) {
      console.log(`Cleaned up ${expiredClients.length} expired rate limit entries`);
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// Cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

/**
 * Extract client IP for rate limiting
 */
function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         'unknown';
}

/**
 * Validate date parameter format and range
 */
function validateDate(dateStr: string, paramName: string): Date {
  if (!dateStr) {
    throw new Error(`${paramName} parameter is required`);
  }

  // Handle URL-encoded datetime strings
  const decodedDateStr = decodeURIComponent(dateStr);
  console.log(`Parsing ${paramName}: "${dateStr}" -> "${decodedDateStr}"`);
  
  const date = new Date(decodedDateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ${paramName} format. Use YYYY-MM-DD or ISO format. Received: ${decodedDateStr}`);
  }

  // Validate reasonable date range (2020-2030)
  const year = date.getFullYear();
  if (year < 2020 || year > 2030) {
    throw new Error(`${paramName} must be between 2020 and 2030`);
  }

  return date;
}

/**
 * Validate and parse query parameters
 */
function parseQueryParams(url: URL): AnalyticsQueryParams {
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const tournamentCode = url.searchParams.get('tournamentCode');
  const federationCode = url.searchParams.get('federationCode');
  // Support both refereeId and refereeIds for backward compatibility
  const refereeId = url.searchParams.get('refereeId') || url.searchParams.get('refereeIds');

  if (!startDate || !endDate) {
    throw new Error('startDate and endDate parameters are required');
  }

  const start = validateDate(startDate, 'startDate');
  const end = validateDate(endDate, 'endDate');

  if (start >= end) {
    throw new Error('startDate must be before endDate');
  }

  // Allow up to 2 years for referee analytics (730 days), but warn about performance for large ranges
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 730) {
    throw new Error('Date range cannot exceed 2 years (730 days)');
  }
  
  // Log warning for large date ranges
  if (daysDiff > 90) {
    console.warn(`Large date range requested: ${daysDiff} days. Performance may be impacted.`);
  }

  // Validate tournament code format
  if (tournamentCode && !tournamentCode.match(/^[A-Z0-9]{3,20}$/i)) {
    throw new Error('Invalid tournament code format. Must be 3-20 alphanumeric characters');
  }

  // Validate federation code format
  if (federationCode && !federationCode.match(/^[A-Z]{2,3}$/i)) {
    throw new Error('Invalid federation code format. Must be 2-3 letter country code');
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    tournamentCode: tournamentCode || undefined,
    federationCode: federationCode || undefined,
    refereeId: refereeId || undefined,
  };
}

/**
 * Build referee analytics SQL query with filters
 */
function buildAnalyticsQuery(params: AnalyticsQueryParams): { query: string; queryParams: any[] } {
  let query = `
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
  `;

  const queryParams = [params.startDate, params.endDate];
  let paramIndex = 3;

  if (params.tournamentCode) {
    query += ` AND m.tournament_code = $${paramIndex}`;
    queryParams.push(params.tournamentCode);
    paramIndex++;
  }

  if (params.federationCode) {
    query += ` AND r.federation_code = $${paramIndex}`;
    queryParams.push(params.federationCode);
    paramIndex++;
  }

  if (params.refereeId) {
    query += ` AND r.id = $${paramIndex}`;
    queryParams.push(params.refereeId);
    paramIndex++;
  }

  query += `
    GROUP BY r.id, r.first_name, r.last_name, r.federation_code
    HAVING COUNT(mr.id) > 0
    ORDER BY total_assignments DESC, referee_name ASC
  `;

  return { query, queryParams };
}

/**
 * Generate cache key for analytics query
 */
function generateCacheKey(params: AnalyticsQueryParams): string {
  const parts = [
    params.startDate.split('T')[0], // Date only
    params.endDate.split('T')[0],
    params.tournamentCode || 'all',
    params.federationCode || 'all',
    params.refereeId || 'all'
  ];
  return `analytics:${parts.join(':')}`;
}

/**
 * Execute referee analytics query
 */
async function executeAnalyticsQuery(
  supabase: any, 
  params: AnalyticsQueryParams
): Promise<RefereeAnalyticsResult[]> {
  // Use a simpler direct query approach
  let supabaseQuery = supabase
    .from('referees')
    .select(`
      id,
      first_name,
      last_name,
      federation_code,
      match_referees!inner(
        role,
        matches!inner(
          tournament_code,
          utc_datetime
        )
      )
    `)
    .gte('match_referees.matches.utc_datetime', params.startDate)
    .lte('match_referees.matches.utc_datetime', params.endDate);
  
  if (params.tournamentCode) {
    supabaseQuery = supabaseQuery.eq('match_referees.matches.tournament_code', params.tournamentCode);
  }
  
  if (params.federationCode) {
    supabaseQuery = supabaseQuery.eq('federation_code', params.federationCode);
  }
  
  if (params.refereeId) {
    supabaseQuery = supabaseQuery.eq('id', params.refereeId);
  }
  
  const { data, error } = await supabaseQuery;

  if (error) {
    console.error('Analytics query error:', error);
    throw new Error(`Database query failed: ${error.message}`);
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  // Transform the nested data structure to match expected interface
  return data.map((referee: any) => {
    const assignments = referee.match_referees || [];
    const tournaments = new Set<string>();
    
    let firstRefereeCount = 0;
    let secondRefereeCount = 0;
    let challengeRefereeCount = 0;
    
    assignments.forEach((assignment: any) => {
      if (assignment.matches) {
        tournaments.add(assignment.matches.tournament_code);
      }
      
      switch (assignment.role) {
        case 'FIRST':
          firstRefereeCount++;
          break;
        case 'SECOND':
          secondRefereeCount++;
          break;
        case 'CHALLENGE':
          challengeRefereeCount++;
          break;
      }
    });
    
    return {
      referee_id: referee.id.toString(),
      referee_name: `${referee.first_name} ${referee.last_name}`,
      federation_code: referee.federation_code,
      total_assignments: assignments.length,
      first_referee_count: firstRefereeCount,
      second_referee_count: secondRefereeCount,
      challenge_referee_count: challengeRefereeCount,
      tournaments_worked: Array.from(tournaments).filter(t => t !== null)
    };
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = performance.now();

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

    // Rate limiting with exponential backoff
    const clientIP = getClientIP(req);
    const rateLimitResult = rateLimiter.isAllowed(clientIP);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
          status: 429,
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

    // Parse and validate query parameters
    const url = new URL(req.url);
    const params = parseQueryParams(url);

    // Generate cache key
    const cacheKey = generateCacheKey(params);

    // Check cache first
    let results = analyticsCache.get(cacheKey);
    let cacheHit = false;

    if (results) {
      cacheHit = true;
      console.log(`Cache hit for analytics query: ${cacheKey}`);
    } else {
      // Cache miss - execute query
      console.log(`Cache miss for analytics query: ${cacheKey} - executing database query`);
      
      results = await executeAnalyticsQuery(supabase, params);
      
      // Cache the results
      analyticsCache.set(cacheKey, results);
    }

    const duration = Math.round(performance.now() - startTime);
    
    // Check performance SLA (<500ms as specified in story)
    if (duration > 500) {
      console.warn(`Analytics query exceeded SLA: ${duration}ms for key ${cacheKey}`);
    }

    // Response with comprehensive metadata
    return new Response(
      JSON.stringify({
        data: results,
        meta: {
          count: results.length,
          filters: {
            startDate: params.startDate.split('T')[0],
            endDate: params.endDate.split('T')[0],
            tournamentCode: params.tournamentCode,
            federationCode: params.federationCode,
            refereeId: params.refereeId,
          },
          performance: {
            duration_ms: duration,
            sla_met: duration <= 500,
            cached: cacheHit,
          },
          cache: {
            key: cacheKey,
            ttl_seconds: 300, // 5 minutes
          },
          timestamp: new Date().toISOString(),
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // 5 minutes
          'X-Cache': cacheHit ? 'HIT' : 'MISS',
          'X-Performance-Ms': duration.toString(),
        },
        status: 200,
      }
    );

  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    console.error('Analytics query error:', error);

    let statusCode = 500;
    let errorMessage = error.message || 'Internal server error';

    // Handle specific error types
    if (errorMessage.includes('parameter') || 
        errorMessage.includes('Invalid') || 
        errorMessage.includes('Date range') ||
        errorMessage.includes('exceed') ||
        errorMessage.includes('format')) {
      statusCode = 400; // Bad Request
    }

    return new Response(
      JSON.stringify({
        error: 'Query failed',
        message: errorMessage,
        performance: {
          duration_ms: duration,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});