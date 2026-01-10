/**
 * @fileoverview Unified VIS API Client v2
 * Replaces complex 3-endpoint fallback logic with optimized unified client
 * Part of EPIC-007 Data Architecture Restructuration
 */

import {
  IVisApiClient,
  VisApiClientConfig,
  VisApiResponse,
  VisApiSuccessResponse,
  VisApiErrorResponse,
  GetEventListRequest,
  GetBeachTournamentListRequest,
  GetBeachTournamentRequest,
  GetEventRequest,
  GetBeachMatchListRequest,
  GetBeachMatchRequest,
  GetBeachRoundRequest,
  GetBeachRoundListRequest,
  GetBeachLiveRequest,
  GetEventOfficialListRequest,
  GetEventRefereeListRequest,
  BatchRequest,
  BatchResponse,
  BatchRequestItem,
  BatchResponseItem,
  TournamentDetailBatchRequest,
  VisApiEndpoint,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_FIELD_SELECTIONS,
  SLIM_FIELD_SELECTIONS,
  FieldSelectionMode,
  FieldSelectionStrategy,
  RequestMonitor
} from '../../types/api-v2';
import { pollingPerformanceMonitor } from '../PollingPerformanceMonitor';
import { v4 as uuidv4 } from 'uuid';
import { ApiRequest, NetworkType, RequestSource } from '../../types/audit';
import { errorTransformService } from '../ErrorTransformService';
import { APIErrorState } from '../../types';

// Platform detection
const isWebEnvironment = typeof window !== 'undefined';

// VIS API Optimization: Audit service integration (T016)
// Conditional imports for audit services (only in __DEV__, not on web)
let ApiAuditService: any = null;
let AuditStorageService: any = null;

if (__DEV__ && !isWebEnvironment) {
  try {
    const auditModule = require('../monitoring/ApiAuditService');
    ApiAuditService = auditModule.ApiAuditService;
  } catch (e) {
    console.warn('[VisApiClient] ApiAuditService not available');
  }

  try {
    const storageModule = require('../monitoring/AuditStorageService');
    AuditStorageService = storageModule.AuditStorageService;
  } catch (e) {
    console.warn('[VisApiClient] AuditStorageService not available');
  }
}

/**
 * Unified VIS API Client implementation
 * Simplifies from 3 complex endpoints to single optimized primary endpoint strategy
 */
