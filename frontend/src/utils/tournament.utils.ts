import type { Tournament } from '@/types/tournament.types';

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/**
 * Get the appropriate badge variant for a tournament status
 */
export function getStatusVariant(status: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  switch (status.toLowerCase()) {
    case 'live':
      return 'destructive';
    case 'completed':
      return 'secondary';
    case 'cancelled':
      return 'outline';
    default:
      return 'default';
  }
}

/**
 * Transform tournament data for card display
 */
export function transformTournamentForCard(tournament: Tournament) {
  return {
    id: tournament.id,
    name: tournament.name,
    description: `${tournament.level} • ${tournament.surface} • ${tournament.gender}`,
    status: tournament.status.toLowerCase() as 'upcoming' | 'live' | 'completed',
    startDate: tournament.dates.start.toISOString(),
    endDate: tournament.dates.end.toISOString(),
    location: `${tournament.location.city}, ${tournament.location.country}`,
    participantCount: tournament.matchCount,
    category: `${tournament.level} - ${tournament.gender}`
  };
}

/**
 * Sort tournaments by field and direction
 */
export function sortTournaments(
  tournaments: Tournament[], 
  field: keyof Tournament | 'dates', 
  direction: 'asc' | 'desc'
): Tournament[] {
  return [...tournaments].sort((a, b) => {
    let aValue: unknown;
    let bValue: unknown;

    if (field === 'dates') {
      aValue = a.dates.start;
      bValue = b.dates.start;
    } else {
      aValue = a[field];
      bValue = b[field];
    }

    // Handle different data types
    if (aValue instanceof Date && bValue instanceof Date) {
      return direction === 'asc' 
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return direction === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });
}