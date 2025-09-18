/**
 * VIS API Timezone Enhancement Processor
 * Handles timezone field extraction and UTC conversion from VIS API responses
 * Integrates with Phase 1 TimezoneService for UTC conversion
 */

// Enhanced match time fields interface for VIS timezone data
export interface MatchTimeFields {
  BeginDateTimeUtc?: string;
  EndDateTimeUtc?: string;
  UtcDate?: string;
  UtcTime?: string;
  LocalDate?: string;
  LocalTime?: string;
  LocalTimeOffset?: string;
  TimeZone?: string;
}

// Tournament timezone context interface
export interface TournamentTimezoneContext {
  DefaultTimeZone?: string;
  DefaultLocalTimeOffset?: string;
  City?: string;
  Country?: string;
}

// UTC conversion result interface
export interface UtcConversionResult {
  utcStart: string | null;
  utcEnd: string | null;
  timezoneSource: 'BeginDateTimeUtc' | 'UtcDateTime' | 'LocalDateTime' | 'fallback';
  timezone: string | null;
  offset: string | null;
  isReliable: boolean;
}

/**
 * VIS API Timezone Enhancer
 * Processes timezone fields from VIS API responses with fallback logic
 */
export class VISApiTimezoneEnhancer {

  /**
   * Extract timezone fields from VIS match response using field priority cascade
   * Uses cached regex compilation for better performance
   */
  extractTimezoneFields(visMatchXml: string): MatchTimeFields {
    const getValue = this.createXmlValueExtractor(visMatchXml);

    return {
      BeginDateTimeUtc: getValue('BeginDateTimeUtc'),
      EndDateTimeUtc: getValue('EndDateTimeUtc'),
      UtcDate: getValue('UtcDate'),
      UtcTime: getValue('UtcTime'),
      LocalDate: getValue('LocalDate'),
      LocalTime: getValue('LocalTime'),
      LocalTimeOffset: getValue('LocalTimeOffset'),
      TimeZone: getValue('TimeZone'),
    };
  }

  /**
   * Extract tournament timezone defaults from VIS tournament response
   * Uses cached regex compilation for better performance
   */
  extractTournamentTimezoneDefaults(visTournamentXml: string): TournamentTimezoneContext {
    const getValue = this.createXmlValueExtractor(visTournamentXml);

    return {
      DefaultTimeZone: getValue('DefaultTimeZone'),
      DefaultLocalTimeOffset: getValue('DefaultLocalTimeOffset'),
      City: getValue('City'),
      Country: getValue('Country'),
    };
  }

  /**
   * Validate timezone field completeness and data quality
   */
  validateTimezoneData(fields: MatchTimeFields): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for UTC timestamp completeness
    if (fields.BeginDateTimeUtc) {
      if (!this.isValidISODateTime(fields.BeginDateTimeUtc)) {
        issues.push('BeginDateTimeUtc is not valid ISO format');
      }
    }

    if (fields.EndDateTimeUtc) {
      if (!this.isValidISODateTime(fields.EndDateTimeUtc)) {
        issues.push('EndDateTimeUtc is not valid ISO format');
      }
    }

    // Check for UTC date/time parts consistency
    if (fields.UtcDate && fields.UtcTime) {
      if (!this.isValidDate(fields.UtcDate)) {
        issues.push('UtcDate is not valid date format');
      }
      if (!this.isValidTime(fields.UtcTime)) {
        issues.push('UtcTime is not valid time format');
      }
    }

    // Check local time offset format
    if (fields.LocalTimeOffset && !this.isValidTimezoneOffset(fields.LocalTimeOffset)) {
      issues.push('LocalTimeOffset is not valid format (expected +/-HH:MM)');
    }

