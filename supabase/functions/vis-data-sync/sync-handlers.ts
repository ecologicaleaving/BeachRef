import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Re-export interfaces that will be used by sync handlers
export interface SyncResponse {
  success: boolean;
  synced: number;
  errors: number;
  duration: number;
  message: string;
}

export interface SyncStats {
  created: number;
  updated: number;
  errors: number;
  skipped: number;
}

/**
 * Fetch data from VIS Adapter with error handling and retries
 */
export async function fetchFromVisAdapter(url: string, retries = 3): Promise<any> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`VIS Adapter request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error as Error;
      console.warn(`VIS Adapter request attempt ${attempt + 1} failed:`, error);
      
      // Wait before retry (exponential backoff)
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw new Error(`VIS Adapter request failed after ${retries} attempts: ${lastError.message}`);
}

/**
 * Validate data consistency between VIS source and database record
 */
export function validateDataConsistency(visData: any, dbData: any, keyFields: string[]): boolean {
  for (const field of keyFields) {
    if (visData[field] !== dbData[field]) {
      console.warn(`Data consistency check failed for field '${field}': VIS='${visData[field]}' vs DB='${dbData[field]}'`);
      return false;
    }
  }
  return true;
}

/**
 * Calculate performance metrics for sync operations
 */
export function calculateSyncMetrics(startTime: number, stats: SyncStats): SyncResponse {
  const duration = Date.now() - startTime;
  const totalProcessed = stats.created + stats.updated + stats.errors + stats.skipped;
  const successCount = stats.created + stats.updated;
  
  return {
    success: stats.errors === 0 && totalProcessed > 0,
    synced: successCount,
    errors: stats.errors,
    duration,
    message: `Processed ${totalProcessed} records: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`,
  };
}

/**
 * Batch upsert helper for efficient database operations
 */
export async function batchUpsert(
  supabase: SupabaseClient,
  table: string,
  records: any[],
  conflictColumns: string[],
  batchSize = 50
): Promise<SyncStats> {
  const stats: SyncStats = { created: 0, updated: 0, errors: 0, skipped: 0 };
  
  if (records.length === 0) {
    return stats;
  }

  // Process records in batches for better performance
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from(table)
        .upsert(batch, {
          onConflict: conflictColumns.join(','),
        })
        .select();

      if (error) {
        console.error(`Batch upsert error for ${table}:`, error);
        stats.errors += batch.length;
        continue;
      }

      // Note: Supabase doesn't distinguish between created/updated in upsert
      // We'll count all successful operations as "synced"
      stats.created += data?.length || batch.length;
      
    } catch (error) {
      console.error(`Batch upsert exception for ${table}:`, error);
      stats.errors += batch.length;
    }
  }
  
  return stats;
}

/**
 * Log sync operation for monitoring and debugging
 */
export async function logSyncOperation(
  supabase: SupabaseClient,
  operation: string,
  result: SyncResponse,
  details?: any
): Promise<void> {
  try {
    // This would log to a sync_logs table if it exists
    // For now, we'll just console log
    console.info(`Sync Operation: ${operation}`, {
      timestamp: new Date().toISOString(),
      operation,
      success: result.success,
      synced: result.synced,
      errors: result.errors,
      duration: result.duration,
      details: details || {},
    });
  } catch (error) {
    console.error('Failed to log sync operation:', error);
    // Don't throw - logging failure shouldn't break sync
  }
}