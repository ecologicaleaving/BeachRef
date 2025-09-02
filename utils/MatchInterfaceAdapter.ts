/**
 * @fileoverview Match Interface Adapter - VIS Compliant to Legacy Compatibility
 * Provides transformation utilities to allow components to work with VIS-compliant data
 * while maintaining compatibility during migration
 * Part of VIS Data Structure Alignment Epic - Story 1.3
 */

import { VisCompliantMatch } from '../types/match-vis-compliant';
import { MatchStatus } from '../types/match-v2';
import { convertSecondsToTimeString } from './VisDurationParser';

/**
 * Transform VIS-compliant match to component-compatible format
 * Provides computed legacy properties from VIS numeric data
 * @param visMatch - VIS-compliant match data
 * @returns Component-compatible match format with computed legacy fields
 * @throws {Error} If required VIS fields are missing or invalid
 */
export function adaptVisMatchToComponent(visMatch: VisCompliantMatch): any {
  // Enhanced input validation
  if (!visMatch || typeof visMatch !== 'object') {
    throw new Error('MatchInterfaceAdapter: Invalid match data - expected object');
  }
  
  if (!visMatch.No || !visMatch.NoInTournament) {
    throw new Error('MatchInterfaceAdapter: Missing required VIS match identifiers (No, NoInTournament)');
  }
  
  if (typeof visMatch.No !== 'number' || typeof visMatch.NoInTournament !== 'number') {
    throw new Error('MatchInterfaceAdapter: VIS match identifiers must be numeric');
  }
  
  // Generate computed fields from VIS data
  const matchId = `${visMatch.tournamentNo || 'unknown'}-${visMatch.No}`;
  const matchNumber = visMatch.No.toString();
  
  // Construct scheduled date time from VIS LocalDate and LocalTime with validation
  let scheduledDateTime: string;
  try {
    if (visMatch.LocalDate && visMatch.LocalTime) {
      // Validate date format before constructing ISO string
      const testDate = new Date(`${visMatch.LocalDate}T${visMatch.LocalTime}:00`);
      if (isNaN(testDate.getTime())) {
        throw new Error(`Invalid date/time format: ${visMatch.LocalDate} ${visMatch.LocalTime}`);
      }
      scheduledDateTime = `${visMatch.LocalDate}T${visMatch.LocalTime}:00`;
    } else if (visMatch.LocalDate) {
      const testDate = new Date(`${visMatch.LocalDate}T00:00:00`);
      if (isNaN(testDate.getTime())) {
        throw new Error(`Invalid date format: ${visMatch.LocalDate}`);
      }
      scheduledDateTime = `${visMatch.LocalDate}T00:00:00`;
    } else {
      scheduledDateTime = new Date().toISOString();
    }
  } catch (dateError) {
    scheduledDateTime = new Date().toISOString();
  }
  
  // Map VIS status to MatchStatus enum
  const status = mapVisStatusToMatchStatus(visMatch.Status);
  
  // Extract court information
  const court = visMatch.Court ? {
    courtNumber: visMatch.Court
  } : undefined;
  
  // Extract team information from VIS fields
  const team1 = {
    teamName: visMatch.TeamAName || 'Team A',
    countryCode: visMatch.TeamAFederationCode,
    // VIS doesn't have individual player names in this interface
    player1Name: undefined,
    player2Name: undefined,
    ranking: undefined
  };
  
  const team2 = {
    teamName: visMatch.TeamBName || 'Team B',
    countryCode: visMatch.TeamBFederationCode,
    player1Name: undefined,
    player2Name: undefined,
    ranking: undefined
  };
  
  // Calculate match result from VIS numeric scores
  let result = undefined;
  if (visMatch.MatchPointsA !== undefined || visMatch.MatchPointsB !== undefined) {
    const team1Sets = visMatch.MatchPointsA || 0;
    const team2Sets = visMatch.MatchPointsB || 0;
    
    // Determine winner (first to 2 sets wins)
    let winner = undefined;
    if (team1Sets >= 2) winner = 1;
    else if (team2Sets >= 2) winner = 2;
    
    // Build set scores array from VIS individual set scores
    const setScores: number[] = [];
    if (visMatch.PointsTeamASet1 !== undefined && visMatch.PointsTeamBSet1 !== undefined) {
      setScores.push(visMatch.PointsTeamASet1, visMatch.PointsTeamBSet1);
    }
    if (visMatch.PointsTeamASet2 !== undefined && visMatch.PointsTeamBSet2 !== undefined) {
      setScores.push(visMatch.PointsTeamASet2, visMatch.PointsTeamBSet2);
    }
    if (visMatch.PointsTeamASet3 !== undefined && visMatch.PointsTeamBSet3 !== undefined) {
      setScores.push(visMatch.PointsTeamASet3, visMatch.PointsTeamBSet3);
    }
    
    // Calculate total duration from VIS seconds
    let duration = undefined;
    if (visMatch.DurationSet1Seconds || visMatch.DurationSet2Seconds || visMatch.DurationSet3Seconds) {
      const totalSeconds = (visMatch.DurationSet1Seconds || 0) + 
                          (visMatch.DurationSet2Seconds || 0) + 
                          (visMatch.DurationSet3Seconds || 0);
      duration = Math.round(totalSeconds / 60); // Convert to minutes
    }
    
    result = {
      team1Sets,
      team2Sets,
      winner,
      setScores: setScores.length > 0 ? setScores : undefined,
      duration
    };
  }
  
  // Extract referee assignments from VIS fields
  const refereeAssignments = [];
  if (visMatch.Referee1Name) {
    refereeAssignments.push({
      refereeName: visMatch.Referee1Name,
      federationCode: visMatch.Referee1FederationCode || undefined
    });
  }
  if (visMatch.Referee2Name) {
    refereeAssignments.push({
      refereeName: visMatch.Referee2Name,
      federationCode: visMatch.Referee2FederationCode || undefined
    });
  }
  
  return {
    // VIS-compliant fields (preserved)
    ...visMatch,
    
    // Computed legacy compatibility fields
    id: matchId,
    matchNumber,
    scheduledDateTime,
    status,
    court,
    team1,
    team2,
    result,
    refereeAssignments: refereeAssignments.length > 0 ? refereeAssignments : undefined,
    
    // Legacy duration fields computed from VIS seconds
    DurationSet1: visMatch.DurationSet1Seconds ? convertSecondsToTimeString(visMatch.DurationSet1Seconds) || undefined : undefined,
    DurationSet2: visMatch.DurationSet2Seconds ? convertSecondsToTimeString(visMatch.DurationSet2Seconds) || undefined : undefined,
    DurationSet3: visMatch.DurationSet3Seconds ? convertSecondsToTimeString(visMatch.DurationSet3Seconds) || undefined : undefined,
  };
}