export class VisApiClient implements IVisApiClient {
  private readonly config: VisApiClientConfig;
  private readonly retryConfig: RetryConfig;
  private monitor: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTimeMs: number;
    requestsByEndpoint: Record<VisApiEndpoint, number>;
    errorsByType: Record<string, number>;
    lastRequestTimestamp: string;
  };

  constructor(config: VisApiClientConfig, retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.config = config;
    this.retryConfig = retryConfig;
    this.monitor = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTimeMs: 0,
      requestsByEndpoint: {
        [VisApiEndpoint.GET_EVENT_LIST]: 0,
        [VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST]: 0,
        [VisApiEndpoint.GET_BEACH_TOURNAMENT]: 0,
        [VisApiEndpoint.GET_EVENT]: 0,
        [VisApiEndpoint.GET_BEACH_MATCH_LIST]: 0,
        [VisApiEndpoint.GET_BEACH_MATCH]: 0,
        [VisApiEndpoint.GET_BEACH_ROUND]: 0,
        [VisApiEndpoint.GET_BEACH_ROUND_LIST]: 0,
        [VisApiEndpoint.GET_BEACH_LIVE]: 0,
        [VisApiEndpoint.BATCH_REQUEST]: 0,
        [VisApiEndpoint.GET_EVENT_OFFICIAL_LIST]: 0,
        [VisApiEndpoint.GET_EVENT_REFEREE_LIST]: 0
      },
      errorsByType: {},
      lastRequestTimestamp: new Date().toISOString()
    };
  }

  /**
   * Get optimized field selection based on context and mode
   * @param endpoint - API endpoint
   * @param strategy - Field selection strategy
   * @returns Optimized field array
   */
  getOptimizedFields(endpoint: VisApiEndpoint, strategy: FieldSelectionStrategy): readonly string[] {
    let fields: readonly string[];
    
    switch (strategy.mode) {
      case FieldSelectionMode.SLIM:
        fields = SLIM_FIELD_SELECTIONS[endpoint];
        break;
      
      case FieldSelectionMode.CUSTOM:
        fields = strategy.customFields || DEFAULT_FIELD_SELECTIONS[endpoint];
        break;
      
      case FieldSelectionMode.FULL:
      default:
        // Context-aware optimization for FULL mode
        if (strategy.contextHint === 'list') {
          // For list views, use tournament list optimizations
          fields = this.getListOptimizedFields(endpoint);
        } else {
          fields = DEFAULT_FIELD_SELECTIONS[endpoint];
        }
        break;
    }
    
    // Record field optimization for performance monitoring
    const defaultFields = DEFAULT_FIELD_SELECTIONS[endpoint];
    const fieldsSaved = defaultFields.length - fields.length;
    const estimatedBytesSaved = fieldsSaved * this.getEstimatedBytesPerField(endpoint);
    
    if (fieldsSaved > 0) {
      pollingPerformanceMonitor.recordFieldOptimization(
        endpoint,
        strategy.mode,
        fields.length,
        estimatedBytesSaved
      );
    }
    
    return fields;
  }
  
  /**
   * Estimate bytes per field for bandwidth calculation
   * @param endpoint - API endpoint
   * @returns Estimated bytes per field
   */
  private getEstimatedBytesPerField(endpoint: VisApiEndpoint): number {
    // Average field sizes based on typical VIS API responses
    switch (endpoint) {
      case VisApiEndpoint.GET_EVENT_LIST:
        return 50;
      case VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST:
        return 45;
      case VisApiEndpoint.GET_BEACH_TOURNAMENT:
        return 60;
      case VisApiEndpoint.GET_EVENT:
        return 40;
      case VisApiEndpoint.GET_BEACH_MATCH_LIST:
        return 55;
      case VisApiEndpoint.GET_BEACH_MATCH:
        return 75;
      case VisApiEndpoint.GET_BEACH_ROUND:
        return 35;
      case VisApiEndpoint.GET_BEACH_ROUND_LIST:
        return 30;
      case VisApiEndpoint.GET_BEACH_LIVE:
        return 80;
      case VisApiEndpoint.BATCH_REQUEST:
        return 100;
      default:
        return 50;
    }
  }

  /**
   * Get list-optimized field selection for tournament browsing
   * @param endpoint - API endpoint
   * @returns List-optimized field array
   */
  private getListOptimizedFields(endpoint: VisApiEndpoint): readonly string[] {
    switch (endpoint) {
      case VisApiEndpoint.GET_EVENT_LIST:
        return ['No', 'Name', 'City', 'CountryCode', 'StartDate', 'EndDate', 'Status', 'Gender'];
      
      case VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST:
        return ['No', 'Name', 'CountryCode', 'City', 'StartDate', 'EndDate', 'Status'];
      
      case VisApiEndpoint.GET_BEACH_MATCH_LIST:
        return ['MatchNo', 'DateTime', 'Status', 'Court'];
      
      default:
        return DEFAULT_FIELD_SELECTIONS[endpoint];
    }
  }

  /**
   * Get event list (primary endpoint)
   * Optimized with field selection for performance
   */
  async getEventList(request: GetEventListRequest): Promise<VisApiResponse> {
    const startTime = Date.now();
    
    try {
      // Build optimized request with field selection
      const optimizedRequest = {
        ...request,
        fields: request.fields || DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_LIST]
      };

      const xmlRequest = this.buildGetEventListXml(optimizedRequest);
      const response = await this.executeRequest(VisApiEndpoint.GET_EVENT_LIST, xmlRequest);
      
      // Response validation and processing
      
      this.updateMonitor(VisApiEndpoint.GET_EVENT_LIST, true, Date.now() - startTime);
      return response;
      
    } catch (error) {
      this.updateMonitor(VisApiEndpoint.GET_EVENT_LIST, false, Date.now() - startTime);
      return this.createErrorResponse(error, Date.now() - startTime);
    }
  }

  /**
   * Get beach tournament list (VIS compliant endpoint)
   * Optimized with field selection for performance
   */
  async getBeachTournamentList(request: GetBeachTournamentListRequest): Promise<VisApiResponse> {
    const startTime = Date.now();
    
    try {
      // Build optimized request with field selection
      const optimizedRequest = {
        ...request,
        fields: request.fields || DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST]
      };

      const xmlRequest = this.buildGetBeachTournamentListXml(optimizedRequest);
      const response = await this.executeRequest(VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST, xmlRequest);
      
      this.updateMonitor(VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST, true, Date.now() - startTime);
      return response;
      
    } catch (error) {
      this.updateMonitor(VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST, false, Date.now() - startTime);
      return this.createErrorResponse(error, Date.now() - startTime);
    }
  }

  /**
   * Get beach tournament details (fallback endpoint)
   * Used only for location details not available in GetEventList
   */
  async getBeachTournament(request: GetBeachTournamentRequest): Promise<VisApiResponse> {
    const startTime = Date.now();

    try {
      const xmlRequest = this.buildGetBeachTournamentXml(request);
      const response = await this.executeRequest(VisApiEndpoint.GET_BEACH_TOURNAMENT, xmlRequest);


      this.updateMonitor(VisApiEndpoint.GET_BEACH_TOURNAMENT, true, Date.now() - startTime);
      return response;
      
    } catch (error) {
      this.updateMonitor(VisApiEndpoint.GET_BEACH_TOURNAMENT, false, Date.now() - startTime);
      return this.createErrorResponse(error, Date.now() - startTime);
    }
  }

  /**
   * Get event officials data
   * For referee assignment information
   */
  async getEvent(request: GetEventRequest): Promise<VisApiResponse> {
    const startTime = Date.now();

    try {
      const xmlRequest = this.buildGetEventXml(request);
      const response = await this.executeRequest(VisApiEndpoint.GET_EVENT, xmlRequest);

      // Log raw GetEvent response for debugging
      if (response.success && response.data) {
        console.log('🔴 [RAW-GET-EVENT-RESPONSE]', {
          eventNo: request.eventNo,
          rawXml: response.data,
          timestamp: new Date().toISOString()
        });
      }

      this.updateMonitor(VisApiEndpoint.GET_EVENT, true, Date.now() - startTime);
      return response;
      
    } catch (error) {
      this.updateMonitor(VisApiEndpoint.GET_EVENT, false, Date.now() - startTime);
      return this.createErrorResponse(error, Date.now() - startTime);
    }
  }

  /**
   * Get beach match list
   * For match data and referee assignments
   */
  async getBeachMatchList(request: GetBeachMatchListRequest): Promise<VisApiResponse> {
    const startTime = Date.now();
    
    try {
      const xmlRequest = this.buildGetBeachMatchListXml(request);
      const response = await this.executeRequest(VisApiEndpoint.GET_BEACH_MATCH_LIST, xmlRequest);


      this.updateMonitor(VisApiEndpoint.GET_BEACH_MATCH_LIST, true, Date.now() - startTime);
      return response;
      
    } catch (error) {
      this.updateMonitor(VisApiEndpoint.GET_BEACH_MATCH_LIST, false, Date.now() - startTime);
      return this.createErrorResponse(error, Date.now() - startTime);
    }
  }

  /**
   * Get individual beach match with full details
   * For detailed match data without overcomplicated mapping
   */
  async getBeachMatch(request: GetBeachMatchRequest): Promise<VisApiResponse> {
    const startTime = Date.now();
    
    try {
      const xmlRequest = this.buildGetBeachMatchXml(request);
      const response = await this.executeRequest(VisApiEndpoint.GET_BEACH_MATCH, xmlRequest);

      if (__DEV__) {
        console.log('🔍 [GetBeachMatch Response]:', response.data ? response.data.substring(0, 1000) : 'NO DATA');
      }

      this.updateMonitor(VisApiEndpoint.GET_BEACH_MATCH, true, Date.now() - startTime);
      return response;
      
    } catch (error) {
      this.updateMonitor(VisApiEndpoint.GET_BEACH_MATCH, false, Date.now() - startTime);
      return this.createErrorResponse(error, Date.now() - startTime);
    }
  }

  /**
   * Get beach round data
   * For round information and teams
   */
  async getBeachRound(request: GetBeachRoundRequest): Promise<VisApiResponse> {
    const startTime = Date.now();
    
    try {
      const xmlRequest = this.buildGetBeachRoundXml(request);
      const response = await this.executeRequest(VisApiEndpoint.GET_BEACH_ROUND, xmlRequest);
      
      this.updateMonitor(VisApiEndpoint.GET_BEACH_ROUND, true, Date.now() - startTime);
      return response;
      
    } catch (error) {
      this.updateMonitor(VisApiEndpoint.GET_BEACH_ROUND, false, Date.now() - startTime);
      return this.createErrorResponse(error, Date.now() - startTime);
    }
  }

  /**
   * Get beach round list (VIS compliant endpoint)
   * For round information and teams with tournament filtering
   */
  async getBeachRoundList(request: GetBeachRoundListRequest): Promise<VisApiResponse> {
    const startTime = Date.now();
    
    try {
      // Build optimized request with field selection
      const optimizedRequest = {
        ...request,
        fields: request.fields || DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_ROUND_LIST]
      };

      const xmlRequest = this.buildGetBeachRoundListXml(optimizedRequest);
      const response = await this.executeRequest(VisApiEndpoint.GET_BEACH_ROUND_LIST, xmlRequest);
      
      this.updateMonitor(VisApiEndpoint.GET_BEACH_ROUND_LIST, true, Date.now() - startTime);
      return response;
      
    } catch (error) {
      this.updateMonitor(VisApiEndpoint.GET_BEACH_ROUND_LIST, false, Date.now() - startTime);
      return this.createErrorResponse(error, Date.now() - startTime);
    }
  }

  /**
   * Get beach live score data
   * For real-time match updates with version-based polling
   */
  async getBeachLive(request: GetBeachLiveRequest): Promise<VisApiResponse> {
    const startTime = Date.now();
    
    try {
      const xmlRequest = this.buildGetBeachLiveXml(request);
      const response = await this.executeRequest(VisApiEndpoint.GET_BEACH_LIVE, xmlRequest);
      
      this.updateMonitor(VisApiEndpoint.GET_BEACH_LIVE, true, Date.now() - startTime);
      return response;
      
    } catch (error) {
      this.updateMonitor(VisApiEndpoint.GET_BEACH_LIVE, false, Date.now() - startTime);
      return this.createErrorResponse(error, Date.now() - startTime);
    }
  }

  /**
   * Get event official list using dedicated VIS API endpoint
   * Optimized with field selection and circuit breaker integration
   */
  async getEventOfficialList(request: GetEventOfficialListRequest): Promise<VisApiResponse> {
    const startTime = Date.now();
    
    try {
      // Build optimized request with field selection
      const optimizedRequest = {
        ...request,
        fields: request.fields || DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_OFFICIAL_LIST]
      };

      const xmlRequest = this.buildGetEventOfficialListXml(optimizedRequest);
      
      
      const response = await this.executeRequest(VisApiEndpoint.GET_EVENT_OFFICIAL_LIST, xmlRequest);
      
      this.updateMonitor(VisApiEndpoint.GET_EVENT_OFFICIAL_LIST, true, Date.now() - startTime);
      return response;
      
    } catch (error) {
      this.updateMonitor(VisApiEndpoint.GET_EVENT_OFFICIAL_LIST, false, Date.now() - startTime);
      return this.createErrorResponse(error, Date.now() - startTime);
    }
  }

  /**
   * Get event referee list using dedicated VIS API endpoint  
   * Optimized with field selection and circuit breaker integration
   */
  async getEventRefereeList(request: GetEventRefereeListRequest): Promise<VisApiResponse> {
    const startTime = Date.now();
    
    try {
      // Build optimized request with field selection
      const optimizedRequest = {
        ...request,
        fields: request.fields || DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_REFEREE_LIST]
      };

      const xmlRequest = this.buildGetEventRefereeListXml(optimizedRequest);
      
      
      const response = await this.executeRequest(VisApiEndpoint.GET_EVENT_REFEREE_LIST, xmlRequest);
      
      this.updateMonitor(VisApiEndpoint.GET_EVENT_REFEREE_LIST, true, Date.now() - startTime);
      return response;
      
    } catch (error) {
      this.updateMonitor(VisApiEndpoint.GET_EVENT_REFEREE_LIST, false, Date.now() - startTime);
      return this.createErrorResponse(error, Date.now() - startTime);
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const testRequest: GetEventListRequest = {
        maxResults: 1,
        fields: ['No', 'Name']
      };
      
      const response = await this.getEventList(testRequest);
      return response.success;
      
    } catch {
      return false;
    }
  }


  /**
   * Execute batch request with multiple API calls
   * Combines multiple requests into a single batch for improved performance
   */
  /**
   * T073: Execute batch chunks sequentially and combine results
   *
   * @param chunks - Array of batch request chunks
   * @param startTime - Start time for duration tracking
   * @returns Combined batch response
   */
  private async executeSequentialBatchChunks(chunks: BatchRequest[], startTime: number): Promise<BatchResponse> {
    const allResults: BatchResponseItem[] = [];
    let hasPartialFailures = false;

    console.log(`[VisApiClient] Executing ${chunks.length} batch chunks sequentially`);

    for (const [index, chunk] of chunks.entries()) {
      try {
        console.log(`[VisApiClient] Executing chunk ${index + 1}/${chunks.length} (${chunk.requests.length} requests)`);

        // Build and execute chunk
        const xmlRequest = this.buildBatchRequestXml(chunk);
        const response = await this.executeRequest(VisApiEndpoint.BATCH_REQUEST, xmlRequest);

        if (response.success) {
          // Parse chunk results
          const chunkResults = this.parseBatchResponse(response.xmlData, chunk.requests);
          allResults.push(...chunkResults);

          if (chunkResults.some(r => !r.success)) {
            hasPartialFailures = true;
          }
        } else {
          // Chunk failed - mark all requests in chunk as failed
          hasPartialFailures = true;
          chunk.requests.forEach((item, i) => {
            allResults.push({
              requestId: item.requestId || `chunk_${index}_req_${i}`,
              type: item.type,
              success: false,
              error: response as VisApiErrorResponse,
            });
          });
        }

      } catch (error) {
        console.error(`[VisApiClient] Chunk ${index + 1} failed:`, error);
        hasPartialFailures = true;

        // Mark all requests in failed chunk as failed
        chunk.requests.forEach((item, i) => {
          allResults.push({
            requestId: item.requestId || `chunk_${index}_req_${i}`,
            type: item.type,
            success: false,
            error: this.createErrorResponse(error, Date.now() - startTime),
          });
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[VisApiClient] Sequential batch complete: ${allResults.length} total results in ${totalDuration}ms`);

    return {
      timestamp: new Date().toISOString(),
      success: true,
      durationMs: totalDuration,
      results: allResults,
      hasPartialFailures,
    };
  }

  /**
   * T072: Validate batch request size and split if oversized
   *
   * Recommended batch size: ≤10 requests per batch to avoid timeouts
   * and improve reliability.
   *
   * @param request - Batch request to validate
   * @returns Array of batch chunks (single element if size is OK)
   */
  private validateAndSplitBatchRequest(request: BatchRequest): BatchRequest[] {
    const MAX_BATCH_SIZE = 10; // Recommended max batch size
    const requestCount = request.requests.length;

    // If batch is within limits, return as-is
    if (requestCount <= MAX_BATCH_SIZE) {
      return [request];
    }

    // T072: Batch exceeds recommended size - split into chunks
    console.warn('[VisApiClient] Batch request exceeds recommended size', {
      requestCount,
      maxSize: MAX_BATCH_SIZE,
      splitting: true,
    });

    const chunks: BatchRequest[] = [];
    for (let i = 0; i < requestCount; i += MAX_BATCH_SIZE) {
      const chunk = request.requests.slice(i, i + MAX_BATCH_SIZE);
      chunks.push({
        requests: chunk,
        failureStrategy: request.failureStrategy,
        requestId: `${request.requestId}_chunk_${Math.floor(i / MAX_BATCH_SIZE)}`,
        timestamp: request.timestamp,
        timeoutMs: request.timeoutMs,
      });
    }

    console.log(`[VisApiClient] Split batch into ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * T073: Execute batch request with sequential fallback for oversized requests
   *
   * If batch exceeds recommended size, splits into smaller chunks and executes
   * sequentially to avoid timeouts.
   */
  async executeBatchRequest(request: BatchRequest): Promise<BatchResponse> {
    const startTime = Date.now();

    // Handle empty batch requests
    if (request.requests.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        success: true,
        durationMs: Date.now() - startTime,
        results: [],
        hasPartialFailures: false
      };
    }

    // T072-T073: Validate and split oversized batch requests
    const batchChunks = this.validateAndSplitBatchRequest(request);

    // If batch was split into multiple chunks, execute sequentially
    if (batchChunks.length > 1) {
      return this.executeSequentialBatchChunks(batchChunks, startTime);
    }

    // Single batch - execute normally
    try {
      // Build batch XML request
      const xmlRequest = this.buildBatchRequestXml(request);
      
      // Execute batch request
      const response = await this.executeRequest(VisApiEndpoint.BATCH_REQUEST, xmlRequest);
      
      if (!response.success) {
        // Return failed batch response
        return {
          timestamp: new Date().toISOString(),
          success: true,
          durationMs: Date.now() - startTime,
          results: request.requests.map((item, index) => ({
            requestId: item.requestId || `req_${index}`,
            type: item.type,
            success: false,
            error: response as VisApiErrorResponse
          })),
          hasPartialFailures: true
        };
      }
      
      // Parse batch response XML
      const batchResults = this.parseBatchResponse(response.xmlData, request.requests);
      
      // Update monitoring for batch request
      this.updateMonitor(VisApiEndpoint.BATCH_REQUEST, true, Date.now() - startTime);
      
      return {
        timestamp: new Date().toISOString(),
        success: true,
        durationMs: Date.now() - startTime,
        results: batchResults,
        hasPartialFailures: batchResults.some(result => !result.success)
      };
      
    } catch (error) {
      // Update monitoring for failed batch request
      this.updateMonitor(VisApiEndpoint.BATCH_REQUEST, false, Date.now() - startTime);
      
      // Return failed batch response
      return {
        timestamp: new Date().toISOString(),
        success: true,
        durationMs: Date.now() - startTime,
        results: request.requests.map((item, index) => ({
          requestId: item.requestId || `req_${index}`,
          type: item.type,
          success: false,
          error: this.createErrorResponse(error, Date.now() - startTime)
        })),
        hasPartialFailures: true
      };
    }
  }

  /**
   * Get tournament details using batch request
   * Combines GetBeachTournament + GetBeachMatchList + GetBeachRoundList
   */
  async getTournamentDetailBatch(request: TournamentDetailBatchRequest): Promise<BatchResponse> {
    const batchItems: BatchRequestItem[] = [];
    
    // Add tournament details request if requested
    if (request.includeTournamentDetails !== false) {
      batchItems.push({
        type: VisApiEndpoint.GET_BEACH_TOURNAMENT,
        requestId: `tournament_${request.tournamentNo}`,
        request: {
          tournamentNo: request.tournamentNo,
          includeLocation: true,
          includeVenue: true,
          includeContacts: true
        } as GetBeachTournamentRequest
      });
    }
    
    // Add match list request if requested
    if (request.includeMatches !== false) {
      batchItems.push({
        type: VisApiEndpoint.GET_BEACH_MATCH_LIST,
        requestId: `matches_${request.tournamentNo}`,
        request: {
          tournamentNo: request.tournamentNo,
          includeResults: true,
          includeReferees: true
        } as GetBeachMatchListRequest
      });
    }
    
    // Add round list request if requested
    if (request.includeRounds !== false) {
      batchItems.push({
        type: VisApiEndpoint.GET_BEACH_ROUND_LIST,
        requestId: `rounds_${request.tournamentNo}`,
        request: {
          tournamentNo: request.tournamentNo,
          includeTeams: true,
          includeMatches: true
        } as GetBeachRoundListRequest
      });
    }
    
    // Execute batch request
    const batchRequest: BatchRequest = {
      requests: batchItems,
      failureStrategy: 'continue_on_partial',
      requestId: request.requestId,
      timestamp: request.timestamp,
      timeoutMs: request.timeoutMs
    };
    
    try {
      const batchResponse = await this.executeBatchRequest(batchRequest);
      
      // If batch has partial failures and fallback is needed, attempt individual requests
      if (batchResponse.hasPartialFailures && this.shouldFallbackToIndividual(batchResponse)) {
        return this.fallbackToIndividualRequests(batchItems);
      }
      
      return batchResponse;
      
    } catch (error) {
      // Batch request failed, using individual request fallback
      return this.fallbackToIndividualRequests(batchItems);
    }
  }

  /**
   * Determine if we should fallback to individual requests
   */
  private shouldFallbackToIndividual(batchResponse: BatchResponse): boolean {
    // Fallback if more than 50% of requests failed
    const failureRate = batchResponse.results.filter(r => !r.success).length / batchResponse.results.length;
    return failureRate > 0.5;
  }

  /**
   * Fallback to individual requests when batch fails
   */
  private async fallbackToIndividualRequests(batchItems: BatchRequestItem[]): Promise<BatchResponse> {
    const startTime = Date.now();
    const results: BatchResponseItem[] = [];
    
    // Execute each request individually
    for (const item of batchItems) {
      try {
        let response: VisApiResponse;
        
        switch (item.type) {
          case VisApiEndpoint.GET_BEACH_TOURNAMENT:
            response = await this.getBeachTournament(item.request as GetBeachTournamentRequest);
            break;
          case VisApiEndpoint.GET_BEACH_MATCH_LIST:
            response = await this.getBeachMatchList(item.request as GetBeachMatchListRequest);
            break;
          case VisApiEndpoint.GET_BEACH_MATCH:
            response = await this.getBeachMatch(item.request as GetBeachMatchRequest);
            break;
          case VisApiEndpoint.GET_BEACH_ROUND_LIST:
            response = await this.getBeachRoundList(item.request as GetBeachRoundListRequest);
            break;
          default:
            throw new Error(`Unsupported fallback request type: ${item.type}`);
        }
        
        results.push({
          requestId: item.requestId,
          type: item.type,
          success: response.success,
          data: response.success ? (response as VisApiSuccessResponse).xmlData : undefined,
          error: response.success ? undefined : (response as VisApiErrorResponse)
        });
        
      } catch (error) {
        results.push({
          requestId: item.requestId,
          type: item.type,
          success: false,
          error: this.createErrorResponse(error, 0)
        });
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      success: true,
      durationMs: Date.now() - startTime,
      results,
      hasPartialFailures: results.some(r => !r.success)
    };
  }

  /**
   * Get API client configuration
   */
  getConfig(): VisApiClientConfig {
    return { ...this.config };
  }

  /**
   * Get request monitoring data
   */
  getMonitor(): RequestMonitor {
    return { ...this.monitor };
  }

  /**
   * Execute HTTP request with retry logic and error handling
   */
  private async executeRequest(_endpoint: VisApiEndpoint, xmlRequest: string): Promise<VisApiResponse> {
    let lastError: Error | null = null;
    let transformedError: APIErrorState | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        const response = await this.makeHttpRequest(xmlRequest);

          // Request successful
        return {
          success: true,
          xmlData: response,
          timestamp: new Date().toISOString(),
          durationMs: 0, // Will be set by caller
          sizeBytes: response.length
        } as VisApiSuccessResponse;

      } catch (error) {
        lastError = error as Error;

        // Transform error to user-friendly message (US3 - API Error Handling)
        transformedError = errorTransformService.transformError(error);

        // Track error for retry logic

        // Don't retry on last attempt
        if (attempt < this.retryConfig.maxAttempts) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    // Throw transformed error with user-friendly message
    const finalError = lastError || new Error(`Request failed after ${this.retryConfig.maxAttempts} attempts`);
    const userFriendlyError = transformedError || errorTransformService.transformError(finalError);

    // Attach transformed error state to the Error object for components to access
    const enrichedError = finalError as Error & { apiErrorState?: APIErrorState };
    enrichedError.apiErrorState = userFriendlyError;

    throw enrichedError;
  }

  /**
   * Make actual HTTP request with form data format (VIS API requirement)
   *
   * VIS API Optimization (T016, T028-T030):
   * - Captures all requests for audit analysis in __DEV__ mode
   * - Reports malformed requests to Sentry
   * - Fallback to cache on BadRequestSyntax errors
   */
  private async makeHttpRequest(xmlRequest: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    // T016: Audit capture setup (only in __DEV__, not on web)
    const requestId = uuidv4();
    const startTime = Date.now();
    const auditService = ApiAuditService ? ApiAuditService.getInstance() : null;
    const storageService = AuditStorageService ? AuditStorageService.getInstance() : null;

    try {
      // VIS API expects form data with Request parameter, not SOAP
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...this.config.headers
      };

      // Encode XML request as form data parameter
      const formData = `Request=${encodeURIComponent(xmlRequest)}`;

      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal
      });

      if (!response.ok) {
        console.error('❌ [VIS-API-HTTP-ERROR]', {
          status: response.status,
          statusText: response.statusText,
          url: this.config.baseUrl,
          timestamp: new Date().toISOString()
        });

        // T016: Capture failed request for audit
        if (auditService && storageService) {
          const responseTime = Date.now() - startTime;
          const auditRequest = this.createAuditRequest(
            requestId,
            startTime,
            xmlRequest,
            headers,
            response.status,
            '',
            responseTime,
            false
          );
          auditService.captureRequest(auditRequest);
          storageService.storeRequest(auditRequest);
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();

      // T016: Capture successful request for audit
      if (auditService && storageService) {
        const responseTime = Date.now() - startTime;
        const auditRequest = this.createAuditRequest(
          requestId,
          startTime,
          xmlRequest,
          headers,
          response.status,
          responseText,
          responseTime,
          false // Not from cache
        );
        auditService.captureRequest(auditRequest);
        storageService.storeRequest(auditRequest);

        // Store findings if any
        const findings = auditService.getFindings(requestId);
        findings.forEach(finding => storageService.storeFinding(finding));
      }

      // Check for VIS API specific errors
      if (this.containsVisError(responseText)) {
        const errorMessage = this.parseVisError(responseText);

        // T029: Log malformed requests in __DEV__
        if (__DEV__) {
          console.error('[API Audit] VIS API Error detected:', {
            requestId,
            error: errorMessage,
            request: xmlRequest.substring(0, 200),
          });
        }

        throw new Error(`VIS API Error: ${errorMessage}`);
      }

      return responseText;

    } catch (error) {
      // T030: Fallback to cache on BadRequestSyntax errors could be implemented here
      // For now, we just re-throw the error
      throw error;

    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * T016: Create audit request object from HTTP request/response
   */
  private createAuditRequest(
    requestId: string,
    timestamp: number,
    requestXml: string,
    headers: Record<string, string>,
    responseStatus: number,
    responseBody: string,
    responseTime: number,
    cacheHit: boolean
  ): ApiRequest {
    // Extract endpoint from XML
    const endpoint = this.extractEndpointFromXml(requestXml);

    // Count fields requested
    const fieldCount = this.countFieldsInXml(requestXml);

    // Determine network type (default to wifi for now)
    // In a real implementation, this would use NetInfo or similar
    const networkType: NetworkType = 'wifi';

    // Determine request source (default to user)
    const source: RequestSource = 'user';

    return {
      id: requestId,
      timestamp,
      endpoint,
      requestXml,
      requestHeaders: headers,
      responseStatus,
      responseBody,
      responseTime,
      payloadSize: requestXml.length + responseBody.length,
      fieldCount,
      cacheHit,
      networkType,
      source,
    };
  }

  /**
   * Extract endpoint name from XML request
   */
  private extractEndpointFromXml(xml: string): any {
    // Match Type="EndpointName" pattern
    const match = xml.match(/Type="([^"]+)"/);
    return match ? match[1] : 'Unknown';
  }

  /**
   * Count fields in XML request
   */
  private countFieldsInXml(xml: string): number {
    // Match Fields="field1,field2,field3" pattern
    const match = xml.match(/Fields="([^"]+)"/);
    if (!match) return 0;

    const fieldsStr = match[1];
    return fieldsStr ? fieldsStr.split(',').length : 0;
  }

  /**
   * Build GetEventList XML request (VIS API format - no SOAP envelope)
   */
  private buildGetEventListXml(request: GetEventListRequest): string {
    const filters = [];
    
    // Build filter element with attributes
    const filterAttribs = [];
    
    if (request.gender) {
      filterAttribs.push(`Gender="${this.escapeXmlAttribute(request.gender)}"`);
    }
    if (request.startDate) {
      filterAttribs.push(`StartDate="${this.escapeXmlAttribute(request.startDate)}"`);
    }
    if (request.endDate) {
      filterAttribs.push(`EndDate="${this.escapeXmlAttribute(request.endDate)}"`);
    }
    if (request.countryCode) {
      filterAttribs.push(`CountryCode="${this.escapeXmlAttribute(request.countryCode)}"`);
    }
    if (request.status) {
      filterAttribs.push(`Status="${this.escapeXmlAttribute(request.status)}"`);
    }
    if (request.tournamentType) {
      filterAttribs.push(`Type="${this.escapeXmlAttribute(request.tournamentType)}"`);
    }
    
    // Always filter for beach volleyball tournaments
    filterAttribs.push('HasBeachTournament="True"');
    
    // Build fields list (space-separated) - ensure we always have essential fields
    const fields = request.fields?.join(' ') || DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_LIST].join(' ');
    
    // Create simple XML request (no SOAP envelope)
    const filterElement = filterAttribs.length > 0 
      ? `<Filter ${filterAttribs.join(' ')} />` 
      : '';
    
    const xmlRequest = `<Request Type="GetEventList" Fields="${this.escapeXmlAttribute(fields)}">${filterElement}</Request>`;
    
    // Built XML request for GetEventList
    
    return xmlRequest;
  }

  /**
   * Build GetBeachTournamentList XML request (VIS API format)
   * VIS compliant tournament list endpoint with proper filtering
   */
  private buildGetBeachTournamentListXml(request: GetBeachTournamentListRequest): string {
    // Build filter element with attributes - properly escape XML attribute values
    const filterAttribs: string[] = [];
    
    if (request.dateFrom) {
      filterAttribs.push(`DateFrom="${this.escapeXmlAttribute(request.dateFrom)}"`);
    }
    if (request.dateTo) {
      filterAttribs.push(`DateTo="${this.escapeXmlAttribute(request.dateTo)}"`);
    }
    if (request.status) {
      filterAttribs.push(`Status="${this.escapeXmlAttribute(request.status)}"`);
    }
    if (request.gender) {
      filterAttribs.push(`Gender="${this.escapeXmlAttribute(request.gender)}"`);
    }
    if (request.countryCode) {
      filterAttribs.push(`CountryCode="${this.escapeXmlAttribute(request.countryCode)}"`);
    }
    
    // Build fields list (space-separated) - ensure we always have essential fields
    const fields = request.fields?.join(' ') || DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST].join(' ');
    
    // Create simple XML request (no SOAP envelope)
    const filterElement = filterAttribs.length > 0 
      ? `<Filter ${filterAttribs.join(' ')} />` 
      : '';
    
    const xmlRequest = `<Request Type="GetBeachTournamentList" Fields="${this.escapeXmlAttribute(fields)}">${filterElement}</Request>`;
    
    return xmlRequest;
  }

  /**
   * Build GetBeachTournament XML request (VIS API format)
   * Based on documentation: <Request Type="GetBeachTournament" No="502" Fields="..." />
   */
  private buildGetBeachTournamentXml(request: GetBeachTournamentRequest): string {
    // Only include Fields attribute if fields are specified
    if (request.fields && request.fields.length > 0) {
      const fields = request.fields.join(' ');
      return `<Request Type="GetBeachTournament" No="${this.escapeXmlAttribute(request.tournamentNo)}" Fields="${this.escapeXmlAttribute(fields)}" />`;
    } else {
      // No fields specified - request without Fields attribute to get all available fields
      return `<Request Type="GetBeachTournament" No="${this.escapeXmlAttribute(request.tournamentNo)}" />`;
    }
  }

  /**
   * Build GetEvent XML request (VIS API format)
   */
  private buildGetEventXml(request: GetEventRequest): string {
    // Only include Fields attribute if fields are specified
    if (request.fields && request.fields.length > 0) {
      const fields = request.fields.join(' ');
      return `<Request Type="GetEvent" No="${this.escapeXmlAttribute(request.eventNo)}" Fields="${this.escapeXmlAttribute(fields)}" />`;
    } else {
      // No fields specified - request without Fields attribute to get all available fields
      return `<Request Type="GetEvent" No="${this.escapeXmlAttribute(request.eventNo)}" />`;
    }
  }

  /**
   * Build GetBeachMatchList XML request (VIS API format)
   */
  private buildGetBeachMatchListXml(request: GetBeachMatchListRequest): string {
    // Use the EXACT format from documentation - filter parameter is NoTournament
    const filterAttribs = [`NoTournament="${this.escapeXmlAttribute(request.tournamentNo)}"`];
    
    // Add optional filters only if provided  
    if (request.courtNo) {
      filterAttribs.push(`CourtNo="${this.escapeXmlAttribute(request.courtNo)}"`);
    }
    if (request.status) {
      filterAttribs.push(`Status="${this.escapeXmlAttribute(request.status)}"`);
    }
    if (request.startDate) {
      filterAttribs.push(`StartDate="${this.escapeXmlAttribute(request.startDate)}"`);
    }
    if (request.endDate) {
      filterAttribs.push(`EndDate="${this.escapeXmlAttribute(request.endDate)}"`);
    }
    
    // Add referee filtering - NoReferee1 = RefereeId, NoReferee2 = RefereeId
    if (request.NoReferee1) {
      filterAttribs.push(`NoReferee1="${this.escapeXmlAttribute(request.NoReferee1)}"`);
    }
    if (request.NoReferee2) {
      filterAttribs.push(`NoReferee2="${this.escapeXmlAttribute(request.NoReferee2)}"`);
    }
    
    const includeResults = request.includeResults !== false;
    const includeReferees = request.includeReferees !== false;
    
    filterAttribs.push(`IncludeResults="${includeResults}"`);
    filterAttribs.push(`IncludeReferees="${includeReferees}"`);
    
    // Include all federation code fields for flag display, plus match results, referee IDs, position fields, result types, timezone data, and match personnel
    // Note: VIS API returns NoEvent (not EventNo) for the event/tournament ID
    const fields = 'No NoInTournament BeginDateTimeUtc EndDateTimeUtc UtcDate UtcTime LocalDate LocalTime LocalTimeOffset TimeZone Status ResultType Court TeamAName TeamBName TeamAFederationCode TeamBFederationCode TeamAPositionInMainDraw TeamBPositionInMainDraw TeamAPositionInQualification TeamBPositionInQualification MatchPointsA MatchPointsB RoundName Round RoundPhase Referee1Name Referee2Name Referee1FederationCode Referee2FederationCode NoRefereeChallenge RefereeChallengeName RefereeChallengeFederationCode NoReferee1 NoReferee2 PointsTeamASet1 PointsTeamBSet1 PointsTeamASet2 PointsTeamBSet2 PointsTeamASet3 PointsTeamBSet3 DurationSet1 DurationSet2 DurationSet3 Personnel NoEvent';
    
    // Use EXACT XML format from documentation
    const xmlRequest = `<Request Type="GetBeachMatchList" Fields="${fields}">
  <Filter ${filterAttribs.join(' ')} />
</Request>`;
    
    
    return xmlRequest;
  }

  /**
   * Build GetBeachMatch XML request (VIS API format)
   * For individual match data retrieval with full details
   */
  private buildGetBeachMatchXml(request: GetBeachMatchRequest): string {
    // For GetBeachMatch, the No parameter goes in the Request element, not Filter
    const requestAttribs = [`No="${this.escapeXmlAttribute(request.matchNo)}"`];

    // Only include tournament number if provided
    if (request.tournamentNo) {
      requestAttribs.push(`NoTournament="${this.escapeXmlAttribute(request.tournamentNo)}"`);
    }

    // Simple request without fields parameter
    const xmlRequest = `<Request Type="GetBeachMatch" ${requestAttribs.join(' ')} />`;

    if (__DEV__) {
    }

    return xmlRequest;
  }

  /**
   * Build XML request for GetBeachRound endpoint
   */
  private buildGetBeachRoundXml(request: GetBeachRoundRequest): string {
    const filterAttribs = [
      `NoTournament="${this.escapeXmlAttribute(request.tournamentNo)}"`,
      `NoRound="${this.escapeXmlAttribute(request.roundNo)}"`
    ];
    
    // Add optional includes
    const includeTeams = request.includeTeams !== false;
    const includeMatches = request.includeMatches !== false;
    
    filterAttribs.push(`IncludeTeams="${includeTeams}"`);
    filterAttribs.push(`IncludeMatches="${includeMatches}"`);
    
    // Request all available fields for debugging
    const fields = '';
    
    const xmlRequest = `<Request Type="GetBeachRound" Fields="${fields}">
  <Filter ${filterAttribs.join(' ')} />
</Request>`;
    
    return xmlRequest;
  }

  /**
   * Build XML request for GetBeachRoundList endpoint
   * VIS compliant round list endpoint with tournament filtering
   */
  private buildGetBeachRoundListXml(request: GetBeachRoundListRequest): string {
    const filterAttribs: string[] = [
      `NoTournament="${this.escapeXmlAttribute(request.tournamentNo)}"`
    ];
    
    // Add optional includes
    if (request.includeTeams !== undefined) {
      filterAttribs.push(`IncludeTeams="${request.includeTeams}"`);
    }
    if (request.includeMatches !== undefined) {
      filterAttribs.push(`IncludeMatches="${request.includeMatches}"`);
    }
    
    // Build fields list (space-separated) - ensure we always have essential fields
    const fields = request.fields?.join(' ') || DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_ROUND_LIST].join(' ');
    
    const xmlRequest = `<Request Type="GetBeachRoundList" Fields="${this.escapeXmlAttribute(fields)}">
  <Filter ${filterAttribs.join(' ')} />
</Request>`;
    
    return xmlRequest;
  }

  /**
   * Build XML request for GetBeachLiveRequest endpoint
   */
  private buildGetBeachLiveXml(request: GetBeachLiveRequest): string {
    const attributes = [`No="${this.escapeXmlAttribute(request.matchNo.toString())}"`];
    
    // Add version for bandwidth optimization (version-based polling)  
    if (request.version !== undefined) {
      attributes.push(`Version="${this.escapeXmlAttribute(request.version.toString())}"`);
    }
    
    // Add options if provided
    if (request.options && request.options.length > 0) {
      attributes.push(`Options="${this.escapeXmlAttribute(request.options.join(','))}"`);
    }
    
    // Use default field selection for live score data
    const fields = DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_LIVE].join(' ');
    
    const xmlRequest = `<Request Type="GetBeachLive" Fields="${this.escapeXmlAttribute(fields)}" ${attributes.join(' ')} />`;
    
    return xmlRequest;
  }

  /**
   * Build GetEventOfficialList XML request
   */
  private buildGetEventOfficialListXml(request: GetEventOfficialListRequest): string {
    // Use exact fields from VIS Implementation Guidelines section 4.3
    const fields = request.fields && request.fields.length > 0 
      ? request.fields.join(' ')
      : 'NoOfficial FirstName LastName Role Status';
    
    // Use Filter element with NoEvent per VIS API specification
    return `<Request Type="GetEventOfficialList" Fields="${this.escapeXmlAttribute(fields)}"><Filter NoEvent="${this.escapeXmlAttribute(request.eventNo)}" /></Request>`;
  }

  /**
   * Build GetEventRefereeList XML request  
   */
  private buildGetEventRefereeListXml(request: GetEventRefereeListRequest): string {
    // Use exact fields from VIS Implementation Guidelines section 4.3
    const fields = request.fields && request.fields.length > 0
      ? request.fields.join(' ')
      : 'NoReferee FirstName LastName Gender Role Status';
    
    // Use Filter element with NoEvent per VIS API specification
    return `<Request Type="GetEventRefereeList" Fields="${this.escapeXmlAttribute(fields)}"><Filter NoEvent="${this.escapeXmlAttribute(request.eventNo)}" /></Request>`;
  }

  /**
   * Build XML request for batch requests
   * Combines multiple requests into a single batch
   */
  private buildBatchRequestXml(request: BatchRequest): string {
    const requestId = request.requestId || `batch_${Date.now()}`;
    
    // Start batch XML structure
    let batchXml = `<BatchRequest RequestId="${this.escapeXmlAttribute(requestId)}"`;
    
    // Add failure strategy if specified
    if (request.failureStrategy) {
      batchXml += ` FailureStrategy="${this.escapeXmlAttribute(request.failureStrategy)}"`;
    }
    
    batchXml += `>\n`;
    
    // Add each individual request
    for (const item of request.requests) {
      const itemRequestId = item.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Build the individual request XML based on type
      let individualXml = '';
      
      switch (item.type) {
        case VisApiEndpoint.GET_EVENT_LIST:
          individualXml = this.buildGetEventListXml(item.request as GetEventListRequest);
          break;
        case VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST:
          individualXml = this.buildGetBeachTournamentListXml(item.request as GetBeachTournamentListRequest);
          break;
        case VisApiEndpoint.GET_BEACH_TOURNAMENT:
          individualXml = this.buildGetBeachTournamentXml(item.request as GetBeachTournamentRequest);
          break;
        case VisApiEndpoint.GET_EVENT:
          individualXml = this.buildGetEventXml(item.request as GetEventRequest);
          break;
        case VisApiEndpoint.GET_BEACH_MATCH_LIST:
          individualXml = this.buildGetBeachMatchListXml(item.request as GetBeachMatchListRequest);
          break;
        case VisApiEndpoint.GET_BEACH_MATCH:
          individualXml = this.buildGetBeachMatchXml(item.request as GetBeachMatchRequest);
          break;
        case VisApiEndpoint.GET_BEACH_ROUND:
          individualXml = this.buildGetBeachRoundXml(item.request as GetBeachRoundRequest);
          break;
        case VisApiEndpoint.GET_BEACH_ROUND_LIST:
          individualXml = this.buildGetBeachRoundListXml(item.request as GetBeachRoundListRequest);
          break;
        case VisApiEndpoint.GET_BEACH_LIVE:
          individualXml = this.buildGetBeachLiveXml(item.request as GetBeachLiveRequest);
          break;
        case VisApiEndpoint.GET_EVENT_OFFICIAL_LIST:
          individualXml = this.buildGetEventOfficialListXml(item.request as GetEventOfficialListRequest);
          break;
        case VisApiEndpoint.GET_EVENT_REFEREE_LIST:
          individualXml = this.buildGetEventRefereeListXml(item.request as GetEventRefereeListRequest);
          break;
        default:
          throw new Error(`Unsupported batch request type: ${item.type}`);
      }
      
      // Wrap individual request with RequestId attribute
      const wrappedXml = individualXml.replace('<Request ', `<Request RequestId="${this.escapeXmlAttribute(itemRequestId)}" `);
      batchXml += `  ${wrappedXml}\n`;
    }
    
    batchXml += `</BatchRequest>`;
    
    return batchXml;
  }

  /**
   * Parse batch response XML and extract individual results
   */
  private parseBatchResponse(xmlData: string, originalRequests: readonly BatchRequestItem[]): BatchResponseItem[] {
    // Simple XML parsing for batch responses
    // In a real implementation, you would use a proper XML parser
    const results: BatchResponseItem[] = [];
    
    // Try to extract individual response elements from the XML
    // This is a simplified implementation - in production you'd use fast-xml-parser
    const responsePattern = /<Response\s+RequestId="([^"]*)"[^>]*>([\s\S]*?)<\/Response>/g;
    const matches = Array.from(xmlData.matchAll(responsePattern));
    
    if (matches.length === 0) {
      // No structured batch response - treat as single response failure
      return originalRequests.map((item, index) => ({
        requestId: item.requestId || `req_${index}`,
        type: item.type,
        success: false,
        error: {
          timestamp: new Date().toISOString(),
          success: false,
          errorCode: 'BATCH_PARSE_ERROR',
          error: 'Failed to parse batch response',
          durationMs: 0
        }
      }));
    }
    
    // Process each response
    for (const match of matches) {
      const requestId = match[1];
      const responseXml = match[2];
      
      // Find original request type
      const originalRequest = originalRequests.find(req => req.requestId === requestId);
      const requestType = originalRequest?.type || VisApiEndpoint.GET_EVENT_LIST;
      
      // Determine if response is successful (contains expected data elements)
      const isSuccess = responseXml.includes('<') && !responseXml.includes('<Error');
      
      results.push({
        requestId,
        type: requestType,
        success: isSuccess,
        data: isSuccess ? responseXml : undefined,
        error: isSuccess ? undefined : {
          timestamp: new Date().toISOString(),
          success: false,
          errorCode: 'REQUEST_FAILED',
          error: 'Individual request in batch failed',
          durationMs: 0
        }
      });
    }
    
    return results;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.retryConfig.baseDelayMs;
    const delay = this.retryConfig.exponentialBackoff 
      ? baseDelay * Math.pow(2, attempt - 1)
      : baseDelay;
    
    const maxDelay = this.retryConfig.maxDelayMs;
    const clampedDelay = Math.min(delay, maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = clampedDelay * this.retryConfig.jitterFactor * Math.random();
    
    return clampedDelay + jitter;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: any, durationMs: number): VisApiErrorResponse {
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || 'UNKNOWN_ERROR';
    
    this.updateErrorCount(errorCode);
    
    return {
      success: false,
      error: errorMessage,
      errorCode,
      timestamp: new Date().toISOString(),
      durationMs,
      details: {
        originalError: error
      }
    };
  }

  /**
   * Update monitoring metrics
   */
  private updateMonitor(endpoint: VisApiEndpoint, success: boolean, durationMs: number): void {
    this.monitor.totalRequests++;
    this.monitor.requestsByEndpoint[endpoint]++;
    this.monitor.lastRequestTimestamp = new Date().toISOString();
    
    if (success) {
      this.monitor.successfulRequests++;
    } else {
      this.monitor.failedRequests++;
    }
    
    // Update average response time
    const totalTime = this.monitor.avgResponseTimeMs * (this.monitor.totalRequests - 1) + durationMs;
    this.monitor.avgResponseTimeMs = totalTime / this.monitor.totalRequests;
  }

  /**
   * Update error count by type
   */
  private updateErrorCount(errorType: string): void {
    this.monitor.errorsByType[errorType] = (this.monitor.errorsByType[errorType] || 0) + 1;
  }

  /**
   * Check if response contains VIS API specific errors
   */
  private containsVisError(responseText: string): boolean {
    return responseText.includes('<BadRequestSyntax') ||
           responseText.includes('<AccessDenied') ||
           responseText.includes('<InternalError') ||
           responseText.includes('<ServiceUnavailable') ||
           responseText.includes('<RateLimitExceeded') ||
           responseText.includes('<Error');
  }

  /**
   * Parse VIS API specific error messages
   */
  private parseVisError(responseText: string): string {
    // Parse different VIS API error types
    if (responseText.includes('<BadRequestSyntax')) {
      return 'Invalid XML request syntax - check request format';
    }
    if (responseText.includes('<AccessDenied')) {
      return 'Access denied - check API credentials or permissions';
    }
    if (responseText.includes('<InternalError')) {
      return 'VIS API internal server error';
    }
    if (responseText.includes('<ServiceUnavailable')) {
      return 'VIS API service temporarily unavailable';
    }
    if (responseText.includes('<RateLimitExceeded')) {
      return 'VIS API rate limit exceeded - reduce request frequency';
    }
    
    // Generic error parsing
    const errorMatch = responseText.match(/<Error[^>]*>([^<]*)<\/Error>/);
    if (errorMatch) {
      return errorMatch[1] || 'Unknown VIS API error';
    }
    
    return 'Unknown VIS API error format';
  }

  /**
   * Escape XML attribute values to prevent injection attacks
   * @param value - The attribute value to escape
   * @returns Escaped XML attribute value
   */
  private escapeXmlAttribute(value: string | number): string {
    const stringValue = String(value);
    return stringValue
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Format XML for readable console output
   * @param xml - Raw XML string
   * @returns Formatted XML string
   */
  private formatXml(xml: string): string {
    try {
      // Simple XML formatting - add line breaks and indentation
      let formatted = xml
        .replace(/></g, '>\n<')
        .replace(/^\s+|\s+$/g, '');

      const lines = formatted.split('\n');
      let indent = 0;
      const indentSize = 2;

      return lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('</')) {
          indent = Math.max(0, indent - indentSize);
        }

        const result = ' '.repeat(indent) + trimmed;

        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
          indent += indentSize;
        }

        return result;
      }).join('\n');
    } catch (error) {
      return xml; // Return original if formatting fails
    }
  }

  /**
   * Parse AuxiliaryPersons field from GetEvent response
   *
   * AuxiliaryPersons contains HTML-entity-encoded XML with complete official roster
   * for an event. Maps Personnel IDs to names, federations, and role codes.
   *
   * @param auxiliaryPersonsXml - HTML-entity-encoded XML string from GetEvent
   * @returns Array of AuxiliaryPerson objects or empty array if parsing fails
   *
   * @example
   * Input: "&lt;AuxiliaryPersons&gt;&lt;AuxiliaryPerson No=&quot;3&quot; FirstName=&quot;John&quot;.../&gt;&lt;/AuxiliaryPersons&gt;"
   * Output: [{ No: 3, FirstName: "John", LastName: "Doe", NationalityCode: "US", Functions: 2, Gender: 0 }]
   *
   * @see specs/006-match-officials-display/INVESTIGATION_REPORT.md
   */
  parseAuxiliaryPersons(auxiliaryPersonsXml: string): any[] {
    try {
      if (!auxiliaryPersonsXml || auxiliaryPersonsXml.trim() === '') {
        return [];
      }

      // HTML entity decode
      const decoded = auxiliaryPersonsXml
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#xD;&#xA;/g, '\n')
        .replace(/&amp;/g, '&'); // Must be last to avoid double-decoding

      // Parse XML using fast-xml-parser (already imported in this file)
      const XMLParser = require('fast-xml-parser').XMLParser;
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        parseAttributeValue: true,
        ignoreDeclaration: true,
        ignorePiTags: true
      });

      const result = parser.parse(decoded);

      // Extract AuxiliaryPersons array
      const auxPersons = result?.AuxiliaryPersons?.AuxiliaryPerson;

      if (!auxPersons) {
        return [];
      }

      // Normalize to array (single person returns object, multiple returns array)
      const personArray = Array.isArray(auxPersons) ? auxPersons : [auxPersons];

      return personArray.map((person: any) => ({
        No: person.No,
        FirstName: person.FirstName || '',
        LastName: person.LastName || '',
        NationalityCode: person.NationalityCode || '',
        Functions: person.Functions || 0,
        Gender: person.Gender || 0
      }));

    } catch (error) {
      console.error('[VisApiClient] Failed to parse AuxiliaryPersons XML:', error);
      return [];
    }
  }

  /**
   * Parse Personnel field from BeachMatch response
   *
   * Personnel contains HTML-entity-encoded XML with scorer and line judge IDs
   * that map to AuxiliaryPersons. IDs are tournament-local scope.
   *
   * @param personnelXml - HTML-entity-encoded XML string from BeachMatch.Personnel
   * @returns PersonnelData object with scorer/line judge IDs or empty object if parsing fails
   *
   * @example
   * Input: "&lt;Personnel Scorer=&quot;19&quot; AssistantScorer=&quot;26&quot; LineJudge1=&quot;3&quot; LineJudge2=&quot;10&quot; /&gt;"
   * Output: { Scorer: 19, AssistantScorer: 26, LineJudge1: 3, LineJudge2: 10 }
   *
   * @see specs/006-match-officials-display/INVESTIGATION_REPORT.md
   */
  parsePersonnelField(personnelXml: string): any {
    try {
      if (!personnelXml || personnelXml.trim() === '') {
        return {};
      }

      // HTML entity decode
      const decoded = personnelXml
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#xD;&#xA;/g, '\n')
        .replace(/&amp;/g, '&'); // Must be last

      // Parse XML
      const XMLParser = require('fast-xml-parser').XMLParser;
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        parseAttributeValue: true,
        ignoreDeclaration: true,
        ignorePiTags: true
      });

      const result = parser.parse(decoded);
      const personnel = result?.Personnel || {};

      // Extract numeric IDs (validation: ID-only mapping, ignore Functions codes)
      return {
        Scorer: personnel.Scorer || undefined,
        AssistantScorer: personnel.AssistantScorer || undefined,
        LineJudge1: personnel.LineJudge1 || undefined,
        LineJudge2: personnel.LineJudge2 || undefined,
        LineJudge3: personnel.LineJudge3 || undefined,
        LineJudge4: personnel.LineJudge4 || undefined
      };

    } catch (error) {
      console.error('[VisApiClient] Failed to parse Personnel field XML:', error);
      return {};
    }
  }
}
