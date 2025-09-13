import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ExportParams {
  format: 'json' | 'csv';
  startDate: string;
  endDate: string;
  tournamentCode?: string;
  federationCode?: string;
}

interface ExportData {
  referee_id: string;
  referee_name: string;
  federation_code: string;
  total_assignments: number;
  first_referee_count: number;
  second_referee_count: number;
  challenge_referee_count: number;
  tournaments_worked: string;
  export_timestamp: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

/**
 * Validate export parameters
 */
function parseExportParams(url: URL): ExportParams {
  const format = url.searchParams.get('format') as 'json' | 'csv';
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const tournamentCode = url.searchParams.get('tournamentCode');
  const federationCode = url.searchParams.get('federationCode');

  // Validate format
  if (!format || !['json', 'csv'].includes(format)) {
    throw new Error('format parameter is required and must be either "json" or "csv"');
  }

  // Validate required date parameters
  if (!startDate || !endDate) {
    throw new Error('startDate and endDate parameters are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD or ISO format');
  }

  if (start >= end) {
    throw new Error('startDate must be before endDate');
  }

  // Allow longer date ranges for export (up to 90 days)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 90) {
    throw new Error('Export date range cannot exceed 90 days');
  }

  return {
    format,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    tournamentCode: tournamentCode || undefined,
    federationCode: federationCode || undefined,
  };
}

/**
 * Execute export query
 */
async function executeExportQuery(
  supabase: any,
  params: ExportParams
): Promise<ExportData[]> {
  let query = `
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

  query += `
    GROUP BY r.id, r.first_name, r.last_name, r.federation_code
    HAVING COUNT(mr.id) > 0
    ORDER BY total_assignments DESC, referee_name ASC
  `;

  const { data, error } = await supabase.rpc('exec_raw_query', {
    query_text: query,
    query_params: queryParams
  });

  if (error) {
    console.error('Export query error:', error);
    throw new Error(`Database query failed: ${error.message}`);
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  const timestamp = new Date().toISOString();

  return data.map((row: any) => ({
    referee_id: row.referee_id,
    referee_name: row.referee_name,
    federation_code: row.federation_code || '',
    total_assignments: parseInt(row.total_assignments) || 0,
    first_referee_count: parseInt(row.first_referee_count) || 0,
    second_referee_count: parseInt(row.second_referee_count) || 0,
    challenge_referee_count: parseInt(row.challenge_referee_count) || 0,
    tournaments_worked: row.tournaments_worked || '',
    export_timestamp: timestamp,
  }));
}

/**
 * Format data as CSV
 */
function formatAsCSV(data: ExportData[]): string {
  if (data.length === 0) {
    return 'referee_id,referee_name,federation_code,total_assignments,first_referee_count,second_referee_count,challenge_referee_count,tournaments_worked,export_timestamp\n';
  }

  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(value => {
      // Escape values that contain commas or quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  return [headers, ...rows].join('\n');
}

/**
 * Generate filename for export
 */
function generateFilename(params: ExportParams): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '');
  
  let filename = `referee-analytics-${dateStr}-${timeStr}`;
  
  if (params.tournamentCode) {
    filename += `-${params.tournamentCode}`;
  }
  
  if (params.federationCode) {
    filename += `-${params.federationCode}`;
  }
  
  filename += `.${params.format}`;
  
  return filename;
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

    // Parse and validate parameters
    const url = new URL(req.url);
    const params = parseExportParams(url);

    console.log(`Export request: ${params.format} format, ${params.startDate} to ${params.endDate}`);

    // Execute query
    const data = await executeExportQuery(supabase, params);
    const duration = Math.round(performance.now() - startTime);

    // Generate filename
    const filename = generateFilename(params);

    // Format response based on requested format
    if (params.format === 'csv') {
      const csvData = formatAsCSV(data);
      
      return new Response(csvData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Export-Count': data.length.toString(),
          'X-Performance-Ms': duration.toString(),
        },
        status: 200,
      });
    } else {
      // JSON format
      return new Response(
        JSON.stringify({
          data: data,
          meta: {
            format: 'json',
            count: data.length,
            filters: {
              startDate: params.startDate.split('T')[0],
              endDate: params.endDate.split('T')[0],
              tournamentCode: params.tournamentCode,
              federationCode: params.federationCode,
            },
            export: {
              filename: filename,
              timestamp: new Date().toISOString(),
            },
            performance: {
              duration_ms: duration,
            },
          }
        }, null, 2), // Pretty print JSON
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'X-Export-Count': data.length.toString(),
            'X-Performance-Ms': duration.toString(),
          },
          status: 200,
        }
      );
    }

  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    console.error('Export error:', error);

    let statusCode = 500;
    let errorMessage = error.message || 'Internal server error';

    // Handle specific error types
    if (errorMessage.includes('parameter') || errorMessage.includes('Invalid') || errorMessage.includes('format')) {
      statusCode = 400; // Bad Request
    }

    return new Response(
      JSON.stringify({
        error: 'Export failed',
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