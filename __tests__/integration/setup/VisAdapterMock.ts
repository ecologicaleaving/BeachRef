/**
 * VIS Adapter mock setup for integration testing
 * Story 3.5: Integration Testing & Performance Validation
 */

import { TournamentDTO, MatchDTO, RefereeDTO } from '../../../services/DualReadService';
import { createTestTournaments, createTestMatches, createTestReferees } from './TestDataFixtures';

/**
 * Mock VIS Adapter responses for consistent testing
 */
export class VisAdapterMock {
  private testId: string;
  private mockData: {
    tournaments: TournamentDTO[];
    matches: Map<string, MatchDTO[]>;
    referees: Map<string, RefereeDTO[]>;
  };

  constructor(testId: string) {
    this.testId = testId;
    this.mockData = {
      tournaments: createTestTournaments(testId),
      matches: new Map(),
      referees: new Map(),
    };

    // Pre-populate matches and referees for each tournament
    this.mockData.tournaments.forEach(tournament => {
      this.mockData.matches.set(
        tournament.tournamentCode,
        createTestMatches(testId, tournament.tournamentCode)
      );
      this.mockData.referees.set(
        tournament.tournamentCode,
        createTestReferees(testId)
      );
    });
  }

  /**
   * Setup fetch mock for VIS Adapter endpoints
   */
  setupFetchMock(): void {
    const originalFetch = global.fetch;
    
    global.fetch = jest.fn().mockImplementation(async (url: string, options?: any) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      // Health endpoint
      if (urlString.includes('/health')) {
        return this.createMockResponse({
          status: 'healthy',
          service: 'vis-adapter',
          timestamp: new Date().toISOString(),
        });
      }

      // Tournaments endpoint
      if (urlString.includes('/vis/tournaments')) {
        return this.createMockResponse(this.mockData.tournaments);
      }

      // Matches endpoint
      if (urlString.includes('/vis/matches')) {
        const urlObj = new URL(urlString, 'http://localhost');
        const tournamentCode = urlObj.searchParams.get('tournamentCode');
        
        if (tournamentCode) {
          const matches = this.mockData.matches.get(tournamentCode) || [];
          return this.createMockResponse(matches);
        }
        
        // Return all matches if no tournament code specified
        const allMatches = Array.from(this.mockData.matches.values()).flat();
        return this.createMockResponse(allMatches);
      }

      // Referees endpoint
      if (urlString.includes('/vis/referees')) {
        const urlObj = new URL(urlString, 'http://localhost');
        const tournamentCode = urlObj.searchParams.get('tournamentCode');
        
        if (tournamentCode) {
          const referees = this.mockData.referees.get(tournamentCode) || [];
          return this.createMockResponse(referees);
        }
        
        // Return all referees if no tournament code specified
        const allReferees = Array.from(this.mockData.referees.values()).flat();
        return this.createMockResponse(allReferees);
      }

      // DataSync Service endpoints
      if (urlString.includes('/sync/')) {
        return this.handleSyncEndpoint(urlString);
      }

      // Fallback to original fetch for unmocked endpoints
      if (originalFetch) {
        return originalFetch(url, options);
      }
      
      throw new Error(`Unmocked fetch call to: ${urlString}`);
    });
  }

  /**
   * Handle DataSync Service endpoint mocks
   */
  private handleSyncEndpoint(url: string): Response {
    const urlObj = new URL(url, 'http://localhost');
    
    if (url.includes('/sync/tournaments')) {
      return this.createMockResponse({
        success: true,
        synced: this.mockData.tournaments.length,
        errors: 0,
        duration: 1500,
        message: `Successfully synced ${this.mockData.tournaments.length} tournaments`,
      });
    }
    
    if (url.includes('/sync/matches')) {
      const tournamentCode = urlObj.searchParams.get('tournamentCode');
      const matchCount = tournamentCode 
        ? this.mockData.matches.get(tournamentCode)?.length || 0
        : Array.from(this.mockData.matches.values()).flat().length;
      
      return this.createMockResponse({
        success: true,
        synced: matchCount,
        errors: 0,
        duration: 2500,
        message: `Successfully synced ${matchCount} matches`,
      });
    }
    
    if (url.includes('/sync/referees')) {
      const tournamentCode = urlObj.searchParams.get('tournamentCode');
      const refereeCount = tournamentCode
        ? this.mockData.referees.get(tournamentCode)?.length || 0
        : Array.from(this.mockData.referees.values()).flat().length;
      
      return this.createMockResponse({
        success: true,
        synced: refereeCount,
        errors: 0,
        duration: 1200,
        message: `Successfully synced ${refereeCount} referees`,
      });
    }
    
    if (url.includes('/sync/full')) {
      const totalSynced = this.mockData.tournaments.length + 
        Array.from(this.mockData.matches.values()).flat().length +
        Array.from(this.mockData.referees.values()).flat().length;
      
      return this.createMockResponse({
        success: true,
        synced: totalSynced,
        errors: 0,
        duration: 15000,
        message: `Full sync completed: ${totalSynced} records synced`,
        details: [
          { step: 'tournaments', synced: this.mockData.tournaments.length, errors: 0 },
          { step: 'matches', synced: Array.from(this.mockData.matches.values()).flat().length, errors: 0 },
          { step: 'referees', synced: Array.from(this.mockData.referees.values()).flat().length, errors: 0 },
        ],
      });
    }
    
    throw new Error(`Unmocked sync endpoint: ${url}`);
  }

  /**
   * Create mock Response object
   */
  private createMockResponse(data: any, status: number = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      json: async () => data,
      text: async () => JSON.stringify(data),
      blob: async () => new Blob([JSON.stringify(data)]),
      arrayBuffer: async () => new ArrayBuffer(0),
      formData: async () => new FormData(),
    } as Response;
  }

  /**
   * Simulate network errors for testing error handling
   */
  simulateNetworkError(): void {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network connection failed'));
  }

  /**
   * Simulate API errors for testing error handling
   */
  simulateApiError(status: number = 500, message: string = 'Internal Server Error'): void {
    global.fetch = jest.fn().mockResolvedValue(this.createMockResponse(
      { error: message },
      status
    ));
  }

  /**
   * Simulate slow responses for performance testing
   */
  simulateSlowResponse(delayMs: number = 5000): void {
    const originalImplementation = (global.fetch as jest.Mock).getMockImplementation();
    
    global.fetch = jest.fn().mockImplementation(async (...args) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return originalImplementation(...args);
    });
  }

  /**
   * Reset fetch mock to original behavior
   */
  resetFetchMock(): void {
    if (global.fetch && (global.fetch as any).mockRestore) {
      (global.fetch as any).mockRestore();
    }
  }

  /**
   * Add custom tournament for specific test scenarios
   */
  addTestTournament(tournament: TournamentDTO): void {
    this.mockData.tournaments.push(tournament);
    this.mockData.matches.set(tournament.tournamentCode, []);
    this.mockData.referees.set(tournament.tournamentCode, []);
  }

  /**
   * Add custom matches for specific test scenarios
   */
  addTestMatches(tournamentCode: string, matches: MatchDTO[]): void {
    const existing = this.mockData.matches.get(tournamentCode) || [];
    this.mockData.matches.set(tournamentCode, [...existing, ...matches]);
  }

  /**
   * Add custom referees for specific test scenarios
   */
  addTestReferees(tournamentCode: string, referees: RefereeDTO[]): void {
    const existing = this.mockData.referees.get(tournamentCode) || [];
    this.mockData.referees.set(tournamentCode, [...existing, ...referees]);
  }

  /**
   * Get mock data for verification in tests
   */
  getMockData() {
    return {
      tournaments: this.mockData.tournaments,
      matches: Object.fromEntries(this.mockData.matches),
      referees: Object.fromEntries(this.mockData.referees),
      testId: this.testId,
    };
  }
}