import { useState, useEffect } from 'react';
import { CacheResult } from '../types/cache';
import { useNetworkStatus } from './useNetworkStatus';

interface PartialDataInfo<T> {
  hasPartialData: boolean;
  missingCount: number;
  availableCount: number;
  expectedCount?: number;
  missingItems: string[];
  canRetry: boolean;
  isStale: boolean;
}

/**
 * Hook for managing partial data scenarios
 * Helps detect when only some expected data is available offline
 */
export function usePartialData<T extends { No: string }>(
  data: T[],
  cacheResult?: CacheResult<T[]>,
  expectedItems?: string[]
): PartialDataInfo<T> {
  const { isConnected } = useNetworkStatus();
  const [partialDataInfo, setPartialDataInfo] = useState<PartialDataInfo<T>>({
    hasPartialData: false,
    missingCount: 0,
    availableCount: 0,
    missingItems: [],
    canRetry: false,
    isStale: false,
  });

  useEffect(() => {
    const analyzePartialData = () => {
      const availableCount = data.length;
      const availableItems = new Set(data.map(item => item.No));
      
      let missingItems: string[] = [];
      let expectedCount: number | undefined;
      
      if (expectedItems) {
        missingItems = expectedItems.filter(item => !availableItems.has(item));
        expectedCount = expectedItems.length;
      }
      
      const missingCount = missingItems.length;
      const hasPartialData = missingCount > 0;
      
      // Determine if data is stale based on cache source
      const isStale = cacheResult ? 
        (cacheResult.source === 'offline' || cacheResult.source === 'localStorage') : false;
      
      const canRetry = isConnected && (hasPartialData || isStale);

      setPartialDataInfo({
        hasPartialData,
        missingCount,
        availableCount,
        expectedCount,
        missingItems,
        canRetry,
        isStale,
      });
    };

    analyzePartialData();
  }, [data, cacheResult, expectedItems, isConnected]);

  return partialDataInfo;
}

/**
 * Hook for handling missing tournament matches
 */
export function useMissingMatches(
  tournamentNo: string,
  availableMatches: any[],
  expectedMatchCount?: number
) {
  const { isConnected } = useNetworkStatus();
  const [missingMatchesInfo, setMissingMatchesInfo] = useState({
    hasMissingMatches: false,
    availableCount: 0,
    expectedCount: expectedMatchCount || 0,
    canLoadMore: false,
  });

  useEffect(() => {
    const availableCount = availableMatches.length;
    const expectedCount = expectedMatchCount || 0;
    const hasMissingMatches = expectedCount > 0 && availableCount < expectedCount;
    const canLoadMore = isConnected && hasMissingMatches;

    setMissingMatchesInfo({
      hasMissingMatches,
      availableCount,
      expectedCount,
      canLoadMore,
    });
  }, [tournamentNo, availableMatches, expectedMatchCount, isConnected]);

  return missingMatchesInfo;
}

/**
 * Hook for graceful error handling with fallback data
 */
export function useGracefulFallback<T>(
  primaryData: T | null,
  fallbackData: T | null,
  error: Error | null
): {
  data: T | null;
  isUsingFallback: boolean;
  hasError: boolean;
  canRetry: boolean;
} {
  const { isConnected } = useNetworkStatus();

  return {
    data: primaryData || fallbackData,
    isUsingFallback: !primaryData && !!fallbackData,
    hasError: !!error,
    canRetry: isConnected && !!error,
  };
}

/**
 * Hook for managing data completeness warnings
 */
export function useDataCompleteness(
  dataSource: string,
  itemCount: number,
  minExpectedCount?: number
): {
  isComplete: boolean;
  completenessLevel: 'complete' | 'partial' | 'minimal' | 'empty';
  warningMessage?: string;
  canImprove: boolean;
} {
  const { isConnected } = useNetworkStatus();

  const getCompletenessLevel = (): 'complete' | 'partial' | 'minimal' | 'empty' => {
    if (itemCount === 0) return 'empty';
    if (!minExpectedCount) return 'complete';
    
    const ratio = itemCount / minExpectedCount;
    if (ratio >= 0.9) return 'complete';
    if (ratio >= 0.5) return 'partial';
    if (ratio > 0) return 'minimal';
    return 'empty';
  };

  const completenessLevel = getCompletenessLevel();
  const isComplete = completenessLevel === 'complete';
  
  const getWarningMessage = (): string | undefined => {
    switch (completenessLevel) {
      case 'empty':
        return `No ${dataSource} data available offline`;
      case 'minimal':
        return `Very limited ${dataSource} data available offline`;
      case 'partial':
        return `Some ${dataSource} data may be missing offline`;
      default:
        return undefined;
    }
  };

  return {
    isComplete,
    completenessLevel,
    warningMessage: getWarningMessage(),
    canImprove: isConnected && !isComplete,
  };
}