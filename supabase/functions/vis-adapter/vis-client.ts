/**
 * VIS API Client for Edge Function
 * Simplified wrapper for VIS API authentication and requests
 */

export interface VisClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export class VisClient {
  private config: VisClientConfig;

  constructor(config: VisClientConfig) {
    // Validate required configuration
    if (!config.baseUrl) {
      throw new Error('VisClient: baseUrl is required');
    }
    
    if (!config.baseUrl.startsWith('http')) {
      throw new Error('VisClient: baseUrl must be a valid HTTP(S) URL');
    }

    this.config = {
      timeoutMs: 10000, // 10 second default timeout
      ...config,
    };
  }

  /**
   * Make authenticated request to VIS API
   */
  async makeRequest(xmlRequest: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      // VIS API expects form data with Request parameter
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...this.config.headers,
      };

      // Encode XML request as form data parameter
      const formData = `Request=${encodeURIComponent(xmlRequest)}`;

      // Only log URL in development, avoid exposing sensitive URLs in production
      if (Deno.env.get('DENO_ENV') !== 'production') {
        console.log('Making VIS API request to:', this.config.baseUrl);
      }

      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
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
      
    } catch (error) {
      // Log error type and message but avoid exposing sensitive details
      console.error('VIS API request failed:', {
        message: error.message,
        type: error.name,
        url: this.config.baseUrl.replace(/\/[^\/]*$/, '/***'), // Mask sensitive URL parts
      });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Test connectivity to VIS API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Simple test request - minimal GetEventList
      const testRequest = `<Request Type="GetEventList" Fields="No Name" />`;
      const response = await this.makeRequest(testRequest);
      return response.length > 0;
    } catch (error) {
      console.error('VIS API connection test failed:', error);
      return false;
    }
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
}