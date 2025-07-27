import type { Match } from '@/types/tournament.types';

export function formatTeamName(team: Match['teams']['team1'] | Match['teams']['team2']): string {
  if (!team.player2) {
    return team.player1;
  }
  return `${team.player1} / ${team.player2}`;
}

export function formatMatchScore(match: Match): string {
  if (!match.score || (!match.score.set1 && !match.score.set2 && !match.score.set3)) {
    return '-';
  }

  const sets: string[] = [];
  
  if (match.score.set1) {
    sets.push(`${match.score.set1.team1}-${match.score.set1.team2}`);
  }
  if (match.score.set2) {
    sets.push(`${match.score.set2.team1}-${match.score.set2.team2}`);
  }
  if (match.score.set3) {
    sets.push(`${match.score.set3.team1}-${match.score.set3.team2}`);
  }

  return sets.join(', ');
}

export function getMatchStatusColor(status: Match['status']): string {
  switch (status) {
    case 'Scheduled':
      return 'text-blue-600';
    case 'Live':
      return 'text-green-600';
    case 'Completed':
      return 'text-gray-600';
    case 'Postponed':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

export function getMatchStatusVariant(status: Match['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Scheduled':
      return 'default';
    case 'Live':
      return 'default'; // Will be styled with custom green variant
    case 'Completed':
      return 'secondary';
    case 'Postponed':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function formatMatchTime(match: Match): string {
  const time = match.actualStartTime || match.scheduledTime;
  return time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function formatMatchDate(match: Match): string {
  const date = match.actualStartTime || match.scheduledTime;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

export function getWinnerName(match: Match): string | null {
  if (!match.winner || match.status !== 'Completed') {
    return null;
  }
  
  const winningTeam = match.winner === 'team1' ? match.teams.team1 : match.teams.team2;
  return formatTeamName(winningTeam);
}

export function formatMatchDuration(duration?: number): string {
  if (!duration) return '-';
  
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}