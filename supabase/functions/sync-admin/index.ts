// Manual Sync Admin API
// Story 2.3: Emergency sync triggers and admin capabilities

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SyncQueueManager } from './sync-queue-manager.ts'
import { AuditLogger } from './audit-logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

interface ManualSyncRequest {
  entity_type: 'tournaments' | 'matches_schedule'
  tournament_no?: string
  priority: 'NORMAL' | 'HIGH' | 'EMERGENCY'
  triggered_by: string
  reason: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const endpoint = url.pathname.split('/').pop() || 'manual-trigger'

    console.log(`Sync admin API called: ${endpoint}`)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Initialize services
    const syncQueueManager = new SyncQueueManager(supabase)
    const auditLogger = new AuditLogger(supabase)

    let responseData: any

    switch (endpoint) {
      case 'manual-trigger':
        if (req.method !== 'POST') {
          throw new Error('Manual trigger requires POST method')
        }
        
        const triggerRequest: ManualSyncRequest = await req.json()
        responseData = await handleManualTrigger(syncQueueManager, auditLogger, triggerRequest)
        break

      case 'sync-status':
        const jobId = url.searchParams.get('job_id')
        if (!jobId) {
          throw new Error('job_id parameter required for sync status')
        }
        responseData = await syncQueueManager.getSyncJobStatus(jobId)
        break

      case 'queue-status':
        responseData = await syncQueueManager.getQueueStatus()
        break

      case 'cancel-sync':
        if (req.method !== 'POST') {
          throw new Error('Cancel sync requires POST method')
        }
        
        const cancelRequest = await req.json()
        responseData = await handleSyncCancellation(syncQueueManager, auditLogger, cancelRequest)
        break

      case 'sync-history':
        const hours = parseInt(url.searchParams.get('hours') || '24')
        const entityType = url.searchParams.get('entity_type')
        responseData = await auditLogger.getSyncHistory(hours, entityType)
        break

      case 'test-connectivity':
        responseData = await testSystemConnectivity(supabase)
        break

      default:
        return new Response(JSON.stringify({
          error: 'Unknown endpoint',
          available_endpoints: [
            'manual-trigger (POST)',
            'sync-status?job_id=<id>',
            'queue-status',
            'cancel-sync (POST)',
            'sync-history?hours=<n>&entity_type=<type>',
            'test-connectivity'
          ]
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    return new Response(JSON.stringify({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
      endpoint
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Sync admin API error:', error)

    // Log the error
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      await supabase.from('sync_error_log').insert([{
        entity_type: 'sync_admin',
        error_type: 'API',
        error_severity: 'MEDIUM',
        error_message: `Sync admin API error: ${error.message}`,
        error_context: {
          stack_trace: error.stack,
          function: 'sync-admin',
          url: req.url,
          method: req.method
        },
        recovery_suggestion: 'Check sync admin API function logs and request parameters'
      }])
    } catch (logError) {
      console.error('Failed to log sync admin error:', logError)
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

/**
 * Handle manual sync trigger request
 */
async function handleManualTrigger(
  syncQueueManager: SyncQueueManager,
  auditLogger: AuditLogger,
  request: ManualSyncRequest
): Promise<any> {
  // Validate request
  if (!request.entity_type || !request.triggered_by || !request.reason) {
    throw new Error('Missing required fields: entity_type, triggered_by, reason')
  }

  if (!['tournaments', 'matches_schedule'].includes(request.entity_type)) {
    throw new Error('Invalid entity_type. Must be: tournaments, matches_schedule')
  }

  if (!['NORMAL', 'HIGH', 'EMERGENCY'].includes(request.priority)) {
    throw new Error('Invalid priority. Must be: NORMAL, HIGH, EMERGENCY')
  }

  console.log(`Manual sync trigger requested:`, {
    entity_type: request.entity_type,
    tournament_no: request.tournament_no,
    priority: request.priority,
    triggered_by: request.triggered_by,
    reason: request.reason
  })

  // Create sync job
  const syncJobId = await syncQueueManager.createSyncJob({
    entity_type: request.entity_type,
    tournament_no: request.tournament_no,
    priority: request.priority,
    triggered_by: request.triggered_by,
    reason: request.reason
  })

  // Log the manual trigger
  await auditLogger.logManualTrigger({
    sync_job_id: syncJobId,
    entity_type: request.entity_type,
    tournament_no: request.tournament_no,
    priority: request.priority,
    triggered_by: request.triggered_by,
    trigger_reason: request.reason
  })

  // Execute the sync job
  const executionResult = await syncQueueManager.executeSyncJob(syncJobId)

  return {
    sync_job_id: syncJobId,
    status: executionResult.status,
    estimated_completion: executionResult.estimated_completion,
    progress: executionResult.progress,
    message: `Manual sync ${request.priority.toLowerCase()} priority job created and executed`,
    triggered_at: new Date().toISOString()
  }
}

/**
 * Handle sync cancellation request
 */
async function handleSyncCancellation(
  syncQueueManager: SyncQueueManager,
  auditLogger: AuditLogger,
  request: { job_id: string; cancelled_by: string; reason: string }
): Promise<any> {
  if (!request.job_id || !request.cancelled_by || !request.reason) {
    throw new Error('Missing required fields: job_id, cancelled_by, reason')
  }

  const result = await syncQueueManager.cancelSyncJob(request.job_id)

  // Log the cancellation
  await auditLogger.logSyncCancellation({
    sync_job_id: request.job_id,
    cancelled_by: request.cancelled_by,
    cancellation_reason: request.reason
  })

  return {
    job_id: request.job_id,
    cancelled: result.success,
    message: result.message,
    cancelled_at: new Date().toISOString()
  }
}

/**
 * Test system connectivity for admin diagnostics
 */
async function testSystemConnectivity(supabase: any): Promise<any> {
  const results: any = {
    database: { status: 'UNKNOWN', response_time_ms: 0 },
    sync_functions: {},
    external_apis: {}
  }

  // Test database connectivity
  const dbStart = Date.now()
  try {
    const { error} = await supabase
      .from('sync_status')
      .select('count(*)')
      .single()

    results.database = {
      status: error ? 'ERROR' : 'HEALTHY',
      response_time_ms: Date.now() - dbStart,
      error: error?.message
    }
  } catch (error) {
    results.database = {
      status: 'ERROR',
      response_time_ms: Date.now() - dbStart,
      error: error.message
    }
  }

  // Test sync function endpoints
  const syncFunctions = ['tournament-master-sync', 'match-schedule-sync']
  
  for (const func of syncFunctions) {
    const funcStart = Date.now()
    try {
      const response = await fetch(
        `https://${Deno.env.get('SUPABASE_PROJECT_REF')}.supabase.co/functions/v1/${func}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ test: true })
        }
      )

      results.sync_functions[func] = {
        status: response.ok ? 'HEALTHY' : 'ERROR',
        response_time_ms: Date.now() - funcStart,
        http_status: response.status
      }
    } catch (error) {
      results.sync_functions[func] = {
        status: 'ERROR',
        response_time_ms: Date.now() - funcStart,
        error: error.message
      }
    }
  }

  // Test FIVB API connectivity (basic ping)
  const apiStart = Date.now()
  try {
    const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'GET',
      headers: { 'User-Agent': 'Supabase-Sync-Monitor/1.0' }
    })

    results.external_apis.fivb = {
      status: response.ok ? 'HEALTHY' : 'WARNING',
      response_time_ms: Date.now() - apiStart,
      http_status: response.status
    }
  } catch (error) {
    results.external_apis.fivb = {
      status: 'ERROR',
      response_time_ms: Date.now() - apiStart,
      error: error.message
    }
  }

  // Calculate overall status
  const allStatuses = [
    results.database.status,
    ...Object.values(results.sync_functions).map((f: any) => f.status),
    ...Object.values(results.external_apis).map((a: any) => a.status)
  ]

  results.overall_status = allStatuses.includes('ERROR') ? 'ERROR' : 
                          allStatuses.includes('WARNING') ? 'WARNING' : 'HEALTHY'

  return results
}