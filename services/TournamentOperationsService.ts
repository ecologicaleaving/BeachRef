import { VisApiClient } from './api/VisApiClient';
import { DEFAULT_RETRY_CONFIG } from '../types/api-v2';
import { RefereeAssignmentsService } from './RefereeAssignmentsService';
import { RefereeProfile } from '../types/RefereeAssignments';
import { TournamentRefereeData } from '../types/referee-v2';

export class TournamentOperationsService {
  private static visApiClient = new VisApiClient({
    baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
    timeoutMs: 10000,
    maxRetries: 3,
    retryDelayMs: 1000,
    exponentialBackoff: true,
    // No custom headers on purpose: any header outside the CORS safelist makes
    // the POST non-simple, and the VIS preflight is not cacheable — every
    // request would cost two round trips. See VisApiClientConfig.headers (#67).
    enableLogging: true
  }, DEFAULT_RETRY_CONFIG);

  /**
   * Find the opposite gender tournament for a given tournament
   */
  static async findOppositeGenderTournament(tournamentNo: string): Promise<string | null> {
    try {
      
      // Get all tournaments from API
      const response = await this.visApiClient.getBeachTournamentList({});
      if (!response.success) {
        throw new Error(`Failed to fetch tournaments: ${response.error}`);
      }
      
      // For now, return empty array as we need to parse XML
      const tournaments: any[] = [];
      
      const currentTournament = tournaments.find(t => t.No === tournamentNo);
      
      if (!currentTournament || !currentTournament.Code) {
        return null;
      }
      
      const currentCode = currentTournament.Code;
      
      // Try to find opposite gender tournament by transforming the code
      let oppositeCode: string | null = null;
      
      if (currentCode.startsWith('M')) {
        oppositeCode = 'W' + currentCode.substring(1);
      } else if (currentCode.startsWith('W')) {
        oppositeCode = 'M' + currentCode.substring(1);
      } else {
        // Try both M and W prefixes for tournaments without gender prefix
        const maleCode = 'M' + currentCode;
        const femaleCode = 'W' + currentCode;
        
        
        const maleTournament = tournaments.find(t => t.Code === maleCode);
        const femaleTournament = tournaments.find(t => t.Code === femaleCode);
        
        // Return the one that's different from current
        if (maleTournament && maleTournament.No !== tournamentNo) {
          return maleTournament.No;
        }
        if (femaleTournament && femaleTournament.No !== tournamentNo) {
          return femaleTournament.No;
        }
        
        return null;
      }
      
      // Look for the opposite gender tournament
      if (oppositeCode) {
        const oppositeTournament = tournaments.find(t => t.Code === oppositeCode);
        if (oppositeTournament) {
          return oppositeTournament.No;
        } else {
        }
      }
      
      return null;
    } catch (error) {
      // console.error('Failed to find opposite gender tournament:', error);
      return null;
    }
  }

  /**
   * Infer country from tournament name
   */
  static inferCountryFromName(name?: string): string | undefined {
    if (!name) return undefined;
    const nameLower = name.toLowerCase();
    
    const countryMap: Record<string, string> = {
      'dusseldorf': 'Germany',
      'düsseldorf': 'Germany',
      'hamburg': 'Germany',
      'berlin': 'Germany',
      'munich': 'Germany',
      'rome': 'Italy',
      'roma': 'Italy',
      'italy': 'Italy',
      'paris': 'France',
      'france': 'France',
      'madrid': 'Spain',
      'spain': 'Spain',
      'vienna': 'Austria',
      'austria': 'Austria',
      'doha': 'Qatar',
      'qatar': 'Qatar',
      'tokyo': 'Japan',
      'japan': 'Japan',
      'sydney': 'Australia',
      'australia': 'Australia',
      'toronto': 'Canada',
      'vancouver': 'Canada',
      'canada': 'Canada',
      'montreal': 'Canada',
      'brazil': 'Brazil',
      'rio': 'Brazil',
      'sao paulo': 'Brazil',
      'usa': 'USA',
      'america': 'USA',
      'miami': 'USA',
      'los angeles': 'USA',
      'new york': 'USA',
      'poland': 'Poland',
      'warsaw': 'Poland',
      'krakow': 'Poland',
      'netherlands': 'Netherlands',
      'amsterdam': 'Netherlands',
      'den haag': 'Netherlands',
      'norway': 'Norway',
      'oslo': 'Norway',
      'sweden': 'Sweden',
      'stockholm': 'Sweden',
      'denmark': 'Denmark',
      'copenhagen': 'Denmark',
      'finland': 'Finland',
      'helsinki': 'Finland',
      'turkey': 'Turkey',
      'istanbul': 'Turkey',
      'ankara': 'Turkey',
      'mexico': 'Mexico',
      'cancun': 'Mexico',
      'acapulco': 'Mexico',
      'argentina': 'Argentina',
      'buenos aires': 'Argentina',
      'chile': 'Chile',
      'santiago': 'Chile',
      'viña del mar': 'Chile',
    };

    for (const [key, country] of Object.entries(countryMap)) {
      if (nameLower.includes(key)) {
        return country;
      }
    }
    
    return undefined;
  }

