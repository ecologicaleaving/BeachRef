import { DateTime, FixedOffsetZone } from 'luxon';
import { ConnectionCircuitBreaker, CircuitState } from './ConnectionCircuitBreaker';
import { ErrorLogger } from './ErrorLogger';

/**
 * VIS API timezone field priority cascade:
 * 1. BeginDateTimeUtc (UTC timestamp)
 * 2. UtcDate + UtcTime (UTC components)
 * 3. LocalDate + LocalTime + Offset (local time with offset)
 * 4. LocalDate + LocalTime (fallback to local time only)
 */
export interface VISTimezoneFields {
  BeginDateTimeUtc?: string;
  EndDateTimeUtc?: string;
  UtcDate?: string;
  UtcTime?: string;
  LocalDate?: string;
  LocalTime?: string;
  LocalTimeOffset?: string;
  TimeZone?: string;
}

/**
 * Tournament timezone metadata
 */
export interface TournamentTimezoneMetadata {
  timezone?: string;
  defaultOffset?: string;
  detectedTimezone?: string;
  lastTimezoneSync?: string;
}

/**
 * UTC conversion result with metadata
 */
export interface UTCConversionResult {
  utcStart: Date;
  utcEnd?: Date;
  sourceFields: string[];
  fallbackUsed: boolean;
  originalLocalTime?: string;
  originalLocalDate?: string;
  detectedTimezone?: string;
  conversionAccuracy: 'high' | 'medium' | 'low';
}

/**
 * Performance metrics for timezone calculations
 */
interface TimezonePerformanceMetrics {
  conversionTime: number;
  fallbackCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
}

/**
 * Common VIS timezone strings to IANA timezone mapping
 */
const VIS_TIMEZONE_MAPPING: Record<string, string> = {
  // Brazil timezones
  'BRT': 'America/Sao_Paulo',        // Brazil Time
  'BRST': 'America/Sao_Paulo',       // Brazil Summer Time
  'America/Sao_Paulo': 'America/Sao_Paulo',
  'America/Brasilia': 'America/Sao_Paulo',
  'South America/Brazil': 'America/Sao_Paulo',

  // European timezones
  'CET': 'Europe/Rome',              // Central European Time
  'CEST': 'Europe/Rome',             // Central European Summer Time
  'Europe/Rome': 'Europe/Rome',
  'Europe/Italy': 'Europe/Rome',
  'GMT+1': 'Europe/Rome',
  'UTC+1': 'Europe/Rome',
  'GMT+2': 'Europe/Rome',            // Summer time
  'UTC+2': 'Europe/Rome',

  // US timezones
  'EST': 'America/New_York',
  'EDT': 'America/New_York',
  'PST': 'America/Los_Angeles',
  'PDT': 'America/Los_Angeles',
  'CST': 'America/Chicago',
  'CDT': 'America/Chicago',
  'MST': 'America/Denver',
  'MDT': 'America/Denver',

  // Asian timezones
  'JST': 'Asia/Tokyo',
  'KST': 'Asia/Seoul',
  'CST': 'Asia/Shanghai',            // China Standard Time
  'SGT': 'Asia/Singapore',

  // UTC variants
  'UTC': 'UTC',
  'GMT': 'UTC',
  'Z': 'UTC',
  '+00:00': 'UTC',
};

/**
 * TimezoneService - Foundation service for UTC-centric timezone handling
 *
 * Implements VIS API field priority cascade and provides comprehensive
 * timezone conversion with fallback logic for BeachRef application.
 *
 * Follows existing service patterns:
 * - Static class methods like TournamentStorageService
 * - Circuit breaker integration for resilience
 * - Comprehensive error handling with ErrorLogger
 * - Performance monitoring and caching
 */
export class TimezoneService {
  private static circuitBreaker = ConnectionCircuitBreaker.getInstance('timezone-service', {
    failureThreshold: 3,
    recoveryTimeout: 10000,
    successThreshold: 2,
  });

  private static performanceMetrics: TimezonePerformanceMetrics = {
    conversionTime: 0,
    fallbackCount: 0,
    successCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
  };

