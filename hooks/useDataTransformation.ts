/**
 * @fileoverview Data Transformation Hook for Legacy Compatibility
 * Provides React hook interface for DataTransformationService with memoization and error handling
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.3 Task 1
 */

import { useMemo } from 'react';
import { DataTransformationService } from '../services/DataTransformationService';
import { Tournament } from '../types/tournament';
import { BeachMatch } from '../types/match';
import { TournamentCore } from '../types/tournament-v2';
import { BeachMatchCore } from '../types/match-v2';

/**
 * Transformation type definitions
 */
export type TransformationType = 'coreToLegacy' | 'legacyToCore';

/**
 * Supported data types for transformation
 */
export type TransformableData = 
  | TournamentCore 
  | Tournament 
  | TournamentCore[] 
  | Tournament[]
  | BeachMatchCore
  | BeachMatch
  | BeachMatchCore[]
  | BeachMatch[]
  | null 
  | undefined;

/**
 * Transformation result with metadata
 */
export interface TransformationResult<T> {
  /** Transformed data */
  data: T | null;
  /** Whether transformation was successful */
  success: boolean;
  /** Error if transformation failed */
  error: Error | null;
  /** Transformation metadata */
  metadata: {
    /** Original data type */
    sourceType: string;
    /** Target data type */
    targetType: string;
    /** Transformation time in milliseconds */
    transformationTime: number;
    /** Whether data was cached */
    cached: boolean;
  };
}

/**
 * Options for data transformation
 */
export interface UseDataTransformationOptions {
  /** Enable transformation result caching */
  enableCache?: boolean;
  /** Custom transformation key for caching */
  cacheKey?: string;
  /** Skip transformation if data is null/undefined */
  skipIfEmpty?: boolean;
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean;
}

/**
 * Transformation cache for memoization
 */
const transformationCache = new Map<string, any>();

/**
 * Generate cache key for transformation
 */
const generateCacheKey = (
  data: any, 
  transformationType: TransformationType, 
  customKey?: string
): string => {
  if (customKey) return customKey;
  
  const dataHash = data ? JSON.stringify(data).slice(0, 100) : 'null';
  return `${transformationType}_${dataHash}`;
};

/**
 * Data transformation hook for legacy compatibility
 * Provides memoized transformation between core and legacy data types
 * 
 * @param data - Data to transform
 * @param transformationType - Type of transformation to perform
 * @param options - Transformation options
 * @returns Transformed data with metadata
 */
export const useDataTransformation = <T>(
  data: TransformableData,
  transformationType: TransformationType,
  options: UseDataTransformationOptions = {}
): TransformationResult<T> => {
  const {
    enableCache = true,
    cacheKey,
    skipIfEmpty = true,
    enablePerformanceMonitoring = process.env.NODE_ENV === 'development'
  } = options;

  const transformationService = useMemo(() => new DataTransformationService(), []);

  return useMemo(() => {
    const startTime = Date.now();
    
    try {
      // Skip transformation if data is null/undefined and skipIfEmpty is true
      if (skipIfEmpty && (data === null || data === undefined)) {
        return {
          data: null,
          success: true,
          error: null,
          metadata: {
            sourceType: 'null',
            targetType: transformationType,
            transformationTime: 0,
            cached: false
          }
        };
      }

      // Check cache if enabled
      if (enableCache) {
        const key = generateCacheKey(data, transformationType, cacheKey);
        if (transformationCache.has(key)) {
          const cached = transformationCache.get(key);
          return {
            data: cached,
            success: true,
            error: null,
            metadata: {
              sourceType: data?.constructor?.name || 'unknown',
              targetType: transformationType,
              transformationTime: Date.now() - startTime,
              cached: true
            }
          };
        }
      }

      let transformedData: any = null;
      let sourceType = 'unknown';
      let targetType = transformationType;

      if (data) {
        sourceType = Array.isArray(data) 
          ? `${data[0]?.constructor?.name || 'unknown'}[]` 
          : data.constructor?.name || 'unknown';

        // Handle array transformations
        if (Array.isArray(data)) {
          if (transformationType === 'coreToLegacy') {
            // Transform array of core types to legacy types
            if (data.length > 0 && 'id' in data[0]) {
              // TournamentCore[] to Tournament[]
              transformedData = data.map(item => 
                transformationService.tournamentCoreToLegacy(item as TournamentCore)
              );
              targetType = 'Tournament[]';
            } else if (data.length > 0 && 'matchId' in data[0]) {
              // BeachMatchCore[] to BeachMatch[]
              transformedData = data.map(item => 
                transformationService.matchCoreToLegacy(item as BeachMatchCore)
              );
              targetType = 'BeachMatch[]';
            }
          } else {
            // Transform array of legacy types to core types
            if (data.length > 0 && 'No' in data[0]) {
              // Tournament[] to TournamentCore[]
              transformedData = data.map(item => 
                transformationService.tournamentLegacyToCore(item as Tournament)
              );
              targetType = 'TournamentCore[]';
            } else if (data.length > 0 && 'MatchNo' in data[0]) {
              // BeachMatch[] to BeachMatchCore[]
              transformedData = data.map(item => 
                transformationService.matchLegacyToCore(item as BeachMatch, 'unknown-tournament')
              );
              targetType = 'BeachMatchCore[]';
            }
          }
        } else {
          // Handle single object transformations
          if (transformationType === 'coreToLegacy') {
            if ('id' in data) {
              // TournamentCore to Tournament
              transformedData = transformationService.tournamentCoreToLegacy(data as TournamentCore);
              targetType = 'Tournament';
            } else if ('matchId' in data) {
              // BeachMatchCore to BeachMatch
              transformedData = transformationService.matchCoreToLegacy(data as BeachMatchCore);
              targetType = 'BeachMatch';
            }
          } else {
            if ('No' in data) {
              // Tournament to TournamentCore
              transformedData = transformationService.tournamentLegacyToCore(data as Tournament);
              targetType = 'TournamentCore';
            } else if ('MatchNo' in data) {
              // BeachMatch to BeachMatchCore
              transformedData = transformationService.matchLegacyToCore(data as BeachMatch, 'unknown-tournament');
              targetType = 'BeachMatchCore';
            }
          }
        }
      }

      // Cache result if enabled
      if (enableCache && transformedData !== null) {
        const key = generateCacheKey(data, transformationType, cacheKey);
        transformationCache.set(key, transformedData);
      }

      const transformationTime = Date.now() - startTime;

      // Log performance if enabled
      if (enablePerformanceMonitoring) {
        console.debug(`Data transformation completed in ${transformationTime}ms`, {
          sourceType,
          targetType,
          dataSize: data ? JSON.stringify(data).length : 0,
          cached: false
        });
      }

      return {
        data: transformedData,
        success: transformedData !== null,
        error: transformedData === null ? new Error(`Unsupported transformation: ${sourceType} -> ${targetType}`) : null,
        metadata: {
          sourceType,
          targetType,
          transformationTime,
          cached: false
        }
      };

    } catch (error) {
      const transformationTime = Date.now() - startTime;
      const transformationError = error instanceof Error ? error : new Error('Transformation failed');
      
      console.error('Data transformation failed:', {
        error: transformationError.message,
        transformationType,
        dataType: data?.constructor?.name,
        transformationTime
      });

      return {
        data: null,
        success: false,
        error: transformationError,
        metadata: {
          sourceType: data?.constructor?.name || 'unknown',
          targetType: transformationType,
          transformationTime,
          cached: false
        }
      };
    }
  }, [data, transformationType, enableCache, cacheKey, skipIfEmpty, enablePerformanceMonitoring, transformationService]);
};

