import { BeachMatch } from '../types/match';

export interface ProcessedMatch extends BeachMatch {
  tournamentGender?: string;
  tournamentNo?: string;
  tournamentCode?: string;
  tournamentCountry?: string;
  sourceType?: 'original' | 'opposite_gender';
  sourceTournament?: string;
}

const extractGenderFromCode = (code: string): string => {
  if (code.toUpperCase().startsWith('W')) return 'Women';
  if (code.toUpperCase().startsWith('M')) return 'Men';
  return 'Mixed';
};

export class MatchProcessingService {
  /**
   * Get unique dates from matches with multiple fallback fields
   */
  static getUniqueDates(matches: BeachMatch[]): string[] {
    const dates = matches.map(match => 
      match.Date || match.LocalDate || match.MatchDate || match.StartDate
    ).filter(Boolean);
    
    return [...new Set(dates)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }

  /**
   * Sort matches by time in ascending order (earliest first)
   */
  static sortMatchesByTime(matches: BeachMatch[]): BeachMatch[] {
    return [...matches].sort((a, b) => {
      const timeA = a.LocalTime || a.Time || '00:00';
      const timeB = b.LocalTime || b.Time || '00:00';
      
      // Convert time strings (HH:MM) to comparable numbers
      const getTimeNumber = (timeStr: string) => {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0] || '0', 10);
        const minutes = parseInt(parts[1] || '0', 10);
        return hours * 60 + minutes; // Total minutes from midnight
      };
      
      return getTimeNumber(timeA) - getTimeNumber(timeB);
    });
  }

  /**
   * Filter matches by selected date
   */
  static filterMatchesByDate(matches: BeachMatch[], selectedDate: string): BeachMatch[] {
    return matches.filter(match => {
      const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
      return matchDate === selectedDate;
    });
  }

  /**
   * Filter matches by court
   */
  static filterMatchesByCourt(matches: BeachMatch[], selectedCourt: string): BeachMatch[] {
    if (selectedCourt === 'All Courts') {
      return matches;
    }
    return matches.filter(match => match.Court === selectedCourt);
  }

  /**
   * Get unique courts from matches
   */
  static getUniqueCourts(matches: BeachMatch[]): string[] {
    const courts = matches
      .map(match => match.Court)
      .filter(Boolean)
      .filter(court => court.trim() !== '');
    
    return [...new Set(courts)].sort();
  }

  /**
   * Add metadata to matches for tournament context
   */
  static addTournamentMetadata(
    matches: BeachMatch[], 
    tournamentNo: string, 
    tournamentCode?: string, 
    tournamentCountry?: string,
    sourceType: 'original' | 'opposite_gender' = 'original'
  ): ProcessedMatch[] {
    const gender = tournamentCode ? extractGenderFromCode(tournamentCode) : 'Unknown';
    
    return matches.map(match => ({
      ...match,
      tournamentGender: gender,
      tournamentNo,
      tournamentCode,
      tournamentCountry,
      sourceType,
      sourceTournament: tournamentNo,
    }));
  }

  /**
   * Find matches where a specific referee is assigned
   */
  static findRefereeMatches(matches: BeachMatch[], refereeName: string): BeachMatch[] {
    return matches.filter(match => {
      const referee1Match = match.Referee1 && match.Referee1.includes(refereeName);
      const referee2Match = match.Referee2 && match.Referee2.includes(refereeName);
      const generalRefereeMatch = match.Referee && match.Referee.includes(refereeName);
      const referee1NameMatch = match.Referee1Name && match.Referee1Name.includes(refereeName);
      const referee2NameMatch = match.Referee2Name && match.Referee2Name.includes(refereeName);
      
      return referee1Match || referee2Match || generalRefereeMatch || 
             referee1NameMatch || referee2NameMatch;
    });
  }

  /**
   * Extract unique referees from matches
   */
  static extractReferees(matches: BeachMatch[]): {
    No: string;
    Name: string;
    FederationCode?: string;
  }[] {
    const refereeMap = new Map<string, {
      No: string;
      Name: string;
      FederationCode?: string;
    }>();
    
    matches.forEach(match => {
      // Add Referee 1 if present
      if (match.NoReferee1 && match.Referee1Name) {
        refereeMap.set(match.NoReferee1, {
          No: match.NoReferee1,
          Name: match.Referee1Name,
          FederationCode: match.Referee1FederationCode,
        });
      }
      
      // Add Referee 2 if present
      if (match.NoReferee2 && match.Referee2Name) {
        refereeMap.set(match.NoReferee2, {
          No: match.NoReferee2,
          Name: match.Referee2Name,
          FederationCode: match.Referee2FederationCode,
        });
      }
    });
    
    return Array.from(refereeMap.values()).sort((a, b) => a.Name.localeCompare(b.Name));
  }

  /**
   * Get the default date (last day of tournament)
   */
  static getDefaultDate(matches: BeachMatch[]): string | null {
    const dates = this.getUniqueDates(matches);
    return dates.length > 0 ? dates[dates.length - 1] : null;
  }

  /**
   * Combine matches from multiple tournaments
   */
  static combineMatches(...matchArrays: BeachMatch[][]): BeachMatch[] {
    return matchArrays.flat();
  }

  /**
   * Format match time for display
   */
  static formatMatchTime(time?: string): string {
    if (!time) return 'TBD';
    return time;
  }

  /**
   * Format match date for display
   */
  static formatMatchDate(dateStr: string): string {
    if (!dateStr) return 'Unknown Date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  /**
   * Check if a match has winner information
   */
  static hasMatchResult(match: BeachMatch): boolean {
    const scoreA = parseInt(match.MatchPointsA || '0');
    const scoreB = parseInt(match.MatchPointsB || '0');
    return scoreA > 0 || scoreB > 0;
  }

  /**
   * Get match winner information
   */
  static getMatchWinner(match: BeachMatch): {
    teamAWon: boolean;
    teamBWon: boolean;
    isDraw: boolean;
  } {
    const scoreA = parseInt(match.MatchPointsA || '0');
    const scoreB = parseInt(match.MatchPointsB || '0');
    
    return {
      teamAWon: scoreA > scoreB,
      teamBWon: scoreB > scoreA,
      isDraw: scoreA === scoreB && scoreA > 0,
    };
  }
}