/**
 * @fileoverview VIS Duration Parser Utility
 * Handles VIS seconds-based duration fields from the VIS API
 * Replaces MatchDurationFormatter with VIS-compliant duration handling
 * Part of VIS Data Structure Alignment Epic - Story 1.2
 */

/**
 * Calculate total match duration from VIS seconds-based duration fields
 * 
 * @param durationSet1Seconds - First set duration in seconds (from VIS DurationSet1Seconds field)
 * @param durationSet2Seconds - Second set duration in seconds (from VIS DurationSet2Seconds field)  
 * @param durationSet3Seconds - Third set duration in seconds (from VIS DurationSet3Seconds field)
 * @returns Formatted duration string (e.g., "1h 25m") or null if no valid durations
 */
export function calculateTotalDurationFromSeconds(
  durationSet1Seconds?: number,
  durationSet2Seconds?: number,
  durationSet3Seconds?: number
): string | null {
  const durations = [durationSet1Seconds, durationSet2Seconds, durationSet3Seconds]
    .filter((d): d is number => typeof d === 'number' && d > 0 && !isNaN(d));

  if (durations.length === 0) {
    return null;
  }

  const totalSeconds = durations.reduce((sum, seconds) => sum + seconds, 0);

  if (totalSeconds === 0) {
    return null;
  }

  return formatDurationFromSeconds(totalSeconds);
}

/**
 * Format duration in seconds to human-readable string
 * Maintains compatibility with existing formatting patterns
 * 
 * @param totalSeconds - Total duration in seconds
 * @returns Formatted string (e.g., "1h 25m", "45m", "2h 3m")
 */
export function formatDurationFromSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) {
    return '0m';
  }

  // Use Math.floor for more predictable behavior - show completed minutes only
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Convert seconds to display format for time debugging or display
 * 
 * @param seconds - Duration in seconds
 * @returns Time string in "mm:ss" format (e.g., "25:30") or null if invalid
 */
export function convertSecondsToTimeString(seconds: number): string | null {
  if (typeof seconds !== 'number' || seconds <= 0 || isNaN(seconds)) {
    return null;
  }

  const totalMinutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  // Format with leading zeros for seconds
  const formattedSeconds = remainingSeconds.toString().padStart(2, '0');
  
  return `${totalMinutes}:${formattedSeconds}`;
}

/**
 * Parse time string in "mm:ss" format to total seconds
 * Maintains backward compatibility with legacy duration string formats during transition
 * 
 * @param duration - Time string in "mm:ss" format (e.g., "25:30")
 * @returns Total seconds, or 0 if invalid/empty
 * @deprecated Use VIS seconds-based fields instead when available
 */
export function parseTimeStringToSeconds(duration: string): number {
  if (!duration || typeof duration !== 'string') {
    return 0;
  }

  const trimmed = duration.trim();
  if (!trimmed) {
    return 0;
  }

  // Match "mm:ss" format (e.g., "25:30" or "5:45")
  const timeMatch = trimmed.match(/^(\d{1,3}):(\d{2})$/);
  if (!timeMatch) {
    return 0;
  }

  const minutes = parseInt(timeMatch[1], 10);
  const seconds = parseInt(timeMatch[2], 10);

  // Validate ranges
  if (isNaN(minutes) || isNaN(seconds) || seconds >= 60 || minutes < 0 || seconds < 0) {
    return 0;
  }

  return minutes * 60 + seconds;
}

/**
 * Calculate total match duration from mixed VIS seconds and legacy string formats
 * Provides transition support for systems migrating from string-based to VIS seconds-based durations
 * 
 * @param options - Duration data with both VIS seconds fields and legacy string fallbacks
 * @returns Formatted duration string (e.g., "1h 25m") or null if no valid durations
 */
export function calculateMixedFormatDuration(options: {
  durationSet1Seconds?: number;
  durationSet2Seconds?: number;
  durationSet3Seconds?: number;
  durationSet1String?: string;
  durationSet2String?: string;
  durationSet3String?: string;
}): string | null {
  const durations: number[] = [];

  // Prefer VIS seconds fields when available, fall back to string parsing
  const set1Duration = options.durationSet1Seconds ?? parseTimeStringToSeconds(options.durationSet1String || '');
  const set2Duration = options.durationSet2Seconds ?? parseTimeStringToSeconds(options.durationSet2String || '');
  const set3Duration = options.durationSet3Seconds ?? parseTimeStringToSeconds(options.durationSet3String || '');

  if (set1Duration > 0) durations.push(set1Duration);
  if (set2Duration > 0) durations.push(set2Duration);
  if (set3Duration > 0) durations.push(set3Duration);

  if (durations.length === 0) {
    return null;
  }

  const totalSeconds = durations.reduce((sum, seconds) => sum + seconds, 0);
  
  if (totalSeconds === 0) {
    return null;
  }

  return formatDurationFromSeconds(totalSeconds);
}

/**
 * Convert legacy "mm:ss" duration strings to VIS seconds format
 * Utility for data migration scenarios
 * 
 * @param durationSet1 - First set duration in "mm:ss" format
 * @param durationSet2 - Second set duration in "mm:ss" format
 * @param durationSet3 - Third set duration in "mm:ss" format
 * @returns Object with VIS seconds-based duration fields
 */
export function convertLegacyDurationsToVisSeconds(
  durationSet1?: string,
  durationSet2?: string,
  durationSet3?: string
): {
  DurationSet1Seconds?: number;
  DurationSet2Seconds?: number;
  DurationSet3Seconds?: number;
} {
  const result: {
    DurationSet1Seconds?: number;
    DurationSet2Seconds?: number;
    DurationSet3Seconds?: number;
  } = {};

  if (durationSet1) {
    const seconds = parseTimeStringToSeconds(durationSet1);
    if (seconds > 0) {
      result.DurationSet1Seconds = seconds;
    }
  }

  if (durationSet2) {
    const seconds = parseTimeStringToSeconds(durationSet2);
    if (seconds > 0) {
      result.DurationSet2Seconds = seconds;
    }
  }

  if (durationSet3) {
    const seconds = parseTimeStringToSeconds(durationSet3);
    if (seconds > 0) {
      result.DurationSet3Seconds = seconds;
    }
  }

  return result;
}