  /**
   * Convert VIS API time data to UTC using field priority cascade
   *
   * Priority:
   * 1. BeginDateTimeUtc > EndDateTimeUtc (direct UTC)
   * 2. UtcDate + UtcTime (UTC components)
   * 3. LocalDate + LocalTime + LocalTimeOffset (with offset)
   * 4. LocalDate + LocalTime (fallback, assumes local timezone)
   *
   * @param fields VIS API timezone fields
   * @param tournamentTimezone Optional tournament timezone metadata
   * @returns UTC conversion result with metadata
   */
  static async convertToUTC(
    fields: VISTimezoneFields,
    tournamentTimezone?: TournamentTimezoneMetadata
  ): Promise<UTCConversionResult> {
    const startTime = Date.now();

    try {
      if (!this.circuitBreaker.canExecute()) {
        throw new Error('Timezone service circuit breaker is open');
      }

      const result = await this.performUTCConversion(fields, tournamentTimezone);

      this.circuitBreaker.onSuccess();
      this.updatePerformanceMetrics(Date.now() - startTime, true);

      return result;
    } catch (error) {
      this.circuitBreaker.onFailure(error instanceof Error ? error.message : 'Unknown error');
      this.updatePerformanceMetrics(Date.now() - startTime, false);

      await ErrorLogger.logError(error as Error, {
        context: 'TimezoneService.convertToUTC',
        fields,
        tournamentTimezone,
      });

      // Return fallback result
      return this.createFallbackResult(fields);
    }
  }

  /**
   * Core UTC conversion logic implementing VIS field priority cascade
   */
  private static async performUTCConversion(
    fields: VISTimezoneFields,
    tournamentTimezone?: TournamentTimezoneMetadata
  ): Promise<UTCConversionResult> {
    // Priority 1: Direct UTC timestamps
    if (fields.BeginDateTimeUtc) {
      const utcStart = this.parseUTCTimestamp(fields.BeginDateTimeUtc);
      const utcEnd = fields.EndDateTimeUtc ? this.parseUTCTimestamp(fields.EndDateTimeUtc) : undefined;

      return {
        utcStart,
        utcEnd,
        sourceFields: ['BeginDateTimeUtc', fields.EndDateTimeUtc ? 'EndDateTimeUtc' : ''].filter(Boolean),
        fallbackUsed: false,
        conversionAccuracy: 'high',
      };
    }

    // Priority 2: UTC date + time components
    if (fields.UtcDate && fields.UtcTime) {
      const utcStart = this.parseUTCComponents(fields.UtcDate, fields.UtcTime);

      return {
        utcStart,
        sourceFields: ['UtcDate', 'UtcTime'],
        fallbackUsed: false,
        conversionAccuracy: 'high',
      };
    }

    // Priority 3: Local date/time with offset
    if (fields.LocalDate && fields.LocalTime && fields.LocalTimeOffset) {
      const result = this.convertLocalTimeWithOffset(
        fields.LocalDate,
        fields.LocalTime,
        fields.LocalTimeOffset
      );

      return {
        utcStart: result.utcStart,
        sourceFields: ['LocalDate', 'LocalTime', 'LocalTimeOffset'],
        fallbackUsed: false,
        originalLocalDate: fields.LocalDate,
        originalLocalTime: fields.LocalTime,
        conversionAccuracy: 'medium',
      };
    }

    // Priority 4: Local date/time with timezone
    if (fields.LocalDate && fields.LocalTime && (fields.TimeZone || tournamentTimezone?.timezone)) {
      const timezone = fields.TimeZone || tournamentTimezone?.timezone;
      const ianaTimezone = this.mapVISTimezoneToIANA(timezone!);

      const result = this.convertLocalTimeWithTimezone(
        fields.LocalDate,
        fields.LocalTime,
        ianaTimezone
      );

      return {
        utcStart: result.utcStart,
        sourceFields: ['LocalDate', 'LocalTime', fields.TimeZone ? 'TimeZone' : 'tournamentTimezone'],
        fallbackUsed: false,
        originalLocalDate: fields.LocalDate,
        originalLocalTime: fields.LocalTime,
        detectedTimezone: ianaTimezone,
        conversionAccuracy: 'medium',
      };
    }

    // Fallback: Local date/time only (low accuracy)
    if (fields.LocalDate && fields.LocalTime) {
      const utcStart = this.parseLocalDateTimeAsUTC(fields.LocalDate, fields.LocalTime);

      return {
        utcStart,
        sourceFields: ['LocalDate', 'LocalTime'],
        fallbackUsed: true,
        originalLocalDate: fields.LocalDate,
        originalLocalTime: fields.LocalTime,
        conversionAccuracy: 'low',
      };
    }

    throw new Error('Insufficient time data for UTC conversion');
  }

