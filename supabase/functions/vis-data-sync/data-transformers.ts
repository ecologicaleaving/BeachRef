// VIS DTO interfaces (from vis-adapter)
interface VisMatchDTO {
  id: string;
  visNo: string;
  tournamentCode: string;
  matchCode: string;
  round: string;
  phaseCode?: string;
  status: 'SCHEDULED' | 'RUNNING' | 'FINISHED' | 'INTERRUPTED' | 'CANCELLED' | 'POSTPONED' | 'TBD';
  court: {
    courtNumber: string;
    courtName?: string;
    surface?: string;
    location?: string;
  };
  scheduledDateTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  team1: {
    teamNumber: 1;
    teamName: string;
    player1Name: string;
    player2Name: string;
    countryCode?: string;
    ranking?: number;
  };
  team2: {
    teamNumber: 2;
    teamName: string;
    player1Name: string;
    player2Name: string;
    countryCode?: string;
    ranking?: number;
  };
  result?: {
    team1Sets: number;
    team2Sets: number;
    setScores: number[];
    duration?: number;
    winner?: 1 | 2;
    forfeit?: boolean;
  };
  refereeAssignments?: {
    refereeId: string;
    refereeName: string;
    function: string;
    federationCode?: string;
    status: 'ASSIGNED' | 'CONFIRMED' | 'DECLINED' | 'PENDING';
  }[];
}

interface VisTournamentDTO {
  id: string;
  visNo: string;
  code: string;
  name: string;
  title?: string;
  gender: 'M' | 'W' | 'MIXED';
  tournamentType: 'FIVB' | 'BPT' | 'CEV' | 'LOCAL';
  dates: {
    startDate: string;
    endDate: string;
    startDateQualification?: string;
    startDateMainDraw?: string;
  };
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  city?: string;
  country?: string;
  countryCode?: string;
  location?: string;
  NoEvent?: string;
}

interface VisRefereeDTO {
  id: string;
  visRefereeNo: string;
  firstName?: string;
  lastName?: string;
  gender?: 'M' | 'F';
  federation?: string;
  birthdate?: string;
  assignments?: {
    matchId: string;
    matchCode: string;
    tournamentCode: string;
    function: 'FIRST' | 'SECOND' | 'CHALLENGE';
    status: 'ASSIGNED' | 'CONFIRMED' | 'DECLINED' | 'PENDING';
    court?: string;
    scheduledTime?: string;
  }[];
}

/**
 * Transform VIS Tournament DTO to database tournaments table format
 */
