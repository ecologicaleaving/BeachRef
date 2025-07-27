/**
 * Utility functions for formatting data display
 */

// Date formatting
export const formatDate = (dateString: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

// Time formatting
export const formatTime = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: 'short'
  });
};

// Date range formatting
export const formatDateRange = (startDate: string | Date, endDate?: string | Date): string => {
  const start = formatDate(startDate);
  
  if (!endDate) return start;
  
  const end = formatDate(endDate);
  return start === end ? start : `${start} - ${end}`;
};

// Number formatting
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

// Score formatting for volleyball
export const formatScore = (score1: number, score2: number): string => {
  return `${score1} - ${score2}`;
};

// Duration formatting (in minutes)
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// Status formatting and styling
export const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case 'live':
    case 'ongoing':
      return {
        variant: 'destructive' as const,
        className: 'badge-live'
      };
    case 'completed':
    case 'finished':
      return {
        variant: 'secondary' as const,
        className: 'badge-completed'
      };
    case 'upcoming':
    case 'scheduled':
    default:
      return {
        variant: 'outline' as const,
        className: 'badge-upcoming'
      };
  }
};

// Empty state messages
export const getEmptyStateMessage = (context: string, isFiltered: boolean = false): string => {
  const messages = {
    tournaments: isFiltered 
      ? "No tournaments match your current filters. Try adjusting your search criteria."
      : "No tournaments are currently available. Check back later for updates.",
    matches: isFiltered
      ? "No matches found for the selected tournament."
      : "No matches are currently scheduled.",
    results: "No results available yet."
  };
  
  return messages[context as keyof typeof messages] || "No data available.";
};

// Validation helpers
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

export const isEmptyOrWhitespace = (value: string | null | undefined): boolean => {
  return !value || value.trim().length === 0;
};