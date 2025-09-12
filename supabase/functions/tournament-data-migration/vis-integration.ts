/**
 * @fileoverview VIS Adapter Integration Client for Tournament Data Migration
 * Handles all interactions with the VIS Adapter Edge Functions from Epic 1
 */

export interface VISAdapterResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  metadata?: {
    totalRecords: number;
    requestId: string;
    timestamp: string;
  };
}

export interface VISTournamentDTO {
  id: string;
  visNo: string;
  code: string;
  name: string;
  title?: string;
  gender: 'M' | 'W' | 'MIXED';
  tournamentType: 'FIVB' | 'BPT' | 'CEV' | 'LOCAL';
  dates: {
    startDate: string;
    endDate: string;
    startDateQualification?: string;
    startDateMainDraw?: string;
  };
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  city?: string;
  country?: string;
  countryCode?: string;
  location?: string;
  NoEvent?: string;
}

export interface VISMatchDTO {
  visMatchNo: number;
  tournamentCode: string;
  eventNo: number;
  eventName?: string;
  matchNo: string;
  roundName: string;
  team1?: {
    player1: string;
    player2: string;
  };
  team2?: {
    player1: string;
    player2: string;
  };
  court: string;
  matchDate: string;
  matchTime: string;
  status: string;
  gender?: string;
  category?: string;
  scoreTeam1Set1?: number;
  scoreTeam2Set1?: number;
  scoreTeam1Set2?: number;
  scoreTeam2Set2?: number;
  scoreTeam1Set3?: number;
  scoreTeam2Set3?: number;
}

export interface VISRefereeDTO {
  visRefereeNo: number;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  federation: string;
  birthdate?: string;
}

export interface VISIntegrationConfig {
  visAdapterUrl: string;
  serviceRoleKey: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export class VISIntegrationClient {
  private config: VISIntegrationConfig;

  constructor(config: VISIntegrationConfig) {
    this.config = config;
  }

  /**
   * Create default VIS integration client from environment variables
   */
  static fromEnvironment(): VISIntegrationClient {
    const visAdapterUrl = Deno.env.get('VIS_ADAPTER_URL') || 
      `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/functions/v1/vis-adapter`;
    
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    }

    return new VISIntegrationClient({
      visAdapterUrl,
      serviceRoleKey,
      timeout: 30000, // 30 second timeout
      retryAttempts: 3,
      retryDelay: 1000, // 1 second initial delay
    });
  }

  /**
   * Fetch tournament data from VIS Adapter with retry logic
   */
  async fetchTournaments(): Promise<VISTournamentDTO[]> {
    console.log('Fetching tournaments from VIS Adapter');
    
    const response = await this.makeRequest<VISTournamentDTO[]>('/vis/tournaments?mode=upsert');
    
    if (!response.success || !response.data) {
      throw new Error(`VIS Adapter tournaments request failed: ${response.message}`);
    }

    console.log(`Successfully fetched ${response.data.length} tournaments from VIS Adapter`);
    return response.data;
  }

  /**
   * Fetch match data from VIS Adapter with retry logic
   */
  async fetchMatches(): Promise<VISMatchDTO[]> {
    console.log('Fetching matches from VIS Adapter');
    
    const response = await this.makeRequest<VISMatchDTO[]>('/vis/matches?mode=upsert');
    
    if (!response.success || !response.data) {
      throw new Error(`VIS Adapter matches request failed: ${response.message}`);
    }

    console.log(`Successfully fetched ${response.data.length} matches from VIS Adapter`);
    return response.data;
  }

  /**
   * Fetch referee data from VIS Adapter with retry logic
   */
  async fetchReferees(): Promise<VISRefereeDTO[]> {
    console.log('Fetching referees from VIS Adapter');
    
    const response = await this.makeRequest<VISRefereeDTO[]>('/vis/referees?mode=upsert');
    
    if (!response.success || !response.data) {
      throw new Error(`VIS Adapter referees request failed: ${response.message}`);
    }

    console.log(`Successfully fetched ${response.data.length} referees from VIS Adapter`);
    return response.data;
  }

  /**
   * Fetch specific tournament data by tournament code
   */
  async fetchTournamentByCode(tournamentCode: string): Promise<VISTournamentDTO | null> {
    console.log(`Fetching tournament ${tournamentCode} from VIS Adapter`);
    
    const response = await this.makeRequest<VISTournamentDTO>(`/vis/tournaments/${tournamentCode}`);
    
    if (!response.success) {
      if (response.message.includes('not found')) {
        return null;
      }
      throw new Error(`VIS Adapter tournament request failed: ${response.message}`);
    }

    return response.data;
  }

