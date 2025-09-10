import { useMutation } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { queryPerformanceMonitor } from '../lib/queryPerformance';
import { ErrorLogger } from '../services/ErrorLogger';

/**
 * Analytics Collection Configuration
 * Controls analytics data collection behavior and performance monitoring
 */
export interface AnalyticsCollectionConfig {
  enablePerformanceMonitoring?: boolean;
  enableRealTimeUpdates?: boolean;
  cacheStrategy?: 'live' | 'historical';
  trackingLevel?: 'basic' | 'detailed';
  enableErrorTracking?: boolean;
  batchSize?: number; // Number of events to batch before sending
  flushIntervalMs?: number; // How often to flush batched events
}

/**
 * Analytics Event Interface
 * Defines structure for client-side analytics events
 */
export interface AnalyticsEvent {
  event_type: string;
  user_context?: Record<string, any>;
  event_data?: Record<string, any>;
  timestamp?: string;
}

/**
 * Screen View Analytics Event
 */
export interface ScreenViewEvent {
  screen_name: string;
  duration_ms?: number;
  user_interactions?: number;
  data_loaded?: boolean;
  load_time_ms?: number;
}

/**
 * Interaction Analytics Event
 */
export interface InteractionEvent {
  interaction_type: string;
  component_name: string;
  action: string;
  context?: Record<string, any>;
}

/**
 * Analytics Collection Result
 */
export interface AnalyticsCollectionResult {
  // Event tracking functions
  trackScreenView: (event: ScreenViewEvent) => void;
  trackInteraction: (event: InteractionEvent) => void;
  trackCustomEvent: (event: AnalyticsEvent) => void;
  
  // Batch management
  flushEvents: () => Promise<void>;
  clearQueue: () => void;
  
  // Configuration
  updateConfig: (newConfig: Partial<AnalyticsCollectionConfig>) => void;
  getConfig: () => AnalyticsCollectionConfig;
  
  // Status
  isCollecting: boolean;
  queueSize: number;
  lastFlush?: Date;
  
  // Performance metrics
  performance: {
    eventsTracked: number;
    eventsQueued: number;
    eventsSent: number;
    avgFlushTime: number;
    lastError?: string;
  };
}

/**
 * Default configuration for analytics collection
 */
const DEFAULT_CONFIG: AnalyticsCollectionConfig = {
  enablePerformanceMonitoring: true,
  enableRealTimeUpdates: false,
  cacheStrategy: 'live',
  trackingLevel: 'basic',
  enableErrorTracking: true,
  batchSize: 10,
  flushIntervalMs: 30000, // 30 seconds
};

/**
 * Analytics Collection Hook
 * Provides comprehensive client-side analytics tracking with performance monitoring
 * Follows existing TanStack Query patterns and integrates with performance monitoring
 */
