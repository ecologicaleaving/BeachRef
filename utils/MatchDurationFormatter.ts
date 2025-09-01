/**
 * @fileoverview Match Duration Formatter Utility
 * Parses and formats beach volleyball match duration from VIS API data
 * Handles DurationSet1/2/3 fields in "mm:ss" format
 */

/**
 * Parse time string in "mm:ss" format to total seconds
 * 
 * @param duration - Time string in "mm:ss" format (e.g., "25:30")
 * @returns Total seconds, or 0 if invalid/empty
 */
export function parseTimeString(duration: string): number {
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
 * Calculate total match duration from set duration strings
 * 
 * @param durationSet1 - First set duration in "mm:ss" format
 * @param durationSet2 - Second set duration in "mm:ss" format  
 * @param durationSet3 - Third set duration in "mm:ss" format
 * @returns Formatted duration string (e.g., "1h 25m") or null if no valid durations
 */
export function calculateTotalDuration(
  durationSet1?: string,
  durationSet2?: string,
  durationSet3?: string
): string | null {
  const durations = [durationSet1, durationSet2, durationSet3]
    .filter((d): d is string => !!d)
    .map(parseTimeString)
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
 * @returns Formatted string (e.g., "1h 25m", "45m", "2h 3m")
 */
function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) {
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