  /**
   * Parse UTC timestamp (ISO 8601 format)
   */
  private static parseUTCTimestamp(utcTimestamp: string): Date {
    const dt = DateTime.fromISO(utcTimestamp, { zone: 'utc' });
    if (!dt.isValid) {
      throw new Error(`Invalid UTC timestamp: ${utcTimestamp}`);
    }
    return dt.toJSDate();
  }

  /**
   * Parse UTC date and time components
   */
  private static parseUTCComponents(utcDate: string, utcTime: string): Date {
    const dt = DateTime.fromISO(`${utcDate}T${utcTime}`, { zone: 'utc' });
    if (!dt.isValid) {
      throw new Error(`Invalid UTC date/time: ${utcDate} ${utcTime}`);
    }
    return dt.toJSDate();
  }

  /**
   * Convert local date/time with offset to UTC
   */
  private static convertLocalTimeWithOffset(
    localDate: string,
    localTime: string,
    offset: string
  ): { utcStart: Date } {
    // Parse offset (e.g., "+03:00", "-05:00", "+0300")
    const offsetMinutes = this.parseTimezoneOffset(offset);
    const zone = FixedOffsetZone.instance(offsetMinutes);

    const dt = DateTime.fromISO(`${localDate}T${localTime}`, { zone });
    if (!dt.isValid) {
      throw new Error(`Invalid local date/time with offset: ${localDate} ${localTime} ${offset}`);
    }

    return { utcStart: dt.toUTC().toJSDate() };
  }

  /**
   * Convert local date/time with timezone to UTC
   */
  private static convertLocalTimeWithTimezone(
    localDate: string,
    localTime: string,
    timezone: string
  ): { utcStart: Date } {
    const dt = DateTime.fromISO(`${localDate}T${localTime}`, { zone: timezone });
    if (!dt.isValid) {
      throw new Error(`Invalid local date/time with timezone: ${localDate} ${localTime} ${timezone}`);
    }

    return { utcStart: dt.toUTC().toJSDate() };
  }

  /**
   * Parse local date/time as UTC (fallback with low accuracy)
   */
  private static parseLocalDateTimeAsUTC(localDate: string, localTime: string): Date {
    const dt = DateTime.fromISO(`${localDate}T${localTime}`, { zone: 'utc' });
    if (!dt.isValid) {
      throw new Error(`Invalid local date/time: ${localDate} ${localTime}`);
    }
    return dt.toJSDate();
  }

  /**
   * Parse timezone offset string to minutes
   * Supports formats: "+03:00", "-05:00", "+0300", "-0500", "+3", "-5"
   */
  private static parseTimezoneOffset(offset: string): number {
    const cleaned = offset.replace(/[^\+\-\d:]/g, '');

    // Match patterns like +03:00, -05:00, +0300, -0500, +3, -5
    const match = cleaned.match(/^([+\-])(\d{1,2}):?(\d{2})?$/);
    if (!match) {
      throw new Error(`Invalid timezone offset format: ${offset}`);
    }

    const [, sign, hours, minutes = '00'] = match;
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);

