// FIVB API Authentication Module
// Handles JWT token generation and request-level authentication

import { encode } from "https://deno.land/x/djwt@v2.8/mod.ts";

export interface FIVBCredentials {
  username: string;
  password: string;
  jwtSecret?: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}

// JWT payload structure for FIVB API
interface JWTPayload {
  sub: string; // subject (username)
  iat: number; // issued at
  exp: number; // expiration
  aud: string; // audience (FIVB API)
  iss: string; // issuer
}

export class FIVBAuthenticator {
  private credentials: FIVBCredentials;
  private cachedToken?: string;
  private tokenExpiration?: number;

  constructor(credentials: FIVBCredentials) {
    this.credentials = credentials;
  }

  /**
   * Get a valid JWT token, creating one if necessary
   */
  async getJWTToken(): Promise<AuthResult> {
    try {
      // Check if we have a valid cached token
      if (this.cachedToken && this.tokenExpiration && Date.now() < this.tokenExpiration) {
        return {
          success: true,
          token: this.cachedToken
        };
      }

      // Generate a new JWT token
      const token = await this.generateJWTToken();
      if (!token) {
        return {
          success: false,
          error: 'Failed to generate JWT token'
        };
      }

      // Cache the token (expires in 1 hour)
      this.cachedToken = token;
      this.tokenExpiration = Date.now() + (60 * 60 * 1000); // 1 hour from now

      return {
        success: true,
        token: token
      };

    } catch (error) {
      console.error('Error generating JWT token:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate a new JWT token using the stored credentials
   */
  private async generateJWTToken(): Promise<string | null> {
    try {
      if (!this.credentials.jwtSecret) {
        console.warn('No JWT secret provided, cannot generate JWT token');
        return null;
      }

      const header = {
        alg: "HS256",
        typ: "JWT"
      };

      const payload: JWTPayload = {
        sub: this.credentials.username,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // Expires in 1 hour
        aud: "fivb-vis-api",
        iss: "tournament-sync-service"
      };

      // Convert JWT secret to Uint8Array for signing
      const key = new TextEncoder().encode(this.credentials.jwtSecret);

      // Generate the JWT token
      const token = await encode(header, payload, key);
      
      console.log('JWT token generated successfully');
      return token;

    } catch (error) {
      console.error('Error in JWT token generation:', error);
      return null;
    }
  }

  /**
   * Create XML request with embedded authentication
   */
  createAuthenticatedXMLRequest(requestType: string, parameters?: Record<string, string>): string {
    let xmlRequest = `<Requests Username="${this.credentials.username}" Password="${this.credentials.password}">`;
    
    if (parameters && Object.keys(parameters).length > 0) {
      const paramString = Object.entries(parameters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      xmlRequest += `<Request Type="${requestType}" ${paramString} />`;
    } else {
      xmlRequest += `<Request Type="${requestType}" />`;
    }
    
    xmlRequest += '</Requests>';
    
    return xmlRequest;
  }

  /**
   * Test authentication with the FIVB API
   */
  async testAuthentication(): Promise<AuthResult> {
    try {
      console.log('Testing FIVB API authentication...');

      // Try JWT authentication first
      const jwtResult = await this.testJWTAuthentication();
      if (jwtResult.success) {
        console.log('JWT authentication test successful');
        return jwtResult;
      }

      console.log('JWT authentication failed, testing request-level authentication');

      // Fallback to request-level authentication
      const requestAuthResult = await this.testRequestAuthentication();
      if (requestAuthResult.success) {
        console.log('Request-level authentication test successful');
        return requestAuthResult;
      }

      console.error('Both authentication methods failed');
      return {
        success: false,
        error: 'All authentication methods failed'
      };

    } catch (error) {
      console.error('Error testing authentication:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test JWT authentication with a simple API call
   */
  private async testJWTAuthentication(): Promise<AuthResult> {
    try {
      const tokenResult = await this.getJWTToken();
      if (!tokenResult.success || !tokenResult.token) {
        return {
          success: false,
          error: 'Failed to get JWT token'
        };
      }

      const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': `Bearer ${tokenResult.token}`
        },
        body: '<Request Type="GetBeachTournamentList" MaxResults="1" />'
      });

      if (response.ok) {
        const responseText = await response.text();
        // Check if the response contains tournament data (not an error)
        if (responseText.includes('<Tournament') || responseText.includes('<Tournaments')) {
          return {
            success: true,
            token: tokenResult.token
          };
        }
      }

      return {
        success: false,
        error: `JWT authentication failed: ${response.status} ${response.statusText}`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test request-level authentication with a simple API call
   */
  private async testRequestAuthentication(): Promise<AuthResult> {
    try {
      const xmlRequest = this.createAuthenticatedXMLRequest('GetBeachTournamentList', { MaxResults: '1' });

      const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml'
        },
        body: xmlRequest
      });

      if (response.ok) {
        const responseText = await response.text();
        // Check if the response contains tournament data (not an error)
        if (responseText.includes('<Tournament') || responseText.includes('<Tournaments')) {
          return {
            success: true
          };
        }
      }

      return {
        success: false,
        error: `Request-level authentication failed: ${response.status} ${response.statusText}`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear cached authentication data
   */
  clearCache(): void {
    this.cachedToken = undefined;
    this.tokenExpiration = undefined;
    console.log('Authentication cache cleared');
  }

  /**
   * Get authentication status information
   */
  getAuthStatus(): { hasCredentials: boolean; hasJWTSecret: boolean; hasCachedToken: boolean; tokenExpired: boolean } {
    return {
      hasCredentials: Boolean(this.credentials.username && this.credentials.password),
      hasJWTSecret: Boolean(this.credentials.jwtSecret),
      hasCachedToken: Boolean(this.cachedToken),
      tokenExpired: Boolean(this.tokenExpiration && Date.now() >= this.tokenExpiration)
    };
  }
}

/**
 * Utility function to retrieve FIVB credentials from Supabase vault
 */
export async function getFIVBCredentialsFromVault(supabase: any): Promise<FIVBCredentials | null> {
  try {
    console.log('Retrieving FIVB API credentials from Supabase vault...');

    const { data, error } = await supabase
      .from('vault')
      .select('secret')
      .eq('name', 'FIVB_API_CREDENTIALS')
      .single();

    if (error) {
      console.error('Error retrieving credentials from vault:', error);
      return null;
    }

    if (!data || !data.secret) {
      console.error('No credentials found in vault');
      return null;
    }

    const credentials = JSON.parse(data.secret) as FIVBCredentials;
    
    // Validate credentials structure
    if (!credentials.username || !credentials.password) {
      console.error('Invalid credentials structure - missing username or password');
      return null;
    }

    console.log('Credentials retrieved successfully from vault');
    return credentials;

  } catch (error) {
    console.error('Error parsing credentials from vault:', error);
    return null;
  }
}

/**
 * Utility function to store FIVB credentials in Supabase vault (for setup)
 */
export async function storeFIVBCredentialsInVault(
  supabase: any, 
  credentials: FIVBCredentials
): Promise<boolean> {
  try {
    console.log('Storing FIVB API credentials in Supabase vault...');

    const { error } = await supabase
      .from('vault')
      .upsert({
        name: 'FIVB_API_CREDENTIALS',
        secret: JSON.stringify(credentials),
        updated_at: new Date().toISOString()
      }, { onConflict: 'name' });

    if (error) {
      console.error('Error storing credentials in vault:', error);
      return false;
    }

    console.log('Credentials stored successfully in vault');
    return true;

  } catch (error) {
    console.error('Error in storeFIVBCredentialsInVault:', error);
    return false;
  }
}