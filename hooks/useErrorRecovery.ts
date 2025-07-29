'use client';

import { useState, useCallback } from 'react';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RecoveryState {
  isRetrying: boolean;
  retryCount: number;
  canRetry: boolean;
  nextRetryIn?: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

export function useErrorRecovery(config: Partial<RetryConfig> = {}) {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    isRetrying: false,
    retryCount: 0,
    canRetry: true,
    nextRetryIn: undefined
  });

  const calculateDelay = useCallback((attemptNumber: number): number => {
    const delay = Math.min(
      retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attemptNumber),
      retryConfig.maxDelay
    );
    return delay;
  }, [retryConfig]);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    onProgress?: (state: RecoveryState) => void
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      const currentState: RecoveryState = {
        isRetrying: attempt > 0,
        retryCount: attempt,
        canRetry: attempt < retryConfig.maxRetries,
        nextRetryIn: attempt < retryConfig.maxRetries ? calculateDelay(attempt) : undefined
      };

      setRecoveryState(currentState);
      onProgress?.(currentState);

      try {
        const result = await operation();
        
        // Reset state on success
        setRecoveryState({
          isRetrying: false,
          retryCount: 0,
          canRetry: true,
          nextRetryIn: undefined
        });
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry if this was the last attempt
        if (attempt >= retryConfig.maxRetries) {
          break;
        }

        // Wait before next attempt
        const delay = calculateDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All attempts failed
    setRecoveryState({
      isRetrying: false,
      retryCount: retryConfig.maxRetries + 1,
      canRetry: false,
      nextRetryIn: undefined
    });

    throw lastError!;
  }, [retryConfig, calculateDelay]);

  const manualRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    onProgress?: (state: RecoveryState) => void
  ): Promise<T> => {
    // Reset retry count for manual retry
    setRecoveryState(prev => ({
      ...prev,
      retryCount: 0,
      canRetry: true,
      isRetrying: true
    }));

    return executeWithRetry(operation, onProgress);
  }, [executeWithRetry]);

  const reset = useCallback(() => {
    setRecoveryState({
      isRetrying: false,
      retryCount: 0,
      canRetry: true,
      nextRetryIn: undefined
    });
  }, []);

  return {
    recoveryState,
    executeWithRetry,
    manualRetry,
    reset
  };
}