export function useAnalyticsCollection(
  config: AnalyticsCollectionConfig = {}
): AnalyticsCollectionResult {
  const [currentConfig, setCurrentConfig] = useState<AnalyticsCollectionConfig>({
    ...DEFAULT_CONFIG,
    ...config
  });

  const [isCollecting] = useState(true);
  const [eventQueue, setEventQueue] = useState<AnalyticsEvent[]>([]);
  const [lastFlush, setLastFlush] = useState<Date>();
  const [performance, setPerformance] = useState({
    eventsTracked: 0,
    eventsQueued: 0,
    eventsSent: 0,
    avgFlushTime: 0,
    lastError: undefined as string | undefined
  });

  const flushTimeoutRef = useRef<NodeJS.Timeout>();
  const errorLogger = ErrorLogger.getInstance();

  // On web without an analytics endpoint configured, disable auto-flush and raise batch size to avoid frequent flush attempts
  useEffect(() => {
    const analyticsUrl = process.env.EXPO_PUBLIC_ANALYTICS_URL;
    if (Platform.OS === 'web' && !analyticsUrl) {
      setCurrentConfig(prev => ({
        ...prev,
        flushIntervalMs: 0,
        batchSize: Math.max(prev.batchSize || 10, 1000)
      }));
    }
  }, []);

  // Mutation for sending analytics events to backend
  const sendEventsMutation = useMutation({
    mutationFn: async (events: AnalyticsEvent[]) => {
      const now = () => (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
      const startTime = now();
      
      try {
        // Determine analytics endpoint. On web, skip if not configured to avoid 404s
        const analyticsUrl = process.env.EXPO_PUBLIC_ANALYTICS_URL;
        if (Platform.OS === 'web' && !analyticsUrl) {
          // Treat as success and silently drop in dev web
          const endTime = now();
          const duration = endTime - startTime;
          setPerformance(prev => ({
            ...prev,
            eventsSent: prev.eventsSent + events.length,
            avgFlushTime: (prev.avgFlushTime + duration) / 2,
            lastError: undefined
          }));
          return { skipped: true } as any;
        }

        const response = await fetch(analyticsUrl || '/api/analytics/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events })
        });

        if (!response.ok) {
          throw new Error(`Analytics API error: ${response.status}`);
        }

        const endTime = now();
        const duration = endTime - startTime;

        // Update performance metrics
        setPerformance(prev => ({
          ...prev,
          eventsSent: prev.eventsSent + events.length,
          avgFlushTime: (prev.avgFlushTime + duration) / 2,
          lastError: undefined
        }));

        if (currentConfig.enablePerformanceMonitoring) {
          queryPerformanceMonitor.recordQuery(
            'analytics_events_send',
            duration,
            events.length,
            'analytics'
          );
        }

        return await response.json();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown analytics error';
        
        setPerformance(prev => ({
          ...prev,
          lastError: errorMessage
        }));

        if (currentConfig.enableErrorTracking) {
          // Use proper ErrorLogger signature
          errorLogger.logError({
            entity_type: 'analytics_collection',
            error: errorMessage,
            context: {
              eventCount: events.length,
              config: currentConfig
            }
          });
        }

        throw error;
      }
    },
    onSuccess: () => {
      setLastFlush(new Date());
    },
    onError: (error) => {
      console.warn('Analytics events failed to send:', error);
    }
  });

  /**
   * Flush queued events to backend
   */
  const flushEvents = useCallback(async () => {
    if (eventQueue.length === 0) return;

    const eventsToSend = [...eventQueue];
    setEventQueue([]);
    
    setPerformance(prev => ({
      ...prev,
      eventsQueued: 0
    }));

    try {
      await sendEventsMutation.mutateAsync(eventsToSend);
    } catch (error) {
      // On failure, restore events to queue (with limit to prevent infinite growth)
      console.warn('Failed to flush analytics events:', error);
      setEventQueue(prev => {
        const restored = [...eventsToSend, ...prev];
        return restored.slice(0, currentConfig.batchSize! * 5); // Max 5 batches in queue
      });
    }
  }, [eventQueue, sendEventsMutation, currentConfig.batchSize]);

  /**
   * Add event to queue and handle batching
   * Enhanced with memory management and overflow protection
   */
  const queueEvent = useCallback((event: AnalyticsEvent) => {
    if (!isCollecting) return;

    // Validate event structure to prevent corrupt data
    if (!event.event_type || typeof event.event_type !== 'string') {
      console.warn('Analytics: Invalid event structure, skipping');
      return;
    }

    const enrichedEvent: AnalyticsEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    };

    setEventQueue(prev => {
      // Prevent memory overflow by limiting queue size
      const maxQueueSize = (currentConfig.batchSize! * 10); // Allow 10 batches max
      let newQueue = prev.length >= maxQueueSize ? 
        [...prev.slice(1), enrichedEvent] : // Remove oldest event if at limit
        [...prev, enrichedEvent];
      
      setPerformance(prevPerf => ({
        ...prevPerf,
        eventsTracked: prevPerf.eventsTracked + 1,
        eventsQueued: newQueue.length
      }));

      // Auto-flush if batch size reached
      if (newQueue.length >= currentConfig.batchSize!) {
        // Use setTimeout to avoid blocking the main thread
        setTimeout(() => flushEvents(), 0);
      }

      return newQueue;
    });
  }, [isCollecting, currentConfig.batchSize, flushEvents]);

  /**
   * Track screen view events
   */
  const trackScreenView = useCallback((screenEvent: ScreenViewEvent) => {
    const event: AnalyticsEvent = {
      event_type: 'screen_view',
      event_data: {
        screen_name: screenEvent.screen_name,
        duration_ms: screenEvent.duration_ms,
        user_interactions: screenEvent.user_interactions,
        data_loaded: screenEvent.data_loaded,
        load_time_ms: screenEvent.load_time_ms,
        tracking_level: currentConfig.trackingLevel
      },
      user_context: currentConfig.trackingLevel === 'detailed' ? {
        timestamp: new Date().toISOString(),
        session_id: Math.random().toString(36).substring(7)
      } : undefined
    };

    queueEvent(event);
  }, [queueEvent, currentConfig.trackingLevel]);

  /**
   * Track user interaction events
   */
  const trackInteraction = useCallback((interactionEvent: InteractionEvent) => {
    const event: AnalyticsEvent = {
      event_type: 'user_interaction',
      event_data: {
        interaction_type: interactionEvent.interaction_type,
        component_name: interactionEvent.component_name,
        action: interactionEvent.action,
        context: interactionEvent.context,
        tracking_level: currentConfig.trackingLevel
      },
      user_context: currentConfig.trackingLevel === 'detailed' ? {
        timestamp: new Date().toISOString()
      } : undefined
    };

    queueEvent(event);
  }, [queueEvent, currentConfig.trackingLevel]);

  /**
   * Track custom analytics events
   */
  const trackCustomEvent = useCallback((event: AnalyticsEvent) => {
    queueEvent(event);
  }, [queueEvent]);

  /**
   * Clear event queue
   */
  const clearQueue = useCallback(() => {
    setEventQueue([]);
    setPerformance(prev => ({
      ...prev,
      eventsQueued: 0
    }));
  }, []);

  /**
   * Update configuration
   */
  const updateConfig = useCallback((newConfig: Partial<AnalyticsCollectionConfig>) => {
    setCurrentConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  /**
   * Get current configuration
   */
  const getConfig = useCallback(() => ({ ...currentConfig }), [currentConfig]);

  // Auto-flush timer
  useEffect(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }

    if (isCollecting && currentConfig.flushIntervalMs && currentConfig.flushIntervalMs > 0) {
      flushTimeoutRef.current = setTimeout(() => {
        if (eventQueue.length > 0) {
          flushEvents();
        }
      }, currentConfig.flushIntervalMs);
    }

    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    };
  }, [eventQueue.length, flushEvents, isCollecting, currentConfig.flushIntervalMs]);

  // Cleanup on unmount - flush remaining events
  useEffect(() => {
    return () => {
      if (eventQueue.length > 0) {
        // Force flush remaining events on unmount
        flushEvents();
      }
    };
  }, [eventQueue.length, flushEvents]);

  // Performance monitoring integration
  useEffect(() => {
    if (currentConfig.enablePerformanceMonitoring) {
      queryPerformanceMonitor.recordQuery(
        'analytics_collection_active',
        0,
        eventQueue.length,
        'analytics'
      );
    }
  }, [eventQueue.length, currentConfig.enablePerformanceMonitoring]);

  return {
    // Event tracking functions
    trackScreenView,
    trackInteraction,
    trackCustomEvent,
    
    // Batch management
    flushEvents,
    clearQueue,
    
    // Configuration
    updateConfig,
    getConfig,
    
    // Status
    isCollecting,
    queueSize: eventQueue.length,
    lastFlush,
    
    // Performance metrics
    performance
  };
}

