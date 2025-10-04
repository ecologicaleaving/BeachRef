/**
 * Tournament Info Utilities
 * Story 2.3: Tournament Info Panel System
 *
 * Utility functions for tournament information processing and formatting
 */

import {
  TournamentInfo,
  ScheduleItem,
  WeatherAlert,
  CourtInfo,
  EmergencyProcedure,
  TournamentStatus,
  MatchStatus,
  WeatherSeverity
} from '../types/tournamentInfo';
import { designTokens } from '../theme/tokens';

// Date and Time Formatting
export const formatTournamentDate = (date: Date, timezone?: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone
  };
  return date.toLocaleDateString('en-US', options);
};

export const formatTournamentDateRange = (startDate: Date, endDate: Date, timezone?: string): string => {
  const start = formatTournamentDate(startDate, timezone);
  const end = formatTournamentDate(endDate, timezone);
  
  if (start === end) {
    return start;
  }
  
  // Same month optimization
  const startParts = start.split(' ');
  const endParts = end.split(' ');
  
  if (startParts[0] === endParts[0] && startParts[2] === endParts[2]) {
    return `${startParts[0]} ${startParts[1].replace(',', '')} - ${endParts[1].replace(',', '')}, ${endParts[2]}`;
  }
  
  return `${start} - ${end}`;
};

export const formatScheduleTime = (date: Date, timezone?: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone
  };
  return date.toLocaleTimeString('en-US', options);
};

export const formatScheduleDateTime = (date: Date, timezone?: string): string => {
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    timeZone: timezone
  });
  const timeStr = formatScheduleTime(date, timezone);
  return `${dateStr} ${timeStr}`;
};

// Tournament Status Utilities
export const getTournamentStatusText = (status: TournamentStatus): string => {
  const statusMap: Record<TournamentStatus, string> = {
    upcoming: 'Upcoming',
    active: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return statusMap[status];
};

export const isTournamentActive = (tournament: TournamentInfo, currentDate: Date = new Date()): boolean => {
  return currentDate >= tournament.startDate && 
         currentDate <= tournament.endDate && 
         tournament.status === 'active';
};

export const getTournamentProgress = (tournament: TournamentInfo, currentDate: Date = new Date()): number => {
  if (currentDate < tournament.startDate) return 0;
  if (currentDate > tournament.endDate) return 100;
  
  const totalDuration = tournament.endDate.getTime() - tournament.startDate.getTime();
  const elapsed = currentDate.getTime() - tournament.startDate.getTime();
  
  return Math.round((elapsed / totalDuration) * 100);
};

// Schedule Utilities
export const getUpcomingMatches = (
  schedule: ScheduleItem[], 
  currentTime: Date = new Date(),
  limit: number = 3
): ScheduleItem[] => {
  return schedule
    .filter(item => item.scheduledTime > currentTime && item.status === 'scheduled')
    .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())
    .slice(0, limit);
};

export const getCurrentMatch = (
  schedule: ScheduleItem[], 
  currentTime: Date = new Date()
): ScheduleItem | null => {
  return schedule.find(item => 
    item.status === 'in-progress' ||
    (item.actualStartTime && item.actualStartTime <= currentTime && !item.actualEndTime)
  ) || null;
};

export const getMatchDuration = (item: ScheduleItem): string => {
  if (item.actualStartTime && item.actualEndTime) {
    const duration = item.actualEndTime.getTime() - item.actualStartTime.getTime();
    const minutes = Math.round(duration / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  }
  
  if (item.estimatedDuration > 0) {
    const hours = Math.floor(item.estimatedDuration / 60);
    const minutes = item.estimatedDuration % 60;
    
    if (hours > 0) {
      return `~${hours}h ${minutes}m`;
    }
    return `~${minutes}m`;
  }
  
  return 'TBD';
};

export const getScheduleItemStatusText = (status: MatchStatus): string => {
  const statusMap: Record<MatchStatus, string> = {
    scheduled: 'Scheduled',
    delayed: 'Delayed',
    'in-progress': 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return statusMap[status];
};

export const isScheduleItemUpcoming = (item: ScheduleItem, currentTime: Date = new Date()): boolean => {
  return item.scheduledTime > currentTime && item.status === 'scheduled';
};

export const isScheduleItemCurrent = (item: ScheduleItem, currentTime: Date = new Date()): boolean => {
  return item.status === 'in-progress' ||
    (item.actualStartTime !== undefined && item.actualStartTime <= currentTime && !item.actualEndTime);
};

// Weather Alert Utilities
export const getActiveWeatherAlerts = (alerts: WeatherAlert[], currentTime: Date = new Date()): WeatherAlert[] => {
  return alerts
    .filter(alert => 
      alert.issuedAt <= currentTime &&
      (!alert.expiresAt || alert.expiresAt > currentTime)
    )
    .sort((a, b) => {
      // Sort by severity first, then by issued time
      const severityOrder: Record<WeatherSeverity, number> = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1
      };
      
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      return b.issuedAt.getTime() - a.issuedAt.getTime();
    });
};

export const getWeatherAlertIcon = (type: string, severity: WeatherSeverity): string => {
  const iconMap: Record<string, string> = {
    warning: severity === 'critical' ? 'alert-triangle' : 'alert-circle',
    watch: 'eye',
    advisory: 'info'
  };
  return iconMap[type] || 'cloud';
};

export const formatWeatherAlertDuration = (issuedAt: Date, expiresAt?: Date): string => {
  if (!expiresAt) return 'Until further notice';
  
  const duration = expiresAt.getTime() - issuedAt.getTime();
  const hours = Math.round(duration / (1000 * 60 * 60));
  
  if (hours < 1) return 'Less than 1 hour';
  if (hours === 1) return '1 hour';
  return `${hours} hours`;
};

// Court Utilities
export const getCourtByNumber = (courts: CourtInfo[], courtNumber: string): CourtInfo | null => {
  return courts.find(court => court.courtNumber === courtNumber) || null;
};

export const getCourtsWithConditions = (courts: CourtInfo[]): CourtInfo[] => {
  return courts.filter(court => court.conditions && court.conditions.trim().length > 0);
};

export const getCourtsWithSpecialRequirements = (courts: CourtInfo[]): CourtInfo[] => {
  return courts.filter(court => court.specialRequirements && court.specialRequirements.length > 0);
};

export const formatCourtConditions = (court: CourtInfo): string => {
  const parts: string[] = [];
  
  if (court.conditions) {
    parts.push(court.conditions);
  }
  
  if (court.surfaceType) {
    parts.push(`Surface: ${court.surfaceType}`);
  }
  
  if (court.netHeight) {
    parts.push(`Net: ${court.netHeight}m`);
  }
  
  return parts.join(' • ');
};

// Emergency Procedures Utilities
export const getEmergencyProceduresByType = (procedures: EmergencyProcedure[], type: string): EmergencyProcedure[] => {
  return procedures
    .filter(proc => proc.type === type)
    .sort((a, b) => a.priority - b.priority);
};

export const getMostRelevantEmergencyProcedures = (procedures: EmergencyProcedure[], limit: number = 3): EmergencyProcedure[] => {
  return procedures
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);
};