/**
 * Map VIS status string to MatchStatus enum
 * Handles various VIS status formats
 */
function mapVisStatusToMatchStatus(visStatus?: string): MatchStatus {
  if (!visStatus) return MatchStatus.SCHEDULED;
  
  const normalizedStatus = visStatus.toLowerCase().trim();
  
  if (normalizedStatus.includes('running') || normalizedStatus.includes('live')) {
    return MatchStatus.RUNNING;
  }
  if (normalizedStatus.includes('finished') || normalizedStatus.includes('final') || normalizedStatus.includes('completed')) {
    return MatchStatus.FINISHED;
  }
  if (normalizedStatus.includes('cancelled')) {
    return MatchStatus.CANCELLED;
  }
  if (normalizedStatus.includes('postponed')) {
    return MatchStatus.POSTPONED;
  }
  if (normalizedStatus.includes('interrupted')) {
    return MatchStatus.INTERRUPTED;
  }
  if (normalizedStatus.includes('scheduled')) {
    return MatchStatus.SCHEDULED;
  }
  
  // Default to scheduled if status is unrecognized
  return MatchStatus.SCHEDULED;
}

/**
 * Batch transform array of VIS-compliant matches to component format
 */
export function adaptVisMatchesToComponent(visMatches: VisCompliantMatch[]): any[] {
  return visMatches.map(adaptVisMatchToComponent);
}

/**
 * Type guard to check if match is VIS-compliant
 */
export function isVisCompliantMatchData(match: any): match is VisCompliantMatch {
  if (!match || typeof match !== 'object') {
    return false;
  }
  return typeof match.No === 'number' &&
         typeof match.NoInTournament === 'number' &&
         typeof match.Format === 'string';
}

/**
 * Adapter function for components - handles both VIS and legacy matches
 * Provides unified interface during migration period
 * Performance optimized: Error isolation prevents single bad match from breaking entire list
 */
export function adaptMatchesForComponent(matches: any[]): any[] {
  if (!Array.isArray(matches) || matches.length === 0) {
    return [];
  }
  
  const adaptedMatches: any[] = [];
  
  // Single-pass processing with error isolation
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    try {
      if (isVisCompliantMatchData(match)) {
        adaptedMatches.push(adaptVisMatchToComponent(match));
      } else {
        // Already in legacy format, return as-is
        adaptedMatches.push(match);
      }
    } catch (adaptationError) {
      // Continue processing remaining matches instead of failing entirely
    }
  }
  
  return adaptedMatches;
}

/**
 * Convert VIS-compliant match to MatchInfo format for Typography MatchCard
 * Provides specific transformation for typography-based components
 */
export function adaptVisMatchToMatchInfo(visMatch: VisCompliantMatch): any {
  const matchId = `#${visMatch.NoInTournament || visMatch.No}`;
  const teamA = visMatch.TeamAName || 'Team A';
  const teamB = visMatch.TeamBName || 'Team B';
  const teamAFederationCode = visMatch.TeamAFederationCode;
  const teamBFederationCode = visMatch.TeamBFederationCode;
  
  // Format time and date from VIS fields
  const time = visMatch.LocalTime || 'TBD';
  const date = visMatch.LocalDate ? new Date(visMatch.LocalDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }) : 'TBD';
  
  const court = visMatch.Court || 'TBD';
  
  // Map VIS status to MatchInfo status
  let status: 'scheduled' | 'live' | 'completed' | 'cancelled' = 'scheduled';
  if (visMatch.Status) {
    const normalizedStatus = visMatch.Status.toLowerCase();
    if (normalizedStatus.includes('running') || normalizedStatus.includes('live')) {
      status = 'live';
    } else if (normalizedStatus.includes('finished') || normalizedStatus.includes('completed')) {
      status = 'completed';
    } else if (normalizedStatus.includes('cancelled')) {
      status = 'cancelled';
    }
  }
  
  return {
    matchId,
    teamA,
    teamB,
    teamAFederationCode,
    teamBFederationCode,
    time,
    date,
    court,
    round: 'TBD', // VIS doesn't provide round info in this interface
    status
  };
}