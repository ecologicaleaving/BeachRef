import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ErrorToastOptions {
  title?: string;
  duration?: number;
  context?: string;
}

export const useErrorToast = () => {
  const { toast } = useToast();

  const showErrorToast = useCallback((error: Error | string, options: ErrorToastOptions = {}) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const { title, duration, context } = options;
    
    // Categorize error for appropriate toast styling and duration
    const isTransient = errorMessage.includes('timeout') || 
                       errorMessage.includes('network') ||
                       errorMessage.includes('fetch') ||
                       errorMessage.includes('AbortError');
    
    const isServerError = errorMessage.includes('500') || 
                         errorMessage.includes('502') || 
                         errorMessage.includes('503');

    // Get appropriate toast message based on error type
    const getToastMessage = (message: string, context?: string) => {
      const prefix = context ? `${context}: ` : '';
      
      if (message.includes('fetch') || message.includes('network')) {
        return `${prefix}Connection lost. Checking network...`;
      }
      
      if (message.includes('timeout') || message.includes('AbortError')) {
        return `${prefix}Request timed out. Retrying...`;
      }
      
      if (message.includes('404')) {
        return `${prefix}Data not found. Will retry automatically.`;
      }
      
      if (isServerError) {
        return `${prefix}Service temporarily unavailable. Retrying...`;
      }
      
      return `${prefix}${message}`;
    };

    toast({
      variant: "destructive",
      title: title || (isTransient ? "Connection Issue" : isServerError ? "Service Issue" : "Error"),
      description: getToastMessage(errorMessage, context),
      duration: duration || (isTransient ? 3000 : isServerError ? 4000 : 5000),
    });
  }, [toast]);

  const showRetryToast = useCallback((success: boolean, attempt: number, maxAttempts?: number) => {
    if (success) {
      toast({
        variant: "success",
        title: "Connection Restored",
        description: "Tournament data loaded successfully",
        duration: 2000,
      });
    } else {
      const isLastAttempt = maxAttempts && attempt >= maxAttempts;
      
      toast({
        variant: "destructive",
        title: isLastAttempt ? "Retry Failed" : `Retry ${attempt} Failed`,
        description: isLastAttempt 
          ? "Unable to load tournament data. Please check your connection."
          : "Will retry automatically in a moment...",
        duration: isLastAttempt ? 5000 : 2000,
      });
    }
  }, [toast]);

  const showNetworkToast = useCallback((isOnline: boolean) => {
    if (isOnline) {
      toast({
        variant: "success",
        title: "Connection Restored",
        description: "Network connection is back online",
        duration: 2000,
      });
    } else {
      toast({
        variant: "warning",
        title: "Network Offline",
        description: "Check your internet connection. Data will sync when connection is restored.",
        duration: 4000,
      });
    }
  }, [toast]);

  const showLoadingToast = useCallback((message: string = "Loading tournament data...") => {
    return toast({
      title: "Loading",
      description: message,
      duration: 1000,
    });
  }, [toast]);

  return {
    showErrorToast,
    showRetryToast,
    showNetworkToast,
    showLoadingToast,
  };
};