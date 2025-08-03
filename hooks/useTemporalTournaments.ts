/**
 * Custom hook for temporal tournament management
 * Story 5.2 - Tournament Dashboard Temporal Filtering Foundation
 */

import { useState, useEffect, useMemo } from 'react';
import { Tournament } from '@/lib/types';
import { 
  filterTournamentsByTimelineRange,
  getActiveTournaments,
  calculateTournamentTemporalStatus,
  TemporalTournamentGroups
} from '@/utils/temporal-filtering';

interface UseTemporalTournamentsProps {
  tournaments: Tournament[];
  currentDate?: Date;
  range?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseTemporalTournamentsReturn {
  temporalGroups: TemporalTournamentGroups;
  activeTournaments: Tournament[];
  isLoading: boolean;
  currentDate: Date;
  range: number;
  setRange: (range: number) => void;
  setCurrentDate: (date: Date) => void;
  refreshData: () => void;
  totalCount: {
    active: number;
    upcoming: number;
    past: number;
    total: number;
  };
}

/**
 * Custom hook for managing temporal tournament filtering and display
 */
export function useTemporalTournaments({
  tournaments,
  currentDate: initialDate = new Date(),
  range: initialRange = 20,
  autoRefresh = false,
  refreshInterval = 60000 // 1 minute
}: UseTemporalTournamentsProps): UseTemporalTournamentsReturn {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [range, setRange] = useState<number>(initialRange);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Auto-refresh current date if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Calculate temporal groups
  const temporalGroups = useMemo(() => {
    setIsLoading(true);
    
    try {
      const groups = filterTournamentsByTimelineRange(tournaments, currentDate, range);
      setIsLoading(false);
      return groups;
    } catch (error) {
      console.error('Error filtering tournaments by timeline:', error);
      setIsLoading(false);
      return {
        active: [],
        upcoming: [],
        past: [],
        total: []
      };
    }
  }, [tournaments, currentDate, range]);

  // Get active tournaments separately for prominent display
  const activeTournaments = useMemo(() => {
    return getActiveTournaments(tournaments, currentDate);
  }, [tournaments, currentDate]);

  // Calculate counts
  const totalCount = useMemo(() => ({
    active: temporalGroups.active.length,
    upcoming: temporalGroups.upcoming.length,
    past: temporalGroups.past.length,
    total: temporalGroups.total.length
  }), [temporalGroups]);

  // Refresh data function
  const refreshData = () => {
    setCurrentDate(new Date());
  };

  return {
    temporalGroups,
    activeTournaments,
    isLoading,
    currentDate,
    range,
    setRange,
    setCurrentDate,
    refreshData,
    totalCount
  };
}

/**
 * Hook for getting tournament temporal status
 */
export function useTournamentTemporalStatus(
  tournament: Tournament,
  currentDate: Date = new Date()
) {
  return useMemo(() => {
    return calculateTournamentTemporalStatus(tournament, currentDate);
  }, [tournament, currentDate]);
}

/**
 * Hook for managing timeline navigation state
 */
export function useTimelineNavigation(initialRange: number = 20) {
  const [range, setRange] = useState(initialRange);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'timeline' | 'year' | 'all'>('timeline');

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const adjustRange = (newRange: number) => {
    setRange(Math.max(1, Math.min(100, newRange))); // Clamp between 1-100
  };

  return {
    range,
    currentDate,
    viewMode,
    setRange: adjustRange,
    setCurrentDate,
    setViewMode,
    goToToday
  };
}