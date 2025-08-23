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
  GetBeachTournamentRequest,
  GetEventRequest,
  GetBeachMatchListRequest,
  GetBeachRoundRequest,
  VisApiEndpoint,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_FIELD_SELECTIONS,
  RequestMonitor
} from '../../types/api-v2';

// Platform detection
const isWebEnvironment = typeof window !== 'undefined';

/**
 * Unified VIS API Client implementation
 * Simplifies from 3 complex endpoints to single optimized primary endpoint strategy
 */
export class VisApiClient implements IVisApiClient {
  private readonly config: VisApiClientConfig;
  private readonly retryConfig: RetryConfig;
  private readonly monitor: RequestMonitor;

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
        [VisApiEndpoint.GET_BEACH_TOURNAMENT]: 0,
        [VisApiEndpoint.GET_EVENT]: 0,
        [VisApiEndpoint.GET_BEACH_MATCH_LIST]: 0,
        [VisApiEndpoint.GET_BEACH_ROUND]: 0
      },
      errorsByType: {},
      lastRequestTimestamp: new Date().toISOString()
    };
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
        if (process.env.NODE_ENV === 'development' && this.config.enableLogging) {
          console.warn(`VIS API ${endpoint} attempt ${attempt} failed:`, error.message);
        }
        
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
      filterAttribs.push(`Gender="${request.gender}"`);
    }
    if (request.startDate) {
      filterAttribs.push(`StartDate="${request.startDate}"`);
    }
    if (request.endDate) {
      filterAttribs.push(`EndDate="${request.endDate}"`);
    }
    if (request.countryCode) {
      filterAttribs.push(`CountryCode="${request.countryCode}"`);
    }
    if (request.status) {
      filterAttribs.push(`Status="${request.status}"`);
    }
    
    // Always filter for beach volleyball tournaments
    filterAttribs.push('HasBeachTournament="True"');
    
    // Build fields list (space-separated) - request ALL fields to debug available data
    const fields = request.fields?.join(' ') || '';
    
    // Create simple XML request (no SOAP envelope)
    const filterElement = filterAttribs.length > 0 
      ? `<Filter ${filterAttribs.join(' ')} />` 
      : '';
    
    const xmlRequest = `<Request Type="GetEventList" Fields="${fields}">${filterElement}</Request>`;
    
    // XML request built successfully
    
    return xmlRequest;
  }

  /**
   * Build GetBeachTournament XML request (VIS API format)
   * Based on documentation: <Request Type="GetBeachTournament" No="502" Fields="..." />
   */
  private buildGetBeachTournamentXml(request: GetBeachTournamentRequest): string {
    // REQUEST THE No FIELD EXPLICITLY - this is the real tournament number we need
    const fields = 'No Code Name';
    
    return `<Request Type="GetBeachTournament" No="${request.tournamentNo}" Fields="${fields}" />`;
  }

  /**
   * Build GetEvent XML request (VIS API format)
   */
  private buildGetEventXml(request: GetEventRequest): string {
    // Include Content field to get BeachTournament information
    const fields = 'No Name Code Content';
    
    // Use simple attribute format like in documentation, not Filter element
    return `<Request Type="GetEvent" No="${request.eventNo}" Fields="${fields}" />`;
  }

  /**
   * Build GetBeachMatchList XML request (VIS API format)
   */
  private buildGetBeachMatchListXml(request: GetBeachMatchListRequest): string {
    // Use the EXACT format from documentation - filter parameter is NoTournament
    const filterAttribs = [`NoTournament="${request.tournamentNo}"`];
    
    // Add optional filters only if provided  
    if (request.courtNo) {
      filterAttribs.push(`CourtNo="${request.courtNo}"`);
    }
    if (request.status) {
      filterAttribs.push(`Status="${request.status}"`);
    }
    if (request.startDate) {
      filterAttribs.push(`StartDate="${request.startDate}"`);
    }
    if (request.endDate) {
      filterAttribs.push(`EndDate="${request.endDate}"`);
    }
    
    const includeResults = request.includeResults !== false;
    const includeReferees = request.includeReferees !== false;
    
    filterAttribs.push(`IncludeResults="${includeResults}"`);
    filterAttribs.push(`IncludeReferees="${includeReferees}"`);
    
    // Include all federation code fields for flag display, plus match results
    const fields = 'No NoInTournament LocalDate LocalTime Status Court TeamAName TeamBName TeamAFederationCode TeamBFederationCode MatchPointsA MatchPointsB RoundName Round Referee1Name Referee2Name Referee1FederationCode Referee2FederationCode';
    
    // Use EXACT XML format from documentation
    const xmlRequest = `<Request Type="GetBeachMatchList" Fields="${fields}">
  <Filter ${filterAttribs.join(' ')} />
</Request>`;
    
    
    return xmlRequest;
  }

  /**
   * Build XML request for GetBeachRound endpoint
   */
  private buildGetBeachRoundXml(request: GetBeachRoundRequest): string {
    const filterAttribs = [
      `NoTournament="${request.tournamentNo}"`,
      `NoRound="${request.roundNo}"`
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
}