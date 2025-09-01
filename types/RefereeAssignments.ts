export interface RefereeAssignment {
  matchNo: string;
  tournamentNo: string;
  matchInTournament: string;
  teamAName: string;
  teamBName: string;
  localDate: Date;
  localTime: string;
  court: string;
  status: 'Scheduled' | 'Running' | 'Finished' | 'Cancelled';
  round: string;
  roundPhase?: string;
  refereeRole: 'referee1' | 'referee2';
}

export interface RefereeAssignmentStatus {
  current: RefereeAssignment[];
  upcoming: RefereeAssignment[];
  completed: RefereeAssignment[];
  cancelled: RefereeAssignment[];
}

export interface RefereeProfile {
  name: string;
  id?: string;
  federationCode?: string;
}