import { useState, useCallback, useEffect } from 'react';

export interface UseDateNavigationProps {
  matches: Array<{
    Date?: string;
    LocalDate?: string;
    MatchDate?: string;
    StartDate?: string;
  }>;
  autoSelectLatest?: boolean;
}

export const useDateNavigation = ({ 
  matches, 
  autoSelectLatest = true 
}: UseDateNavigationProps) => {
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Get available dates from matches, sorted oldest to newest
  const getAvailableDates = useCallback(() => {
    if (!matches || !Array.isArray(matches)) {
      // console.log('🗓️ useDateNavigation - matches is invalid:', matches);
      return [];
    }

    const allDates = matches.map(match => 
      match.Date || match.LocalDate || match.MatchDate || match.StartDate
    ).filter(Boolean);
    
    const sortedDates = [...new Set(allDates)].sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    // console.log('🗓️ useDateNavigation - Available dates (oldest to newest):', sortedDates);
    return sortedDates;
  }, [matches]);

  const availableDates = getAvailableDates();

  // Auto-select the most recent date when matches change
  useEffect(() => {
    if (autoSelectLatest && availableDates.length > 0 && !selectedDate) {
      const defaultDate = availableDates[availableDates.length - 1]; // Last day (most recent)
      // console.log('🗓️ useDateNavigation - Setting default to most recent date:', defaultDate);
      setSelectedDate(defaultDate);
    }
  }, [availableDates, selectedDate, autoSelectLatest]);

  // Get matches for selected date
  const getMatchesForDate = useCallback((date: string) => {
    if (!matches || !Array.isArray(matches)) return [];
    if (!date) return matches;
    
    return matches.filter(match => {
      const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
      return matchDate === date;
    });
  }, [matches]);

  // Format date for display
  const formatMatchDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }, []);

  // Get match count for a specific date
  const getMatchCountForDate = useCallback((date: string) => {
    return getMatchesForDate(date).length;
  }, [getMatchesForDate]);

  return {
    selectedDate,
    setSelectedDate,
    availableDates,
    getMatchesForDate,
    formatMatchDate,
    getMatchCountForDate,
    matchesForSelectedDate: getMatchesForDate(selectedDate)
  };
};

export default useDateNavigation;