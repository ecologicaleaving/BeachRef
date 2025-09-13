/**
 * Status Color Utilities
 * Tournament Referee Status-Driven Color Coding System
 */

import { statusColors, colors } from '../theme/tokens';
import { calculateContrast } from './contrast';

// Status type definitions for type safety
export type TournamentStatus = 'current' | 'upcoming' | 'completed' | 'cancelled' | 'emergency';
export type AssignmentStatus = 'active' | 'scheduled' | 'finished' | 'modified' | 'urgent';
export type MatchStatus = 'live' | 'pending' | 'final' | 'postponed' | 'critical';

// Status color mapping functions
export const getStatusColor = (status: TournamentStatus): string => {
  switch (status) {
    case 'current':
      return statusColors.current;
    case 'upcoming':
      return statusColors.upcoming;
    case 'completed':
      return statusColors.completed;
    case 'cancelled':
      return statusColors.cancelled;
    case 'emergency':
      return statusColors.emergency;
    default:
      return statusColors.upcoming; // Default fallback
  }
};

// Assignment status to tournament status mapping
export const getAssignmentStatusColor = (status: AssignmentStatus): string => {
  const statusMap: Record<AssignmentStatus, TournamentStatus> = {
    active: 'current',
    scheduled: 'upcoming',
    finished: 'completed',
    modified: 'cancelled',
    urgent: 'emergency',
  };
  
  return getStatusColor(statusMap[status]);
};

// Match status to tournament status mapping
export const getMatchStatusColor = (status: MatchStatus): string => {
  const statusMap: Record<MatchStatus, TournamentStatus> = {
    live: 'current',
    pending: 'upcoming',
    final: 'completed',
    postponed: 'cancelled',
    critical: 'emergency',
  };
  
  return getStatusColor(statusMap[status]);
};

// Status color with automatic text color selection for optimal contrast
export const getStatusColorWithText = (status: TournamentStatus): {
  backgroundColor: string;
  textColor: string;
  contrastRatio: number;
} => {
  // Special case for current (LIVE) status: white background with blue text
  if (status === 'current') {
    const backgroundColor = '#FFFFFF';
    const textColor = statusColors.current; // Blue color
    const contrastRatio = calculateContrast(textColor, backgroundColor).ratio;
    
    return {
      backgroundColor,
      textColor,
      contrastRatio,
    };
  }
  
  const backgroundColor = getStatusColor(status);
  
  // Calculate contrast with white and dark text to determine best option
  const whiteContrast = calculateContrast('#FFFFFF', backgroundColor);
  const darkContrast = calculateContrast(colors.textPrimary, backgroundColor);
  
  // Choose text color with better contrast
  const useWhiteText = whiteContrast.ratio > darkContrast.ratio;
  const textColor = useWhiteText ? '#FFFFFF' : colors.textPrimary;
  const contrastRatio = useWhiteText ? whiteContrast.ratio : darkContrast.ratio;
  
  return {
    backgroundColor,
    textColor,
    contrastRatio,
  };
};

// Get appropriate status color for background combinations
export const getStatusColorForBackground = (
  status: TournamentStatus, 
  backgroundType: 'primary' | 'secondary' | 'background' = 'background'
): {
  statusColor: string;
  contrastRatio: number;
  wcagCompliant: boolean;
} => {
  const statusColor = getStatusColor(status);
  const backgroundColorMap = {
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
  };
  
  const backgroundColor = backgroundColorMap[backgroundType];
  const contrast = calculateContrast(statusColor, backgroundColor);
  
  return {
    statusColor,
    contrastRatio: contrast.ratio,
    wcagCompliant: contrast.wcagAAA,
  };
};

// Status priority for sorting and display ordering
export const getStatusPriority = (status: TournamentStatus): number => {
  const priorityMap: Record<TournamentStatus, number> = {
    emergency: 1,     // Highest priority
    current: 2,
    upcoming: 3,
    cancelled: 4,
    completed: 5,     // Lowest priority
  };
  
  return priorityMap[status];
};

// Status validation function
export const isValidStatus = (status: string): status is TournamentStatus => {
  return ['current', 'upcoming', 'completed', 'cancelled', 'emergency'].includes(status);
};

// Status color accessibility validation
export const validateStatusColorAccessibility = (): {
  status: TournamentStatus;
  color: string;
  onBackground: number;
  wcagCompliant: boolean;
}[] => {
  const statuses: TournamentStatus[] = ['current', 'upcoming', 'completed', 'cancelled', 'emergency'];
  
  return statuses.map(status => {
    const color = getStatusColor(status);
    const contrast = calculateContrast(color, colors.background);
    
    return {
      status,
      color,
      onBackground: contrast.ratio,
      wcagCompliant: contrast.wcagAAA,
    };
  });
};

