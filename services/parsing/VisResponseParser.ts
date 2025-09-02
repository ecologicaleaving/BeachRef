/**
 * @fileoverview VIS Response Parser v2
 * Robust XML parsing and data transformation for VIS API responses
 * Migrated to VIS-compliant types for improved type safety and schema compliance
 * Part of VIS Data Structure Alignment Epic - Story 1.2
 */

import { 
  TournamentCore, 
  TournamentDates, 
  GenderType, 
  TournamentType, 
  TournamentStatus,
  generateTournamentId,
  mapVisTournamentType,
  mapVisTournamentStatus
} from '../../types/tournament-v2';

import {
  BeachMatchCore,
  MatchTeam,
  CourtInfo,
  RefereeAssignment,
  MatchResult,
  MatchStatus,
  generateMatchId,
  mapVisMatchStatus,
  calculateMatchDuration,
  determineMatchImportance
} from '../../types/match-v2';

// Import VIS-compliant types for numeric conversion
import {
  VisCompliantMatch,
  BeachMatchFormat,
  convertLegacyToVisCompliant,
  isVisCompliantMatch,
  isLegacyMatch
} from '../../types/match-vis-compliant';

/**
 * Tournament location data from GetBeachTournament
 */
export interface TournamentLocation {
  readonly tournamentId: string;
  readonly venue?: string;
  readonly address?: string;
  readonly location?: string;
  readonly contactName?: string;
  readonly contactEmail?: string;
  readonly contactPhone?: string;
  readonly courts?: number;
  readonly surface?: string;
}

/**
 * Tournament officials data from GetEvent
 */
export interface TournamentOfficials {
  readonly tournamentId: string;
  readonly officials: readonly RefereeAssignment[];
  readonly referees: readonly RefereeAssignment[];
  readonly technicalOfficials: readonly RefereeAssignment[];
}

/**
 * Parsing error with context
 */
export class VisParsingError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly originalError?: Error
  ) {
    super(`VIS Parsing Error in ${context}: ${message}`);
    this.name = 'VisParsingError';
  }
}

/**
 * VIS Response Parser implementation
 * Handles XML parsing and data transformation with robust error handling
 */
export class VisResponseParser {
  /**
   * Parse GetEventList response to TournamentCore array
   * Primary method for tournament data parsing
   */
  static parseEventList(xmlResponse: string): TournamentCore[] {
    try {
      // Basic XML parsing - in production would use xml2js or similar
      const tournaments: TournamentCore[] = [];
      
      // Extract tournament nodes from XML
      const tournamentMatches = xmlResponse.match(/<Tournament[^>]*>.*?<\/Tournament>/gs);
      
      if (!tournamentMatches) {
        return tournaments;
      }

      for (const tournamentXml of tournamentMatches) {
        try {
          const tournament = this.parseSingleTournament(tournamentXml);
          if (tournament) {
            tournaments.push(tournament);
          }
        } catch (error) {
          // Continue parsing other tournaments
        }
      }

      // Debug: Log the parsed tournaments to see venue data
      if (tournaments.length > 0) {
      }

      return tournaments;
      
    } catch (error) {
      throw new VisParsingError(
        'Failed to parse EventList response',
        'parseEventList',
        error as Error
      );
    }
  }

  /**
   * Parse GetBeachTournament response for location data
   * Fallback method for detailed location information
   */
  static parseBeachTournament(xmlResponse: string): TournamentLocation | null {
    try {
      const visNo = this.extractXmlValue(xmlResponse, 'No');
      if (!visNo) return null;

      // Generate tournament ID to match with existing data
      const code = this.extractXmlValue(xmlResponse, 'Code') || visNo;
      const genderStr = this.extractXmlValue(xmlResponse, 'Gender') || 'M';
      const typeStr = this.extractXmlValue(xmlResponse, 'Type') || '';
      
      const gender = this.parseGender(genderStr);
      const tournamentType = mapVisTournamentType(typeStr);
      const tournamentId = generateTournamentId(visNo, code, gender, tournamentType);

      return {
        tournamentId,
        venue: this.extractXmlValue(xmlResponse, 'Venue'),
        address: this.extractXmlValue(xmlResponse, 'Address'),
        location: this.extractXmlValue(xmlResponse, 'Location'),
        contactName: this.extractXmlValue(xmlResponse, 'ContactName'),
        contactEmail: this.extractXmlValue(xmlResponse, 'ContactEmail'),
        contactPhone: this.extractXmlValue(xmlResponse, 'ContactPhone'),
        courts: parseInt(this.extractXmlValue(xmlResponse, 'Courts') || '0') || undefined,
        surface: this.extractXmlValue(xmlResponse, 'Surface')
      };
      
    } catch (error) {
      throw new VisParsingError(
        'Failed to parse BeachTournament response',
        'parseBeachTournament',
        error as Error
      );
    }
  }