  /**
   * Fetch matches for a specific tournament
   */
  async fetchMatchesByTournament(tournamentCode: string): Promise<VISMatchDTO[]> {
    console.log(`Fetching matches for tournament ${tournamentCode} from VIS Adapter`);
    
    const response = await this.makeRequest<VISMatchDTO[]>(`/vis/matches?tournament=${tournamentCode}&mode=upsert`);
    
    if (!response.success || !response.data) {
      throw new Error(`VIS Adapter matches request failed: ${response.message}`);
    }

    console.log(`Successfully fetched ${response.data.length} matches for tournament ${tournamentCode}`);
    return response.data;
  }

  /**
   * Test VIS Adapter connectivity and health
   */
  async testConnection(): Promise<{ healthy: boolean; message: string; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/health', 'GET', null, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: response.success,
        message: response.message || 'VIS Adapter is healthy',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        healthy: false,
        message: `VIS Adapter connection failed: ${error.message}`,
        responseTime,
      };
    }
  }

  /**
   * Get VIS Adapter configuration and status
   */
  async getAdapterStatus(): Promise<any> {
    console.log('Checking VIS Adapter status');
    
    const response = await this.makeRequest('/status', 'GET');
    
    if (!response.success) {
      throw new Error(`VIS Adapter status request failed: ${response.message}`);
    }

    return response.data;
  }

  /**
   * Make authenticated request to VIS Adapter with retry logic
   */
  private async makeRequest<T = any>(
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET', 
    body?: any,
    options: { timeout?: number } = {}
  ): Promise<VISAdapterResponse<T>> {
    const url = `${this.config.visAdapterUrl}${endpoint}`;
    const timeout = options.timeout || this.config.timeout;
    
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`VIS Adapter request attempt ${attempt}/${this.config.retryAttempts}: ${method} ${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${this.config.serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Validate response structure
        if (typeof data.success !== 'boolean') {
          throw new Error('Invalid response format from VIS Adapter');
        }

        console.log(`VIS Adapter request successful: ${method} ${endpoint} (attempt ${attempt})`);
        return data as VISAdapterResponse<T>;

      } catch (error) {
        lastError = error;
        console.error(`VIS Adapter request failed (attempt ${attempt}/${this.config.retryAttempts}):`, error.message);
        
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`VIS Adapter request failed after ${this.config.retryAttempts} attempts: ${lastError.message}`);
  }
}

/**
 * Rate limiter to respect VIS API limits
 */
export class VISRateLimiter {
  private requestTimes: number[] = [];
  private readonly maxRequestsPerMinute: number;
  private readonly windowMs: number;

  constructor(maxRequestsPerMinute: number = 60) {
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.windowMs = 60000; // 1 minute in milliseconds
  }

  /**
   * Wait if necessary to respect rate limits
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Remove requests older than the window
    this.requestTimes = this.requestTimes.filter(time => now - time < this.windowMs);
    
    if (this.requestTimes.length >= this.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requestTimes.push(now);
  }

  /**
   * Get current rate limit status
   */
  getStatus(): { requestsInWindow: number; maxRequests: number; canMakeRequest: boolean } {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(time => now - time < this.windowMs);
    
    return {
      requestsInWindow: this.requestTimes.length,
      maxRequests: this.maxRequestsPerMinute,
      canMakeRequest: this.requestTimes.length < this.maxRequestsPerMinute,
    };
  }
}

/**
 * Caching layer for VIS Adapter responses to improve performance
 */
export class VISResponseCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly defaultTtl: number;

  constructor(defaultTtlMinutes: number = 5) {
    this.defaultTtl = defaultTtlMinutes * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Get cached response if available and not expired
   */
  get<T = any>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`Cache hit for key: ${key}`);
    return cached.data as T;
  }

  /**
   * Store response in cache
   */
  set(key: string, data: any, ttlMinutes?: number): void {
    const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : this.defaultTtl;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    
    console.log(`Cached response for key: ${key} (TTL: ${ttl / 1000 / 60} minutes)`);
  }

  /**
   * Clear all cached responses
   */
  clear(): void {
    this.cache.clear();
    console.log('VIS response cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}