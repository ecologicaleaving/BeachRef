/**
 * @fileoverview Data Transformation Service
 * Handles bi-directional transformation between legacy and new domain types
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.2
 */

import { TournamentCore, GenderType, TournamentType, TournamentStatus } from '../types/tournament-v2';
import { BeachMatchCore, MatchStatus } from '../types/match-v2';
import { Tournament } from '../types/tournament';
import { BeachMatch } from '../types/match';

/**
 * Transformation error with context
 */
export class TransformationError extends Error {
  constructor(
    message: string,
    public readonly context: Record<string, any> = {},
    public readonly originalError?: Error
  ) {
    super(`Transformation Error: ${message}`);
    this.name = 'TransformationError';
  }
}

/**
 * Transformation validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly isValid: boolean;
  /** Validation errors if any */
  readonly errors: string[];
  /** Missing fields if any */
  readonly missingFields: string[];
  /** Warnings about data loss */
  readonly warnings: string[];
}

/**
 * Data transformation service for legacy compatibility
 * Provides bi-directional transformation between old and new data types
 */
export class DataTransformationService {
  /**
   * Transform legacy Tournament interface to TournamentCore
   */
  tournamentLegacyToCore(legacy: Tournament): TournamentCore {
    try {
      if (!legacy.No) {
        throw new TransformationError('Missing required field: No', { legacy });
      }

      // Parse gender from code or direct field
      const gender = this.parseGender(legacy.Code);
      
      // Parse tournament type from various fields
      const tournamentType = this.parseTournamentType(legacy.Type, legacy.Series, legacy.Category);
      
      // Generate stable ID
      const id = this.generateTournamentId(
        legacy.No, 
        legacy.Code || legacy.No, 
        gender, 
        tournamentType
      );

      const tournamentCore: TournamentCore = {
        id,
        visNo: legacy.No,
        version: 1,
        lastUpdated: new Date().toISOString(),
        code: legacy.Code || legacy.No,
        name: legacy.Name || 'Unknown Tournament',
        title: legacy.Title,
        gender,
        tournamentType,
        status: this.parseStatus(legacy.Status),
        dates: {
          startDate: legacy.StartDate || new Date().toISOString(),
          endDate: legacy.EndDate || legacy.StartDate || new Date().toISOString(),
          startDateQualification: undefined,
          endDateQualification: undefined,
          startDateMainDraw: undefined,
          endDateMainDraw: undefined
        },
        city: legacy.City,
        country: legacy.Country,
        countryCode: this.extractCountryCode(legacy.Country),
        location: legacy.Location,
        courts: legacy.Courts ? parseInt(legacy.Courts) : undefined,
        prizeMoney: legacy.PrizeMoney || legacy.Prize,
        currency: legacy.Currency,
        website: legacy.Website,
        parentEventNo: undefined,
        series: legacy.Series,
        category: legacy.Category
      };

      return tournamentCore;

    } catch (error) {
      throw new TransformationError(
        'Failed to transform legacy tournament to core',
        { legacy },
        error as Error
      );
    }
  }

  /**
   * Transform TournamentCore to legacy Tournament interface
   */
  tournamentCoreToLegacy(core: TournamentCore): Tournament {
    try {
      const legacy: Tournament = {
        No: core.visNo,
        NoTournament: core.visNo,
        Name: core.name,
        Title: core.title,
        City: core.city,
        Country: core.country,
        CountryName: core.country,
        Location: core.location,
        StartDate: core.dates.startDate,
        EndDate: core.dates.endDate,
        Dates: this.formatDateRange(core.dates.startDate, core.dates.endDate),
        Version: core.version.toString(),
        Code: core.code,
        Status: this.statusToLegacy(core.status),
        Type: this.tournamentTypeToLegacy(core.tournamentType),
        Category: core.category,
        Series: core.series,
        League: undefined,
        Division: undefined,
        Prize: core.prizeMoney,
        PrizeMoney: core.prizeMoney,
        Currency: core.currency,
        Venue: core.location,
        Courts: core.courts?.toString(),
        ContactName: undefined,
        ContactEmail: undefined,
        ContactPhone: undefined,
        Website: core.website,
        // Additional fields with default values for full compatibility
        Draw: undefined,
        Phase: undefined,
        Round: undefined,
        Gender: this.genderToLegacy(core.gender),
        // Extended compatibility fields
        StartTime: undefined,
        EndTime: undefined,
        TimeZone: undefined,
        Surface: undefined,
        Indoor: undefined,
        Qualification: undefined,
        MainDraw: undefined,
        Entries: undefined,
        DirectAcceptances: undefined,
        Qualifiers: undefined,
        WildCards: undefined,
        SpecialExempt: undefined,
        Alternates: undefined,
        Seeds: undefined,
        Byes: undefined,
        Ranking: undefined,
        RankingSystem: undefined,
        PointsAwarded: undefined,
        PointsSystem: undefined,
        Created: core.lastUpdated,
        Modified: core.lastUpdated,
        CreatedBy: 'DataTransformationService',
        ModifiedBy: 'DataTransformationService'
      };

      return legacy;

    } catch (error) {
      throw new TransformationError(
        'Failed to transform core tournament to legacy',
        { core },
        error as Error
      );
    }
  }

