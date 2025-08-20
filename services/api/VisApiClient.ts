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
  VisApiEndpoint,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_FIELD_SELECTIONS,
  RequestMonitor
} from '../../types/api-v2';

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
        [VisApiEndpoint.GET_BEACH_MATCH_LIST]: 0
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
        
        if (this.config.enableLogging) {
          console.log(`VIS API ${endpoint} success (attempt ${attempt})`);
        }
        
        return {
          success: true,
          xmlData: response,
          timestamp: new Date().toISOString(),
          durationMs: 0, // Will be set by caller
          sizeBytes: response.length
        } as VisApiSuccessResponse;
        
      } catch (error) {
        lastError = error as Error;
        
        if (this.config.enableLogging) {
          console.warn(`VIS API ${endpoint} attempt ${attempt} failed:`, error);
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
   * Make actual HTTP request
   */
  private async makeHttpRequest(xmlData: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '',
          ...this.config.headers
        },
        body: xmlData,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
      
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Build GetEventList XML request
   */
  private buildGetEventListXml(request: GetEventListRequest): string {
    const filters = [];
    
    if (request.tournamentType) {
      filters.push(`<Type>${request.tournamentType}</Type>`);
    }
    if (request.gender) {
      filters.push(`<Gender>${request.gender}</Gender>`);
    }
    if (request.startDate) {
      filters.push(`<StartDate>${request.startDate}</StartDate>`);
    }
    if (request.endDate) {
      filters.push(`<EndDate>${request.endDate}</EndDate>`);
    }
    if (request.countryCode) {
      filters.push(`<CountryCode>${request.countryCode}</CountryCode>`);
    }
    if (request.status) {
      filters.push(`<Status>${request.status}</Status>`);
    }
    if (request.maxResults) {
      filters.push(`<MaxResults>${request.maxResults}</MaxResults>`);
    }

    const fieldSelection = request.fields?.map(field => `<Field>${field}</Field>`).join('') || '';

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetEventList xmlns="http://www.fivb.org/VIS/VIS_WebServices/">
      <Request>
        ${filters.join('')}
        <FieldSelection>
          ${fieldSelection}
        </FieldSelection>
      </Request>
    </GetEventList>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Build GetBeachTournament XML request
   */
  private buildGetBeachTournamentXml(request: GetBeachTournamentRequest): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetBeachTournament xmlns="http://www.fivb.org/VIS/VIS_WebServices/">
      <Request>
        <No>${request.tournamentNo}</No>
        <IncludeLocation>${request.includeLocation || true}</IncludeLocation>
        <IncludeVenue>${request.includeVenue || true}</IncludeVenue>
        <IncludeContacts>${request.includeContacts || false}</IncludeContacts>
      </Request>
    </GetBeachTournament>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Build GetEvent XML request
   */
  private buildGetEventXml(request: GetEventRequest): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetEvent xmlns="http://www.fivb.org/VIS/VIS_WebServices/">
      <Request>
        <No>${request.eventNo}</No>
        <IncludeOfficials>${request.includeOfficials || true}</IncludeOfficials>
        <IncludeReferees>${request.includeReferees || true}</IncludeReferees>
        <IncludeTechnicalOfficials>${request.includeTechnicalOfficials || false}</IncludeTechnicalOfficials>
      </Request>
    </GetEvent>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Build GetBeachMatchList XML request
   */
  private buildGetBeachMatchListXml(request: GetBeachMatchListRequest): string {
    const filters = [];
    
    if (request.courtNo) {
      filters.push(`<CourtNo>${request.courtNo}</CourtNo>`);
    }
    if (request.status) {
      filters.push(`<Status>${request.status}</Status>`);
    }
    if (request.startDate) {
      filters.push(`<StartDate>${request.startDate}</StartDate>`);
    }
    if (request.endDate) {
      filters.push(`<EndDate>${request.endDate}</EndDate>`);
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetBeachMatchList xmlns="http://www.fivb.org/VIS/VIS_WebServices/">
      <Request>
        <TournamentNo>${request.tournamentNo}</TournamentNo>
        ${filters.join('')}
        <IncludeResults>${request.includeResults || true}</IncludeResults>
        <IncludeReferees>${request.includeReferees || true}</IncludeReferees>
      </Request>
    </GetBeachMatchList>
  </soap:Body>
</soap:Envelope>`;
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