    // Check timezone string format
    if (fields.TimeZone && !this.isValidTimezoneString(fields.TimeZone)) {
      issues.push('TimeZone string appears invalid');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Convert VIS timezone data to UTC using field priority cascade
   * Priority: BeginDateTimeUtc > UtcDate+UtcTime > LocalDate+LocalTime+Offset
   * This is a lightweight version for Edge Function environment
   */
  convertToUtc(
    matchFields: MatchTimeFields,
    tournamentDefaults?: TournamentTimezoneContext
  ): UtcConversionResult {

    // Priority 1: BeginDateTimeUtc (highest priority)
    if (matchFields.BeginDateTimeUtc && this.isValidISODateTime(matchFields.BeginDateTimeUtc)) {
      return {
        utcStart: matchFields.BeginDateTimeUtc,
        utcEnd: matchFields.EndDateTimeUtc || null,
        timezoneSource: 'BeginDateTimeUtc',
        timezone: matchFields.TimeZone || tournamentDefaults?.DefaultTimeZone || null,
        offset: matchFields.LocalTimeOffset || tournamentDefaults?.DefaultLocalTimeOffset || null,
        isReliable: true,
      };
    }

    // Priority 2: UtcDate + UtcTime
    if (matchFields.UtcDate && matchFields.UtcTime &&
        this.isValidDate(matchFields.UtcDate) && this.isValidTime(matchFields.UtcTime)) {
      const utcDateTime = `${matchFields.UtcDate}T${matchFields.UtcTime}Z`;
      return {
        utcStart: utcDateTime,
        utcEnd: null, // EndDateTime would need similar construction
        timezoneSource: 'UtcDateTime',
        timezone: matchFields.TimeZone || tournamentDefaults?.DefaultTimeZone || null,
        offset: matchFields.LocalTimeOffset || tournamentDefaults?.DefaultLocalTimeOffset || null,
        isReliable: true,
      };
    }

    // Priority 3: LocalDate + LocalTime + Offset
    if (matchFields.LocalDate && matchFields.LocalTime &&
        this.isValidDate(matchFields.LocalDate) && this.isValidTime(matchFields.LocalTime)) {

      const offset = matchFields.LocalTimeOffset || tournamentDefaults?.DefaultLocalTimeOffset;
      if (offset && this.isValidTimezoneOffset(offset)) {
        try {
          const localDateTime = `${matchFields.LocalDate}T${matchFields.LocalTime}`;
          const utcDateTime = this.convertLocalToUtc(localDateTime, offset);
          return {
            utcStart: utcDateTime,
            utcEnd: null,
            timezoneSource: 'LocalDateTime',
            timezone: matchFields.TimeZone || tournamentDefaults?.DefaultTimeZone || null,
            offset: offset,
            isReliable: false, // Less reliable due to manual offset calculation
          };
        } catch (error) {
          console.warn('Failed to convert local time to UTC:', error);
        }
      }
    }

    // Fallback: Return null values but preserve available timezone information
    return {
      utcStart: null,
      utcEnd: null,
      timezoneSource: 'fallback',
      timezone: matchFields.TimeZone || tournamentDefaults?.DefaultTimeZone || null,
      offset: matchFields.LocalTimeOffset || tournamentDefaults?.DefaultLocalTimeOffset || null,
      isReliable: false,
    };
  }

  /**
   * Handle VIS API response variations gracefully
   */
  processMatchWithFallback(
    visMatchXml: string,
    tournamentDefaults?: TournamentTimezoneContext
  ): UtcConversionResult {
    try {
      const timezoneFields = this.extractTimezoneFields(visMatchXml);
      const validation = this.validateTimezoneData(timezoneFields);

      if (!validation.isValid) {
        console.warn('Timezone data validation issues:', validation.issues);
      }

      return this.convertToUtc(timezoneFields, tournamentDefaults);
    } catch (error) {
      console.error('Failed to process match timezone data:', error);

      // Return safe fallback result
      return {
        utcStart: null,
        utcEnd: null,
        timezoneSource: 'fallback',
        timezone: tournamentDefaults?.DefaultTimeZone || null,
        offset: tournamentDefaults?.DefaultLocalTimeOffset || null,
        isReliable: false,
      };
    }
  }

  /**
   * Create optimized XML value extractor with regex caching
   * Performance improvement for parsing multiple fields from same XML
   */
  private createXmlValueExtractor(xml: string): (tagName: string) => string | undefined {
    const regexCache = new Map<string, RegExp>();

    return (tagName: string): string | undefined => {
      let regex = regexCache.get(tagName);
      if (!regex) {
        regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`, 'i');
        regexCache.set(tagName, regex);
      }

      const match = xml.match(regex);
      return match?.[1]?.trim() || undefined;
    };
  }

  // Private validation helper methods
  private isValidISODateTime(datetime: string): boolean {
    // Check for ISO 8601 format with Z or timezone offset
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)$/;
    if (!isoRegex.test(datetime)) {
      return false;
    }

    // Validate the date is actually valid
    const date = new Date(datetime);
    return !isNaN(date.getTime());
  }

  private isValidDate(date: string): boolean {
    // Check for YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return false;
    }

    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  private isValidTime(time: string): boolean {
    // Check for HH:MM:SS or HH:MM format
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    if (!timeRegex.test(time)) {
      return false;
    }

    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours >= 0 && hours <= 23 &&
           minutes >= 0 && minutes <= 59 &&
           (seconds === undefined || (seconds >= 0 && seconds <= 59));
  }

  private isValidTimezoneOffset(offset: string): boolean {
    // Check for +/-HH:MM format
    const offsetRegex = /^[+-]\d{2}:\d{2}$/;
    if (!offsetRegex.test(offset)) {
      return false;
    }

    const hours = Math.abs(parseInt(offset.substr(1, 2)));
    const minutes = parseInt(offset.substr(4, 2));
    return hours <= 14 && minutes <= 59; // UTC-12 to UTC+14 are valid
  }

  private isValidTimezoneString(timezone: string): boolean {
    // Basic validation for timezone strings
    // Could be IANA format (America/Sao_Paulo) or abbreviation (BRT, EST)
    return timezone.length >= 3 && timezone.length <= 50 &&
           /^[A-Za-z/_-]+$/.test(timezone);
  }

  private convertLocalToUtc(localDateTime: string, offset: string): string {
    // Parse local datetime components manually to avoid timezone interpretation issues
    const dateTimeMatch = localDateTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
    if (!dateTimeMatch) {
      throw new Error(`Invalid local datetime format: ${localDateTime}`);
    }

    const [, year, month, day, hour, minute, second] = dateTimeMatch;

    // Create UTC date from components (treat input as if it were already UTC)
    const utcBase = new Date(Date.UTC(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    ));

    if (isNaN(utcBase.getTime())) {
      throw new Error(`Invalid local datetime: ${localDateTime}`);
    }

    // Parse offset (+/-HH:MM)
    const sign = offset[0] === '+' ? 1 : -1;
    const hours = parseInt(offset.substr(1, 2));
    const minutes = parseInt(offset.substr(4, 2));

    // Validate parsed offset values
    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error(`Invalid timezone offset format: ${offset}`);
    }

    const offsetMinutes = sign * (hours * 60 + minutes);

    // Convert local time to UTC by subtracting the timezone offset
    // If offset is -03:00 (UTC-3), local time is 3 hours behind UTC
    // So local 14:00 = UTC 17:00 (subtract -180 minutes = add 180 minutes)
    const utcTime = new Date(utcBase.getTime() - offsetMinutes * 60 * 1000);
    return utcTime.toISOString();
  }
}

/**
 * Legacy compatibility function for existing match parsing
 * Maintains backward compatibility while adding timezone enhancement
 */
export function enhanceMatchWithTimezone(
  matchXml: string,
  tournamentDefaults?: TournamentTimezoneContext
): { utcStart: string | null; utcEnd: string | null; timezone: string | null; isReliable: boolean } {
  const enhancer = new VISApiTimezoneEnhancer();
  const result = enhancer.processMatchWithFallback(matchXml, tournamentDefaults);

  return {
    utcStart: result.utcStart,
    utcEnd: result.utcEnd,
    timezone: result.timezone,
    isReliable: result.isReliable,
  };
}