import { Tournament } from '../types/tournament';

export interface TournamentDateInfo {
  startDate?: string;
  endDate?: string;
  dateRange?: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
  hasValidDates: boolean;
}

export class TournamentDateExtractor {
  /**
   * Extract start and end dates for tournaments that may not have matches yet
   * Uses multiple fallback strategies to find date information
   * Automatically sets end date to next Sunday if only start date is available
   */
  static extractTournamentDates(tournament: Tournament): TournamentDateInfo {
    console.log(`🗓️ Extracting dates for tournament: ${tournament.Name} (${tournament.No})`);
    
    // Strategy 1: Direct StartDate/EndDate fields (highest confidence)
    if (tournament.StartDate || tournament.EndDate) {
      console.log('📅 Found direct StartDate/EndDate fields');
      
      let startDate = tournament.StartDate;
      let endDate = tournament.EndDate;
      
      // If we have start date but no end date, set end date to next Sunday
      if (startDate && !endDate) {
        endDate = this.getNextSunday(startDate);
        console.log(`📅 Auto-calculated end date to next Sunday: ${endDate}`);
      }
      
      return {
        startDate,
        endDate,
        dateRange: this.formatDateRange(startDate, endDate),
        confidence: 'high',
        source: 'Direct StartDate/EndDate fields',
        hasValidDates: !!(startDate || endDate)
      };
    }

    // Strategy 2: Dates field (medium confidence)
    if (tournament.Dates) {
      console.log('📅 Found Dates field:', tournament.Dates);
      const parsedDates = this.parseDatesField(tournament.Dates);
      if (parsedDates.startDate || parsedDates.endDate) {
        let startDate = parsedDates.startDate;
        let endDate = parsedDates.endDate;
        
        // If we have start date but no end date, set end date to next Sunday
        if (startDate && !endDate) {
          endDate = this.getNextSunday(startDate);
          console.log(`📅 Auto-calculated end date to next Sunday: ${endDate}`);
        }
        
        return {
          startDate,
          endDate,
          dateRange: this.formatDateRange(startDate, endDate),
          confidence: 'medium',
          source: 'Dates field parsing',
          hasValidDates: true
        };
      }
    }

    // Strategy 3: Extract from tournament name (low confidence)
    const nameBasedDates = this.extractDatesFromName(tournament.Name || tournament.Title);
    if (nameBasedDates.startDate || nameBasedDates.endDate) {
      console.log('📅 Extracted dates from name:', nameBasedDates);
      return {
        startDate: nameBasedDates.startDate,
        endDate: nameBasedDates.endDate,
        dateRange: nameBasedDates.dateRange,
        confidence: 'low',
        source: 'Tournament name extraction',
        hasValidDates: true
      };
    }

    // Strategy 4: Use merged tournaments dates if available
    if ((tournament as any)._mergedTournaments?.length) {
      console.log('📅 Checking merged tournaments for dates');
      const mergedDates = this.extractFromMergedTournaments((tournament as any)._mergedTournaments);
      if (mergedDates.startDate || mergedDates.endDate) {
        return {
          startDate: mergedDates.startDate,
          endDate: mergedDates.endDate,
          dateRange: mergedDates.dateRange,
          confidence: 'medium',
          source: 'Merged tournaments data',
          hasValidDates: true
        };
      }
    }

    // Strategy 5: Use EntryDeadline as a reference point (very low confidence)
    if (tournament.EntryDeadline) {
      console.log('📅 Using EntryDeadline as reference:', tournament.EntryDeadline);
      const estimatedDates = this.estimateDatesFromDeadline(tournament.EntryDeadline);
      return {
        startDate: estimatedDates.startDate,
        endDate: estimatedDates.endDate,
        dateRange: estimatedDates.dateRange,
        confidence: 'low',
        source: 'Entry deadline estimation',
        hasValidDates: true
      };
    }

    console.log('📅 No date information found');
    return {
      confidence: 'low',
      source: 'No date information available',
      hasValidDates: false
    };
  }