/**
 * Hook for tournament-specific transformations
 */
export const useTournamentTransformation = (
  tournament: TournamentCore | Tournament | null,
  transformationType: TransformationType,
  options: UseDataTransformationOptions = {}
) => {
  return useDataTransformation<Tournament | TournamentCore>(
    tournament,
    transformationType,
    options
  );
};

/**
 * Hook for match-specific transformations
 */
export const useMatchTransformation = (
  match: BeachMatchCore | BeachMatch | null,
  transformationType: TransformationType,
  options: UseDataTransformationOptions = {}
) => {
  return useDataTransformation<BeachMatch | BeachMatchCore>(
    match,
    transformationType,
    options
  );
};

/**
 * Hook for batch transformations with progress tracking
 * Uses the transformation service directly to avoid hooks violations
 */
export const useBatchTransformation = <T>(
  dataArray: TransformableData[],
  transformationType: TransformationType,
  options: UseDataTransformationOptions & { batchSize?: number } = {}
) => {
  const { batchSize = 10, enablePerformanceMonitoring = false } = options;
  const transformationService = useMemo(() => new DataTransformationService(), []);
  
  return useMemo(() => {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return {
        data: [],
        success: true,
        error: null,
        progress: 100,
        metadata: {
          totalItems: 0,
          processedItems: 0,
          successfulItems: 0,
          failedItems: 0
        }
      };
    }

    const results: T[] = [];
    const errors: Error[] = [];
    let processedItems = 0;
    const startTime = Date.now();

    // Process data in batches using the transformation service directly
    for (let i = 0; i < dataArray.length; i += batchSize) {
      const batch = dataArray.slice(i, i + batchSize);
      
      batch.forEach((item) => {
        try {
          if (!item) {
            processedItems++;
            return;
          }

          let transformedData: any = null;

          // Direct transformation using the service to avoid hooks violation
          if (transformationType === 'coreToLegacy') {
            if ('id' in item) {
              transformedData = transformationService.tournamentCoreToLegacy(item as TournamentCore);
            } else if ('matchId' in item) {
              transformedData = transformationService.matchCoreToLegacy(item as BeachMatchCore);
            }
          } else {
            if ('No' in item) {
              transformedData = transformationService.tournamentLegacyToCore(item as Tournament);
            } else if ('MatchNo' in item) {
              transformedData = transformationService.matchLegacyToCore(item as BeachMatch, 'unknown-tournament');
            }
          }
          
          if (transformedData) {
            results.push(transformedData as T);
          }
          
          processedItems++;
        } catch (error) {
          errors.push(error instanceof Error ? error : new Error('Batch transformation failed'));
          processedItems++;
        }
      });
    }

    const transformationTime = Date.now() - startTime;

    if (enablePerformanceMonitoring) {
      console.debug(`Batch transformation completed in ${transformationTime}ms`, {
        totalItems: dataArray.length,
        successfulItems: results.length,
        failedItems: errors.length,
        transformationType
      });
    }

    return {
      data: results,
      success: errors.length === 0,
      error: errors.length > 0 ? errors[0] : null,
      progress: (processedItems / dataArray.length) * 100,
      metadata: {
        totalItems: dataArray.length,
        processedItems,
        successfulItems: results.length,
        failedItems: errors.length
      }
    };
  }, [dataArray, transformationType, batchSize, enablePerformanceMonitoring, transformationService]);
};

/**
 * Clear transformation cache
 */
export const clearTransformationCache = (): void => {
  transformationCache.clear();
};

/**
 * Get transformation cache stats
 */
export const getTransformationCacheStats = () => {
  return {
    size: transformationCache.size,
    keys: Array.from(transformationCache.keys())
  };
};

export default useDataTransformation;