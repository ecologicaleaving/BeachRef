/**
 * Database Mapper
 *
 * Bidirectional mapping between domain types and database schema:
 * - BeachMatchCore ↔ DbMatch
 * - TournamentCore ↔ DbTournament
 * - RefereeAssignment ↔ DbMatchReferee
 */

import { BeachMatchCore, RefereeAssignment, MatchStatus } from '../../types/match-v2';
import { TournamentCore, GenderType } from '../../types/tournament-v2';
import { DbMatch, DbTournament, DbMatchReferee, MatchSet } from '../../types/database';

/**
 * Map BeachMatchCore to database schema
 *
 * @param match - Domain match object
 * @param eventId - Database event ID (required for foreign key)
 * @returns Database match insert object
 */
export function mapMatchToDb(
  match: BeachMatchCore,
  eventId: number
): Omit<DbMatch, 'id' | 'created_at' | 'updated_at'> {
  // Extract year from scheduled date
  const matchDate = new Date(match.scheduledDateTime);
  const year = matchDate.getFullYear();

  // Convert sets to database format
  const sets: MatchSet[] = match.result?.sets?.map(set => ({
    a: set.team1Score || 0,
    b: set.team2Score || 0,
  })) || [];

  return {
    vis_match_no: parseInt(match.visNo),
    tournament_code: `${(match as any).tournamentNo || match.tournamentId}_${year}`, // Include year to avoid João Pessoa bug
    event_id: eventId,
    round_code: match.phaseCode,
    round_name: match.round,
    round_phase: match.phaseCode,
    utc_datetime: match.scheduledDateTime,
    local_datetime: match.actualStartTime || match.scheduledDateTime,
    court: match.court?.name || match.court?.number,
    team_a_name: match.team1.name,
    team_b_name: match.team2.name,
    team_a_fed: match.team1.federation,
    team_b_fed: match.team2.federation,
    team_a_players: match.team1.players?.map(p => parseInt(p.visNo)) || [],
    team_b_players: match.team2.players?.map(p => parseInt(p.visNo)) || [],
    sets: sets as any, // JSONB type
    result: match.result as any, // JSONB type
    status: match.status,
    are_court_and_time_published: !!(match.court?.name || match.court?.number),
    nb_live_score_upload: 0, // TODO: Get from live score system if available
  };
}

/**
 * Map database match to BeachMatchCore
 *
 * @param dbMatch - Database match object
 * @returns Domain match object
 */
export function mapDbToMatch(dbMatch: DbMatch): BeachMatchCore {
  // Extract tournament code without year suffix
  const [tournamentCode] = dbMatch.tournament_code.split('_');

  return {
    id: `match:${dbMatch.vis_match_no}`,
    visNo: dbMatch.vis_match_no.toString(),
    version: 1,
    lastUpdated: dbMatch.updated_at,

    tournamentId: tournamentCode,
    matchCode: dbMatch.vis_match_no.toString(),
    round: dbMatch.round_name || '',
    roundName: dbMatch.round_name,
    phaseCode: dbMatch.round_phase,

    status: (dbMatch.status as MatchStatus) || 'Scheduled',
    rawStatus: dbMatch.status,

    court: {
      number: dbMatch.court || '',
      name: dbMatch.court,
    },

    scheduledDateTime: dbMatch.utc_datetime || '',
    Date: dbMatch.utc_datetime,
    MatchDate: dbMatch.utc_datetime,
    StartDate: dbMatch.utc_datetime,
    actualStartTime: dbMatch.local_datetime,
    actualEndTime: undefined,

    team1: {
      name: dbMatch.team_a_name || '',
      federation: dbMatch.team_a_fed,
      players: [], // TODO: Load players if needed
    },

    team2: {
      name: dbMatch.team_b_name || '',
      federation: dbMatch.team_b_fed,
      players: [],
    },

    teams: [],

    result: dbMatch.result ? {
      ...dbMatch.result,
      sets: (dbMatch.sets as MatchSet[] || []).map((set, index) => ({
        setNumber: index + 1,
        team1Score: set.a,
        team2Score: set.b,
      })),
    } : undefined,

    refereeAssignments: [], // Loaded separately from match_referees table
    officials: [],

    notes: undefined,
    weather: undefined,
    importance: undefined,
    noInTournament: undefined,
    teamAPositionInMainDraw: undefined,
    teamBPositionInMainDraw: undefined,
    tournamentTimezone: undefined,
  };
}

