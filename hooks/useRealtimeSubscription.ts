import { useEffect, useState, useRef } from 'react';
import { RealtimeSubscriptionService, ConnectionState } from '../services/RealtimeSubscriptionService';

/**
 * Custom hook for managing real-time WebSocket subscriptions
 * Handles subscription lifecycle, connection state, and cleanup automatically
 */
export const useRealtimeSubscription = (tournamentNo: string | null, enabled: boolean = true) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    RealtimeSubscriptionService.getConnectionState()
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = RealtimeSubscriptionService.addConnectionStateListener(
      (state: ConnectionState, error?: string) => {
        setConnectionState(state);
        if (error) {
          setSubscriptionError(error);
        } else if (state === ConnectionState.CONNECTED) {
          setSubscriptionError(null);
        }
      }
    );

    unsubscribeRef.current = unsubscribe;
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Manage tournament subscription
  useEffect(() => {
    let isMounted = true;

    const subscribe = async () => {
      if (!tournamentNo || !enabled) {
        setIsSubscribed(false);
        return;
      }

      try {
        const success = await RealtimeSubscriptionService.subscribeTournament(tournamentNo, true);
        
        if (isMounted) {
          setIsSubscribed(success);
          if (!success) {
            setSubscriptionError('Failed to establish real-time subscription');
          }
        }
      } catch (error) {
        // console.error('Error setting up real-time subscription:', error);
        if (isMounted) {
          setIsSubscribed(false);
          setSubscriptionError(error instanceof Error ? error.message : 'Subscription failed');
        }
      }
    };

    const unsubscribe = async () => {
      if (tournamentNo) {
        await RealtimeSubscriptionService.unsubscribeTournament(tournamentNo);
        if (isMounted) {
          setIsSubscribed(false);
        }
      }
    };

    if (enabled && tournamentNo) {
      subscribe();
    } else {
      unsubscribe();
    }

    // Cleanup on unmount or dependency change
    return () => {
      isMounted = false;
      if (tournamentNo) {
        RealtimeSubscriptionService.unsubscribeTournament(tournamentNo);
      }
    };
  }, [tournamentNo, enabled]);

  // Get subscription status for the current tournament
  const subscriptionStatus = tournamentNo 
    ? RealtimeSubscriptionService.getSubscriptionStatus(tournamentNo)
    : { active: false, retrying: false };

  return {
    connectionState,
    isSubscribed,
    subscriptionError,
    isConnected: connectionState === ConnectionState.CONNECTED,
    isConnecting: connectionState === ConnectionState.CONNECTING,
    isReconnecting: connectionState === ConnectionState.RECONNECTING,
    hasError: connectionState === ConnectionState.ERROR || subscriptionError !== null,
    subscriptionStatus,
  };
};

/**
 * Hook for managing multiple tournament subscriptions
 * Useful for components that need to subscribe to multiple tournaments
 */
export const useMultipleRealtimeSubscriptions = (
  tournamentNumbers: string[], 
  enabled: boolean = true
) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    RealtimeSubscriptionService.getConnectionState()
  );
  const [subscriptions, setSubscriptions] = useState<{[key: string]: boolean}>({});
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = RealtimeSubscriptionService.addConnectionStateListener(
      (state: ConnectionState, error?: string) => {
        setConnectionState(state);
        if (error) {
          // Update errors for all current subscriptions
          const newErrors = { ...errors };
          tournamentNumbers.forEach(tournamentNo => {
            newErrors[tournamentNo] = error;
          });
          setErrors(newErrors);
        } else if (state === ConnectionState.CONNECTED) {
          setErrors({});
        }
      }
    );

    return unsubscribe;
  }, [tournamentNumbers, errors]);

  // Manage multiple subscriptions
  useEffect(() => {
    let isMounted = true;

    const subscribeAll = async () => {
      if (!enabled || tournamentNumbers.length === 0) {
        setSubscriptions({});
        return;
      }

      const newSubscriptions: {[key: string]: boolean} = {};
      const newErrors: {[key: string]: string} = {};

      for (const tournamentNo of tournamentNumbers) {
        try {
          const success = await RealtimeSubscriptionService.subscribeTournament(tournamentNo, true);
          newSubscriptions[tournamentNo] = success;
          
          if (!success) {
            newErrors[tournamentNo] = 'Failed to establish subscription';
          }
        } catch (error) {
          // console.error(`Error subscribing to tournament ${tournamentNo}:`, error);
          newSubscriptions[tournamentNo] = false;
          newErrors[tournamentNo] = error instanceof Error ? error.message : 'Subscription failed';
        }
      }

      if (isMounted) {
        setSubscriptions(newSubscriptions);
        setErrors(newErrors);
      }
    };

    const unsubscribeAll = async () => {
      const cleanupPromises = tournamentNumbers.map(tournamentNo => 
        RealtimeSubscriptionService.unsubscribeTournament(tournamentNo)
      );
      await Promise.all(cleanupPromises);
      
      if (isMounted) {
        setSubscriptions({});
        setErrors({});
      }
    };

    if (enabled && tournamentNumbers.length > 0) {
      subscribeAll();
    } else {
      unsubscribeAll();
    }

    return () => {
      isMounted = false;
      // Cleanup all subscriptions
      tournamentNumbers.forEach(tournamentNo => {
        RealtimeSubscriptionService.unsubscribeTournament(tournamentNo);
      });
    };
  }, [tournamentNumbers, enabled]);

  const activeSubscriptions = Object.entries(subscriptions)
    .filter(([, isActive]) => isActive)
    .map(([tournamentNo]) => tournamentNo);

  return {
    connectionState,
    subscriptions,
    errors,
    activeSubscriptions,
    isConnected: connectionState === ConnectionState.CONNECTED,
    isConnecting: connectionState === ConnectionState.CONNECTING,
    isReconnecting: connectionState === ConnectionState.RECONNECTING,
    hasErrors: Object.keys(errors).length > 0,
    allSubscribed: tournamentNumbers.length > 0 && Object.keys(subscriptions).length === tournamentNumbers.length &&
                   Object.values(subscriptions).every(subscribed => subscribed),
  };
};