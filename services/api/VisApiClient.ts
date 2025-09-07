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

// Platform detection
const isWebEnvironment = typeof window !== 'undefined';

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
      
      // Log the exact XML request being sent to debug 400 errors
      console.log('🔍 GetEventOfficialList XML Request:');
      console.log('EventNo:', optimizedRequest.eventNo);
      console.log('Fields:', optimizedRequest.fields);
      console.log('XML Request:', xmlRequest);
      
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
      
      // Log the exact XML request being sent to debug 400 errors
      console.log('🔍 GetEventRefereeList XML Request:');
      console.log('EventNo:', optimizedRequest.eventNo);
      console.log('Fields:', optimizedRequest.fields);
      console.log('XML Request:', xmlRequest);
      
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
      // If batch request completely fails, fallback to individual requests
      console.warn('Batch request failed, falling back to individual requests:', error);
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
  private async executeRequest(endpoint: VisApiEndpoint, xmlRequest: string): Promise<VisApiResponse> {
    let lastError: Error | null = null;
    
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
        
        // Log errors in non-production environments only
        
        // Don't retry on last attempt
        if (attempt < this.retryConfig.maxAttempts) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError || new Error(`Request failed after ${this.retryConfig.maxAttempts} attempts`);
  }

  /**
   * Make actual HTTP request with form data format (VIS API requirement)
   */
  private async makeHttpRequest(xmlRequest: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      
      // Check for VIS API specific errors
      if (this.containsVisError(responseText)) {
        const errorMessage = this.parseVisError(responseText);
        throw new Error(`VIS API Error: ${errorMessage}`);
      }
      
      return responseText;
      
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Create mock response for web development environment
   */
  private createMockResponse(): string {
    // Mock tournament data for development in web environment
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetEventListResponse xmlns="http://www.fivb.org/vis/2009/XmlRequest">
      <GetEventListResult>
        <Events>
          <Event>
            <No>DEV001</No>
            <Name>Development Tournament - Beach Volleyball</Name>
            <Code>DEVBVB</Code>
            <StartDate>2025-08-21T00:00:00</StartDate>
            <EndDate>2025-08-23T23:59:59</EndDate>
            <Status>Running</Status>
            <Country>DEV</Country>
            <City>Development City</City>
            <BeachTournament>
              <No>DEV001</No>
              <Gender>W</Gender>
              <NoOfCourts>4</NoOfCourts>
            </BeachTournament>
          </Event>
          <Event>
            <No>DEV002</No>
            <Name>Test Tournament - Beach Volleyball Men</Name>
            <Code>TESTBVB</Code>
            <StartDate>2025-08-25T00:00:00</StartDate>
            <EndDate>2025-08-27T23:59:59</EndDate>
            <Status>Scheduled</Status>
            <Country>TEST</Country>
            <City>Test City</City>
            <BeachTournament>
              <No>DEV002</No>
              <Gender>M</Gender>
              <NoOfCourts>6</NoOfCourts>
            </BeachTournament>
          </Event>
        </Events>
      </GetEventListResult>
    </GetEventListResponse>
  </soap:Body>
</soap:Envelope>`;
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
    
    // Always filter for beach volleyball tournaments
    filterAttribs.push('HasBeachTournament="True"');
    
    // Build fields list (space-separated) - ensure we always have essential fields
    const fields = request.fields?.join(' ') || DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_LIST].join(' ');
    
    // Create simple XML request (no SOAP envelope)
    const filterElement = filterAttribs.length > 0 
      ? `<Filter ${filterAttribs.join(' ')} />` 
      : '';
    
    const xmlRequest = `<Request Type="GetEventList" Fields="${this.escapeXmlAttribute(fields)}">${filterElement}</Request>`;
    
    // XML request built successfully
    
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
    // REQUEST NoEvent field - this is needed to filter referee list
    const fields = 'No Code Name NoEvent';
    
    return `<Request Type="GetBeachTournament" No="${this.escapeXmlAttribute(request.tournamentNo)}" Fields="${this.escapeXmlAttribute(fields)}" />`;
  }

  /**
   * Build GetEvent XML request (VIS API format)
   */
  private buildGetEventXml(request: GetEventRequest): string {
    // Include Content field to get BeachTournament information
    const fields = 'No Name Code Content';
    
    // Use simple attribute format like in documentation, not Filter element
    return `<Request Type="GetEvent" No="${this.escapeXmlAttribute(request.eventNo)}" Fields="${this.escapeXmlAttribute(fields)}" />`;
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
    
    // Include all federation code fields for flag display, plus match results and referee IDs
    const fields = 'No NoInTournament LocalDate LocalTime Status Court TeamAName TeamBName TeamAFederationCode TeamBFederationCode MatchPointsA MatchPointsB RoundName Round RoundPhase Referee1Name Referee2Name Referee1FederationCode Referee2FederationCode NoReferee1 NoReferee2';
    
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
    const filterAttribs = [
      `NoTournament="${this.escapeXmlAttribute(request.tournamentNo)}"`,
      `No="${this.escapeXmlAttribute(request.matchNo)}"`
    ];
    
    // Add optional includes
    const includeResults = request.includeResults !== false;
    const includeReferees = request.includeReferees !== false;
    const includeTeamDetails = request.includeTeamDetails !== false;
    const includeSetScores = request.includeSetScores !== false;
    const includeStatistics = request.includeStatistics !== false;
    
    filterAttribs.push(`IncludeResults="${includeResults}"`);
    filterAttribs.push(`IncludeReferees="${includeReferees}"`);
    filterAttribs.push(`IncludeTeamDetails="${includeTeamDetails}"`);
    filterAttribs.push(`IncludeSetScores="${includeSetScores}"`);
    filterAttribs.push(`IncludeStatistics="${includeStatistics}"`);
    
    // Include all available fields for comprehensive match data (no overcomplicated mapping)
    const fields = '';
    
    const xmlRequest = `<Request Type="GetBeachMatch" Fields="${fields}">
  <Filter ${filterAttribs.join(' ')} />
</Request>`;
    
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
  private escapeXmlAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}