  /**
   * Parse GetEvent response for referee assignments
   * Extract officials and referee data
   */
  static parseEventOfficials(xmlResponse: string, tournamentId: string): TournamentOfficials | null {
    try {
      const officials = this.parseOfficialsList(xmlResponse, 'Officials');
      const referees = this.parseOfficialsList(xmlResponse, 'Referees');
      const technicalOfficials = this.parseOfficialsList(xmlResponse, 'TechnicalOfficials');

      return {
        tournamentId,
        officials,
        referees,
        technicalOfficials
      };
      
    } catch (error) {
      throw new VisParsingError(
        'Failed to parse Event officials response',
        'parseEventOfficials',
        error as Error
      );
    }
  }

  /**
   * Parse GetBeachMatchList response for match data
   * Extract match information with referee assignments
   */
  static parseBeachMatches(xmlResponse: string, tournamentId: string): BeachMatchCore[] {
    try {
      const matches: BeachMatchCore[] = [];
      
      // Extract BeachMatch nodes from XML (VIS API returns <BeachMatch> not <Match>)
      const matchMatches = xmlResponse.match(/<BeachMatch[^>]*>.*?<\/BeachMatch>/gs) || 
                          xmlResponse.match(/<BeachMatch[^>]*\/>/gs); // Handle self-closing tags
      
      if (!matchMatches) {
        return matches;
      }

      for (const matchXml of matchMatches) {
        try {
          const match = this.parseSingleMatch(matchXml, tournamentId);
          if (match) {
            matches.push(match);
          }
        } catch (error) {
          // Continue parsing other matches
        }
      }

      return matches;
      
    } catch (error) {
      throw new VisParsingError(
        'Failed to parse BeachMatchList response',
        'parseBeachMatches',
        error as Error
      );
    }
  }

  /**
   * Parse GetBeachMatchList response to VIS-compliant match data
   * Returns VisCompliantMatch objects with proper numeric types and schema compliance
   */
  static parseBeachMatchesVisCompliant(xmlResponse: string, tournamentId: string): VisCompliantMatch[] {
    try {
      const matches: VisCompliantMatch[] = [];
      
      // Extract BeachMatch nodes from XML (VIS API returns <BeachMatch> not <Match>)
      const matchMatches = xmlResponse.match(/<BeachMatch[^>]*>.*?<\/BeachMatch>/gs) || 
                          xmlResponse.match(/<BeachMatch[^>]*\/>/gs); // Handle self-closing tags
      
      if (!matchMatches) {
        return matches;
      }

      for (const matchXml of matchMatches) {
        try {
          const match = this.parseSingleMatchVisCompliant(matchXml, tournamentId);
          if (match) {
            matches.push(match);
          }
        } catch (error) {
          // Continue parsing other matches - log error but don't fail entire operation
        }
      }

      return matches;
      
    } catch (error) {
      throw new VisParsingError(
        'Failed to parse BeachMatchList response to VIS-compliant format',
        'parseBeachMatchesVisCompliant',
        error as Error
      );
    }
  }

