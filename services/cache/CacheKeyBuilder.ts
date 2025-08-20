/**
 * @fileoverview Cache Key Builder v2
 * Semantic cache key generation for stable, timestamp-free cache keys
 * Part of EPIC-007 Data Architecture Restructuration
 */

import { ICacheKeyBuilder, CacheKey, createCacheKey } from '../../types/cache-v2';

/**
 * Cache Key Builder implementation
 * Generates semantic cache keys in format: {resource}_{filters}_{version}
 * Example: "tournaments_current_type_fivb_gender_w_v1"
 * 
 * Eliminates timestamp pollution that caused 30% hit rate in old system
 */
export class CacheKeyBuilder implements ICacheKeyBuilder {
  private readonly version: number = 1;
  private readonly keyVersion = `v${this.version}`;

  /**
   * Build cache key for tournament list
   * Creates stable keys based on filters, not timestamps
   */
  tournamentList(filters: Record<string, any>): CacheKey {
    const parts = ['tournaments'];
    
    // Add filter components in consistent order
    if (filters.status) {
      parts.push(`status_${this.normalizeValue(filters.status)}`);
    } else {
      parts.push('current'); // Default for active tournaments
    }
    
    if (filters.type || filters.tournamentType) {
      const type = filters.type || filters.tournamentType;
      parts.push(`type_${this.normalizeValue(type)}`);
    }
    
    if (filters.gender) {
      parts.push(`gender_${this.normalizeValue(filters.gender)}`);
    }
    
    if (filters.country || filters.countryCode) {
      const country = filters.country || filters.countryCode;
      parts.push(`country_${this.normalizeValue(country)}`);
    }
    
    if (filters.dateRange) {
      parts.push(`dates_${this.normalizeDateRange(filters.dateRange)}`);
    }
    
    if (filters.limit) {
      parts.push(`limit_${filters.limit}`);
    }
    
    // Add version
    parts.push(this.keyVersion);
    
    const key = parts.join('_');
    return createCacheKey(key);
  }

  /**
   * Build cache key for tournament details
   * Single tournament data with location and officials
   */
  tournamentDetail(tournamentId: string): CacheKey {
    const normalizedId = this.normalizeValue(tournamentId);
    const key = `tournament_detail_${normalizedId}_${this.keyVersion}`;
    return createCacheKey(key);
  }

  /**
   * Build cache key for match list
   * Tournament matches with optional filters
   */
  matchList(tournamentId: string, filters?: Record<string, any>): CacheKey {
    const parts = ['matches', `tournament_${this.normalizeValue(tournamentId)}`];
    
    if (filters?.status) {
      parts.push(`status_${this.normalizeValue(filters.status)}`);
    }
    
    if (filters?.court || filters?.courtNo) {
      const court = filters.court || filters.courtNo;
      parts.push(`court_${this.normalizeValue(court)}`);
    }
    
    if (filters?.round) {
      parts.push(`round_${this.normalizeValue(filters.round)}`);
    }
    
    if (filters?.date || filters?.dateRange) {
      const dateFilter = filters.date || filters.dateRange;
      parts.push(`date_${this.normalizeDateRange(dateFilter)}`);
    }
    
    if (filters?.includeResults !== undefined) {
      parts.push(`results_${filters.includeResults ? 'yes' : 'no'}`);
    }
    
    // Add version
    parts.push(this.keyVersion);
    
    const key = parts.join('_');
    return createCacheKey(key);
  }

  /**
   * Build cache key for referee assignments
   * Referee-specific data with date range
   */
  refereeAssignments(refereeId: string, dateRange?: Record<string, any>): CacheKey {
    const parts = ['referee_assignments', `ref_${this.normalizeValue(refereeId)}`];
    
    if (dateRange) {
      parts.push(`dates_${this.normalizeDateRange(dateRange)}`);
    } else {
      parts.push('current'); // Default for current assignments
    }
    
    // Add version
    parts.push(this.keyVersion);
    
    const key = parts.join('_');
    return createCacheKey(key);
  }

  /**
   * Build versioned cache key
   * Allows for cache invalidation via version bumping
   */
  withVersion(baseKey: string, version: number): CacheKey {
    // Remove existing version if present
    const cleanKey = baseKey.replace(/_v\d+$/, '');
    const versionedKey = `${cleanKey}_v${version}`;
    return createCacheKey(versionedKey);
  }

  /**
   * Build cache key for VIS API responses
   * Raw API response caching with endpoint and parameters
   */
  apiResponse(endpoint: string, params: Record<string, any>): CacheKey {
    const parts = ['api', this.normalizeValue(endpoint)];
    
    // Add parameter hash for unique identification
    const paramHash = this.hashParameters(params);
    parts.push(`params_${paramHash}`);
    
    // Add version
    parts.push(this.keyVersion);
    
    const key = parts.join('_');
    return createCacheKey(key);
  }