  /**
   * Format date range string using compact format: ggStart - ggEnd / MM / YY
   */
  private static formatDateRange(startDate?: string, endDate?: string): string | undefined {
    if (!startDate && !endDate) return undefined;
    
    if (startDate && endDate) {
      if (startDate === endDate) {
        return this.formatCompactDate(startDate);
      }
      return this.formatCompactDateRange(startDate, endDate);
    }
    
    return this.formatCompactDate(startDate || endDate);
  }

  /**
   * Format a single date using compact format: GG Month (3-letter month)
   */
  private static formatCompactDate(dateStr?: string): string {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const monthName = this.getMonthNameShort(date.getMonth());
      
      return `${day} ${monthName}`;
    } catch {
      return dateStr;
    }
  }

  /**
   * Format date range using compact format: GG - GG Month (3-letter month name)
   */
  private static formatCompactDateRange(startDate: string, endDate: string): string {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const startDay = start.getDate().toString().padStart(2, '0');
      const endDay = end.getDate().toString().padStart(2, '0');
      const monthName = this.getMonthNameShort(start.getMonth());
      
      // If same date, show as single date
      if (startDate === endDate) {
        return `${startDay} ${monthName}`;
      }
      
      // Check if they're in the same month/year
      if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${startDay} - ${endDay} ${monthName}`;
      } else {
        // Different months - show month for each date
        const endMonthName = this.getMonthNameShort(end.getMonth());
        return `${startDay} ${monthName} - ${endDay} ${endMonthName}`;
      }
    } catch {
      return `${startDate} - ${endDate}`;
    }
  }

  /**
   * Format a single date string (legacy method for backwards compatibility)
   */
  private static formatSingleDate(dateStr?: string): string {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  /**
   * Parse the Dates field which might contain various formats
   */
  private static parseDatesField(datesField: string): { startDate?: string; endDate?: string; dateRange?: string } {
    // Handle formats like "2024-03-15 - 2024-03-17" or "March 15-17, 2024"
    const isoDateRange = datesField.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (isoDateRange) {
      return {
        startDate: isoDateRange[1],
        endDate: isoDateRange[2],
        dateRange: datesField
      };
    }

    // Handle single ISO date
    const singleIsoDate = datesField.match(/(\d{4}-\d{2}-\d{2})/);
    if (singleIsoDate) {
      return {
        startDate: singleIsoDate[1],
        dateRange: datesField
      };
    }

    // Return as-is if we can't parse it
    return { dateRange: datesField };
  }

  /**
   * Extract dates from tournament name (looking for patterns like "March 2024" or "15-17 March 2024")
   */
  private static extractDatesFromName(name?: string): { startDate?: string; endDate?: string; dateRange?: string } {
    if (!name) return {};


    // Look for month/year patterns
    const monthYearPattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i;
    const monthYearMatch = name.match(monthYearPattern);
    
    if (monthYearMatch) {
      const month = monthYearMatch[1];
      const year = monthYearMatch[2];
      
      // Try to extract day range like "15-17 March 2024"
      const dayRangePattern = new RegExp(`(\\d{1,2})[-–](\\d{1,2})\\s+${month}\\s+${year}`, 'i');
      const dayRangeMatch = name.match(dayRangePattern);
      
      if (dayRangeMatch) {
        const startDay = dayRangeMatch[1];
        const endDay = dayRangeMatch[2];
        const monthNum = this.getMonthNumber(month);
        
        const startDateISO = `${year}-${monthNum.toString().padStart(2, '0')}-${startDay.padStart(2, '0')}`;
        const endDateISO = `${year}-${monthNum.toString().padStart(2, '0')}-${endDay.padStart(2, '0')}`;
        
        return {
          startDate: startDateISO,
          endDate: endDateISO,
          dateRange: this.formatCompactDateRange(startDateISO, endDateISO)
        };
      }
      
      // Just month/year - estimate first and last day of month
      const monthNum = this.getMonthNumber(month);
      const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
      
      const startDateISO = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
      const endDateISO = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      
      return {
        startDate: startDateISO,
        endDate: endDateISO,
        dateRange: this.formatCompactDateRange(startDateISO, endDateISO)
      };
    }

    return {};
  }

  /**
   * Get month number from month name
   */
  private static getMonthNumber(monthName: string): number {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return months.indexOf(monthName.toLowerCase()) + 1;
  }

  /**
   * Get 3-letter month name from month index (0-11)
   */
  private static getMonthNameShort(monthIndex: number): string {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return monthNames[monthIndex] || 'Jan';
  }

  /**
   * Extract dates from merged tournaments
   */
  private static extractFromMergedTournaments(mergedTournaments: any[]): { startDate?: string; endDate?: string; dateRange?: string } {
    const dates = mergedTournaments
      .map(t => ({ start: t.StartDate, end: t.EndDate }))
      .filter(d => d.start || d.end);
    
    if (dates.length === 0) return {};
    
    const startDates = dates.map(d => d.start).filter(Boolean).sort();
    const endDates = dates.map(d => d.end).filter(Boolean).sort();
    
    const earliestStart = startDates[0];
    const latestEnd = endDates[endDates.length - 1];
    
    return {
      startDate: earliestStart,
      endDate: latestEnd,
      dateRange: this.formatDateRange(earliestStart, latestEnd)
    };
  }

  /**
   * Estimate tournament dates based on entry deadline (tournaments usually start 1-2 weeks after deadline)
   */
  private static estimateDatesFromDeadline(entryDeadline: string): { startDate?: string; endDate?: string; dateRange?: string } {
    try {
      const deadline = new Date(entryDeadline);
      
      // Estimate tournament starts 1-2 weeks after entry deadline
      const estimatedStart = new Date(deadline);
      estimatedStart.setDate(deadline.getDate() + 10); // 10 days after deadline
      
      // Estimate tournament duration of 3 days (typical for beach volleyball)
      const estimatedEnd = new Date(estimatedStart);
      estimatedEnd.setDate(estimatedStart.getDate() + 2);
      
      const startDate = estimatedStart.toISOString().split('T')[0];
      const endDate = estimatedEnd.toISOString().split('T')[0];
      
      return {
        startDate,
        endDate,
        dateRange: `${this.formatCompactDateRange(startDate, endDate)} (estimated)`
      };
    } catch {
      return {};
    }
  }

  /**
   * Check if a tournament is currently active based on extracted dates
   */
  static isTournamentActive(dateInfo: TournamentDateInfo): boolean {
    if (!dateInfo.hasValidDates) return false;
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (dateInfo.startDate && dateInfo.endDate) {
      return today >= dateInfo.startDate && today <= dateInfo.endDate;
    }
    
    if (dateInfo.startDate) {
      // If only start date, consider active for next 7 days
      const start = new Date(dateInfo.startDate);
      const weekAfter = new Date(start);
      weekAfter.setDate(start.getDate() + 7);
      
      return now >= start && now <= weekAfter;
    }
    
    return false;
  }

  /**
   * Get tournament status based on extracted dates
   */
  static getTournamentStatus(dateInfo: TournamentDateInfo): 'upcoming' | 'live' | 'completed' | 'unknown' {
    if (!dateInfo.hasValidDates) return 'unknown';
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (dateInfo.startDate) {
      if (today < dateInfo.startDate) {
        return 'upcoming';
      }
      
      if (dateInfo.endDate) {
        if (today > dateInfo.endDate) {
          return 'completed';
        }
        if (today >= dateInfo.startDate && today <= dateInfo.endDate) {
          return 'live';
        }
      } else {
        // Only start date available - consider live for reasonable duration
        const start = new Date(dateInfo.startDate);
        const weekAfter = new Date(start);
        weekAfter.setDate(start.getDate() + 7);
        
        if (now >= start && now <= weekAfter) {
          return 'live';
        }
        if (now > weekAfter) {
          return 'completed';
        }
      }
    }
    
    return 'unknown';
  }

  /**
   * Get the next Sunday after a given date (or the same date if it's already Sunday)
   * Returns ISO date string (YYYY-MM-DD)
   */
  private static getNextSunday(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // If it's already Sunday, keep the same date
      if (dayOfWeek === 0) {
        return dateStr;
      }
      
      // Calculate days until next Sunday
      const daysUntilSunday = 7 - dayOfWeek;
      const nextSunday = new Date(date);
      nextSunday.setDate(date.getDate() + daysUntilSunday);
      
      return nextSunday.toISOString().split('T')[0];
    } catch {
      // If date parsing fails, return the original date
      return dateStr;
    }
  }
}