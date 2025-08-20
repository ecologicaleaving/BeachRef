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
          console.warn('Failed to parse tournament:', error);
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
      
      // Extract match nodes from XML
      const matchMatches = xmlResponse.match(/<Match[^>]*>.*?<\/Match>/gs);
      
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
          console.warn('Failed to parse match:', error);
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
    const visNo = this.extractXmlValue(matchXml, 'No');
    const matchCode = this.extractXmlValue(matchXml, 'MatchNo') || visNo;
    const round = this.extractXmlValue(matchXml, 'Round') || 'Unknown';
    
    if (!visNo || !matchCode) {
      return null;
    }

    const statusStr = this.extractXmlValue(matchXml, 'Status') || '';
    const status = mapVisMatchStatus(statusStr);
    
    const courtNumber = this.extractXmlValue(matchXml, 'Court') || '1';
    const scheduledDateTime = this.extractXmlValue(matchXml, 'DateTime') || new Date().toISOString();
    
    const court: CourtInfo = {
      courtNumber,
      courtName: this.extractXmlValue(matchXml, 'CourtName'),
      surface: this.extractXmlValue(matchXml, 'Surface'),
      location: this.extractXmlValue(matchXml, 'CourtLocation')
    };

    const team1 = this.parseMatchTeam(matchXml, 1);
    const team2 = this.parseMatchTeam(matchXml, 2);
    
    if (!team1 || !team2) {
      return null;
    }

    const id = generateMatchId(tournamentId, courtNumber, scheduledDateTime, matchCode);
    
    const refereeAssignments = this.parseMatchReferees(matchXml);
    const result = this.parseMatchResult(matchXml);
    const importance = determineMatchImportance(round, this.extractXmlValue(matchXml, 'Phase'));

    return {
      id,
      visNo,
      version: 1,
      lastUpdated: new Date().toISOString(),
      tournamentId,
      matchCode,
      round,
      phaseCode: this.extractXmlValue(matchXml, 'Phase'),
      status,
      court,
      scheduledDateTime,
      actualStartTime: this.extractXmlValue(matchXml, 'StartTime'),
      actualEndTime: this.extractXmlValue(matchXml, 'EndTime'),
      team1,
      team2,
      result,
      refereeAssignments,
      notes: this.extractXmlValue(matchXml, 'Notes'),
      weather: this.extractXmlValue(matchXml, 'Weather'),
      importance
    };
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
  private static parseMatchTeam(matchXml: string, teamNumber: 1 | 2): MatchTeam | null {
    const teamPrefix = `Team${teamNumber}`;
    const teamName = this.extractXmlValue(matchXml, `${teamPrefix}Name`) || 
                     this.extractXmlValue(matchXml, `${teamPrefix}`);
    
    if (!teamName) return null;

    const player1Name = this.extractXmlValue(matchXml, `${teamPrefix}Player1`) || 'Player 1';
    const player2Name = this.extractXmlValue(matchXml, `${teamPrefix}Player2`) || 'Player 2';
    
    return {
      teamNumber,
      teamName,
      player1Name,
      player2Name,
      countryCode: this.extractXmlValue(matchXml, `${teamPrefix}Country`),
      ranking: parseInt(this.extractXmlValue(matchXml, `${teamPrefix}Ranking`) || '0') || undefined
    };
  }

  /**
   * Parse match referees from XML
   */
  private static parseMatchReferees(matchXml: string): readonly RefereeAssignment[] {
    const referees: RefereeAssignment[] = [];
    
    // Parse referee assignments - simplified parsing
    const refereeMatches = matchXml.match(/<Referee[^>]*>.*?<\/Referee>/gs);
    
    if (refereeMatches) {
      for (const refereeXml of refereeMatches) {
        const refereeId = this.extractXmlValue(refereeXml, 'Id') || 'unknown';
        const refereeName = this.extractXmlValue(refereeXml, 'Name') || 'Unknown Referee';
        const functionValue = this.extractXmlValue(refereeXml, 'Function') || 'Referee';
        
        referees.push({
          refereeId,
          refereeName,
          function: functionValue,
          federationCode: this.extractXmlValue(refereeXml, 'Federation'),
          status: 'ASSIGNED'
        });
      }
    }
    
    return referees;
  }

  /**
   * Parse match result from XML
   */
  private static parseMatchResult(matchXml: string): MatchResult | undefined {
    const result = this.extractXmlValue(matchXml, 'Result');
    if (!result) return undefined;

    // Parse set scores (simplified - would need more robust parsing)
    const setScores: number[] = [];
    const team1Sets = parseInt(this.extractXmlValue(matchXml, 'Team1Sets') || '0');
    const team2Sets = parseInt(this.extractXmlValue(matchXml, 'Team2Sets') || '0');
    
    const startTime = this.extractXmlValue(matchXml, 'StartTime');
    const endTime = this.extractXmlValue(matchXml, 'EndTime');
    const duration = calculateMatchDuration(startTime, endTime);
    
    const winner = team1Sets > team2Sets ? 1 : (team2Sets > team1Sets ? 2 : undefined);
    
    return {
      team1Sets,
      team2Sets,
      setScores,
      duration,
      winner,
      forfeit: result.toLowerCase().includes('forfeit')
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
}