  /**
   * Parse single tournament from XML
   */
  private static parseSingleTournament(tournamentXml: string): TournamentCore | null {
    const visNo = this.extractXmlValue(tournamentXml, 'No');
    const name = this.extractXmlValue(tournamentXml, 'Name');
    const code = this.extractXmlValue(tournamentXml, 'Code');
    
    if (!visNo || !name) {
      return null;
    }

    const genderStr = this.extractXmlValue(tournamentXml, 'Gender') || 'M';
    const typeStr = this.extractXmlValue(tournamentXml, 'Type') || '';
    const statusStr = this.extractXmlValue(tournamentXml, 'Status') || '';
    
    const gender = this.parseGender(genderStr);
    const tournamentType = mapVisTournamentType(typeStr);
    const status = mapVisTournamentStatus(statusStr);
    
    const id = generateTournamentId(visNo, code || visNo, gender, tournamentType);
    
    const dates = this.parseTournamentDates(tournamentXml);
    
    return {
      id,
      visNo,
      version: 1,
      lastUpdated: new Date().toISOString(),
      code: code || visNo,
      name,
      title: this.extractXmlValue(tournamentXml, 'Title'),
      gender,
      tournamentType,
      dates,
      status,
      city: this.extractXmlValue(tournamentXml, 'City'),
      country: this.extractXmlValue(tournamentXml, 'Country'),
      countryCode: this.extractXmlValue(tournamentXml, 'CountryCode'),
      location: this.extractXmlValue(tournamentXml, 'Location'),
      venue: this.extractXmlValue(tournamentXml, 'Venue'),
      address: this.extractXmlValue(tournamentXml, 'Address'),
      courts: parseInt(this.extractXmlValue(tournamentXml, 'Courts') || '0') || undefined,
      prizeMoney: this.extractXmlValue(tournamentXml, 'PrizeMoney'),
      currency: this.extractXmlValue(tournamentXml, 'Currency'),
      website: this.extractXmlValue(tournamentXml, 'Website'),
      parentEventNo: this.extractXmlValue(tournamentXml, 'ParentEvent'),
      series: this.extractXmlValue(tournamentXml, 'Series'),
      category: this.extractXmlValue(tournamentXml, 'Category')
    };
  }

  /**
   * Parse single match from XML
   */
  private static parseSingleMatch(matchXml: string, tournamentId: string): BeachMatchCore | null {
    // Extract from BeachMatch attributes (VIS API uses attributes, not child elements)
    const visNo = this.extractXmlAttribute(matchXml, 'No');
    const matchCode = this.extractXmlAttribute(matchXml, 'MatchNo') || this.extractXmlAttribute(matchXml, 'No') || visNo;
    const round = this.extractXmlAttribute(matchXml, 'Round') || '';
    const roundPhase = this.extractXmlAttribute(matchXml, 'RoundPhase') || '';
    const roundName = this.extractXmlAttribute(matchXml, 'RoundName') || '';
    
    
    if (!visNo || !matchCode) {
      return null;
    }

    const statusStr = this.extractXmlAttribute(matchXml, 'Status') || '';
    const status = mapVisMatchStatus(statusStr);
    
    const courtNumber = this.extractXmlAttribute(matchXml, 'Court') || '1';
    const localDate = this.extractXmlAttribute(matchXml, 'LocalDate') || '';
    const localTime = this.extractXmlAttribute(matchXml, 'LocalTime') || '';
    
    // Build scheduledDateTime safely - handle cases where localTime might already include seconds
    let scheduledDateTime: string;
    if (localDate && localTime) {
      // If localTime already has seconds (HH:MM:SS), don't add :00
      // If it's just HH:MM, add :00
      const timeWithSeconds = localTime.includes(':') && localTime.split(':').length === 3 
        ? localTime 
        : `${localTime}:00`;
      scheduledDateTime = `${localDate}T${timeWithSeconds}`;
    } else {
      scheduledDateTime = new Date().toISOString();
    }
    
    const court: CourtInfo = {
      courtNumber,
      courtName: this.extractXmlAttribute(matchXml, 'CourtName'),
      surface: this.extractXmlAttribute(matchXml, 'Surface'),
      location: this.extractXmlAttribute(matchXml, 'CourtLocation')
    };

    const team1 = this.parseMatchTeam(matchXml, 'A'); // VIS API uses TeamAName, TeamBName
    const team2 = this.parseMatchTeam(matchXml, 'B');
    
    if (!team1 || !team2) {
      return null;
    }

    const id = generateMatchId(tournamentId, courtNumber, scheduledDateTime, matchCode);
    
    const refereeAssignments = this.parseMatchReferees(matchXml);
    const result = this.parseMatchResult(matchXml);
    const importance = determineMatchImportance(round, this.extractXmlAttribute(matchXml, 'Phase'));

    return {
      id,
      visNo,
      version: 1,
      lastUpdated: new Date().toISOString(),
      tournamentId,
      matchCode,
      round,
      roundPhase: roundPhase,
      roundName: roundName,
      phaseCode: this.extractXmlAttribute(matchXml, 'Phase'),
      status,
      court,
      scheduledDateTime,
      actualStartTime: this.extractXmlAttribute(matchXml, 'StartTime'),
      actualEndTime: this.extractXmlAttribute(matchXml, 'EndTime'),
      team1,
      team2,
      result,
      refereeAssignments,
      notes: this.extractXmlAttribute(matchXml, 'Notes'),
      weather: this.extractXmlAttribute(matchXml, 'Weather'),
      importance
    } as any;
  }

