/**
 * @fileoverview VIS Response Parser v2
 * Robust XML parsing and data transformation for VIS API responses
 * Part of EPIC-007 Data Architecture Restructuration
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

import {
  RefereeOfficial,
  EventReferee,
  OfficialRole,
  OfficialStatus,
  OfficialType,
  OfficialListResponse,
  RefereeListResponse
} from '../../types/referee-v2';

import { calculateTotalDuration } from '../../utils/MatchDurationFormatter';
import { detectTournamentTimezone } from '../../utils/tournamentTimezoneMapping';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import tz from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(tz);

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
  readonly gender?: string; // Raw numeric value from VIS API (0, 1, etc.)
  readonly genderText?: GenderType; // Parsed text representation (M, W, MIXED)
  // Location fields for timezone detection
  readonly city?: string;
  readonly country?: string;
  readonly countryCode?: string;
  readonly name?: string;
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
          // console.warn('Failed to parse tournament:', error);
          // Continue parsing other tournaments
        }
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
      const visNo = this.extractXmlAttribute(xmlResponse, 'No');

      if (!visNo) {
        return null;
      }

      // Generate tournament ID to match with existing data
      const code = this.extractXmlAttribute(xmlResponse, 'Code') || visNo;
      const genderStr = this.extractXmlAttribute(xmlResponse, 'Gender') || 'M';
      const typeStr = this.extractXmlAttribute(xmlResponse, 'Type') || '';

      const gender = this.parseGender(genderStr);
      const tournamentType = mapVisTournamentType(typeStr);
      const tournamentId = generateTournamentId(visNo, code, gender, tournamentType);

      // Extract location data with debug logging to see what's actually available
      const venue = this.extractXmlAttribute(xmlResponse, 'Venue') || this.extractXmlAttribute(xmlResponse, 'DefaultVenue');
      const city = this.extractXmlAttribute(xmlResponse, 'DefaultCity') || this.extractXmlAttribute(xmlResponse, 'City');
      const country = this.extractXmlAttribute(xmlResponse, 'CountryName') || this.extractXmlAttribute(xmlResponse, 'Country');
      const countryCode = this.extractXmlAttribute(xmlResponse, 'CountryCode') || this.extractXmlAttribute(xmlResponse, 'CountryId');
      const name = this.extractXmlAttribute(xmlResponse, 'Name') || this.extractXmlAttribute(xmlResponse, 'Title');


      const tournamentObject = {
        tournamentId,
        venue,
        address: this.extractXmlAttribute(xmlResponse, 'Address'),
        location: this.extractXmlAttribute(xmlResponse, 'Location'),
        contactName: this.extractXmlAttribute(xmlResponse, 'ContactName'),
        contactEmail: this.extractXmlAttribute(xmlResponse, 'ContactEmail'),
        contactPhone: this.extractXmlAttribute(xmlResponse, 'ContactPhone'),
        courts: parseInt(this.extractXmlAttribute(xmlResponse, 'Courts') || '0') || undefined,
        surface: this.extractXmlAttribute(xmlResponse, 'Surface'),
        gender: genderStr, // Keep raw numeric value (0, 1, etc.)
        genderText: gender, // Parsed text representation (M, W, MIXED)
        // Add location fields for timezone detection
        city,
        country,
        countryCode,
        name
      };


      return tournamentObject;
      
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
  static parseBeachMatches(xmlResponse: string, tournamentId: string, tournamentTimezone?: string, tournamentGender?: string, tournamentGenderText?: GenderType, tournamentLocation?: TournamentLocation): BeachMatchCore[] {
    try {
      const matches: BeachMatchCore[] = [];

      // Extract BeachMatch nodes from XML (VIS API returns <BeachMatch> not <Match>)
      const matchMatches = xmlResponse.match(/<BeachMatch[^>]*>.*?<\/BeachMatch>/gs) ||
                          xmlResponse.match(/<BeachMatch[^>]*\/>/gs); // Handle self-closing tags

      if (!matchMatches) {
        return matches;
      }

      // Parse each match
      for (const matchXml of matchMatches) {
        try {
          const match = this.parseSingleMatch(matchXml, tournamentId, tournamentTimezone, tournamentGender, tournamentGenderText, tournamentLocation);
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
    
    const city = this.extractXmlValue(tournamentXml, 'City');
    const country = this.extractXmlValue(tournamentXml, 'Country');
    const countryCode = this.extractXmlValue(tournamentXml, 'CountryCode');

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
      city,
      country,
      countryCode,
      location: this.extractXmlValue(tournamentXml, 'Location'),
      venue: this.extractXmlValue(tournamentXml, 'Venue'),
      address: this.extractXmlValue(tournamentXml, 'Address'),
      courts: parseInt(this.extractXmlValue(tournamentXml, 'Courts') || '0') || undefined,
      prizeMoney: this.extractXmlValue(tournamentXml, 'PrizeMoney'),
      currency: this.extractXmlValue(tournamentXml, 'Currency'),
      website: this.extractXmlValue(tournamentXml, 'Website'),
      parentEventNo: this.extractXmlValue(tournamentXml, 'ParentEvent'),
      series: this.extractXmlValue(tournamentXml, 'Series'),
      category: this.extractXmlValue(tournamentXml, 'Category'),
      DefaultTimeZone: this.extractXmlValue(tournamentXml, 'DefaultTimeZone')
    };
  }

  /**
   * Parse single match from XML
   */
  private static parseSingleMatch(matchXml: string, tournamentId: string, tournamentTimezone?: string, tournamentGender?: string, tournamentGenderText?: GenderType, tournamentLocation?: TournamentLocation): BeachMatchCore | null {
    // Extract from BeachMatch attributes (VIS API uses attributes, not child elements)
    const visNo = this.extractXmlAttribute(matchXml, 'No');
    const noInTournament = this.extractXmlAttribute(matchXml, 'NoInTournament');
    const matchCode = noInTournament || this.extractXmlAttribute(matchXml, 'MatchNo') || this.extractXmlAttribute(matchXml, 'No') || visNo;
    const round = this.extractXmlAttribute(matchXml, 'Round') || '';
    const roundPhase = this.extractXmlAttribute(matchXml, 'RoundPhase') || '';
    const roundName = this.extractXmlAttribute(matchXml, 'RoundName') || '';
    
    // Extract team position fields
    const teamAPositionInMainDraw = this.extractXmlAttribute(matchXml, 'TeamAPositionInMainDraw');
    const teamBPositionInMainDraw = this.extractXmlAttribute(matchXml, 'TeamBPositionInMainDraw');
    
    if (!visNo || !matchCode) {
      return null;
    }

    const statusStr = this.extractXmlAttribute(matchXml, 'Status') || '';
    const rawStatus = statusStr ? (isNaN(parseInt(statusStr)) ? statusStr : parseInt(statusStr)) : undefined;
    const status = mapVisMatchStatus(statusStr);
    
    const courtNumber = this.extractXmlAttribute(matchXml, 'Court') || '1';
    const localDate = this.extractXmlAttribute(matchXml, 'LocalDate') || '';
    const localTime = this.extractXmlAttribute(matchXml, 'LocalTime') || '';

    // Extract new timezone fields for enhanced timezone support
    const beginDateTimeUtc = this.extractXmlAttribute(matchXml, 'BeginDateTimeUtc');
    const endDateTimeUtc = this.extractXmlAttribute(matchXml, 'EndDateTimeUtc');
    const utcDate = this.extractXmlAttribute(matchXml, 'UtcDate');
    const utcTime = this.extractXmlAttribute(matchXml, 'UtcTime');
    const localTimeOffset = this.extractXmlAttribute(matchXml, 'LocalTimeOffset');
    const timezone = this.extractXmlAttribute(matchXml, 'TimeZone');


    // TIMEZONE-SAFE: Build scheduled date/time following robust approach (prevents 18→17 bug)
    // Interpret LocalDate+LocalTime in tournament timezone, not as UTC
    let scheduledDateTime: string;
    let scheduledDateTournament: string;
    let scheduledTimeTournament: string;
    let scheduledDateTimeTournament: string;
    let scheduledEpochMs: number;
    let scheduledTz: string;

    if (localDate && localTime) {
      // Normalize time format to include seconds
      const timeWithSeconds = localTime.includes(':') && localTime.split(':').length === 3
        ? localTime
        : `${localTime}:00`;

      // Determine tournament timezone - use multiple fallback sources with validation
      // CRITICAL: BeachMatch TimeZone field often contains invalid values like "24"
      // Only use timezone from BeachMatch if it passes validation
      const validatedBeachMatchTimezone = this.validateAndNormalizeTimezone(timezone);

      // Use tournament location data to detect timezone if available
      let detectedTournamentTz = 'UTC';
      if (tournamentLocation) {
        const detection = detectTournamentTimezone({
          city: tournamentLocation.city || '',
          country: tournamentLocation.country || '',
          countryCode: tournamentLocation.countryCode || '',
          venue: tournamentLocation.venue || '',
          name: tournamentLocation.name || ''
        });
        detectedTournamentTz = detection.timezone;

      }

      const resolvedTournamentTz = tournamentTimezone ||                                         // 1. Tournament timezone (from GetTournament call)
                                   detectedTournamentTz ||                                        // 2. NEW: Auto-detected from tournament location
                                   validatedBeachMatchTimezone ||                                 // 3. Validated BeachMatch timezone (often invalid!)
                                   (localTimeOffset ? this.parseTimezoneFromOffset(localTimeOffset) : null) || // 4. Parse from offset
                                   'UTC'; // 5. Safe fallback


      try {
        // SOLUTION: Interpret LocalDate+LocalTime in tournament timezone, not as UTC
        const dtLocal = dayjs.tz(`${localDate}T${timeWithSeconds}`, resolvedTournamentTz);

        // 1) UTC ISO for global sorting and storage
        scheduledDateTime = dtLocal.toISOString(); // e.g., "2025-09-18T17:00:00.000Z"

        // 2) Tournament-local representations (immune to browser timezone)
        scheduledDateTournament = dtLocal.format("YYYY-MM-DD");      // "2025-09-18"
        scheduledTimeTournament = dtLocal.format("HH:mm:ss");        // "14:00:00"
        scheduledDateTimeTournament = dtLocal.format("YYYY-MM-DD[T]HH:mm:ss"); // "2025-09-18T14:00:00"

        // 3) Epoch for stable sorting
        scheduledEpochMs = dtLocal.valueOf();

        // 4) Tournament timezone for reference
        scheduledTz = resolvedTournamentTz;

      } catch (error) {
        // Fallback if timezone parsing fails
        console.warn(`[VisResponseParser] Timezone parsing failed for ${localDate}T${timeWithSeconds} in ${resolvedTournamentTz}:`, error);
        scheduledDateTime = new Date().toISOString();
        scheduledDateTournament = localDate;
        scheduledTimeTournament = timeWithSeconds;
        scheduledDateTimeTournament = `${localDate}T${timeWithSeconds}`;
        scheduledEpochMs = Date.now();
        scheduledTz = 'UTC';
      }
    } else {
      // No date/time available
      scheduledDateTime = new Date().toISOString();
      scheduledDateTournament = new Date().toISOString().split('T')[0];
      scheduledTimeTournament = '00:00:00';
      scheduledDateTimeTournament = `${scheduledDateTournament}T${scheduledTimeTournament}`;
      scheduledEpochMs = Date.now();
      scheduledTz = tournamentTimezone || 'UTC';
    }
    
    const court: CourtInfo = {
      courtNumber,
      courtName: this.extractXmlAttribute(matchXml, 'CourtName'),
      surface: this.extractXmlAttribute(matchXml, 'Surface'),
      location: this.extractXmlAttribute(matchXml, 'CourtLocation')
    };

    const team1 = this.parseMatchTeam(matchXml, 'A'); // VIS API uses TeamAName, TeamBName
    const team2 = this.parseMatchTeam(matchXml, 'B');

    // Create placeholder teams if missing but match has valid scheduled time
    const finalTeam1 = team1 || {
      teamNumber: 1 as const,
      teamName: 'TBD',
      player1Name: 'TBD',
      player2Name: 'TBD'
    };

    const finalTeam2 = team2 || {
      teamNumber: 2 as const,
      teamName: 'TBD',
      player1Name: 'TBD',
      player2Name: 'TBD'
    };

    const id = generateMatchId(tournamentId, courtNumber, scheduledDateTime, matchCode);
    
    const refereeAssignments = this.parseMatchReferees(matchXml);
    const result = this.parseMatchResult(matchXml);
    const importance = determineMatchImportance(round, this.extractXmlAttribute(matchXml, 'Phase'));
    
    // Extract duration fields for debugging and future use
    const durationSet1 = this.extractXmlAttribute(matchXml, 'DurationSet1');
    const durationSet2 = this.extractXmlAttribute(matchXml, 'DurationSet2');
    const durationSet3 = this.extractXmlAttribute(matchXml, 'DurationSet3');

    const matchObject = {
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
      rawStatus, // Preserve original VIS status (numeric or string)
      court,
      scheduledDateTime, // Legacy field for backward compatibility
      // NEW: Timezone-safe scheduled date/time structure (prevents 18→17 bug)
      scheduled: {
        utcISO: scheduledDateTime,                  // UTC timestamp for global sorting
        tz: scheduledTz,                           // Tournament timezone
        dateTournament: scheduledDateTournament,    // "2025-09-18" (immune to browser)
        timeTournament: scheduledTimeTournament,    // "14:00:00" (tournament time)
        dateTimeTournament: scheduledDateTimeTournament, // "2025-09-18T14:00:00" (tournament)
        epochMs: scheduledEpochMs                   // Epoch for stable sorting
      },
      actualStartTime: this.extractXmlAttribute(matchXml, 'StartTime'),
      actualEndTime: this.extractXmlAttribute(matchXml, 'EndTime'),
      team1: finalTeam1,
      team2: finalTeam2,
      result,
      refereeAssignments,
      notes: this.extractXmlAttribute(matchXml, 'Notes'),
      weather: this.extractXmlAttribute(matchXml, 'Weather'),
      importance,
      // Add additional VIS API fields
      noInTournament: noInTournament,
      teamAPositionInMainDraw: teamAPositionInMainDraw,
      teamBPositionInMainDraw: teamBPositionInMainDraw,
      // Add duration fields for debugging and access
      DurationSet1: durationSet1,
      DurationSet2: durationSet2,
      DurationSet3: durationSet3,
      // Add timezone fields for enhanced timezone support
      beginDateTimeUtc: beginDateTimeUtc,
      endDateTimeUtc: endDateTimeUtc,
      utcDate: utcDate,
      utcTime: utcTime,
      localDate: localDate,
      localTime: localTime,
      localTimeOffset: localTimeOffset,
      timezone: timezone,
      // Add tournament gender for filter functionality (from tournament data, not match XML)
      tournamentGender: tournamentGender,
      tournamentGenderText: tournamentGenderText,
      // Add referee names for enhanced filter functionality
      Referee1Name: this.extractXmlAttribute(matchXml, 'Referee1Name'),
      Referee2Name: this.extractXmlAttribute(matchXml, 'Referee2Name'),
      Referee1FederationCode: this.extractXmlAttribute(matchXml, 'Referee1FederationCode'),
      Referee2FederationCode: this.extractXmlAttribute(matchXml, 'Referee2FederationCode'),
      // Add tournament location fields for timezone conversion
      tournamentCity: tournamentLocation?.city,
      tournamentCountry: tournamentLocation?.country,
      tournamentCountryCode: tournamentLocation?.countryCode,
      tournamentVenue: tournamentLocation?.venue,
      tournamentName: tournamentLocation?.name
    } as any;


    return matchObject;
  }

  /**
   * Parse tournament dates from XML
   */
  private static parseTournamentDates(tournamentXml: string): TournamentDates {
    // Use date-only format to prevent timezone interpretation issues
    const startDate = this.extractXmlValue(tournamentXml, 'StartDate') || new Date().toISOString().split('T')[0];
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
    // Handle numeric values from VIS API: 0 = M, 1 = W
    if (genderStr === '0') return GenderType.M;
    if (genderStr === '1') return GenderType.W;

    // Handle string values as fallback
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
    // VIS API exposes total sets via MatchPointsA/B
    const matchPointsA = this.extractXmlAttribute(matchXml, 'MatchPointsA');
    const matchPointsB = this.extractXmlAttribute(matchXml, 'MatchPointsB');
    if (!matchPointsA || !matchPointsB) return undefined;

    // Attempt to extract individual set scores when present in MatchList fields
    const setScores: number[] = [];
    const pA1 = this.extractXmlAttribute(matchXml, 'PointsTeamASet1');
    const pB1 = this.extractXmlAttribute(matchXml, 'PointsTeamBSet1');
    const pA2 = this.extractXmlAttribute(matchXml, 'PointsTeamASet2');
    const pB2 = this.extractXmlAttribute(matchXml, 'PointsTeamBSet2');
    const pA3 = this.extractXmlAttribute(matchXml, 'PointsTeamASet3');
    const pB3 = this.extractXmlAttribute(matchXml, 'PointsTeamBSet3');
    const pushPair = (a?: string, b?: string) => {
      const na = parseInt(a || '');
      const nb = parseInt(b || '');
      if (!isNaN(na) && !isNaN(nb)) {
        setScores.push(na, nb);
      }
    };
    pushPair(pA1, pB1);
    pushPair(pA2, pB2);
    pushPair(pA3, pB3);

    const team1Sets = parseInt(matchPointsA) || 0;
    const team2Sets = parseInt(matchPointsB) || 0;

    // Extract duration from DurationSet1/2/3 fields (VIS API format: "mm:ss")
    const durationSet1 = this.extractXmlAttribute(matchXml, 'DurationSet1');
    const durationSet2 = this.extractXmlAttribute(matchXml, 'DurationSet2');
    const durationSet3 = this.extractXmlAttribute(matchXml, 'DurationSet3');
    
    let duration: number | undefined;
    
    // If we have set durations, calculate total using MatchDurationFormatter
    if (durationSet1 || durationSet2 || durationSet3) {
      try {
        const totalDurationStr = calculateTotalDuration(durationSet1, durationSet2, durationSet3);
        
        if (totalDurationStr) {
          // Convert "1h 25m" format to minutes
          const hourMatch = totalDurationStr.match(/(\d+)h/);
          const minuteMatch = totalDurationStr.match(/(\d+)m/);
          const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
          const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
          let totalPlayingTime = hours * 60 + minutes;
          
          // Add break time between sets (1 minute per set break)
          // Count how many sets were actually played
          const setsPlayed = [durationSet1, durationSet2, durationSet3].filter(set => set && set.trim()).length;
          const setBreaks = Math.max(0, setsPlayed - 1); // Number of breaks = sets - 1
          const breakTimeMinutes = setBreaks * 1; // 1 minute per break
          
          duration = totalPlayingTime + breakTimeMinutes;
          
          // Duration calculation: ${totalPlayingTime}min playing + ${breakTimeMinutes}min breaks = ${duration}min total
        }
      } catch (error) {
        console.warn('Error calculating duration from set times:', error);
      }
    }
    
    // Fallback: try calculating from start/end times if set durations not available
    if (!duration) {
      const startTime = this.extractXmlAttribute(matchXml, 'StartTime');
      const endTime = this.extractXmlAttribute(matchXml, 'EndTime');
      if (startTime && endTime) {
        try {
          const startDate = new Date(startTime);
          const endDate = new Date(endTime);
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const durationResult = calculateMatchDuration(startDate.toISOString(), endDate.toISOString());
            duration = durationResult;
          }
        } catch {}
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

  /**
   * Parse GetEventOfficialList response
   * Extract official list data from VIS API response  
   */
  static parseEventOfficialList(xmlResponse: string): OfficialListResponse {
    try {
      const officials: RefereeOfficial[] = [];
      const timestamp = new Date().toISOString();
      
      // Extract officials using VIS API attribute format
      // Expected format: <Official FederationCode="ITA" FirstName="Marco" ... />
      const officialMatches = xmlResponse.match(/<Official[^>]*\/>/g);
      
      if (officialMatches) {
        for (const officialXml of officialMatches) {
          const federationCode = this.extractXmlAttribute(officialXml, 'FederationCode') || '';
          const firstName = this.extractXmlAttribute(officialXml, 'FirstName') || '';
          const lastName = this.extractXmlAttribute(officialXml, 'LastName') || '';
          const gender = this.extractXmlAttribute(officialXml, 'Gender') as 'M' | 'W' || 'M';
          const noOfficial = this.extractXmlAttribute(officialXml, 'NoOfficial') || '';
          const roleStr = this.extractXmlAttribute(officialXml, 'Role') || 'TECHNICAL_OFFICIAL';
          const statusStr = this.extractXmlAttribute(officialXml, 'Status') || 'ACTIVE';
          const typeStr = this.extractXmlAttribute(officialXml, 'Type') || 'TECHNICAL';
          
          // Map string values to enum values with fallbacks
          const role = this.mapOfficialRole(roleStr);
          const status = this.mapOfficialStatus(statusStr);
          const type = this.mapOfficialType(typeStr);
          
          if (federationCode && firstName && lastName && noOfficial) {
            officials.push({
              federationCode,
              firstName,
              lastName,
              gender,
              noOfficial,
              role,
              status,
              type
            });
          }
        }
      }
      
      return {
        officials,
        totalCount: officials.length,
        timestamp
      };
      
    } catch (error) {
      throw new VisParsingError(
        'Failed to parse Event official list response',
        'parseEventOfficialList',
        error as Error
      );
    }
  }

  /**
   * Parse GetEventRefereeList response
   * Extract referee list data from VIS API response with extended fields
   */
  static parseEventRefereeList(xmlResponse: string): RefereeListResponse {
    try {
      const referees: EventReferee[] = [];
      const timestamp = new Date().toISOString();
      
      // Extract referees using VIS API attribute format
      // Expected format: <Referee FederationCode="USA" FirstName="John" ... NoReferee="123" ... />
      const refereeMatches = xmlResponse.match(/<Referee[^>]*\/>/g);
      
      if (refereeMatches) {
        for (const refereeXml of refereeMatches) {
          const federationCode = this.extractXmlAttribute(refereeXml, 'FederationCode') || '';
          const firstName = this.extractXmlAttribute(refereeXml, 'FirstName') || '';
          const lastName = this.extractXmlAttribute(refereeXml, 'LastName') || '';
          const gender = this.extractXmlAttribute(refereeXml, 'Gender') as 'M' | 'W' || 'M';
          const noReferee = this.extractXmlAttribute(refereeXml, 'NoReferee') || '';
          const statusStr = this.extractXmlAttribute(refereeXml, 'Status') || 'ACTIVE';
          const typeStr = this.extractXmlAttribute(refereeXml, 'Type') || 'REFEREE';
          const theoryTest = this.extractXmlAttribute(refereeXml, 'TheoryTest');
          const strongPoints = this.extractXmlAttribute(refereeXml, 'StrongPoints');
          const weakPoints = this.extractXmlAttribute(refereeXml, 'WeakPoints');
          
          // Map string values to enum values
          const status = this.mapOfficialStatus(statusStr);
          const type = this.mapOfficialType(typeStr);
          
          if (federationCode && firstName && lastName && noReferee) {
            referees.push({
              federationCode,
              firstName,
              lastName,
              gender,
              noReferee,
              status,
              type,
              theoryTest,
              strongPoints,
              weakPoints
            });
          }
        }
      }
      
      return {
        referees,
        totalCount: referees.length,
        timestamp
      };
      
    } catch (error) {
      throw new VisParsingError(
        'Failed to parse Event referee list response',
        'parseEventRefereeList',
        error as Error
      );
    }
  }

  /**
   * Map VIS role string to OfficialRole enum
   */
  private static mapOfficialRole(roleStr: string): OfficialRole {
    switch (roleStr?.toUpperCase()) {
      case 'REFEREE1':
      case 'REFEREE_1':
        return OfficialRole.REFEREE_1;
      case 'REFEREE2':
      case 'REFEREE_2':
        return OfficialRole.REFEREE_2;
      case 'CHALLENGEREFEREE':
      case 'CHALLENGE_REFEREE':
        return OfficialRole.CHALLENGE_REFEREE;
      case 'TECHNICALOFFICIAL':
      case 'TECHNICAL_OFFICIAL':
        return OfficialRole.TECHNICAL_OFFICIAL;
      case 'TOURNAMENTDIRECTOR':
      case 'TOURNAMENT_DIRECTOR':
        return OfficialRole.TOURNAMENT_DIRECTOR;
      case 'MATCHCOMMISSIONER':
      case 'MATCH_COMMISSIONER':
        return OfficialRole.MATCH_COMMISSIONER;
      default:
        return OfficialRole.TECHNICAL_OFFICIAL;
    }
  }

  /**
   * Map VIS status string to OfficialStatus enum
   */
  private static mapOfficialStatus(statusStr: string): OfficialStatus {
    switch (statusStr?.toUpperCase()) {
      case 'ACTIVE':
        return OfficialStatus.ACTIVE;
      case 'INACTIVE':
        return OfficialStatus.INACTIVE;
      case 'SUSPENDED':
        return OfficialStatus.SUSPENDED;
      case 'RESTRICTED':
        return OfficialStatus.RESTRICTED;
      default:
        return OfficialStatus.ACTIVE;
    }
  }

  /**
   * Map VIS type string to OfficialType enum
   */
  private static mapOfficialType(typeStr: string): OfficialType {
    switch (typeStr?.toUpperCase()) {
      case 'REFEREE':
        return OfficialType.REFEREE;
      case 'TECHNICAL':
        return OfficialType.TECHNICAL;
      case 'ADMINISTRATIVE':
        return OfficialType.ADMINISTRATIVE;
      default:
        return OfficialType.TECHNICAL;
    }
  }

  /**
   * Validate and normalize timezone from VIS API
   * Handles invalid values like "24" and converts them to valid IANA timezones
   */
  private static validateAndNormalizeTimezone(timezone: string | undefined): string | null {
    if (!timezone || typeof timezone !== 'string') {
      return null;
    }

    const cleanTz = timezone.trim();

    // SPECIAL CASE: VIS API sometimes returns invalid values like "24"
    if (cleanTz === "24" || cleanTz === "25") {
      return null;
    }

    // Check if it's a numeric offset (like "1", "-5", "+3")
    const numericMatch = cleanTz.match(/^([+-]?)(\d{1,2})$/);
    if (numericMatch) {
      const [, sign, hours] = numericMatch;
      const hourOffset = parseInt(hours, 10);

      // Handle invalid offsets (24+ hours)
      if (hourOffset >= 24) {
        return null;
      }

      // Convert to standard offset format and use parseTimezoneFromOffset
      const standardOffset = `${sign || '+'}${hours.padStart(2, '0')}:00`;
      return this.parseTimezoneFromOffset(standardOffset);
    }

    // Check if it's already a valid IANA timezone by testing with dayjs
    try {
      // Test if timezone is valid by attempting to create a date with it
      dayjs.tz('2025-01-01T12:00:00', cleanTz);
      return cleanTz;
    } catch {
      console.warn(`[VisResponseParser] Invalid timezone format: ${timezone}, ignoring`);
      return null;
    }
  }

  /**
   * Parse timezone from LocalTimeOffset format (e.g., "+03:00", "-05:00")
   * Converts offset to best-guess IANA timezone name
   */
  private static parseTimezoneFromOffset(localTimeOffset: string): string | null {
    if (!localTimeOffset || typeof localTimeOffset !== 'string') {
      return null;
    }

    // Clean and validate offset format
    const cleanOffset = localTimeOffset.trim();
    const offsetMatch = cleanOffset.match(/^([+-])(\d{1,2}):?(\d{2})$/);

    if (!offsetMatch) {
      return null;
    }

    const [, sign, hours, minutes] = offsetMatch;
    const offsetHours = parseInt(hours, 10);
    const offsetMinutes = parseInt(minutes, 10);

    // Convert to total offset in hours
    const totalOffset = (offsetHours + offsetMinutes / 60) * (sign === '+' ? 1 : -1);

    // Map common offsets to IANA timezones (best effort)
    const offsetToTimezone: Record<number, string> = {
      '-12': 'Pacific/Wake',
      '-11': 'Pacific/Midway',
      '-10': 'Pacific/Honolulu',
      '-9': 'America/Anchorage',
      '-8': 'America/Los_Angeles',
      '-7': 'America/Denver',
      '-6': 'America/Chicago',
      '-5': 'America/New_York',
      '-4': 'America/Halifax',
      '-3': 'America/Sao_Paulo',  // ← Brazil timezone
      '-2': 'America/Noronha',
      '-1': 'Atlantic/Azores',
      '0': 'UTC',
      '1': 'Europe/Paris',
      '2': 'Europe/Rome',        // ← Italy timezone
      '3': 'Europe/Moscow',
      '4': 'Asia/Dubai',
      '5': 'Asia/Karachi',
      '6': 'Asia/Dhaka',
      '7': 'Asia/Bangkok',
      '8': 'Asia/Singapore',
      '9': 'Asia/Tokyo',
      '10': 'Australia/Sydney',
      '11': 'Australia/Lord_Howe',
      '12': 'Pacific/Fiji'
    };

    const offsetKey = totalOffset.toString();
    return offsetToTimezone[offsetKey] || null;
  }
}
