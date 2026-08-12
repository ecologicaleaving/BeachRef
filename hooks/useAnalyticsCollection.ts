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

  const flushTimeoutRef = useRef<TimerHandle>();

  /**
   * LA CODA VERA STA QUI, non in `eventQueue`.
   *
   * `eventQueue` resta come specchio per il render (e per `performance`), ma
   * ogni lettura e scrittura passa dal riferimento. La ragione e' che lo
   * scarico automatico viene programmato con un `setTimeout` dentro
   * `trackEvent`: un `useCallback` che leggesse lo stato vedrebbe il valore
   * catturato al render precedente — vuoto — e uscirebbe subito. E' il difetto
   * della issue #99: la soglia di batch non ha mai fatto partire un invio, e
   * gli eventi uscivano solo al timer periodico.
   *
   * Un `useRef` non viene catturato: punta sempre al valore corrente, ed e'
   * sincrono, quindi due `trackEvent` nello stesso tick si vedono a vicenda.
   * Tenere DUE verita' allineate a mano — stato e riferimento — e' cio' che ha
   * fatto fallire i due tentativi precedenti; qui la verita' e' una sola.
   */
  const codaRef = useRef<AnalyticsEvent[]>([]);

  /** Scrive la coda: prima la verita', poi lo specchio. */
  const scriviCoda = useCallback((prossima: AnalyticsEvent[]) => {
    codaRef.current = prossima;
    setEventQueue(prossima);
  }, []);
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
      // `globalThis.performance` e non `performance`: in questo modulo il nome
      // `performance` e' gia' preso dallo STATO del hook (le metriche), che
      // ovviamente non ha `now()`. La guardia `typeof performance.now ===
      // 'function'` risultava quindi sempre falsa e si ricadeva su `Date.now()`,
      // che ha risoluzione al millisecondo: uno scarico piu' veloce di 1 ms
      // misurava 0, e `avgFlushTime` restava 0 per sempre.
      const orologio = globalThis.performance;
      const now = () => (typeof orologio?.now === 'function') ? orologio.now() : Date.now();
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
  /**
   * Lo scarico ritardato di `queueEvent` passa da qui e non dalla chiusura.
   *
   * `setTimeout(() => flushEvents(), 0)` cattura la versione di `flushEvents`
   * viva al momento della programmazione; se nel frattempo cambia la
   * configurazione, allo scadere del timer parte quella vecchia. Il riferimento
   * punta sempre all'ultima, e toglie `flushEvents` dalle dipendenze di
   * `queueEvent` — che altrimenti si ricrea a ogni scarico.
   */
  const flushEventsRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const flushEvents = useCallback(async () => {
    const eventsToSend = codaRef.current;
    if (eventsToSend.length === 0) return;

    // Si svuota SUBITO, prima dell'await: due scarichi che si sovrappongono
    // devono spartirsi gli eventi, non spedirli entrambi.
    scriviCoda([]);
    
    setPerformance(prev => ({
      ...prev,
      eventsQueued: 0
    }));

    try {
      await sendEventsMutation.mutateAsync(eventsToSend);
    } catch (error) {
      // On failure, restore events to queue (with limit to prevent infinite growth)
      console.warn('Failed to flush analytics events:', error);
      const restored = [...eventsToSend, ...codaRef.current];
      scriviCoda(restored.slice(0, currentConfig.batchSize! * 5)); // Max 5 batches in queue

      // Rimessi gli eventi in coda, l'errore RISALE.
      //
      // Chi chiama `flushEvents()` di sua iniziativa lo fa per sapere se
      // l'invio e' riuscito; ingoiare l'eccezione gli faceva credere di si'.
      // Gli scarichi automatici (soglia, timer, smontaggio) non hanno nessuno a
      // cui riferire, quindi la ignorano esplicitamente sul posto — il
      // `console.warn` qui sopra e' gia' la loro diagnosi.
      throw error;
    }
  }, [sendEventsMutation, currentConfig.batchSize, scriviCoda]);

  flushEventsRef.current = flushEvents;

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

    // Prevent memory overflow by limiting queue size
    const maxQueueSize = currentConfig.batchSize! * 10; // Allow 10 batches max
    const precedente = codaRef.current;
    const newQueue = precedente.length >= maxQueueSize
      ? [...precedente.slice(1), enrichedEvent] // Remove oldest event if at limit
      : [...precedente, enrichedEvent];

    scriviCoda(newQueue);

    setPerformance(prevPerf => ({
      ...prevPerf,
      eventsTracked: prevPerf.eventsTracked + 1,
      eventsQueued: newQueue.length
    }));

    // Auto-flush if batch size reached.
    //
    // Il calcolo e la decisione stanno FUORI da un aggiornatore di stato: React
    // puo' invocare un aggiornatore piu' di una volta per lo stesso valore (e in
    // StrictMode lo fa apposta), quindi un effetto collaterale li' dentro viene
    // eseguito un numero di volte non definito. Qui `setTimeout` partiva due
    // volte per evento, e `setPerformance` contava il doppio.
    if (newQueue.length >= currentConfig.batchSize!) {
      // Use setTimeout to avoid blocking the main thread
      setTimeout(() => { void flushEventsRef.current?.().catch(() => {}); }, 0);
    }
  }, [isCollecting, currentConfig.batchSize, scriviCoda]);

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
    scriviCoda([]);
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
        // La coda si legge allo SCADERE del timer, non quando lo si programma.
        if (codaRef.current.length > 0) {
          void flushEventsRef.current?.().catch(() => {});
        }
      }, currentConfig.flushIntervalMs);
    }

    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    };
    // `eventQueue.length` NON e' una dipendenza: era li' per rileggere la coda,
    // che ora si legge dal riferimento. Tenerlo significava azzerare e
    // riprogrammare il timer a ogni evento, cioe' un intervallo periodico che
    // non scadeva mai finche' arrivavano eventi.
  }, [isCollecting, currentConfig.flushIntervalMs]);

  // Cleanup on unmount - flush remaining events
  //
  // Le dipendenze erano `[eventQueue.length, flushEvents]`, e con esse la
  // PULIZIA non girava allo smontaggio: girava a ogni evento accodato, perche'
  // React esegue la pulizia dell'effetto precedente prima di rieseguirlo. Dal
  // secondo evento in poi la coda veniva quindi scaricata a ogni singola
  // aggiunta — il raggruppamento non esisteva nemmeno quando la soglia
  // funzionava. Con le dipendenze vuote l'effetto vive quanto il componente,
  // che e' l'unica lettura sensata di "on unmount".
  useEffect(() => {
    return () => {
      if (codaRef.current.length > 0) {
        // Force flush remaining events on unmount
        void flushEventsRef.current?.().catch(() => {});
      }
    };
  }, []);

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