// Generate status color CSS variables for styling
export const generateStatusColorCSSVars = (): Record<string, string> => {
  return {
    '--status-current': statusColors.current,
    '--status-upcoming': statusColors.upcoming,
    '--status-completed': statusColors.completed,
    '--status-cancelled': statusColors.cancelled,
    '--status-emergency': statusColors.emergency,
  };
};

// Status color themes for different contexts
export const statusColorThemes = {
  badge: {
    current: { bg: '#FFFFFF', text: statusColors.current }, // White background, blue text for LIVE
    upcoming: { bg: statusColors.upcoming, text: '#FFFFFF' },
    completed: { bg: statusColors.completed, text: '#FFFFFF' },
    cancelled: { bg: statusColors.cancelled, text: '#FFFFFF' },
    emergency: { bg: statusColors.emergency, text: '#FFFFFF' },
  },
  border: {
    current: { borderColor: statusColors.current, width: 2 },
    upcoming: { borderColor: statusColors.upcoming, width: 1 },
    completed: { borderColor: statusColors.completed, width: 1 },
    cancelled: { borderColor: statusColors.cancelled, width: 1 },
    emergency: { borderColor: statusColors.emergency, width: 3 },
  },
  indicator: {
    current: { color: statusColors.current, size: 'large' },
    upcoming: { color: statusColors.upcoming, size: 'medium' },
    completed: { color: statusColors.completed, size: 'small' },
    cancelled: { color: statusColors.cancelled, size: 'medium' },
    emergency: { color: statusColors.emergency, size: 'large' },
  },
} as const;

// Tournament and Match Status Determination Functions

/**
 * Determines tournament status based on tournament data
 */
export const determineTournamentStatus = (tournament: any): TournamentStatus => {
  // Check for emergency/cancelled states first
  if (tournament.Status && (
    tournament.Status.toLowerCase().includes('cancel') ||
    tournament.Status.toLowerCase().includes('postpone')
  )) {
    return 'cancelled';
  }
  
  // Check for emergency indicators
  if (tournament.Status && (
    tournament.Status.toLowerCase().includes('emergency') ||
    tournament.Status.toLowerCase().includes('urgent')
  )) {
    return 'emergency';
  }
  
  // Use date-based logic for current/upcoming/completed
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  try {
    if (tournament.StartDate && tournament.EndDate) {
      const startDate = new Date(tournament.StartDate);
      const endDate = new Date(tournament.EndDate);
      
      // Tournament is currently active
      if (startDate <= today && today <= endDate) {
        return 'current';
      }
      
      // Tournament has ended
      if (today > endDate) {
        return 'completed';
      }
      
      // Tournament is upcoming
      if (today < startDate) {
        return 'upcoming';
      }
    }
  } catch (error) {
    // console.warn('Error parsing tournament dates:', error);
  }
  
  // Default to upcoming if we can't determine
  return 'upcoming';
};

/**
 * Determines match status based on match data
 */
export const determineMatchStatus = (match: any): TournamentStatus => {
  // Check explicit status codes first
  if (match.Status) {
    const statusNum = parseInt(match.Status);
    if (statusNum === 2) return 'current';  // Playing
    if (statusNum === 3 || statusNum >= 3) return 'completed';  // Completed
    if (statusNum === 1) return 'upcoming';  // Scheduled
  }
  
  // Check if match has scores (indicates completion)
  const pointsA = parseInt(match.MatchPointsA || '0');
  const pointsB = parseInt(match.MatchPointsB || '0');
  if (pointsA > 0 || pointsB > 0) {
    return 'completed';
  }
  
  // Use time-based logic for live matches
  if (match.LocalDate && match.LocalTime) {
    try {
      const matchDateTime = new Date(`${match.LocalDate}T${match.LocalTime}`);
      const now = new Date();
      const matchStart = matchDateTime.getTime();
      const currentTime = now.getTime();
      const oneHourBefore = matchStart - (60 * 60 * 1000); // 1 hour before
      const fourHoursAfter = matchStart + (4 * 60 * 60 * 1000); // 4 hours after
      
      // If current time is within the match window, consider it current/playing
      if (currentTime >= oneHourBefore && currentTime <= fourHoursAfter) {
        return 'current';
      }
      
      // If match time has passed significantly, it's completed
      if (currentTime > fourHoursAfter) {
        return 'completed';
      }
      
      // Otherwise it's upcoming
      return 'upcoming';
    } catch (error) {
      // console.warn('Error parsing match date/time:', error);
    }
  }
  
  // Default to upcoming
  return 'upcoming';
};

// Export all status colors for easy access
export { statusColors } from '../theme/tokens';