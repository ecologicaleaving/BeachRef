/**
 * Timezone Conversion Utilities
 * Proper handling of VIS API LocalDate/LocalTime → UTC → User Time
 * Based on FIVB VIS API specification and tournament location data
 */

import { DateTime } from 'luxon';
import {
  calculateMyTime,
  TournamentLocation,
  TimezoneDetectionResult
} from './tournamentTimezoneMapping';

/**
 * VIS API BeachMatch data structure with timezone fields
 */
export interface VisBeachMatchData {
  LocalDate?: string;           // Tournament local date (YYYY-MM-DD)
  LocalTime?: string;           // Tournament local time (HH:mm or HH:mm:ss)
  scheduledDateTime?: string;   // Combined local date and time (ISO format in tournament timezone)
  LocalTimeOffset?: string;     // Timezone offset (e.g., "+03:00")
  TimeZone?: string;           // Timezone identifier
  UtcDate?: string;            // UTC date if available
  UtcTime?: string;            // UTC time if available
  BeginDateTimeUtc?: string;   // UTC datetime if available
  EndDateTimeUtc?: string;     // UTC end datetime if available
  tournamentName?: string;     // Tournament name for heuristics
  tournamentCity?: string;     // Tournament city
  tournamentCountry?: string;  // Tournament country
  tournamentCountryCode?: string; // Tournament country code
  tournamentVenue?: string;    // Tournament venue
}

/**
 * Tournament data from event/tournament API calls
 */
export interface TournamentData {
  name?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  venue?: string;
  defaultTimeZone?: string;
}

/**
 * Result of timezone conversion with metadata
 */
export interface TimezoneConversionResult {
  /** Final UTC ISO string */
  utcDateTime: string;
  /** User's local time formatted as HH:mm */
  userDateTime: string;
  /** Raw conversion method used */
  conversionMethod: 'utc_direct' | 'local_with_offset' | 'local_with_timezone' | 'local_detected';
  /** Timezone detection result if location-based detection was used */
  timezoneDetection?: TimezoneDetectionResult;
  /** Source data fields that were used */
  sourceFields: string[];
  /** Whether the conversion is considered reliable */
  reliable: boolean;
  /** Debug information */
  debug?: {
    originalLocalDate?: string;
    originalLocalTime?: string;
    detectedTimezone?: string;
    userTimezone?: string;
    fallbackReason?: string;
  };
}

/**
 * Convert VIS API match time data to user's local time
 * Implements the priority order specified in your requirements:
 * 1. Use UTC fields if available (BeginDateTimeUtc, UtcDate+UtcTime)
 * 2. Convert LocalDate+LocalTime using tournament location → timezone detection
 * 3. Fallback to LocalTimeOffset if available
 * 4. Fallback to treating as UTC (least reliable)
 *
 * @param matchData - VIS API match data
 * @param tournamentData - Tournament location data (optional)
 * @param userTimezone - User's timezone (optional, defaults to browser timezone)
 * @returns Conversion result with user time and metadata
 */
