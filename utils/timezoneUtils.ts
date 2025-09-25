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
  LocalTimeOffset?: string;     // Timezone offset (e.g., "+03:00")
  TimeZone?: string;           // Timezone identifier
  UtcDate?: string;            // UTC date if available
  UtcTime?: string;            // UTC time if available
  BeginDateTimeUtc?: string;   // UTC datetime if available
  EndDateTimeUtc?: string;     // UTC end datetime if available
  TournamentName?: string;     // Tournament name for heuristics
  TournamentCity?: string;     // Tournament city
  TournamentCountry?: string;  // Tournament country
  TournamentCountryCode?: string; // Tournament country code
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

  console.log('🌍 [TIMEZONE-CONVERSION] Converting match time:', {
    LocalDate: matchData.LocalDate,
    LocalTime: matchData.LocalTime,
    TournamentCity: matchData.TournamentCity,
    TournamentCountry: matchData.TournamentCountry,
    TournamentCountryCode: matchData.TournamentCountryCode,
    userTimezone: userTz,
    tournamentDataCity: tournamentData?.city,
    tournamentDataCountry: tournamentData?.country
  });

  // Method 1: Use UTC datetime if available (highest priority)
  if (matchData.BeginDateTimeUtc) {
    try {
      const utcDateTime = DateTime.fromISO(matchData.BeginDateTimeUtc, { zone: 'utc' });
      if (utcDateTime.isValid) {
        const userDateTime = utcDateTime.setZone(userTz);
        return {
          utcDateTime: utcDateTime.toISO(),
          userDateTime: userDateTime.toFormat('HH:mm'),
          conversionMethod: 'utc_direct',
          sourceFields: ['BeginDateTimeUtc'],
          reliable: true,
          debug: {
            userTimezone: userTz
          }
        };
      }
    } catch (error) {
      console.warn('Failed to parse BeginDateTimeUtc:', matchData.BeginDateTimeUtc, error);
    }
  }

  // Method 2: Use UtcDate + UtcTime if available
  if (matchData.UtcDate && matchData.UtcTime) {
    try {
      const utcTimeNormalized = /^\d{2}:\d{2}$/.test(matchData.UtcTime)
        ? `${matchData.UtcTime}:00`
        : matchData.UtcTime;

      const utcDateTime = DateTime.fromISO(`${matchData.UtcDate}T${utcTimeNormalized}`, { zone: 'utc' });
      if (utcDateTime.isValid) {
        const userDateTime = utcDateTime.setZone(userTz);
        return {
          utcDateTime: utcDateTime.toISO(),
          userDateTime: userDateTime.toFormat('HH:mm'),
          conversionMethod: 'utc_direct',
          sourceFields: ['UtcDate', 'UtcTime'],
          reliable: true,
          debug: {
            userTimezone: userTz
          }
        };
      }
    } catch (error) {
      console.warn('Failed to parse UtcDate/UtcTime:', matchData.UtcDate, matchData.UtcTime, error);
    }
  }

  // Method 3: Use LocalDate + LocalTime with tournament location-based timezone detection
  if (matchData.LocalDate && matchData.LocalTime) {
    try {
      // Build tournament location data from various sources
      const location: TournamentLocation = {
        city: matchData.TournamentCity || tournamentData?.city || '',
        country: matchData.TournamentCountry || tournamentData?.country || '',
        countryCode: matchData.TournamentCountryCode || tournamentData?.countryCode || '',
        venue: tournamentData?.venue || '',
        name: matchData.TournamentName || tournamentData?.name || ''
      };

      const result = calculateMyTime(
        matchData.LocalDate,
        matchData.LocalTime,
        location,
        userTz
      );

      if (result) {
        console.log('✅ [TIMEZONE-CONVERSION] Successfully detected timezone:', {
          detectedTimezone: result.detection.timezone,
          confidence: result.detection.confidence,
          detectedFrom: result.detection.detectedFrom,
          originalTime: `${matchData.LocalDate} ${matchData.LocalTime}`,
          convertedMyTime: result.myTime,
          utcTime: result.utcTime
        });

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
      }
    } catch (error) {
      console.warn('Failed to convert using location detection:', error);
    }
  }

  // Method 4: Use LocalDate + LocalTime + LocalTimeOffset if available
  if (matchData.LocalDate && matchData.LocalTime && matchData.LocalTimeOffset) {
    try {
      const localTimeNormalized = /^\d{2}:\d{2}$/.test(matchData.LocalTime)
        ? `${matchData.LocalTime}:00`
        : matchData.LocalTime;

      // Parse as local time with offset
      const localWithOffset = DateTime.fromISO(`${matchData.LocalDate}T${localTimeNormalized}${matchData.LocalTimeOffset}`);

      if (localWithOffset.isValid) {
        const utcDateTime = localWithOffset.toUTC();
        const userDateTime = utcDateTime.setZone(userTz);

        return {
          utcDateTime: utcDateTime.toISO(),
          userDateTime: userDateTime.toFormat('HH:mm'),
          conversionMethod: 'local_with_offset',
          sourceFields: ['LocalDate', 'LocalTime', 'LocalTimeOffset'],
          reliable: true,
          debug: {
            originalLocalDate: matchData.LocalDate,
            originalLocalTime: matchData.LocalTime,
            userTimezone: userTz
          }
        };
      }
    } catch (error) {
      console.warn('Failed to parse LocalDate/LocalTime with offset:', error);
    }
  }

  // Method 5: Use LocalDate + LocalTime + TimeZone if available
  if (matchData.LocalDate && matchData.LocalTime && (matchData.TimeZone || tournamentData?.defaultTimeZone)) {
    try {
      const localTimeNormalized = /^\d{2}:\d{2}$/.test(matchData.LocalTime)
        ? `${matchData.LocalTime}:00`
        : matchData.LocalTime;

      const timezone = matchData.TimeZone || tournamentData?.defaultTimeZone;
      const localDateTime = DateTime.fromISO(`${matchData.LocalDate}T${localTimeNormalized}`, { zone: timezone });

      if (localDateTime.isValid) {
        const utcDateTime = localDateTime.toUTC();
        const userDateTime = utcDateTime.setZone(userTz);

        return {
          utcDateTime: utcDateTime.toISO(),
          userDateTime: userDateTime.toFormat('HH:mm'),
          conversionMethod: 'local_with_timezone',
          sourceFields: ['LocalDate', 'LocalTime', matchData.TimeZone ? 'TimeZone' : 'defaultTimeZone'],
          reliable: true,
          debug: {
            originalLocalDate: matchData.LocalDate,
            originalLocalTime: matchData.LocalTime,
            detectedTimezone: timezone,
            userTimezone: userTz
          }
        };
      }
    } catch (error) {
      console.warn('Failed to parse LocalDate/LocalTime with timezone:', error);
    }
  }

  // Fallback: Treat LocalDate + LocalTime as UTC (least reliable)
  if (matchData.LocalDate && matchData.LocalTime) {
    try {
      const localTimeNormalized = /^\d{2}:\d{2}$/.test(matchData.LocalTime)
        ? `${matchData.LocalTime}:00`
        : matchData.LocalTime;

      const utcDateTime = DateTime.fromISO(`${matchData.LocalDate}T${localTimeNormalized}`, { zone: 'utc' });

      if (utcDateTime.isValid) {
        const userDateTime = utcDateTime.setZone(userTz);

        return {
          utcDateTime: utcDateTime.toISO(),
          userDateTime: userDateTime.toFormat('HH:mm'),
          conversionMethod: 'local_detected',
          sourceFields: ['LocalDate', 'LocalTime'],
          reliable: false, // Very unreliable fallback
          debug: {
            originalLocalDate: matchData.LocalDate,
            originalLocalTime: matchData.LocalTime,
            userTimezone: userTz
          }
        };
      }
    } catch (error) {
      console.warn('Failed fallback parsing of LocalDate/LocalTime:', error);
    }
  }

  // Ultimate fallback: current time
  console.error('Could not parse any time data from match, using current time as fallback:', matchData);
  const now = DateTime.now();
  const utcNow = now.toUTC();

  return {
    utcDateTime: utcNow.toISO(),
    userDateTime: now.toFormat('HH:mm'),
    conversionMethod: 'local_detected',
    sourceFields: ['fallback_current_time'],
    reliable: false,
    debug: {
      userTimezone: userTz,
      fallbackReason: 'no_parseable_time_data'
    }
  };
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