    return sign === '+' ? totalMinutes : -totalMinutes;
  }

  /**
   * Map VIS timezone string to IANA timezone identifier
   */
  private static mapVISTimezoneToIANA(visTimezone: string): string {
    const normalized = visTimezone.trim();

    // Direct mapping
    if (VIS_TIMEZONE_MAPPING[normalized]) {
      return VIS_TIMEZONE_MAPPING[normalized];
    }

    // Try case-insensitive mapping
    const lowerCase = normalized.toLowerCase();
    for (const [key, value] of Object.entries(VIS_TIMEZONE_MAPPING)) {
      if (key.toLowerCase() === lowerCase) {
        return value;
      }
    }

    // If it looks like an IANA timezone (contains '/'), assume it's valid
    if (normalized.includes('/')) {
      return normalized;
    }

    // Default fallback
    console.warn(`Unknown VIS timezone: ${visTimezone}, using UTC`);
    return 'UTC';
  }

  /**
   * Create fallback result when conversion fails
   */
  private static createFallbackResult(fields: VISTimezoneFields): UTCConversionResult {
    this.performanceMetrics.fallbackCount++;

    // Try to create a minimal fallback using LocalDate/LocalTime
    if (fields.LocalDate && fields.LocalTime) {
      const utcStart = this.parseLocalDateTimeAsUTC(fields.LocalDate, fields.LocalTime);

      return {
        utcStart,
        sourceFields: ['LocalDate', 'LocalTime'],
        fallbackUsed: true,
        originalLocalDate: fields.LocalDate,
        originalLocalTime: fields.LocalTime,
        conversionAccuracy: 'low',
      };
    }

    // Ultimate fallback - current time
    return {
      utcStart: new Date(),
      sourceFields: [],
      fallbackUsed: true,
      conversionAccuracy: 'low',
    };
  }

  /**
   * Update performance metrics
   */
  private static updatePerformanceMetrics(responseTime: number, success: boolean): void {
    const metrics = this.performanceMetrics;

    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }

    const totalOperations = metrics.successCount + metrics.errorCount;
    metrics.averageResponseTime = (
      (metrics.averageResponseTime * (totalOperations - 1) + responseTime) / totalOperations
    );

    metrics.conversionTime = responseTime;
  }

  /**
   * Get performance metrics
   */
  static getPerformanceMetrics(): Readonly<TimezonePerformanceMetrics> {
    return { ...this.performanceMetrics };
  }

  /**
   * Check if service is healthy (for monitoring)
   */
  static isHealthy(): boolean {
    return this.circuitBreaker.isHealthy();
  }

  /**
   * Get circuit breaker state
   */
  static getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset performance metrics (for testing)
   */
  static resetMetrics(): void {
    this.performanceMetrics = {
      conversionTime: 0,
      fallbackCount: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Validate UTC conversion result
   */
  static validateUTCResult(result: UTCConversionResult): boolean {
    if (!result.utcStart || isNaN(result.utcStart.getTime())) {
      return false;
    }

    if (result.utcEnd && isNaN(result.utcEnd.getTime())) {
      return false;
    }

    // Check if start time is reasonable (not too far in past/future)
    const now = new Date();
    const diffYears = Math.abs(now.getFullYear() - result.utcStart.getFullYear());
    if (diffYears > 5) {
      return false;
    }

    return true;
  }

  /**
   * Test timezone conversion with real VIS API data
   * Used for validation and testing purposes
   */
  static async testWithVISData(
    testData: VISTimezoneFields[],
    expectedResults?: UTCConversionResult[]
  ): Promise<{
    passed: number;
    failed: number;
    averageTime: number;
    results: UTCConversionResult[];
  }> {
    const results: UTCConversionResult[] = [];
    let passed = 0;
    let failed = 0;
    let totalTime = 0;

    for (let i = 0; i < testData.length; i++) {
      const startTime = Date.now();

      try {
        const result = await this.convertToUTC(testData[i]);
        results.push(result);

        if (this.validateUTCResult(result)) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        results.push(this.createFallbackResult(testData[i]));
      }

      totalTime += Date.now() - startTime;
    }

    return {
      passed,
      failed,
      averageTime: totalTime / testData.length,
      results,
    };
  }
}