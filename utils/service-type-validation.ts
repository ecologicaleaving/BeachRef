/**
 * @fileoverview Service layer type validation utilities
 * Runtime validation to ensure services receive VIS-compliant data
 * Part of VIS Data Structure Alignment Epic - Story 1.3
 */

import { VisCompliantMatch, isVisCompliantMatch, convertLegacyToVisCompliant } from '../types/match-vis-compliant';

/**
 * Validate and ensure match data is VIS-compliant at service boundaries
 * Provides runtime type safety during migration from legacy interfaces
 * 
 * @param data - Match data that may be legacy or VIS-compliant
 * @param serviceName - Name of service for error logging
 * @returns VIS-compliant match data
 * @throws Error if conversion fails
 */
export function validateVisCompliantMatches(
  data: any[], 
  serviceName: string
): VisCompliantMatch[] {
  if (!Array.isArray(data)) {
    console.error(`${serviceName}: Expected array of matches, received:`, typeof data);
    throw new Error(`${serviceName}: Invalid match data format - expected array`);
  }

  const visCompliantMatches: VisCompliantMatch[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const match = data[i];
    
    try {
      if (isVisCompliantMatch(match)) {
        visCompliantMatches.push(match);
      } else {
        // Attempt conversion from legacy format
        const converted = convertLegacyToVisCompliant(match);
        visCompliantMatches.push(converted);
      }
    } catch (conversionError) {
      console.error(`${serviceName}: Failed to process match at index ${i}:`, conversionError);
      // Skip invalid matches rather than failing entire operation
      continue;
    }
  }
  
  return visCompliantMatches;
}

/**
 * Validate single match data for VIS compliance
 * 
 * @param data - Single match data that may be legacy or VIS-compliant
 * @param serviceName - Name of service for error logging  
 * @returns VIS-compliant match data
 * @throws Error if validation fails
 */
export function validateVisCompliantMatch(
  data: any,
  serviceName: string
): VisCompliantMatch {
  if (!data || typeof data !== 'object') {
    console.error(`${serviceName}: Expected match object, received:`, typeof data);
    throw new Error(`${serviceName}: Invalid match data format - expected object`);
  }

  try {
    if (isVisCompliantMatch(data)) {
      return data;
    } else {
      // Attempt conversion from legacy format
      return convertLegacyToVisCompliant(data);
    }
  } catch (conversionError) {
    console.error(`${serviceName}: Failed to process match data:`, conversionError);
    throw new Error(`${serviceName}: Unable to convert match data to VIS-compliant format`);
  }
}

/**
 * Safe conversion helper that logs conversion operations for monitoring
 * 
 * @param matches - Array of potentially mixed format matches
 * @param serviceName - Service name for logging
 * @returns Array of VIS-compliant matches
 */
export function safeConvertToVisCompliant(
  matches: any[],
  serviceName: string
): VisCompliantMatch[] {
  if (!Array.isArray(matches)) {
    return [];
  }

  let legacyCount = 0;
  let visCompliantCount = 0;
  let failedCount = 0;

  const converted = matches.map(match => {
    try {
      if (isVisCompliantMatch(match)) {
        visCompliantCount++;
        return match;
      } else {
        legacyCount++;
        return convertLegacyToVisCompliant(match);
      }
    } catch (error) {
      failedCount++;
      return null;
    }
  }).filter((match): match is VisCompliantMatch => match !== null);

  // Log conversion statistics for monitoring migration progress
  if (legacyCount > 0 || failedCount > 0) {
  }

  return converted;
}