export function convertMatchTimeToUserTime(
  matchData: VisBeachMatchData,
  tournamentData?: TournamentData,
  userTimezone?: string
): TimezoneConversionResult {
  const userTz = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  console.log('🕐 TIMEZONE CONVERSION START');
  console.log('📥 Input Data:');
  console.log('  📊 matchData:', matchData);
  console.log('  🏟️ tournamentData:', tournamentData);
  console.log('  🌍 userTimezone:', userTz);
  console.log('  📍 Call stack:', new Error().stack?.split('\n')[2]?.trim());


  // Build tournament location data from various sources
  const location: TournamentLocation = {
    city: matchData.tournamentCity || tournamentData?.city || '',
    country: matchData.tournamentCountry || tournamentData?.country || '',
    countryCode: matchData.tournamentCountryCode || tournamentData?.countryCode || '',
    venue: matchData.tournamentVenue || tournamentData?.venue || '',
    name: matchData.tournamentName || tournamentData?.name || ''
  };

  console.log('🗺️ Tournament Location Built:', location);

  // Method 1: Use LocalDate + LocalTime with tournament location-based timezone detection
  if (matchData.LocalDate && matchData.LocalTime) {
    console.log('🕐 Method 1: Using LocalDate + LocalTime');
    console.log('📅 LocalDate:', matchData.LocalDate);
    console.log('🕒 LocalTime:', matchData.LocalTime);

    const result = calculateMyTime(
      matchData.LocalDate,
      matchData.LocalTime,
      location,
      userTz
    );

    if (result) {
      console.log('✅ Method 1 Success:');
      console.log('  🕒 User Time:', result.myTime);
      console.log('  🌐 UTC Time:', result.utcTime);
      console.log('  📍 Detection:', result.detection);
      return {
        utcDateTime: result.utcTime,
        userDateTime: result.myTime,
        conversionMethod: 'local_detected',
        timezoneDetection: result.detection,
        sourceFields: ['LocalDate', 'LocalTime', 'TournamentLocation'],
        reliable: result.detection.confidence === 'high',
        debug: {
          originalLocalDate: matchData.LocalDate,
          originalLocalTime: matchData.LocalTime,
          detectedTimezone: result.detection.timezone,
          userTimezone: userTz
        }
      };
    } else {
      console.log('❌ Method 1 Failed: calculateMyTime returned null');

    }
  } else {
    console.log('⏩ Method 1 Skipped: Missing LocalDate or LocalTime');
  }

  // Method 2: Use scheduledDateTime (local time) with tournament location-based timezone detection
  if (matchData.scheduledDateTime) {
    console.log('🕐 Method 2: Using scheduledDateTime');
    console.log('📅 Original scheduledDateTime:', matchData.scheduledDateTime);

    // Parse scheduledDateTime as local time, ignoring any timezone info
    // The API data has Z suffix but according to user, this is actually local time
    const cleanedDateTime = matchData.scheduledDateTime.replace('Z', '');
    console.log('🧹 Cleaned scheduledDateTime:', cleanedDateTime);

    const scheduledDate = DateTime.fromISO(cleanedDateTime);
    console.log('📊 Parsed DateTime:', { isValid: scheduledDate.isValid, toString: scheduledDate.toString() });

    if (scheduledDate.isValid) {
      const localDate = scheduledDate.toFormat('yyyy-MM-dd');
      const localTime = scheduledDate.toFormat('HH:mm');
      console.log('📅 Extracted LocalDate:', localDate);
      console.log('🕒 Extracted LocalTime:', localTime);

      const result = calculateMyTime(
        localDate,
        localTime,
        location,
        userTz
      );

      if (result) {
        console.log('✅ Method 2 Success:', result);
        return {
          utcDateTime: result.utcTime,
          userDateTime: result.myTime,
          conversionMethod: 'local_detected',
          timezoneDetection: result.detection,
          sourceFields: ['scheduledDateTime', 'TournamentLocation'],
          reliable: result.detection.confidence === 'high',
          debug: {
            originalLocalDate: localDate,
            originalLocalTime: localTime,
            scheduledDateTime: matchData.scheduledDateTime,
            detectedTimezone: result.detection.timezone,
            userTimezone: userTz
          }
        };
      } else {
        console.log('❌ Method 2 Failed: calculateMyTime returned null');
      }
    } else {
      console.log('❌ Method 2 Failed: Invalid DateTime parsing');
    }
  } else {
    console.log('⏩ Method 2 Skipped: Missing scheduledDateTime');
  }

  // NO FALLBACKS - Fail with clear error
  console.log('❌ TIMEZONE CONVERSION FAILED: All methods exhausted');
  throw new Error(`Timezone conversion failed: Missing LocalDate/LocalTime or scheduledDateTime, or location detection failed`);
}

/**
 * Simple wrapper for getting just the user time string
 * Use this for UI display when you don't need the full conversion metadata
 *
 * @param matchData - VIS API match data
 * @param tournamentData - Tournament location data (optional)
 * @param userTimezone - User's timezone (optional)
 * @returns Formatted user time (HH:mm)
 */
export function getMatchTimeForUser(
  matchData: VisBeachMatchData,
  tournamentData?: TournamentData,
  userTimezone?: string
): string {
  const result = convertMatchTimeToUserTime(matchData, tournamentData, userTimezone);
  return result.userDateTime;
}

/**
 * Get UTC ISO string from VIS match data
 * Use this when you need to store or compare times in UTC
 *
 * @param matchData - VIS API match data
 * @param tournamentData - Tournament location data (optional)
 * @returns UTC ISO string
 */
export function getMatchTimeUTC(
  matchData: VisBeachMatchData,
  tournamentData?: TournamentData
): string {
  const result = convertMatchTimeToUserTime(matchData, tournamentData);
  return result.utcDateTime;
}

/**
 * Check if the timezone conversion is reliable
 * Use this to show timezone indicators or warnings to users
 *
 * @param matchData - VIS API match data
 * @param tournamentData - Tournament location data (optional)
 * @returns True if conversion is considered reliable
 */
export function isTimezoneConversionReliable(
  matchData: VisBeachMatchData,
  tournamentData?: TournamentData
): boolean {
  const result = convertMatchTimeToUserTime(matchData, tournamentData);
  return result.reliable;
}

/**
 * Get human-readable description of how the time was converted
 * Use this for debugging or showing users how their time was calculated
 *
 * @param matchData - VIS API match data
 * @param tournamentData - Tournament location data (optional)
 * @returns Description of conversion method
 */
export function getTimezoneConversionMethod(
  matchData: VisBeachMatchData,
  tournamentData?: TournamentData
): string {
  const result = convertMatchTimeToUserTime(matchData, tournamentData);

  switch (result.conversionMethod) {
    case 'utc_direct':
      return result.sourceFields.includes('BeginDateTimeUtc')
        ? 'Direct UTC time from VIS API'
        : 'UTC date/time from VIS API';

    case 'local_with_offset':
      return 'Local time converted using timezone offset';

    case 'local_with_timezone':
      return 'Local time converted using timezone identifier';

    case 'local_detected':
      if (result.timezoneDetection) {
        const confidence = result.timezoneDetection.confidence;
        const source = result.timezoneDetection.detectedFrom;
        return `Tournament timezone detected (${confidence} confidence) from ${source}`;
      }
      return 'Local time treated as UTC (unreliable)';

    default:
      return 'Unknown conversion method';
  }
}