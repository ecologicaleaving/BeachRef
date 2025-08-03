/**
 * Temporal tournament filtering utilities for Story 5.2
 * Provides date-based filtering and categorization for tournament dashboard reorganization
 */

import { Tournament } from '@/lib/types';

export interface TournamentTemporalStatus {
  status: 'active' | 'upcoming' | 'past';
  daysFromNow: number;
  displayText: string;
  priority: number;
}

export interface TemporalTournamentGroups {
  active: Tournament[];
  upcoming: Tournament[];
  past: Tournament[];
  total: Tournament[];
}

/**
 * Calculate temporal status for a tournament based on current date
 */
export function calculateTournamentTemporalStatus(
  tournament: Tournament, 
  currentDate: Date = new Date()
): TournamentTemporalStatus {
  const startDate = new Date(tournament.startDate);
  const endDate = new Date(tournament.endDate);
  
  // Normalize dates to midnight for consistent day calculations
  const normalizedCurrent = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  
  const now = normalizedCurrent.getTime();
  
  // Calculate days difference from start date
  const daysDiff = Math.floor((normalizedStart.getTime() - now) / (1000 * 60 * 60 * 24));
  
  // Active tournament (currently happening)
  if (now >= normalizedStart.getTime() && now <= normalizedEnd.getTime()) {
    const daysRemaining = Math.floor((normalizedEnd.getTime() - now) / (1000 * 60 * 60 * 24));
    return {
      status: 'active',
      daysFromNow: 0,
      displayText: daysRemaining === 0 ? 'Ends today' : daysRemaining === 1 ? 'Ends tomorrow' : `${daysRemaining} days left`,
      priority: 1
    };
  }
  
  // Upcoming tournament
  if (now < normalizedStart.getTime()) {
    return {
      status: 'upcoming',
      daysFromNow: daysDiff,
      displayText: daysDiff === 0 ? 'Starts today' : daysDiff === 1 ? 'Starts tomorrow' : `Starts in ${daysDiff} days`,
      priority: 2
    };
  }
  
  // Past tournament  
  const daysAgo = Math.abs(daysDiff);
  const endDaysDiff = Math.floor((now - normalizedEnd.getTime()) / (1000 * 60 * 60 * 24));
  return {
    status: 'past',
    daysFromNow: daysDiff,
    displayText: endDaysDiff === 0 ? 'Ended today' : endDaysDiff === 1 ? 'Ended yesterday' : `Ended ${endDaysDiff} days ago`,
    priority: 3
  };
}

/**
 * Filter tournaments by timeline range (±N tournaments from current date)
 */
export function filterTournamentsByTimelineRange(
  tournaments: Tournament[],
  currentDate: Date = new Date(),
  range: number = 20
): TemporalTournamentGroups {
  // Add temporal status to all tournaments
  const tournamentsWithStatus = tournaments.map(tournament => ({
    ...tournament,
    temporalStatus: calculateTournamentTemporalStatus(tournament, currentDate)
  }));
  
  // Separate by status
  const active = tournamentsWithStatus.filter(t => t.temporalStatus.status === 'active');
  const upcoming = tournamentsWithStatus
    .filter(t => t.temporalStatus.status === 'upcoming')
    .sort((a, b) => a.temporalStatus.daysFromNow - b.temporalStatus.daysFromNow)
    .slice(0, range);
  const past = tournamentsWithStatus
    .filter(t => t.temporalStatus.status === 'past')
    .sort((a, b) => Math.abs(a.temporalStatus.daysFromNow) - Math.abs(b.temporalStatus.daysFromNow))
    .slice(0, range);
  
  // Remove temporalStatus before returning (keep original Tournament type)
  const cleanTournaments = (tournaments: (Tournament & { temporalStatus: TournamentTemporalStatus })[]): Tournament[] => 
    tournaments.map(({ temporalStatus, ...tournament }) => tournament);
  
  return {
    active: cleanTournaments(active),
    upcoming: cleanTournaments(upcoming),
    past: cleanTournaments(past),
    total: cleanTournaments([...active, ...upcoming, ...past])
  };
}

/**
 * Get tournaments within a specific date range
 */
export function getTournamentsInDateRange(
  tournaments: Tournament[],
  startDate: Date,
  endDate: Date
): Tournament[] {
  return tournaments.filter(tournament => {
    const tournamentStart = new Date(tournament.startDate);
    const tournamentEnd = new Date(tournament.endDate);
    
    // Tournament overlaps with the date range
    return (
      (tournamentStart >= startDate && tournamentStart <= endDate) ||
      (tournamentEnd >= startDate && tournamentEnd <= endDate) ||
      (tournamentStart <= startDate && tournamentEnd >= endDate)
    );
  });
}

/**
 * Get active tournaments (currently happening)
 */
export function getActiveTournaments(
  tournaments: Tournament[],
  currentDate: Date = new Date()
): Tournament[] {
  return tournaments.filter(tournament => {
    const startDate = new Date(tournament.startDate);
    const endDate = new Date(tournament.endDate);
    
    // Normalize dates for consistent day-based comparisons
    const normalizedCurrent = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    const now = normalizedCurrent.getTime();
    
    return now >= normalizedStart.getTime() && now <= normalizedEnd.getTime();
  });
}

/**
 * Sort tournaments by temporal relevance (active > upcoming by proximity > past by recency)
 */
export function sortTournamentsByTemporalRelevance(
  tournaments: Tournament[],
  currentDate: Date = new Date()
): Tournament[] {
  return tournaments
    .map(tournament => ({
      ...tournament,
      temporalStatus: calculateTournamentTemporalStatus(tournament, currentDate)
    }))
    .sort((a, b) => {
      // Sort by priority first (active=1, upcoming=2, past=3)
      if (a.temporalStatus.priority !== b.temporalStatus.priority) {
        return a.temporalStatus.priority - b.temporalStatus.priority;
      }
      
      // Within same priority, sort by proximity to current date
      return Math.abs(a.temporalStatus.daysFromNow) - Math.abs(b.temporalStatus.daysFromNow);
    })
    .map(({ temporalStatus, ...tournament }) => tournament);
}

/**
 * Calculate date range for timeline navigation
 */
export function calculateTimelineRange(
  currentDate: Date = new Date(),
  daysBefore: number = 30,
  daysAfter: number = 30
): { startDate: Date; endDate: Date } {
  const startDate = new Date(currentDate);
  startDate.setDate(startDate.getDate() - daysBefore);
  
  const endDate = new Date(currentDate);
  endDate.setDate(endDate.getDate() + daysAfter);
  
  return { startDate, endDate };
}

/**
 * Format temporal status text for display
 */
export function formatTemporalDisplay(
  tournament: Tournament,
  currentDate: Date = new Date()
): string {
  const status = calculateTournamentTemporalStatus(tournament, currentDate);
  return status.displayText;
}

/**
 * Check if a tournament is happening within the next N days
 */
export function isTournamentUpcoming(
  tournament: Tournament,
  withinDays: number = 7,
  currentDate: Date = new Date()
): boolean {
  const status = calculateTournamentTemporalStatus(tournament, currentDate);
  return status.status === 'upcoming' && status.daysFromNow <= withinDays;
}

/**
 * Check if a tournament ended within the last N days
 */
export function isTournamentRecentlyCompleted(
  tournament: Tournament,
  withinDays: number = 7,
  currentDate: Date = new Date()
): boolean {
  const status = calculateTournamentTemporalStatus(tournament, currentDate);
  return status.status === 'past' && Math.abs(status.daysFromNow) <= withinDays;
}