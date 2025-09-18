// Error logging and classification service
// Story 2.3: Comprehensive error handling and classification

import { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import {
  SyncErrorLog,
  ErrorType,
  ErrorSeverity,
  NetworkErrorContext,
  AuthErrorContext,
  APIErrorContext,
  DatabaseErrorContext,
  isNetworkErrorContext,
  isAuthErrorContext,
  isAPIErrorContext,
  isDatabaseErrorContext
} from '../types/monitoring'

export class ErrorLogger {
  private static instance: ErrorLogger | null = null;
  private supabase: SupabaseClient | null = null;

  private constructor() {
    // Use the shared Supabase client instead of creating a new one
    this.supabase = supabase;

    if (!this.supabase) {
      console.warn('ErrorLogger: Supabase client not available, error logging will be disabled');
    }
  }

  /**
   * Get the singleton instance of ErrorLogger
   */
  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with automatic classification and severity assessment
   */
  async logError(params: {
    entity_type: string
    tournament_no?: string
    error: Error | string
    context?: Record<string, any>
    recovery_suggestion?: string
  }): Promise<string> {
    const errorMessage = typeof params.error === 'string' ? params.error : (params.error?.message || params.error?.toString() || 'Unknown error')
    const errorStack = typeof params.error === 'object' && params.error.stack ? params.error.stack : undefined

    // Classify error type and severity
    const { errorType, severity } = this.classifyError(errorMessage, params.context)

    // Generate recovery suggestion if not provided
    const recoverySuggestion = params.recovery_suggestion || this.generateRecoverySuggestion(errorType, errorMessage)

    // Prepare error context with stack trace
    const errorContext = {
      ...params.context,
      stack_trace: errorStack,
      classification_confidence: this.getClassificationConfidence(errorMessage, params.context),
      auto_classified: true
    }

    const errorLog: Omit<SyncErrorLog, 'id' | 'occurred_at'> = {
      entity_type: params.entity_type,
      tournament_no: params.tournament_no,
      error_type: errorType,
      error_severity: severity,
      error_message: errorMessage,
      error_context: errorContext,
      recovery_suggestion: recoverySuggestion
    }

    // If Supabase is not available, log to console only
    if (!this.supabase) {
      console.warn('ErrorLogger: Supabase not available, logging to console only');
      console.error('Error:', errorLog);
      return 'console-logged';
    }

    try {
      const { data, error } = await this.supabase
        .from('sync_error_log')
        .insert([errorLog])
        .select('id')
        .single()

      if (error) throw error

      // Update entity error count
      await this.updateEntityErrorCount(params.entity_type)

      return data.id
    } catch (dbError) {
      // Fallback logging to console if database fails
      // console.error('Failed to log error to database:', dbError)
      // console.error('Original error:', errorLog)
      
      // Try to log the database error itself
      try {
        await this.logDatabaseError('error_logger', dbError as Error, {
          original_error: errorLog,
          operation: 'insert_error_log'
        })
      } catch {
        // Ultimate fallback - just console log
        // console.error('Complete error logging failure')
      }

      return 'error_log_failed'
    }
  }

  /**
   * Log network-related errors with detailed context
   */
  async logNetworkError(params: {
    entity_type: string
    tournament_no?: string
    url: string
    method: string
    status_code?: number
    timeout_ms?: number
    retry_attempt: number
    response_time_ms?: number
    error_message: string
  }): Promise<string> {
    const context: NetworkErrorContext = {
      url: params.url,
      method: params.method,
      status_code: params.status_code,
      timeout_ms: params.timeout_ms,
      retry_attempt: params.retry_attempt,
      response_time_ms: params.response_time_ms
    }

    return this.logError({
      entity_type: params.entity_type,
      tournament_no: params.tournament_no,
      error: params.error_message,
      context,
      recovery_suggestion: this.getNetworkErrorRecovery(params.status_code, params.retry_attempt)
    })
  }

  /**
   * Log authentication errors with specific context
   */
  async logAuthError(params: {
    entity_type: string
    tournament_no?: string
    auth_method: 'jwt' | 'request_level'
    credential_type: string
    token_expired: boolean
    retry_attempt: number
    error_message: string
  }): Promise<string> {
    const context: AuthErrorContext = {
      auth_method: params.auth_method,
      credential_type: params.credential_type,
      token_expired: params.token_expired,
      retry_attempt: params.retry_attempt
    }

    return this.logError({
      entity_type: params.entity_type,
      tournament_no: params.tournament_no,
      error: params.error_message,
      context,
      recovery_suggestion: this.getAuthErrorRecovery(params.auth_method, params.token_expired)
    })
  }

  /**
   * Log API-related errors with request/response details
   */
  async logAPIError(params: {
    entity_type: string
    tournament_no?: string
    endpoint: string
    request_payload?: Record<string, any>
    response_status?: number
    response_body?: string
    parsing_error?: string
    error_message: string
  }): Promise<string> {
    const context: APIErrorContext = {
      endpoint: params.endpoint,
      request_payload: params.request_payload,
      response_status: params.response_status,
      response_body: params.response_body,
      parsing_error: params.parsing_error
    }

    return this.logError({
      entity_type: params.entity_type,
      tournament_no: params.tournament_no,
      error: params.error_message,
      context,
      recovery_suggestion: this.getAPIErrorRecovery(params.response_status, params.parsing_error)
    })
  }

  /**
   * Log database-related errors
   */
  async logDatabaseError(entity_type: string, error: Error, context?: {
    query_type?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT'
    table_name?: string
    constraint_violation?: string
    connection_error?: boolean
    deadlock?: boolean
    [key: string]: any
  }): Promise<string> {
    const dbContext: DatabaseErrorContext = {
      query_type: context?.query_type || 'SELECT',
      table_name: context?.table_name,
      constraint_violation: context?.constraint_violation,
      connection_error: context?.connection_error || false,
      deadlock: context?.deadlock || false,
      ...context
    }

    // For database errors, log directly to avoid recursion
    const errorLog = {
      entity_type,
      error_type: 'DATABASE' as ErrorType,
      error_severity: this.getDatabaseErrorSeverity(error.message, dbContext),
      error_message: error.message,
      error_context: { ...dbContext, stack_trace: error.stack },
      recovery_suggestion: this.getDatabaseErrorRecovery(error.message, dbContext)
    }

    // Use a different table or console for database errors to avoid recursion
    // console.error('Database error logged:', errorLog)
    
    // If Supabase is not available, log to console only
    if (!this.supabase) {
      console.warn('ErrorLogger: Database error logged to console only');
      console.error('Database Error:', errorLog);
      return 'db_error_console_only';
    }

    try {
      const { data } = await this.supabase
        .from('sync_error_log')
        .insert([errorLog])
        .select('id')
        .single()

      return data?.id || 'db_error_logged'
    } catch {
      return 'db_error_console_only'
    }
  }

  /**
   * Classify error based on message and context
   */
  private classifyError(message: string, context?: Record<string, any>): {
    errorType: ErrorType
    severity: ErrorSeverity
  } {
    const lowerMessage = message.toLowerCase()

    // Network errors
    if (lowerMessage.includes('network') || 
        lowerMessage.includes('connection') ||
        lowerMessage.includes('timeout') ||
        lowerMessage.includes('fetch') ||
        lowerMessage.includes('enotfound') ||
        isNetworkErrorContext(context)) {
      return {
        errorType: 'NETWORK',
        severity: this.getNetworkErrorSeverity(message, context)
      }
    }

    // Authentication errors
    if (lowerMessage.includes('auth') ||
        lowerMessage.includes('unauthorized') ||
        lowerMessage.includes('forbidden') ||
        lowerMessage.includes('token') ||
        lowerMessage.includes('credential') ||
        isAuthErrorContext(context)) {
      return {
        errorType: 'AUTH',
        severity: 'HIGH' // Auth errors are always high severity
      }
    }

    // API errors
    if (lowerMessage.includes('api') ||
        lowerMessage.includes('http') ||
        lowerMessage.includes('status') ||
        lowerMessage.includes('response') ||
        isAPIErrorContext(context)) {
      return {
        errorType: 'API',
        severity: this.getAPIErrorSeverity(message, context)
      }
    }

    // Database errors
    if (lowerMessage.includes('database') ||
        lowerMessage.includes('sql') ||
        lowerMessage.includes('constraint') ||
        lowerMessage.includes('deadlock') ||
        isDatabaseErrorContext(context)) {
      return {
        errorType: 'DATABASE',
        severity: this.getDatabaseErrorSeverity(message, context)
      }
    }

    // Validation errors
    if (lowerMessage.includes('validation') ||
        lowerMessage.includes('invalid') ||
        lowerMessage.includes('format') ||
        lowerMessage.includes('parse') ||
        lowerMessage.includes('schema')) {
      return {
        errorType: 'VALIDATION',
        severity: 'MEDIUM'
      }
    }

    // Timeout errors
    if (lowerMessage.includes('timeout') ||
        lowerMessage.includes('exceeded') ||
        lowerMessage.includes('deadline')) {
      return {
        errorType: 'TIMEOUT',
        severity: 'MEDIUM'
      }
    }

    // Default classification
    return {
      errorType: 'API', // Default to API error
      severity: 'MEDIUM'
    }
  }

  private getNetworkErrorSeverity(message: string, context?: Record<string, any>): ErrorSeverity {
    const statusCode = isNetworkErrorContext(context) ? context.status_code : undefined
    
    if (!statusCode) return 'HIGH' // No response at all
    if (statusCode >= 500) return 'HIGH' // Server errors
    if (statusCode >= 400) return 'MEDIUM' // Client errors
    return 'LOW'
  }

  private getAPIErrorSeverity(message: string, context?: Record<string, any>): ErrorSeverity {
    const statusCode = isAPIErrorContext(context) ? context.response_status : undefined
    
    if (!statusCode) return 'HIGH'
    if (statusCode >= 500) return 'HIGH'
    if (statusCode === 401 || statusCode === 403) return 'HIGH' // Auth issues
    if (statusCode >= 400) return 'MEDIUM'
    return 'LOW'
  }

  private getDatabaseErrorSeverity(message: string, context?: Record<string, any> | DatabaseErrorContext): ErrorSeverity {
    const lowerMessage = message.toLowerCase()
    const dbContext = isDatabaseErrorContext(context) ? context : undefined
    
    if (dbContext?.connection_error || lowerMessage.includes('connection')) return 'CRITICAL'
    if (dbContext?.deadlock || lowerMessage.includes('deadlock')) return 'HIGH'
    if (dbContext?.constraint_violation || lowerMessage.includes('constraint')) return 'MEDIUM'
    if (lowerMessage.includes('duplicate') || lowerMessage.includes('unique')) return 'LOW'
    return 'MEDIUM'
  }

  private generateRecoverySuggestion(errorType: ErrorType, message: string): string {
    switch (errorType) {
      case 'NETWORK':
        return 'Check network connectivity and retry with exponential backoff. Verify API endpoint availability.'
      case 'AUTH':
        return 'Refresh authentication credentials. Check token expiration and credential validity.'
      case 'API':
        return 'Verify API request format and endpoint. Check for API rate limits or service degradation.'
      case 'DATABASE':
        return 'Check database connectivity and query syntax. Verify constraint requirements.'
      case 'TIMEOUT':
        return 'Increase timeout duration or optimize query performance. Consider breaking large operations into batches.'
      case 'VALIDATION':
        return 'Verify data format and schema compliance. Check for required fields and data types.'
      case 'INFO':
        return 'No action required. This is an informational log entry.'
      default:
        return 'Review error details and context. Consider implementing retry logic with backoff.'
    }
  }

  private getNetworkErrorRecovery(statusCode?: number, retryAttempt?: number): string {
    if (!statusCode) return 'Check network connectivity and retry after delay.'
    if (statusCode >= 500) return 'Server error detected. Retry with exponential backoff.'
    if (statusCode === 429) return 'Rate limit exceeded. Implement longer delay before retry.'
    if (statusCode >= 400) return 'Client error. Review request format and parameters.'
    return 'Verify network stability and endpoint availability.'
  }

  private getAuthErrorRecovery(authMethod: string, tokenExpired: boolean): string {
    if (tokenExpired) return 'Token expired. Refresh authentication token and retry.'
    if (authMethod === 'jwt') return 'JWT authentication failed. Verify token generation and signing.'
    return 'Authentication failed. Check credentials and authentication method.'
  }

  private getAPIErrorRecovery(statusCode?: number, parsingError?: string): string {
    if (parsingError) return 'Response parsing failed. Verify response format and parser implementation.'
    if (!statusCode) return 'No API response received. Check endpoint availability.'
    if (statusCode >= 500) return 'API server error. Implement retry with backoff.'
    if (statusCode >= 400) return 'API request error. Verify request format and parameters.'
    return 'API call successful but may have unexpected response format.'
  }

  private getDatabaseErrorRecovery(message: string, context: DatabaseErrorContext): string {
    if (context.connection_error) return 'Database connection failed. Check connection pool and network.'
    if (context.deadlock) return 'Database deadlock detected. Retry operation after brief delay.'
    if (context.constraint_violation) return 'Constraint violation. Verify data integrity and foreign key relationships.'
    return 'Database operation failed. Review query and data validity.'
  }

  private getClassificationConfidence(message: string, context?: Record<string, any>): number {
    let confidence = 0.5 // Base confidence
    
    // Increase confidence based on context
    if (context && Object.keys(context).length > 0) confidence += 0.2
    if (isNetworkErrorContext(context) || isAuthErrorContext(context) || 
        isAPIErrorContext(context) || isDatabaseErrorContext(context)) confidence += 0.3
    
    // Increase confidence based on message keywords
    const keywords = ['network', 'auth', 'database', 'api', 'timeout', 'validation']
    const foundKeywords = keywords.filter(keyword => message.toLowerCase().includes(keyword))
    confidence += foundKeywords.length * 0.1
    
    return Math.min(confidence, 1.0)
  }

  private async updateEntityErrorCount(entityType: string): Promise<void> {
    if (!this.supabase) {
      console.warn('ErrorLogger: Cannot update entity error count, Supabase not available');
      return;
    }

    try {
      await this.supabase
        .from('sync_status')
        .update({
          error_count: this.supabase.rpc('increment', { column: 'error_count' }),
          updated_at: new Date().toISOString()
        })
        .eq('entity_type', entityType)
    } catch (error) {
      // console.error('Failed to update entity error count:', error)
    }
  }

  /**
   * Resolve an error after it has been fixed
   */
  async resolveError(errorId: string, resolutionNotes: string): Promise<boolean> {
    if (!this.supabase) {
      console.warn('ErrorLogger: Cannot resolve error, Supabase not available');
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('sync_error_log')
        .update({
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes
        })
        .eq('id', errorId)

      return !error
    } catch {
      return false
    }
  }

  /**
   * Get error statistics for monitoring dashboard
   */
  async getErrorStatistics(params: {
    entity_type?: string
    time_window_hours?: number
    severity?: ErrorSeverity[]
  } = {}): Promise<{
    total_errors: number
    errors_by_type: Record<ErrorType, number>
    errors_by_severity: Record<ErrorSeverity, number>
    resolution_rate: number
    avg_resolution_time_hours: number
  }> {
    const timeWindow = params.time_window_hours || 24
    const cutoffTime = new Date(Date.now() - timeWindow * 60 * 60 * 1000).toISOString()

    // If Supabase is not available, return empty statistics
    if (!this.supabase) {
      console.warn('ErrorLogger: Cannot get error statistics, Supabase not available');
      return this.getEmptyStatistics();
    }

    try {
      let query = this.supabase
        .from('sync_error_log')
        .select('error_type, error_severity, resolved_at, occurred_at')
        .gte('occurred_at', cutoffTime)

      if (params.entity_type) {
        query = query.eq('entity_type', params.entity_type)
      }

      if (params.severity && params.severity.length > 0) {
        query = query.in('error_severity', params.severity)
      }

      const { data, error } = await query

      if (error || !data) {
        // console.error('Error fetching statistics:', error)
        return this.getEmptyStatistics()
      }

      const totalErrors = data.length
      const resolvedErrors = data.filter(e => e.resolved_at).length

      const errorsByType = data.reduce((acc, error) => {
        acc[error.error_type] = (acc[error.error_type] || 0) + 1
        return acc
      }, {} as Record<ErrorType, number>)

      const errorsBySeverity = data.reduce((acc, error) => {
        acc[error.error_severity] = (acc[error.error_severity] || 0) + 1
        return acc
      }, {} as Record<ErrorSeverity, number>)

      const avgResolutionTime = this.calculateAvgResolutionTime(data)

      return {
        total_errors: totalErrors,
        errors_by_type: errorsByType,
        errors_by_severity: errorsBySeverity,
        resolution_rate: totalErrors > 0 ? resolvedErrors / totalErrors : 0,
        avg_resolution_time_hours: avgResolutionTime
      }
    } catch (error) {
      // console.error('Failed to get error statistics:', error)
      return this.getEmptyStatistics()
    }
  }

  private calculateAvgResolutionTime(errors: any[]): number {
    const resolvedErrors = errors.filter(e => e.resolved_at)
    if (resolvedErrors.length === 0) return 0

    const totalResolutionTime = resolvedErrors.reduce((sum, error) => {
      const occurred = new Date(error.occurred_at).getTime()
      const resolved = new Date(error.resolved_at).getTime()
      return sum + (resolved - occurred)
    }, 0)

    return totalResolutionTime / resolvedErrors.length / (1000 * 60 * 60) // Convert to hours
  }

  private getEmptyStatistics() {
    return {
      total_errors: 0,
      errors_by_type: {} as Record<ErrorType, number>,
      errors_by_severity: {} as Record<ErrorSeverity, number>,
      resolution_rate: 0,
      avg_resolution_time_hours: 0
    }
  }
}