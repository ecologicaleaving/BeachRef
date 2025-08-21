import { VisApiClient, DEFAULT_RETRY_CONFIG } from './api/VisApiClient';
import { TournamentCore } from '../types/tournament-v2';

export class TournamentOperationsService {
  private static visApiClient = new VisApiClient({
    baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
    timeoutMs: 10000,
    maxRetries: 3,
    retryDelayMs: 1000,
    exponentialBackoff: true,
    enableLogging: true
  }, DEFAULT_RETRY_CONFIG);

  /**
   * Find the opposite gender tournament for a given tournament
   */
  static async findOppositeGenderTournament(tournamentNo: string): Promise<string | null> {
    try {
      // console.log(`🏐 DEBUG: Looking for opposite gender tournament for ${tournamentNo}...`);
      
      // Get all tournaments from API
      const tournaments = await this.visApiClient.fetchBeachTournamentsThisYear();
      // console.log(`🏐 DEBUG: Fetched ${tournaments.length} tournaments from API`);
      
      const currentTournament = tournaments.find(t => t.No === tournamentNo);
      
      if (!currentTournament || !currentTournament.Code) {
        // console.log(`🏐 DEBUG: Current tournament not found or has no code`);
        return null;
      }
      
      const currentCode = currentTournament.Code;
      // console.log(`🏐 DEBUG: Current tournament code: ${currentCode}`);
      
      // Try to find opposite gender tournament by transforming the code
      let oppositeCode: string | null = null;
      
      if (currentCode.startsWith('M')) {
        oppositeCode = 'W' + currentCode.substring(1);
        // console.log(`🏐 DEBUG: Looking for female version: ${oppositeCode}`);
      } else if (currentCode.startsWith('W')) {
        oppositeCode = 'M' + currentCode.substring(1);
        // console.log(`🏐 DEBUG: Looking for male version: ${oppositeCode}`);
      } else {
        // Try both M and W prefixes for tournaments without gender prefix
        const maleCode = 'M' + currentCode;
        const femaleCode = 'W' + currentCode;
        
        // console.log(`🏐 DEBUG: Trying both gender versions: ${maleCode} and ${femaleCode}`);
        
        const maleTournament = tournaments.find(t => t.Code === maleCode);
        const femaleTournament = tournaments.find(t => t.Code === femaleCode);
        
        // Return the one that's different from current
        if (maleTournament && maleTournament.No !== tournamentNo) {
          // console.log(`🏐 DEBUG: Found male version: ${maleTournament.Code} (${maleTournament.No})`);
          return maleTournament.No;
        }
        if (femaleTournament && femaleTournament.No !== tournamentNo) {
          // console.log(`🏐 DEBUG: Found female version: ${femaleTournament.Code} (${femaleTournament.No})`);
          return femaleTournament.No;
        }
        
        // console.log(`🏐 DEBUG: No gender variants found for neutral tournament`);
        return null;
      }
      
      // Look for the opposite gender tournament
      if (oppositeCode) {
        const oppositeTournament = tournaments.find(t => t.Code === oppositeCode);
        if (oppositeTournament) {
          // console.log(`🏐 DEBUG: Found opposite gender tournament: ${oppositeTournament.Code} (${oppositeTournament.No})`);
          return oppositeTournament.No;
        } else {
          // console.log(`🏐 DEBUG: No tournament found with code: ${oppositeCode}`);
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
  static getTournamentStatus(tournament: Tournament): 'upcoming' | 'live' | 'completed' | 'unknown' {
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
  static formatTournamentDateRange(tournament: Tournament): string {
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
  static getTournamentLocation(tournament: Tournament): string {
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
  static validateTournament(tournament: Partial<Tournament>): {
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
}