  /**
   * Transform legacy BeachMatch to BeachMatchCore
   */
  matchLegacyToCore(legacy: BeachMatch, tournamentId: string): BeachMatchCore {
    try {
      if (!legacy.No) {
        throw new TransformationError('Missing required field: No', { legacy });
      }

      // Generate stable match ID
      const id = this.generateMatchId(
        tournamentId,
        legacy.Court || '1',
        legacy.DateTime || new Date().toISOString(),
        legacy.MatchNo || legacy.No
      );

      const matchCore: BeachMatchCore = {
        id,
        visNo: legacy.No,
        version: 1,
        lastUpdated: new Date().toISOString(),
        tournamentId,
        matchCode: legacy.MatchNo || legacy.No,
        round: legacy.Round || 'Unknown',
        phaseCode: legacy.Phase,
        status: this.parseMatchStatus(legacy.Status),
        court: {
          courtNumber: legacy.Court || '1',
          courtName: legacy.CourtName,
          surface: legacy.Surface,
          location: legacy.CourtLocation
        },
        scheduledDateTime: legacy.DateTime || new Date().toISOString(),
        actualStartTime: legacy.StartTime,
        actualEndTime: legacy.EndTime,
        team1: this.parseTeam(legacy, 1),
        team2: this.parseTeam(legacy, 2),
        result: this.parseMatchResult(legacy),
        refereeAssignments: this.parseRefereeAssignments(legacy),
        notes: legacy.Notes,
        weather: legacy.Weather,
        importance: this.determineMatchImportance(legacy.Round, legacy.Phase)
      };

      return matchCore;

    } catch (error) {
      throw new TransformationError(
        'Failed to transform legacy match to core',
        { legacy },
        error as Error
      );
    }
  }

  /**
   * Transform BeachMatchCore to legacy BeachMatch interface
   */
  matchCoreToLegacy(core: BeachMatchCore): BeachMatch {
    try {
      // Extract date and time from scheduledDateTime ISO string
      const scheduledDate = new Date(core.scheduledDateTime);
      const localDate = scheduledDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const localTime = scheduledDate.toTimeString().split(' ')[0]; // HH:MM:SS
      
      const legacy: BeachMatch = {
        No: core.visNo,
        NoInTournament: core.matchCode,
        LocalDate: localDate,
        LocalTime: localTime,
        TeamAName: core.team1.teamName,
        TeamBName: core.team2.teamName,
        Court: core.court.courtNumber,
        MatchPointsA: core.result?.team1Sets?.toString(),
        MatchPointsB: core.result?.team2Sets?.toString(),
        Status: this.matchStatusToLegacy(core.status),
        Round: core.round,
        Referee1Name: core.referees?.[0]?.name,
        Referee2Name: core.referees?.[1]?.name,
        NoReferee1: core.referees?.[0]?.id,
        NoReferee2: core.referees?.[1]?.id,
        Referee1FederationCode: core.referees?.[0]?.countryCode,
        Referee2FederationCode: core.referees?.[1]?.countryCode,
        // Additional fields for multi-tournament filtering
        tournamentGender: this.extractGenderFromTournamentId(core.tournamentId),
        tournamentNo: core.tournamentId,
        tournamentCode: this.extractCodeFromTournamentId(core.tournamentId),
        tournamentCountry: undefined // Would need tournament data to fill this
      } as BeachMatch;

      return legacy;

    } catch (error) {
      throw new TransformationError(
        'Failed to transform core match to legacy',
        { core },
        error as Error
      );
    }
  }