export const formatEmergencyContactInfo = (contact: { name: string; phone: string; role?: string }): string => {
  if (contact.role) {
    return `${contact.name} (${contact.role}): ${contact.phone}`;
  }
  return `${contact.name}: ${contact.phone}`;
};

// Time Management Utilities
export const getTimeUntilMatch = (scheduledTime: Date, currentTime: Date = new Date()): string => {
  const diff = scheduledTime.getTime() - currentTime.getTime();
  
  if (diff <= 0) return 'Now';
  
  const minutes = Math.round(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  
  if (hours > 0) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  return `${minutes}m`;
};

export const shouldShowTimeWarning = (scheduledTime: Date, currentTime: Date = new Date()): boolean => {
  const minutesUntil = (scheduledTime.getTime() - currentTime.getTime()) / (1000 * 60);
  return minutesUntil <= 15 && minutesUntil > 0;
};

// Panel Section Utilities
export const createPanelSectionId = (panelType: string, sectionName: string): string => {
  return `${panelType}-${sectionName}`.toLowerCase().replace(/\s+/g, '-');
};

export const isPanelSectionCollapsed = (sectionId: string, collapsedSections: Set<string>): boolean => {
  return collapsedSections.has(sectionId);
};

export const togglePanelSection = (
  sectionId: string, 
  collapsedSections: Set<string>
): Set<string> => {
  const newSet = new Set(collapsedSections);
  
  if (newSet.has(sectionId)) {
    newSet.delete(sectionId);
  } else {
    newSet.add(sectionId);
  }
  
  return newSet;
};

// Validation Utilities
export const validateTournamentInfo = (tournament: TournamentInfo): string[] => {
  const errors: string[] = [];
  
  if (!tournament.name || tournament.name.trim().length === 0) {
    errors.push('Tournament name is required');
  }
  
  if (!tournament.location || tournament.location.trim().length === 0) {
    errors.push('Tournament location is required');
  }
  
  if (tournament.startDate >= tournament.endDate) {
    errors.push('End date must be after start date');
  }
  
  if (!tournament.director || !tournament.director.phone) {
    errors.push('Tournament director contact information is required');
  }
  
  return errors;
};

export const validateScheduleItem = (item: ScheduleItem): string[] => {
  const errors: string[] = [];
  
  if (!item.teamA || item.teamA.trim().length === 0) {
    errors.push('Team A name is required');
  }
  
  if (!item.teamB || item.teamB.trim().length === 0) {
    errors.push('Team B name is required');
  }
  
  if (!item.courtNumber || item.courtNumber.trim().length === 0) {
    errors.push('Court number is required');
  }
  
  if (item.actualStartTime && item.actualEndTime && item.actualStartTime >= item.actualEndTime) {
    errors.push('Match end time must be after start time');
  }
  
  return errors;
};

// Additional Weather Alert Utilities
export const getWeatherAlertPriority = (alert: WeatherAlert): number => {
  const severityPriority = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1
  };
  
  return severityPriority[alert.severity] || 0;
};

export const formatWeatherAlertTime = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleTimeString('en-US', options);
};

export const getWeatherAlertSeverityColor = (severity: WeatherSeverity): string => {
  switch (severity) {
    case 'critical':
      return '#DC2626'; // Red
    case 'high':
      return '#D97706'; // Orange
    case 'medium':
      return '#2563EB'; // Blue
    case 'low':
      return designTokens.neutrals.textSecondary; // Gray
    default:
      return designTokens.neutrals.textSecondary;
  }
};