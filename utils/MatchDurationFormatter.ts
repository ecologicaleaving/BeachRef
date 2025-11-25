/**
 * @fileoverview Match Duration Formatter Utility
 * Parses and formats beach volleyball match duration from VIS API data
 *
 * VIS API DurationSet1/2/3 fields contain positive 32-bit integers representing seconds.
 * Example: 1530 = 25 minutes 30 seconds
 *
 * This module provides:
 * - parseDurationSeconds(): Primary parser for VIS API integer seconds format
 * - parseDurationLegacy(): Fallback parser for cached "mm:ss" format data
 * - parseDuration(): Smart parser that tries both formats
 */

/**
 * Parse duration as integer seconds (VIS API format)
 *
 * VIS API returns Duration as a positive 32-bit integer representing seconds.
 * Example: 1530 represents 25 minutes and 30 seconds
 *
 * @param duration - Duration value (number or string representation of seconds)
 * @returns Duration in seconds, or 0 if invalid/empty
 */
export function parseDurationSeconds(duration: string | number | undefined | null): number {
  if (duration === undefined || duration === null || duration === '') {
    return 0;
  }

  const value = typeof duration === 'number' ? duration : parseInt(String(duration), 10);

  if (isNaN(value) || value < 0) {
    return 0;
  }

  return value; // Already in seconds
}

/**
 * Parse legacy time string in "mm:ss" format to total seconds
 * Used for backward compatibility with cached data that may contain "mm:ss" format
 *
 * @param duration - Time string in "mm:ss" format (e.g., "25:30")
 * @returns Total seconds, or 0 if invalid/empty
 * @deprecated Use parseDurationSeconds() for new code - VIS API returns integer seconds
 */
export function parseDurationLegacy(duration: string): number {
  if (!duration || typeof duration !== 'string') {
    return 0;
  }

  const trimmed = duration.trim();
  if (!trimmed) {
    return 0;
  }

  // Match "mm:ss" format (e.g., "25:30" or "5:45")
  const timeMatch = trimmed.match(/^(\d{1,3}):(\d{2})$/);
  if (timeMatch && timeMatch[1] && timeMatch[2]) {
    const minutes = parseInt(timeMatch[1], 10);
    const seconds = parseInt(timeMatch[2], 10);

    // Validate ranges
    if (isNaN(minutes) || isNaN(seconds) || seconds >= 60 || minutes < 0 || seconds < 0) {
      return 0;
    }

    return minutes * 60 + seconds;
  }

  return 0;
}

/**
 * @deprecated Alias for parseDurationLegacy - use parseDuration() instead
 */
export function parseTimeString(duration: string): number {
  return parseDurationLegacy(duration);
}

/**
 * Smart duration parser with fallback logic
 *
 * Priority order:
 * 1. Try parsing as integer seconds (VIS API format - primary)
 * 2. Try parsing as "mm:ss" format (legacy cached data - fallback)
 *
 * @param duration - Duration value in any supported format
 * @returns Duration in seconds, or 0 if invalid
 */
export function parseDuration(duration: string | number | undefined | null): number {
  // Handle null/undefined/empty
  if (duration === undefined || duration === null || duration === '') {
    return 0;
  }

  // If it's a number, use directly as seconds
  if (typeof duration === 'number') {
    return duration >= 0 ? duration : 0;
  }

  const trimmed = String(duration).trim();
  if (!trimmed) {
    return 0;
  }

  // Check if it contains a colon - indicates legacy "mm:ss" format
  if (trimmed.includes(':')) {
    return parseDurationLegacy(trimmed);
  }

  // Try parsing as integer seconds (VIS API format)
  const seconds = parseDurationSeconds(trimmed);
  if (seconds > 0) {
    return seconds;
  }

  return 0;
}

/**
 * Calculate total match duration from set duration values
 *
 * Handles both VIS API format (integer seconds) and legacy cached format ("mm:ss")
 *
 * @param durationSet1 - First set duration (seconds as number/string, or "mm:ss" format)
 * @param durationSet2 - Second set duration (seconds as number/string, or "mm:ss" format)
 * @param durationSet3 - Third set duration (seconds as number/string, or "mm:ss" format)
 * @returns Formatted duration string (e.g., "1h 25m", "54m") or null if no valid durations
 */
export function calculateTotalDuration(
  durationSet1?: string | number,
  durationSet2?: string | number,
  durationSet3?: string | number
): string | null {
  const durations = [durationSet1, durationSet2, durationSet3]
    .map(parseDuration)
    .filter(seconds => seconds > 0);

  if (durations.length === 0) {
    return null;
  }

  const totalSeconds = durations.reduce((sum, seconds) => sum + seconds, 0);

  if (totalSeconds === 0) {
    return null;
  }

  return formatDuration(totalSeconds);
}

/**
 * Format duration in seconds to human-readable string
 *
 * @param totalSeconds - Total duration in seconds
 * @returns Formatted string (e.g., "1h 25m", "45m", "2h 3m") or null for zero/invalid
 */
export function formatDuration(totalSeconds: number): string | null {
  if (totalSeconds <= 0) {
    return null; // Suppress "0m" display
  }

  // Use Math.floor for more predictable behavior - show completed minutes only
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Handle edge case: less than 1 minute
  if (totalMinutes === 0) {
    return null; // Less than 1 minute - don't display
  }

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}