  /**
   * Get tournament status based on dates
   */
  static getTournamentStatus(tournament: any): 'upcoming' | 'live' | 'completed' | 'unknown' {
    if (!tournament.StartDate || !tournament.EndDate) {
      return 'unknown';
    }

    const now = new Date();
    const start = new Date(tournament.StartDate);
    const end = new Date(tournament.EndDate);

    if (now < start) {
      return 'upcoming';
    } else if (now >= start && now <= end) {
      return 'live';
    } else {
      return 'completed';
    }
  }

  /**
   * Format tournament date range
   */
  static formatTournamentDateRange(tournament: any): string {
    if (tournament.Dates) {
      return tournament.Dates;
    }
    
    if (tournament.StartDate && tournament.EndDate) {
      const start = this.formatDate(tournament.StartDate);
      const end = this.formatDate(tournament.EndDate);
      if (start === end) return start;
      return `${start} - ${end}`;
    }
    
    return this.formatDate(tournament.StartDate) || this.formatDate(tournament.EndDate) || 'TBD';
  }

  /**
   * Format a single date
   */
  private static formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  /**
   * Get tournament location string
   */
  static getTournamentLocation(tournament: any): string {
    const city = tournament.City;
    const country = tournament.CountryName || tournament.Country;
    const inferredCountry = this.inferCountryFromName(tournament.Name);
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    // If we inferred a country, show it
    if (inferredCountry) {
      const suffix = !country ? ` [Inferred: ${inferredCountry}]` : '';
      return city ? `${city}, ${inferredCountry}${suffix}` : `${inferredCountry}${suffix}`;
    }
    
    return tournament.Location || city || country || 'Unknown Location';
  }

  /**
   * Validate tournament data
   */
  static validateTournament(tournament: Partial<any>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!tournament.No) {
      errors.push('Tournament number is required');
    }

    if (!tournament.Name && !tournament.Title) {
      errors.push('Tournament name or title is required');
    }

    if (!tournament.StartDate) {
      errors.push('Start date is required');
    }

    if (!tournament.EndDate) {
      errors.push('End date is required');
    }

    if (tournament.StartDate && tournament.EndDate) {
      const start = new Date(tournament.StartDate);
      const end = new Date(tournament.EndDate);
      
      if (start > end) {
        errors.push('Start date must be before end date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get referee data for tournament detail views
   */
  static async getTournamentRefereeData(tournamentNo: string): Promise<TournamentRefereeData | null> {
    try {
      return await RefereeAssignmentsService.getRefereeDataFromCache(tournamentNo);
    } catch (error) {
      // console.error('Failed to get tournament referee data:', error);
      return null;
    }
  }

  /**
   * Get all referees for tournament detail display
   */
  static async getTournamentReferees(tournamentNo: string): Promise<RefereeProfile[]> {
    try {
      return await RefereeAssignmentsService.getAllRefereesForTournament(tournamentNo);
    } catch (error) {
      // console.error('Failed to get tournament referees:', error);
      return [];
    }
  }

  /**
   * Get referee profile for tournament detail views
   */
  static async getRefereeForTournament(refereeId: string, tournamentNo: string): Promise<RefereeProfile | null> {
    try {
      return await RefereeAssignmentsService.getRefereeProfile(refereeId, tournamentNo);
    } catch (error) {
      // console.error('Failed to get referee for tournament:', error);
      return null;
    }
  }

  /**
   * Check if tournament has referee data available
   */
  static async hasTournamentRefereeData(tournamentNo: string): Promise<boolean> {
    try {
      const refereeData = await this.getTournamentRefereeData(tournamentNo);
      return refereeData !== null && (refereeData.referees.length > 0 || refereeData.officials.length > 0);
    } catch (error) {
      return false;
    }
  }
}