/**
 * Map TournamentCore to database schema
 *
 * @param tournament - Domain tournament object
 * @returns Database tournament insert object
 */
export function mapTournamentToDb(
  tournament: TournamentCore
): Omit<DbTournament, 'id' | 'created_at' | 'updated_at'> {
  return {
    vis_no: tournament.visNo,
    code: tournament.code,
    name: tournament.name,
    gender: tournament.gender as 'M' | 'W' | undefined,
    type: tournament.tournamentType,
    start_date: tournament.dates.startDate,
    end_date: tournament.dates.endDate,
    city: tournament.city,
    country: tournament.country,
    country_code: tournament.countryCode,
    status: tournament.status,
  };
}

/**
 * Map database tournament to TournamentCore
 *
 * @param dbTournament - Database tournament object
 * @returns Domain tournament object
 */
export function mapDbToTournament(dbTournament: DbTournament): TournamentCore {
  return {
    id: `tournament:${dbTournament.vis_no}`,
    visNo: dbTournament.vis_no,
    version: 1,
    lastUpdated: dbTournament.updated_at,

    code: dbTournament.code || '',
    name: dbTournament.name,
    title: dbTournament.name,

    gender: (dbTournament.gender as GenderType) || 'M',
    tournamentType: dbTournament.type as any || 'World Tour',

    dates: {
      startDate: dbTournament.start_date,
      endDate: dbTournament.end_date,
    },

    status: dbTournament.status as any || 'Scheduled',

    NoEvent: undefined,
    city: dbTournament.city,
    country: dbTournament.country,
    countryCode: dbTournament.country_code,
    location: dbTournament.city,
    DefaultTimeZone: undefined,
    venue: undefined,
    address: undefined,
    courts: undefined,
  };
}

/**
 * Map referee assignment to database schema
 *
 * @param matchId - Database match ID
 * @param refereeId - Database referee ID
 * @param assignment - Domain referee assignment
 * @returns Database match_referee object
 */
export function mapRefereeAssignmentToDb(
  matchId: number,
  refereeId: number,
  assignment: RefereeAssignment
): DbMatchReferee {
  // Determine role from assignment type
  let role: 'FIRST' | 'SECOND' | 'CHALLENGE' = 'FIRST';

  if (assignment.role?.toLowerCase().includes('second') || assignment.role?.toLowerCase() === '2nd') {
    role = 'SECOND';
  } else if (assignment.role?.toLowerCase().includes('challenge')) {
    role = 'CHALLENGE';
  }

  return {
    match_id: matchId,
    referee_id: refereeId,
    role,
  };
}

/**
 * Map database match_referee to RefereeAssignment
 *
 * @param dbMatchReferee - Database match_referee object
 * @param refereeData - Referee details from referees table
 * @returns Domain referee assignment
 */
export function mapDbToRefereeAssignment(
  dbMatchReferee: DbMatchReferee,
  refereeData?: { first_name?: string; last_name?: string; federation_code?: string }
): RefereeAssignment {
  const name = refereeData
    ? `${refereeData.first_name || ''} ${refereeData.last_name || ''}`.trim()
    : 'Unknown';

  return {
    visNo: dbMatchReferee.referee_id.toString(),
    name,
    role: dbMatchReferee.role,
    federation: refereeData?.federation_code,
  };
}

/**
 * Extract year from tournament dates
 *
 * Used for year-based filtering to fix João Pessoa bug
 */
export function extractYearFromTournament(tournament: TournamentCore): number {
  return new Date(tournament.dates.startDate).getFullYear();
}

/**
 * Extract year from match date
 *
 * Used for year-based filtering to fix João Pessoa bug
 */
export function extractYearFromMatch(match: BeachMatchCore): number {
  return new Date(match.scheduledDateTime).getFullYear();
}