  /**
   * Extract gender from tournament ID (format: tournamentCode-gender-type-YYYYMMDD)
   */
  private extractGenderFromTournamentId(tournamentId: string): string {
    const parts = tournamentId.split('-');
    return parts.length > 1 ? parts[1] : 'U'; // Default to 'U' for unknown
  }

  /**
   * Extract tournament code from tournament ID
   */
  private extractCodeFromTournamentId(tournamentId: string): string {
    const parts = tournamentId.split('-');
    return parts[0] || tournamentId;
  }

  /**
   * Validate transformation to ensure no data loss
   */
  validateTransformation<T, U>(
    original: T,
    transformed: U,
    requiredFields: (keyof T)[]
  ): ValidationResult {
    const errors: string[] = [];
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const field of requiredFields) {
      if (!original[field]) {
        missingFields.push(field as string);
      }
    }

    // Check for data loss (simplified validation)
    const originalKeys = Object.keys(original as any);
    const transformedKeys = Object.keys(transformed as any);

    for (const key of originalKeys) {
      if (!transformedKeys.includes(key)) {
        warnings.push(`Field '${key}' may be lost in transformation`);
      }
    }

    const isValid = errors.length === 0 && missingFields.length === 0;

    return {
      isValid,
      errors,
      missingFields,
      warnings
    };
  }

  /**
   * Parse gender from tournament code or direct field
   */
  private parseGender(code?: string): GenderType {
    if (!code) return GenderType.M;
    
    const upperCode = code.toUpperCase();
    if (upperCode.startsWith('W') || upperCode.includes('WOMEN')) return GenderType.W;
    if (upperCode.includes('MIXED') || upperCode.includes('MX')) return GenderType.MIXED;
    return GenderType.M;
  }

  /**
   * Parse tournament type from various legacy fields
   */
  private parseTournamentType(type?: string, series?: string, category?: string): TournamentType {
    const typeStr = (type || series || category || '').toUpperCase();
    
    if (typeStr.includes('FIVB')) return TournamentType.FIVB;
    if (typeStr.includes('BPT') || typeStr.includes('BEACH PRO TOUR')) return TournamentType.BPT;
    if (typeStr.includes('CEV')) return TournamentType.CEV;
    
    return TournamentType.LOCAL;
  }

  /**
   * Parse tournament status from legacy status string
   */
  private parseStatus(status?: string): TournamentStatus {
    if (!status) return TournamentStatus.UPCOMING;
    
    const statusStr = status.toLowerCase();
    if (statusStr.includes('active') || statusStr.includes('running')) return TournamentStatus.ACTIVE;
    if (statusStr.includes('completed') || statusStr.includes('finished')) return TournamentStatus.COMPLETED;
    if (statusStr.includes('cancelled') || statusStr.includes('canceled')) return TournamentStatus.CANCELLED;
    
    return TournamentStatus.UPCOMING;
  }

  /**
   * Convert status back to legacy format
   */
  private statusToLegacy(status: TournamentStatus): string {
    switch (status) {
      case TournamentStatus.ACTIVE: return 'Active';
      case TournamentStatus.COMPLETED: return 'Completed';
      case TournamentStatus.CANCELLED: return 'Cancelled';
      default: return 'Upcoming';
    }
  }

  /**
   * Convert tournament type to legacy format
   */
  private tournamentTypeToLegacy(type: TournamentType): string {
    return type;
  }

  /**
   * Convert gender to legacy format
   */
  private genderToLegacy(gender: GenderType): string {
    return gender;
  }

  /**
   * Generate stable tournament ID
   */
  private generateTournamentId(
    visNo: string, 
    code: string, 
    gender: GenderType, 
    type: TournamentType
  ): string {
    const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `${visNo}_${cleanCode}_${gender.toLowerCase()}_${type.toLowerCase()}`;
  }

  /**
   * Generate stable match ID
   */
  private generateMatchId(
    tournamentId: string,
    court: string,
    dateTime: string,
    matchCode: string
  ): string {
    const dateStr = new Date(dateTime).toISOString().split('T')[0];
    const cleanMatchCode = matchCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `${tournamentId}_court${court}_${dateStr}_${cleanMatchCode}`;
  }

  /**
   * Extract country code from country name (simplified)
   */
  private extractCountryCode(country?: string): string | undefined {
    if (!country) return undefined;
    
    // Simplified country code mapping - in production would use proper mapping
    const countryMappings: Record<string, string> = {
      'United States': 'US',
      'Brazil': 'BR',
      'Germany': 'DE',
      'Italy': 'IT',
      'France': 'FR',
      'Netherlands': 'NL'
    };
    
    return countryMappings[country] || country.substring(0, 2).toUpperCase();
  }

  /**
   * Format date range for legacy compatibility
   */
  private formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate).toLocaleDateString();
    const end = new Date(endDate).toLocaleDateString();
    return start === end ? start : `${start} - ${end}`;
  }

  /**
   * Parse match status from legacy status
   */
  private parseMatchStatus(status?: string): MatchStatus {
    if (!status) return MatchStatus.SCHEDULED;
    
    const statusStr = status.toLowerCase();
    if (statusStr.includes('progress') || statusStr.includes('live')) return MatchStatus.IN_PROGRESS;
    if (statusStr.includes('completed') || statusStr.includes('finished')) return MatchStatus.COMPLETED;
    if (statusStr.includes('cancelled') || statusStr.includes('canceled')) return MatchStatus.CANCELLED;
    
    return MatchStatus.SCHEDULED;
  }

  /**
   * Parse team data from legacy match (simplified)
   */
  private parseTeam(match: any, teamNumber: 1 | 2): any {
    return {
      teamNumber,
      teamName: match[`Team${teamNumber}`] || `Team ${teamNumber}`,
      player1Name: match[`Team${teamNumber}Player1`] || 'Player 1',
      player2Name: match[`Team${teamNumber}Player2`] || 'Player 2',
      countryCode: match[`Team${teamNumber}Country`]
    };
  }

  /**
   * Parse match result from legacy data (simplified)
   */
  private parseMatchResult(match: any): any {
    if (!match.Result) return undefined;
    
    return {
      team1Sets: parseInt(match.Team1Sets || '0'),
      team2Sets: parseInt(match.Team2Sets || '0'),
      setScores: [],
      duration: undefined,
      winner: undefined,
      forfeit: false
    };
  }

  /**
   * Parse referee assignments (simplified)
   */
  private parseRefereeAssignments(match: any): any[] {
    return [];
  }

  /**
   * Determine match importance (simplified)
   */
  private determineMatchImportance(round?: string, phase?: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (round?.toLowerCase().includes('final') || phase?.toLowerCase().includes('final')) {
      return 'HIGH';
    }
    if (round?.toLowerCase().includes('semi') || phase?.toLowerCase().includes('semi')) {
      return 'HIGH';
    }
    return 'MEDIUM';
  }

  /**
   * Convert match status to legacy format
   */
  private matchStatusToLegacy(status: MatchStatus): string {
    switch (status) {
      case MatchStatus.SCHEDULED: return 'Scheduled';
      case MatchStatus.IN_PROGRESS: return 'In Progress';
      case MatchStatus.COMPLETED: return 'Completed';
      case MatchStatus.CANCELLED: return 'Cancelled';
      default: return 'Scheduled';
    }
  }

  /**
   * Format match result for legacy interface
   */
  private formatMatchResult(result: MatchResult): string {
    const team1Sets = result.team1Sets || 0;
    const team2Sets = result.team2Sets || 0;
    const winner = result.winner;
    
    let resultStr = `${team1Sets}-${team2Sets}`;
    if (winner) {
      resultStr += ` (Team ${winner} wins)`;
    }
    if (result.forfeit) {
      resultStr += ' (Forfeit)';
    }
    
    return resultStr;
  }

  /**
   * Extract tournament number from match ID
   */
  private extractTournamentNoFromMatchId(matchId: string): string {
    // Match ID format: "tournamentId_courtX_date_matchCode"
    // Tournament ID format: "visNo_code_gender_type"
    const parts = matchId.split('_');
    return parts.length >= 4 ? parts[0] : 'unknown';
  }
}