  /**
   * Build cache key for user preferences
   * User-specific settings and filters
   */
  userPreferences(userId: string, preferencesType: string): CacheKey {
    const parts = [
      'user_prefs',
      `user_${this.normalizeValue(userId)}`,
      `type_${this.normalizeValue(preferencesType)}`
    ];
    
    // Add version
    parts.push(this.keyVersion);
    
    const key = parts.join('_');
    return createCacheKey(key);
  }

  /**
   * Build cache key for search results
   * Search query results with filters
   */
  searchResults(query: string, filters: Record<string, any>): CacheKey {
    const parts = ['search', `query_${this.normalizeValue(query)}`];
    
    // Add filter components
    Object.keys(filters)
      .sort() // Consistent ordering
      .forEach(filterKey => {
        if (filters[filterKey] !== undefined && filters[filterKey] !== null) {
          parts.push(`${filterKey}_${this.normalizeValue(filters[filterKey])}`);
        }
      });
    
    // Add version
    parts.push(this.keyVersion);
    
    const key = parts.join('_');
    return createCacheKey(key);
  }

  /**
   * Build cache key for aggregated data
   * Statistics, counts, summaries
   */
  aggregatedData(aggregationType: string, filters: Record<string, any>): CacheKey {
    const parts = ['aggregated', this.normalizeValue(aggregationType)];
    
    // Add filter components in consistent order
    Object.keys(filters)
      .sort()
      .forEach(filterKey => {
        if (filters[filterKey] !== undefined && filters[filterKey] !== null) {
          parts.push(`${filterKey}_${this.normalizeValue(filters[filterKey])}`);
        }
      });
    
    // Add version
    parts.push(this.keyVersion);
    
    const key = parts.join('_');
    return createCacheKey(key);
  }

  /**
   * Normalize value for consistent key generation
   * Handles case sensitivity, special characters, and null values
   */
  private normalizeValue(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special characters
      .substring(0, 50); // Limit length
  }

  /**
   * Normalize date range for consistent key generation
   * Converts date objects/strings to consistent format
   */
  private normalizeDateRange(dateRange: any): string {
    if (!dateRange) return 'any';
    
    // Handle single date
    if (typeof dateRange === 'string') {
      return this.normalizeDate(dateRange);
    }
    
    // Handle date range object
    if (typeof dateRange === 'object') {
      const start = dateRange.start || dateRange.startDate || dateRange.from;
      const end = dateRange.end || dateRange.endDate || dateRange.to;
      
      if (start && end) {
        return `${this.normalizeDate(start)}_${this.normalizeDate(end)}`;
      }
      
      if (start) {
        return `from_${this.normalizeDate(start)}`;
      }
      
      if (end) {
        return `to_${this.normalizeDate(end)}`;
      }
    }
    
    return 'any';
  }

  /**
   * Normalize single date to consistent format
   */
  private normalizeDate(date: any): string {
    if (!date) return 'any';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'invalid';
      
      // Return YYYYMMDD format
      return dateObj.toISOString().split('T')[0].replace(/-/g, '');
    } catch {
      return 'invalid';
    }
  }

  /**
   * Hash parameters for consistent key generation
   * Creates short hash from parameter object
   */
  private hashParameters(params: Record<string, any>): string {
    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys
      .map(key => `${key}=${this.normalizeValue(params[key])}`)
      .join('&');
    
    // Simple hash function (would use proper hash in production)
    let hash = 0;
    for (let i = 0; i < paramString.length; i++) {
      const char = paramString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  /**
   * Validate cache key format
   * Ensures generated keys meet format requirements
   */
  private validateKey(key: string): boolean {
    // Check format: resource_filters_vN
    const keyPattern = /^[a-z0-9_]+_v\d+$/;
    return keyPattern.test(key) && key.length <= 200; // Reasonable length limit
  }

  /**
   * Get current cache version
   * Used for version-based invalidation
   */
  getCurrentVersion(): number {
    return this.version;
  }

  /**
   * Generate invalidation pattern for cache clearing
   * Creates regex pattern to match related cache keys
   */
  getInvalidationPattern(resource: string, filters?: Record<string, any>): string {
    const parts = [this.normalizeValue(resource)];
    
    if (filters) {
      Object.keys(filters)
        .sort()
        .forEach(filterKey => {
          if (filters[filterKey] !== undefined && filters[filterKey] !== null) {
            parts.push(`.*${filterKey}_${this.normalizeValue(filters[filterKey])}.*`);
          }
        });
    }
    
    return `^${parts.join('.*')}_v\\d+$`;
  }
}