/**
 * Hook for tracking specific referee-related screen views
 * Simplified interface for common referee dashboard analytics
 */
export function useRefereeScreenAnalytics() {
  const analytics = useAnalyticsCollection({
    trackingLevel: 'basic',
    batchSize: 5, // Smaller batch size for screen events
    flushIntervalMs: 15000 // More frequent flushing for screen analytics
  });

  const trackRefereeScreenView = useCallback((
    screenName: 'referee_dashboard' | 'assignment_list' | 'match_monitoring' | 'referee_search',
    metrics?: { loadTime?: number; dataCount?: number }
  ) => {
    analytics.trackScreenView({
      screen_name: `referee_${screenName}`,
      load_time_ms: metrics?.loadTime,
      data_loaded: metrics?.dataCount !== undefined,
      user_interactions: 0 // Will be updated by interaction tracking
    });
  }, [analytics]);

  const trackRefereeInteraction = useCallback((
    action: 'search' | 'filter' | 'assign' | 'view_details' | 'export',
    component: string,
    context?: Record<string, any>
  ) => {
    analytics.trackInteraction({
      interaction_type: 'referee_action',
      component_name: `referee_${component}`,
      action,
      context
    });
  }, [analytics]);

  return {
    trackRefereeScreenView,
    trackRefereeInteraction,
    flushEvents: analytics.flushEvents,
    performance: analytics.performance
  };
}
