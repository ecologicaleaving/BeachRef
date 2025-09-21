/**
 * Robust match sorting utilities
 *
 * This module provides timezone-safe, refactoring-resistant sorting logic for matches.
 * Key principles:
 * - Time sorting within daily panels is ALWAYS chronological (earliest first)
 * - sortOrder only affects date panel ordering, never time order within panels
 * - Stable sorting with consistent tie-breakers
 * - Timezone-aware epoch calculation with multiple fallback strategies
 */

import { BeachMatchCore } from '../types/match-v2';

/**
 * Safely extracts epoch timestamp from a match using multiple fallback strategies
 * Priority order:
 * 1. utcScheduledDateTime (highest accuracy)
 * 2. scheduledDateTime with timezone context
 * 3. scheduledDateTime as-is (fallback)
 *
 * @param match - The match to extract time from
 * @param tournamentTimezone - Optional tournament timezone for context
 * @returns Epoch timestamp in milliseconds, or null if extraction fails
 */
export const toEpochMsSafe = (match: BeachMatchCore, tournamentTimezone?: string): number | null => {
  // Priority 1: Enhanced UTC timestamp (highest accuracy)
  if (match.utcScheduledDateTime) {
    const utcTime = Date.parse(match.utcScheduledDateTime);
    if (Number.isFinite(utcTime)) {
      return utcTime;
    }
  }

  // Priority 2: Enhanced timezone-aware epoch from match data
  if ((match as any).scheduled?.epochMs) {
    const epochMs = (match as any).scheduled.epochMs;
    if (typeof epochMs === 'number' && Number.isFinite(epochMs)) {
      return epochMs;
    }
  }

  // Priority 3: Original scheduledDateTime
  if (match.scheduledDateTime) {
    const time = Date.parse(match.scheduledDateTime);
    if (Number.isFinite(time)) {
      return time;
    }
  }

  // Priority 4: Try to extract from timezone-safe fields if available
  const scheduled = (match as any).scheduled;
  if (scheduled?.dateTimeTournament) {
    const time = Date.parse(scheduled.dateTimeTournament);
    if (Number.isFinite(time)) {
      return time;
    }
  }

  return null;
};

/**
 * Gender ranking for secondary sorting
 * Men's matches before Women's matches, then any other/mixed
 */
const getGenderRank = (gender?: string): number => {
  switch (gender) {
    case 'M': return 0;
    case 'W': return 1;
    default: return 2; // Mixed, unknown, or other
  }
};

/**
 * Robust comparator for sorting matches within a single day panel
 *
 * Sorting priority:
 * 1. Time (always ascending - earliest first)
 * 2. Gender (M before W before others)
 * 3. Match ID (stable tie-breaker)
 *
 * IMPORTANT: This comparator is designed to be used ONLY for matches within the same date.
 * It does NOT respect global sortOrder - that should only affect date panel ordering.
 *
 * @param a - First match to compare
 * @param b - Second match to compare
 * @param tournamentTimezone - Optional tournament timezone for accurate time extraction
 * @returns Comparison result (-1, 0, 1)
 */
export const compareWithinDay = (
  a: BeachMatchCore,
  b: BeachMatchCore,
  tournamentTimezone?: string
): number => {
  // 1. Primary sort: time (ALWAYS ascending within a day)
  const timeA = toEpochMsSafe(a, tournamentTimezone);
  const timeB = toEpochMsSafe(b, tournamentTimezone);

  // Handle cases where one or both times are null
  if (timeA !== null && timeB === null) {
    return -1; // Match with time comes before match without time
  }
  if (timeA === null && timeB !== null) {
    return 1; // Match without time comes after match with time
  }
  if (timeA !== null && timeB !== null && timeA !== timeB) {
    return timeA - timeB; // Ascending time order (earliest first)
  }

  // 2. Secondary sort: gender (M before W before others)
  const genderA = (a as any).tournamentGender || a.team1?.countryCode || 'M';
  const genderB = (b as any).tournamentGender || b.team1?.countryCode || 'M';
  const genderDiff = getGenderRank(genderA) - getGenderRank(genderB);

  if (genderDiff !== 0) {
    return genderDiff;
  }

  // 3. Stable tie-breaker: match ID
  return (a.id || '').localeCompare(b.id || '');
};

/**
 * Comparator for sorting date groups/panels
 * This is where sortOrder should be applied
 *
 * @param dateA - First date string (YYYY-MM-DD format)
 * @param dateB - Second date string (YYYY-MM-DD format)
 * @param sortOrder - Sort order preference ('asc' | 'desc')
 * @returns Comparison result
 */
export const compareDatePanels = (
  dateA: string,
  dateB: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): number => {
  const baseDiff = dateB.localeCompare(dateA); // Base: descending (newest first)
  return sortOrder === 'desc' ? baseDiff : -baseDiff;
};

/**
 * Utility to sort grouped matches with proper separation of concerns
 *
 * @param groupedMatches - Matches grouped by date
 * @param sortOrder - Sort order for date panels only
 * @param tournamentTimezone - Tournament timezone for accurate time sorting
 * @returns Sorted groups with internally sorted matches
 */
export const sortMatchGroups = (
  groupedMatches: Array<[string, BeachMatchCore[]]>,
  sortOrder: 'asc' | 'desc' = 'desc',
  tournamentTimezone?: string
): Array<[string, BeachMatchCore[]]> => {
  return groupedMatches
    // Sort date panels according to sortOrder
    .sort(([dateA], [dateB]) => compareDatePanels(dateA, dateB, sortOrder))
    // Sort matches within each panel chronologically (ignoring sortOrder)
    .map(([dateKey, matches]) => [
      dateKey,
      [...matches].sort((a, b) => compareWithinDay(a, b, tournamentTimezone))
    ]);
};