export function transformTournamentForDatabase(visTournament: VisTournamentDTO): any {
  // Extract season from dates or tournament code
  let season: number | null = null;
  if (visTournament.dates.startDate) {
    const startYear = new Date(visTournament.dates.startDate).getFullYear();
    season = startYear;
  }
  
  // Map VIS gender to database format
  let dbGender: 'M' | 'W' | null = null;
  if (visTournament.gender === 'M' || visTournament.gender === 'W') {
    dbGender = visTournament.gender;
  }
  
  return {
    vis_tournament_no: parseInt(visTournament.visNo),
    tournament_code: visTournament.code,
    name: visTournament.name || visTournament.title,
    country: visTournament.countryCode || visTournament.country,
    city: visTournament.city,
    season: season,
    gender: dbGender,
    type: visTournament.tournamentType || 'LOCAL',
    start_qualification: visTournament.dates.startDateQualification || null,
    start_main_draw: visTournament.dates.startDateMainDraw || visTournament.dates.startDate || null,
    end_date: visTournament.dates.endDate || null,
    status: visTournament.status || 'UPCOMING',
    location: visTournament.location,
    // Analytics fields - will be calculated later
    participant_count: null,
    completion_rate: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Transform VIS Match DTO to database events and matches tables format
 */
export function transformMatchForDatabase(visMatch: VisMatchDTO, tournamentId?: number): {
  event?: any;
  match: any;
  refereeAssignments: any[];
} {
  // Create event data if needed (extract from match data)
  const event = tournamentId ? {
    vis_event_no: parseInt(visMatch.visNo), // Using match visNo as event identifier
    tournament_id: tournamentId,
    gender: visMatch.tournamentCode.includes('W') ? 'W' : 'M', // Infer from tournament code
    phase: visMatch.phaseCode || 'Main Draw',
    name: `${visMatch.tournamentCode} - ${visMatch.phaseCode || 'Main Draw'}`,
    country: null, // Will be populated from tournament data
    start_date: visMatch.scheduledDateTime ? new Date(visMatch.scheduledDateTime).toISOString().split('T')[0] : null,
    end_date: null,
    status: visMatch.status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } : undefined;

  // Transform sets data to JSONB format
  const sets = visMatch.result?.setScores ? 
    visMatch.result.setScores.map((score, index) => {
      // Assuming setScores is an array of scores, we need to split into team scores
      // This may need adjustment based on actual VIS data format
      return {
        set: index + 1,
        a: Math.floor(score / 100), // Assuming score format like 2119 = 21-19
        b: score % 100,
      };
    }) : [];

  // Transform result data to JSONB format
  const result = visMatch.result ? {
    team1Sets: visMatch.result.team1Sets,
    team2Sets: visMatch.result.team2Sets,
    winner: visMatch.result.winner,
    duration: visMatch.result.duration,
    forfeit: visMatch.result.forfeit || false,
    resultType: visMatch.result.forfeit ? 'FORFEIT' : 'NORMAL',
  } : null;

  const match = {
    vis_match_no: parseInt(visMatch.visNo),
    tournament_code: visMatch.tournamentCode,
    event_id: null, // Will be populated after event is created
    round_code: visMatch.round,
    round_name: visMatch.round,
    round_phase: visMatch.phaseCode,
    utc_datetime: visMatch.scheduledDateTime ? new Date(visMatch.scheduledDateTime).toISOString() : null,
    local_datetime: visMatch.actualStartTime ? new Date(visMatch.actualStartTime).toISOString() : null,
    court: visMatch.court.courtNumber,
    team_a_name: visMatch.team1.teamName,
    team_b_name: visMatch.team2.teamName,
    team_a_fed: visMatch.team1.countryCode,
    team_b_fed: visMatch.team2.countryCode,
    team_a_players: [visMatch.team1.player1Name, visMatch.team1.player2Name].filter(Boolean),
    team_b_players: [visMatch.team2.player1Name, visMatch.team2.player2Name].filter(Boolean),
    sets: JSON.stringify(sets),
    result: result ? JSON.stringify(result) : null,
    status: visMatch.status,
    are_court_and_time_published: Boolean(visMatch.court.courtNumber && visMatch.scheduledDateTime),
    nb_live_score_upload: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Transform referee assignments
  const refereeAssignments = (visMatch.refereeAssignments || []).map(assignment => ({
    // match_id will be populated after match is created
    // referee_id will be resolved from referee sync
    referee_vis_no: assignment.refereeId,
    referee_name: assignment.refereeName,
    role: mapRefereeFunction(assignment.function),
    status: assignment.status,
    federation_code: assignment.federationCode,
  }));

  return {
    event,
    match,
    refereeAssignments,
  };
}

/**
 * Transform VIS Referee DTO to database referees table format
 */
export function transformRefereeForDatabase(visReferee: VisRefereeDTO): any {
  return {
    referee_id: visReferee.visRefereeNo,
    vis_referee_no: parseInt(visReferee.visRefereeNo),
    first_name: visReferee.firstName || '',
    last_name: visReferee.lastName || '',
    gender: visReferee.gender === 'F' ? 'W' : visReferee.gender || 'M',
    federation_code: visReferee.federation || 'UNK',
    birthdate: visReferee.birthdate ? new Date(visReferee.birthdate).toISOString().split('T')[0] : null,
    status: 'ACTIVE', // Default status
    type: 'REFEREE', // Default type
    role: null, // Will be determined from assignments
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Transform referee assignments for match_referees junction table
 */
export function transformRefereeAssignments(assignments: any[], matchId: number, refereeId: number): any[] {
  return assignments.map(assignment => ({
    match_id: matchId,
    referee_id: refereeId,
    role: mapRefereeFunction(assignment.function),
  }));
}

/**
 * Map VIS referee function to database role format
 */
function mapRefereeFunction(visFunction: string): 'FIRST' | 'SECOND' | 'CHALLENGE' {
  const func = visFunction.toUpperCase();
  
  if (func.includes('FIRST') || func === '1' || func === 'R1') {
    return 'FIRST';
  }
  if (func.includes('SECOND') || func === '2' || func === 'R2') {
    return 'SECOND';
  }
  if (func.includes('CHALLENGE') || func.includes('CR')) {
    return 'CHALLENGE';
  }
  
  // Default to FIRST if unclear
  return 'FIRST';
}

/**
 * Validate transformed data before database insertion
 */
export function validateTransformedTournament(tournament: any): boolean {
  return Boolean(
    tournament.vis_tournament_no &&
    tournament.tournament_code &&
    tournament.name
  );
}

export function validateTransformedMatch(match: any): boolean {
  return Boolean(
    match.vis_match_no &&
    match.tournament_code &&
    match.team_a_name &&
    match.team_b_name
  );
}

export function validateTransformedReferee(referee: any): boolean {
  return Boolean(
    referee.referee_id &&
    referee.vis_referee_no
  );
}