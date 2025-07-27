/**
 * Date utility functions for tournament display
 */

// Format tournament dates
export const formatTournamentDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Format tournament date range
export const formatTournamentDateRange = (startDate: Date, endDate: Date): string => {
  const start = formatTournamentDate(startDate);
  const end = formatTournamentDate(endDate);
  
  // If same date, show only once
  if (start === end) {
    return start;
  }
  
  // If same year, don't repeat year
  if (startDate.getFullYear() === endDate.getFullYear()) {
    const startShort = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    return `${startShort} - ${end}`;
  }
  
  return `${start} - ${end}`;
};

// Get relative date (e.g., "in 3 days", "2 days ago")
export const getRelativeDate = (date: Date): string => {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays === -1) {
    return 'Yesterday';
  } else if (diffDays > 0) {
    return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else {
    return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
  }
};

// Check if tournament is currently active
export const isTournamentActive = (startDate: Date, endDate: Date): boolean => {
  const now = new Date();
  return now >= startDate && now <= endDate;
};

// Check if tournament is upcoming
export const isTournamentUpcoming = (startDate: Date): boolean => {
  const now = new Date();
  return startDate > now;
};

// Check if tournament is completed
export const isTournamentCompleted = (endDate: Date): boolean => {
  const now = new Date();
  return endDate < now;
};

// Get tournament status based on dates
export const getTournamentStatus = (startDate: Date, endDate: Date): 'Upcoming' | 'Live' | 'Completed' => {
  if (isTournamentCompleted(endDate)) {
    return 'Completed';
  } else if (isTournamentActive(startDate, endDate)) {
    return 'Live';
  } else {
    return 'Upcoming';
  }
};

// Format duration between two dates
export const formatDuration = (startDate: Date, endDate: Date): string => {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return '1 day';
  } else if (diffDays < 7) {
    return `${diffDays} days`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    const remainingDays = diffDays % 7;
    if (remainingDays === 0) {
      return `${weeks} week${weeks > 1 ? 's' : ''}`;
    } else {
      return `${weeks} week${weeks > 1 ? 's' : ''}, ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
    }
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
};

// Parse ISO date string to Date object
export const parseISODate = (dateString: string): Date => {
  return new Date(dateString);
};

// Convert Date to ISO string for API calls
export const toISODateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};