  /**
   * Parse single match from XML to VIS-compliant format
   * Returns VisCompliantMatch with proper numeric types and VIS schema compliance
   */
  private static parseSingleMatchVisCompliant(matchXml: string, tournamentId: string): VisCompliantMatch | null {
    try {
      // Extract basic match information from XML attributes
      const visNoStr = this.extractXmlAttribute(matchXml, 'No');
      const noInTournamentStr = this.extractXmlAttribute(matchXml, 'MatchNo') || this.extractXmlAttribute(matchXml, 'NoInTournament') || visNoStr;
      
      if (!visNoStr) {
        return null;
      }

      // Convert required numeric fields with validation
      const No = parseInt(visNoStr, 10);
      const NoInTournament = parseInt(noInTournamentStr || '0', 10);
      
      if (isNaN(No) || No <= 0) {
        throw new Error(`Invalid match number: ${visNoStr}`);
      }
      
      if (isNaN(NoInTournament) || NoInTournament <= 0) {
        throw new Error(`Invalid tournament match number: ${noInTournamentStr}`);
      }

      // Determine match format - TODO: implement dynamic detection based on match data
      // For now, default to BEST_OF_3 as specified in foundation story
      const Format = BeachMatchFormat.BEST_OF_3;

      // Safe parsing function for optional numeric fields
      const safeParseInt = (value: string | undefined): number | undefined => {
        if (value === undefined || value === null || value === '') return undefined;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) || parsed < 0 ? undefined : parsed;
      };

      // Extract team information with VIS-compliant field names
      const TeamAName = this.extractXmlAttribute(matchXml, 'TeamAName');
      const TeamBName = this.extractXmlAttribute(matchXml, 'TeamBName');
      const TeamAPlayer1 = this.extractXmlAttribute(matchXml, 'TeamAPlayer1');
      const TeamAPlayer2 = this.extractXmlAttribute(matchXml, 'TeamAPlayer2');
      const TeamBPlayer1 = this.extractXmlAttribute(matchXml, 'TeamBPlayer1');
      const TeamBPlayer2 = this.extractXmlAttribute(matchXml, 'TeamBPlayer2');
      
      // Use VIS-compliant field names (FederationCode, not CountryCode)
      const TeamAFederationCode = this.extractXmlAttribute(matchXml, 'TeamAFederationCode') || 
                                  this.extractXmlAttribute(matchXml, 'TeamACountryCode'); // Fallback for legacy data
      const TeamBFederationCode = this.extractXmlAttribute(matchXml, 'TeamBFederationCode') || 
                                  this.extractXmlAttribute(matchXml, 'TeamBCountryCode'); // Fallback for legacy data

      // Parse numeric fields with proper validation
      const MatchPointsA = safeParseInt(this.extractXmlAttribute(matchXml, 'MatchPointsA'));
      const MatchPointsB = safeParseInt(this.extractXmlAttribute(matchXml, 'MatchPointsB'));
      const NoReferee1 = safeParseInt(this.extractXmlAttribute(matchXml, 'NoReferee1'));
      const NoReferee2 = safeParseInt(this.extractXmlAttribute(matchXml, 'NoReferee2'));
      const NoRefereeChallenge = safeParseInt(this.extractXmlAttribute(matchXml, 'NoRefereeChallenge'));
      const TeamARanking = safeParseInt(this.extractXmlAttribute(matchXml, 'TeamARanking'));
      const TeamBRanking = safeParseInt(this.extractXmlAttribute(matchXml, 'TeamBRanking'));

      // Parse set points with numeric validation
      const PointsTeamASet1 = safeParseInt(this.extractXmlAttribute(matchXml, 'PointsTeamASet1'));
      const PointsTeamBSet1 = safeParseInt(this.extractXmlAttribute(matchXml, 'PointsTeamBSet1'));
      const PointsTeamASet2 = safeParseInt(this.extractXmlAttribute(matchXml, 'PointsTeamASet2'));
      const PointsTeamBSet2 = safeParseInt(this.extractXmlAttribute(matchXml, 'PointsTeamBSet2'));
      const PointsTeamASet3 = safeParseInt(this.extractXmlAttribute(matchXml, 'PointsTeamASet3'));
      const PointsTeamBSet3 = safeParseInt(this.extractXmlAttribute(matchXml, 'PointsTeamBSet3'));

      // Parse VIS seconds-based duration fields (instead of "mm:ss" strings)
      const DurationSet1Seconds = safeParseInt(this.extractXmlAttribute(matchXml, 'DurationSet1Seconds'));
      const DurationSet2Seconds = safeParseInt(this.extractXmlAttribute(matchXml, 'DurationSet2Seconds'));
      const DurationSet3Seconds = safeParseInt(this.extractXmlAttribute(matchXml, 'DurationSet3Seconds'));

      // Parse environmental data fields with numeric types
      const Temperature = safeParseInt(this.extractXmlAttribute(matchXml, 'Temperature'));
      const Humidity = safeParseInt(this.extractXmlAttribute(matchXml, 'Humidity'));
      const NbSpectators = safeParseInt(this.extractXmlAttribute(matchXml, 'NbSpectators'));

      // Parse performance statistics
      const FastestServeTeamAPlayer1 = safeParseInt(this.extractXmlAttribute(matchXml, 'FastestServeTeamAPlayer1'));
      const FastestServeTeamAPlayer2 = safeParseInt(this.extractXmlAttribute(matchXml, 'FastestServeTeamAPlayer2'));
      const FastestServeTeamBPlayer1 = safeParseInt(this.extractXmlAttribute(matchXml, 'FastestServeTeamBPlayer1'));
      const FastestServeTeamBPlayer2 = safeParseInt(this.extractXmlAttribute(matchXml, 'FastestServeTeamBPlayer2'));

      // Extract string fields
      const LocalDate = this.extractXmlAttribute(matchXml, 'LocalDate');
      const LocalTime = this.extractXmlAttribute(matchXml, 'LocalTime');
      const UtcDate = this.extractXmlAttribute(matchXml, 'UtcDate');
      const UtcTime = this.extractXmlAttribute(matchXml, 'UtcTime');
      const BeginDateTimeUtc = this.extractXmlAttribute(matchXml, 'BeginDateTimeUtc');
      const EndDateTimeUtc = this.extractXmlAttribute(matchXml, 'EndDateTimeUtc');
      const Court = this.extractXmlAttribute(matchXml, 'Court');
      const City = this.extractXmlAttribute(matchXml, 'City');
      const Venue = this.extractXmlAttribute(matchXml, 'Venue');
      const Version = this.extractXmlAttribute(matchXml, 'Version');
      const Status = this.extractXmlAttribute(matchXml, 'Status');
      const Round = this.extractXmlAttribute(matchXml, 'Round');
      const RoundPhase = this.extractXmlAttribute(matchXml, 'RoundPhase');
      const RoundName = this.extractXmlAttribute(matchXml, 'RoundName');
      const RoundCode = this.extractXmlAttribute(matchXml, 'RoundCode');
      const RoundBracket = this.extractXmlAttribute(matchXml, 'RoundBracket');
      const ResultTypeText = this.extractXmlAttribute(matchXml, 'ResultTypeText');

      // Extract referee information
      const Referee1Name = this.extractXmlAttribute(matchXml, 'Referee1Name');
      const Referee2Name = this.extractXmlAttribute(matchXml, 'Referee2Name');
      const Referee1FederationCode = this.extractXmlAttribute(matchXml, 'Referee1FederationCode');
      const Referee2FederationCode = this.extractXmlAttribute(matchXml, 'Referee2FederationCode');

      // Tournament context fields for compatibility
      const tournamentGender = this.extractXmlAttribute(matchXml, 'TournamentGender');
      const tournamentNo = this.extractXmlAttribute(matchXml, 'TournamentNo') || tournamentId;
      const tournamentCode = this.extractXmlAttribute(matchXml, 'TournamentCode');
      const tournamentCountry = this.extractXmlAttribute(matchXml, 'TournamentCountry');

      // Build VIS-compliant match object
      const visCompliantMatch: VisCompliantMatch = {
        // Required fields
        No,
        NoInTournament,
        Format,

        // Core match data
        LocalDate,
        LocalTime,
        UtcDate,
        UtcTime,
        BeginDateTimeUtc,
        EndDateTimeUtc,

        // Team information (VIS-compliant field names)
        TeamAName,
        TeamBName,
        TeamAPlayer1,
        TeamAPlayer2,
        TeamBPlayer1,
        TeamBPlayer2,
        TeamAFederationCode,
        TeamBFederationCode,
        TeamARanking,
        TeamBRanking,

        // Match results with numeric types
        MatchPointsA,
        MatchPointsB,
        PointsTeamASet1,
        PointsTeamBSet1,
        PointsTeamASet2,
        PointsTeamBSet2,
        PointsTeamASet3,
        PointsTeamBSet3,

        // Location information
        Court,
        City,
        Venue,

        // Officials with numeric types
        NoReferee1,
        NoReferee2,
        NoRefereeChallenge,
        Referee1Name,
        Referee2Name,
        Referee1FederationCode,
        Referee2FederationCode,

        // Environmental data
        Temperature,
        Humidity,
        NbSpectators,

        // Performance statistics
        FastestServeTeamAPlayer1,
        FastestServeTeamAPlayer2,
        FastestServeTeamBPlayer1,
        FastestServeTeamBPlayer2,

        // Additional context fields
        Version,
        Status,
        Round,
        RoundPhase,
        RoundName,
        RoundCode,
        RoundBracket,
        ResultTypeText,

        // VIS seconds-based duration fields
        DurationSet1Seconds,
        DurationSet2Seconds,
        DurationSet3Seconds,

        // Tournament context for compatibility
        tournamentGender,
        tournamentNo,
        tournamentCode,
        tournamentCountry,
      };

      return visCompliantMatch;

    } catch (error) {
      throw new VisParsingError(
        `Failed to parse VIS-compliant match: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'parseSingleMatchVisCompliant',
        error as Error
      );
    }
  }

  /**
   * Parse tournament dates from XML
   */
  private static parseTournamentDates(tournamentXml: string): TournamentDates {
    const startDate = this.extractXmlValue(tournamentXml, 'StartDate') || new Date().toISOString();
    const endDate = this.extractXmlValue(tournamentXml, 'EndDate') || startDate;
    
    return {
      startDate,
      endDate,
      startDateQualification: this.extractXmlValue(tournamentXml, 'StartDateQualification'),
      startDateMainDraw: this.extractXmlValue(tournamentXml, 'StartDateMainDraw'),
      endDateQualification: this.extractXmlValue(tournamentXml, 'EndDateQualification'),
      endDateMainDraw: this.extractXmlValue(tournamentXml, 'EndDateMainDraw')
    };
  }

  /**
   * Parse gender from string
   */
  private static parseGender(genderStr: string): GenderType {
    const gender = genderStr.toUpperCase();
    if (gender === 'W' || gender === 'WOMEN') return GenderType.W;
    if (gender === 'MIXED' || gender === 'MX') return GenderType.MIXED;
    return GenderType.M; // Default to men
  }

  /**
   * Parse match team from XML
   */
  private static parseMatchTeam(matchXml: string, teamLetter: 'A' | 'B'): MatchTeam | null {
    const teamName = this.extractXmlAttribute(matchXml, `Team${teamLetter}Name`);
    
    if (!teamName) return null;

    const teamNumber = teamLetter === 'A' ? 1 : 2;
    const player1Name = this.extractXmlAttribute(matchXml, `Team${teamLetter}Player1`) || 'Player 1';
    const player2Name = this.extractXmlAttribute(matchXml, `Team${teamLetter}Player2`) || 'Player 2';
    
    return {
      teamNumber,
      teamName,
      player1Name,
      player2Name,
      countryCode: this.extractXmlAttribute(matchXml, `Team${teamLetter}FederationCode`),
      ranking: parseInt(this.extractXmlAttribute(matchXml, `Team${teamLetter}Ranking`) || '0') || undefined
    };
  }

  /**
   * Parse match referees from XML
   */
  private static parseMatchReferees(matchXml: string): readonly RefereeAssignment[] {
    const referees: RefereeAssignment[] = [];
    
    // VIS API returns referee names in attributes: Referee1Name, Referee2Name
    const referee1Name = this.extractXmlAttribute(matchXml, 'Referee1Name');
    const referee2Name = this.extractXmlAttribute(matchXml, 'Referee2Name');
    
    if (referee1Name) {
      referees.push({
        refereeId: 'ref1',
        refereeName: referee1Name,
        function: 'First Referee',
        federationCode: this.extractXmlAttribute(matchXml, 'Referee1FederationCode'),
        status: 'ASSIGNED'
      });
    }
    
    if (referee2Name) {
      referees.push({
        refereeId: 'ref2',
        refereeName: referee2Name,
        function: 'Second Referee',
        federationCode: this.extractXmlAttribute(matchXml, 'Referee2FederationCode'),
        status: 'ASSIGNED'
      });
    }
    
    return referees;
  }

  /**
   * Parse match result from XML
   */
  private static parseMatchResult(matchXml: string): MatchResult | undefined {
    // VIS API uses MatchPointsA, MatchPointsB for set scores
    const matchPointsA = this.extractXmlAttribute(matchXml, 'MatchPointsA');
    const matchPointsB = this.extractXmlAttribute(matchXml, 'MatchPointsB');
    
    
    if (!matchPointsA || !matchPointsB) return undefined;

    // Individual set scores are not available in GetBeachMatchList
    // They must be fetched separately using GetBeachLive API
    const setScores: number[] = [];
    
    const team1Sets = parseInt(matchPointsA) || 0;
    const team2Sets = parseInt(matchPointsB) || 0;
    
    const startTime = this.extractXmlAttribute(matchXml, 'StartTime');
    const endTime = this.extractXmlAttribute(matchXml, 'EndTime');
    
    let duration: number | undefined;
    if (startTime && endTime) {
      try {
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          const durationResult = calculateMatchDuration(startDate, endDate);
          duration = durationResult.totalMinutes;
        }
      } catch (error) {
        // Invalid date strings, duration remains undefined
      }
    }
    
    const winner = team1Sets > team2Sets ? 1 : (team2Sets > team1Sets ? 2 : undefined);
    const status = this.extractXmlAttribute(matchXml, 'Status') || '';
    
    return {
      team1Sets,
      team2Sets,
      setScores,
      duration,
      winner,
      forfeit: status.toLowerCase().includes('forfeit') || status.toLowerCase().includes('wo')
    };
  }

  /**
   * Parse officials list from XML
   */
  private static parseOfficialsList(xmlResponse: string, sectionName: string): readonly RefereeAssignment[] {
    const officials: RefereeAssignment[] = [];
    
    const sectionMatch = xmlResponse.match(new RegExp(`<${sectionName}[^>]*>.*?<\/${sectionName}>`, 's'));
    if (!sectionMatch) return officials;
    
    const officialMatches = sectionMatch[0].match(/<Official[^>]*>.*?<\/Official>/gs);
    
    if (officialMatches) {
      for (const officialXml of officialMatches) {
        const refereeId = this.extractXmlValue(officialXml, 'Id') || 'unknown';
        const refereeName = this.extractXmlValue(officialXml, 'Name') || 'Unknown Official';
        const functionValue = this.extractXmlValue(officialXml, 'Function') || 'Official';
        
        officials.push({
          refereeId,
          refereeName,
          function: functionValue,
          federationCode: this.extractXmlValue(officialXml, 'Federation'),
          status: 'ASSIGNED'
        });
      }
    }
    
    return officials;
  }

  /**
   * Extract XML value by tag name (simplified - would use proper XML parser in production)
   */
  private static extractXmlValue(xml: string, tagName: string): string | undefined {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Extract XML attribute value from tag attributes (for VIS API BeachMatch format)
   */
  private static extractXmlAttribute(xml: string, attributeName: string): string | undefined {
    const regex = new RegExp(`${attributeName}\\s*=\\s*"([^"]*)"`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : undefined;
  }
}