/**
 * Match Time Formatter
 * Clean, modern formatter using the new timezone conversion system
 * Replaces the complex timezone handling in dateFormatters.ts
 */

import {
  convertMatchTimeToUserTime,
  getTimezoneConversionMethod,
  VisBeachMatchData,
  TournamentData
} from './timezoneUtils';

/**
 * Options for match time formatting
 */
export interface MatchTimeFormatOptions {
  /** Show timezone indicator (e.g., "My Time", "Local Time") */
  showTimezoneIndicator?: boolean;
  /** User's timezone override (defaults to browser timezone) */
  userTimezone?: string;
  /** Show reliability indicator for uncertain conversions */
  showReliabilityIndicator?: boolean;
  /** Tournament data for timezone detection */
  tournamentData?: TournamentData;
}

/**
 * Format match time for display in the UI
 * This is the main function to use for displaying "My Time" in components
 *
 * @param matchData - VIS API match data containing time fields
 * @param options - Formatting options
 * @returns Formatted time string for display
 */
export function formatMatchTimeForUser(
  matchData: VisBeachMatchData,
  options: MatchTimeFormatOptions = {}
): string {
  const {
    showTimezoneIndicator = false,
    showReliabilityIndicator = false,
    userTimezone,
    tournamentData
  } = options;

  // Get the conversion result with metadata
  const result = convertMatchTimeToUserTime(matchData, tournamentData, userTimezone);

  // Base formatted time
  let formattedTime = result.userDateTime;

  // Add timezone indicator if requested - show as (HH:mm) format
  if (showTimezoneIndicator) {
    formattedTime = `(${result.userDateTime})`;
  }

  // Add reliability indicator if requested and conversion is unreliable
  if (showReliabilityIndicator && !result.reliable) {
    formattedTime += ' ⚠️';
  }

  return formattedTime;
}

/**
 * Format match time with full timezone information for debugging/admin views
 *
 * @param matchData - VIS API match data
 * @param options - Formatting options
 * @returns Detailed time information
 */
export function formatMatchTimeDetailed(
  matchData: VisBeachMatchData,
  options: MatchTimeFormatOptions = {}
): {
  userTime: string;
  utcTime: string;
  conversionMethod: string;
  reliable: boolean;
  sourceFields: string[];
  timezoneDetection?: string;
} {
  const result = convertMatchTimeToUserTime(matchData, options.tournamentData, options.userTimezone);

  return {
    userTime: result.userDateTime,
    utcTime: result.utcDateTime,
    conversionMethod: getTimezoneConversionMethod(matchData, options.tournamentData),
    reliable: result.reliable,
    sourceFields: result.sourceFields,
    timezoneDetection: result.timezoneDetection
      ? `${result.timezoneDetection.timezone} (${result.timezoneDetection.confidence})`
      : undefined
  };
}

/**
 * Format match date for display
 * Handles date conversion from tournament timezone to user timezone
 *
 * @param matchData - VIS API match data
 * @param options - Formatting options
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function formatMatchDateForUser(
  matchData: VisBeachMatchData,
  options: MatchTimeFormatOptions = {}
): string {
  const result = convertMatchTimeToUserTime(matchData, options.tournamentData, options.userTimezone);

  try {
    // Parse the UTC datetime and convert to user timezone
    const utcDateTime = new Date(result.utcDateTime);
    const userTimezone = options.userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Format in user's timezone
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(utcDateTime);

  } catch (error) {
    console.warn('Error formatting match date:', error);
    return matchData.LocalDate || new Date().toISOString().split('T')[0];
  }
}

/**
 * Format match datetime for display (both date and time)
 *
 * @param matchData - VIS API match data
 * @param options - Formatting options
 * @returns Formatted datetime string
 */
export function formatMatchDateTimeForUser(
  matchData: VisBeachMatchData,
  options: MatchTimeFormatOptions = {}
): string {
  const date = formatMatchDateForUser(matchData, options);
  const time = formatMatchTimeForUser(matchData, options);

  return `${date} ${time}`;
}

/**
 * Check if match is today in user's timezone
 *
 * @param matchData - VIS API match data
 * @param options - Formatting options
 * @returns True if match date is today in user's timezone
 */
export function isMatchToday(
  matchData: VisBeachMatchData,
  options: MatchTimeFormatOptions = {}
): boolean {
  const matchDate = formatMatchDateForUser(matchData, options);
  const today = new Date();
  const userTimezone = options.userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const todayFormatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(today);

  return matchDate === todayFormatted;
}

/**
 * Get match time in specific timezone (for multi-timezone displays)
 *
 * @param matchData - VIS API match data
 * @param targetTimezone - Target timezone (e.g., 'Europe/Rome', 'America/New_York')
 * @param options - Formatting options
 * @returns Time in target timezone
 */
export function formatMatchTimeInTimezone(
  matchData: VisBeachMatchData,
  targetTimezone: string,
  options: MatchTimeFormatOptions = {}
): string {
  const result = convertMatchTimeToUserTime(matchData, options.tournamentData, targetTimezone);
  return result.userDateTime;
}

/**
 * Legacy compatibility function - matches the signature of formatTimeWithTimezoneSync
 * Use this to replace existing calls without changing the interface
 *
 * @deprecated Use formatMatchTimeForUser instead
 */
export function formatTimeWithTimezoneSync(
  utcDate: Date | string,
  options: {
    tournamentTimezone?: string;
    showTimezoneIndicator?: boolean;
    cachedPreference?: 'user' | 'local';
    countryCode?: string;
    city?: string;
    tournamentName?: string;
  } = {}
): string {
  // Convert legacy parameters to new format
  const matchData: VisBeachMatchData = {};
  const tournamentData: TournamentData = {};

  // Handle the utcDate parameter
  if (typeof utcDate === 'string') {
    // Assume it's an ISO string that might be in tournament local time
    const dateTimeMatch = utcDate.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)/);
    if (dateTimeMatch) {
      matchData.LocalDate = dateTimeMatch[1];
      matchData.LocalTime = dateTimeMatch[2];
    }
  } else {
    // Convert Date to LocalDate/LocalTime
    matchData.LocalDate = utcDate.toISOString().split('T')[0];
    matchData.LocalTime = utcDate.toTimeString().split(' ')[0].substring(0, 5);
  }

  // Map legacy options
  if (options.countryCode) tournamentData.countryCode = options.countryCode;
  if (options.city) tournamentData.city = options.city;
  if (options.tournamentName) tournamentData.name = options.tournamentName;
  if (options.tournamentTimezone) tournamentData.defaultTimeZone = options.tournamentTimezone;

  // Use new formatter
  return formatMatchTimeForUser(matchData, {
    showTimezoneIndicator: options.showTimezoneIndicator,
    tournamentData
  });
}