/**
 * Subscription Manager
 * Part of Real-time Service Architecture Simplification Refactoring
 * Focused responsibility: Managing individual subscriptions and their lifecycle
 */

import { supabase } from '../supabase';
import { BeachMatch } from '../../types/match';

export interface SubscriptionConfig {
  tournamentNo: string;
  maxRetries: number;
  retryDelay: number;
  lastRetryAttempt?: number;
  liveMatchesOnly?: boolean;
}

export interface Subscription {
  id: string;
  tournamentNo: string;
  channel: any; // Supabase RealtimeChannel
  config: SubscriptionConfig;
  status: 'active' | 'paused' | 'failed' | 'connecting';
  createdAt: number;
  lastActivity?: number;
}

export type SubscriptionEventHandler = (payload: any) => void;

/**
 * Manages individual subscriptions with their lifecycle
 * Single responsibility: Subscription CRUD operations
 */
export class SubscriptionManager {
  private subscriptions = new Map<string, Subscription>();
  private eventHandlers = new Map<string, Set<SubscriptionEventHandler>>();

  /**
   * Create a new subscription
   */
  async createSubscription(
    tournamentNo: string,
    config: Partial<SubscriptionConfig> = {}
  ): Promise<string> {
    const subscriptionId = `matches_${tournamentNo}`;

    if (this.subscriptions.has(subscriptionId)) {
      return subscriptionId; // Already exists
    }

    const fullConfig: SubscriptionConfig = {
      tournamentNo,
      maxRetries: 5,
      retryDelay: 1000,
      liveMatchesOnly: true,
      ...config
    };

    const subscription: Subscription = {
      id: subscriptionId,
      tournamentNo,
      channel: null,
      config: fullConfig,
      status: 'connecting',
      createdAt: Date.now()
    };

    this.subscriptions.set(subscriptionId, subscription);

    try {
      await this.establishConnection(subscription);
      return subscriptionId;
    } catch (error) {
      this.subscriptions.delete(subscriptionId);
      throw error;
    }
  }

  /**
   * Remove a subscription
   */
  async removeSubscription(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    try {
      if (subscription.channel) {
        await supabase.removeChannel(subscription.channel);
      }

      this.subscriptions.delete(subscriptionId);
      this.eventHandlers.delete(subscriptionId);

      return true;
    } catch (error) {
      console.error(`Failed to remove subscription ${subscriptionId}:`, error);
      return false;
    }
  }

  /**
   * Get subscription by ID
   */
  getSubscription(subscriptionId: string): Subscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * Get all subscriptions
   */
  getAllSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get subscriptions by tournament
   */
  getSubscriptionsByTournament(tournamentNo: string): Subscription[] {
    return this.getAllSubscriptions().filter(sub => sub.tournamentNo === tournamentNo);
  }

  /**
   * Add event handler for subscription
   */
  addEventHandler(subscriptionId: string, handler: SubscriptionEventHandler): () => void {
    if (!this.eventHandlers.has(subscriptionId)) {
      this.eventHandlers.set(subscriptionId, new Set());
    }

    this.eventHandlers.get(subscriptionId)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(subscriptionId)?.delete(handler);
    };
  }

  /**
   * Pause a subscription (for battery optimization)
   */
  pauseSubscription(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || subscription.status !== 'active') {
      return false;
    }

    try {
      if (subscription.channel) {
        supabase.removeChannel(subscription.channel);
        subscription.channel = null;
      }

      subscription.status = 'paused';
      return true;
    } catch (error) {
      console.error(`Failed to pause subscription ${subscriptionId}:`, error);
      return false;
    }
  }

  /**
   * Resume a paused subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || subscription.status !== 'paused') {
      return false;
    }

    try {
      await this.establishConnection(subscription);
      return true;
    } catch (error) {
      console.error(`Failed to resume subscription ${subscriptionId}:`, error);
      return false;
    }
  }

  /**
   * Update subscription configuration
   */
  updateSubscriptionConfig(
    subscriptionId: string,
    configUpdate: Partial<SubscriptionConfig>
  ): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.config = { ...subscription.config, ...configUpdate };
    return true;
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats() {
    const subscriptions = this.getAllSubscriptions();

    return {
      total: subscriptions.length,
      active: subscriptions.filter(s => s.status === 'active').length,
      paused: subscriptions.filter(s => s.status === 'paused').length,
      failed: subscriptions.filter(s => s.status === 'failed').length,
      connecting: subscriptions.filter(s => s.status === 'connecting').length,
      byTournament: this.groupByTournament(subscriptions),
      oldestSubscription: subscriptions.reduce((oldest, current) =>
        !oldest || current.createdAt < oldest.createdAt ? current : oldest,
        null as Subscription | null
      )
    };
  }

  // Private methods

  private async establishConnection(subscription: Subscription): Promise<void> {
    const filter = subscription.config.liveMatchesOnly
      ? `tournament_no=eq.${subscription.tournamentNo}&status=in.(live,in_progress,running)`
      : `tournament_no=eq.${subscription.tournamentNo}`;

    subscription.channel = supabase
      .channel(`matches_${subscription.tournamentNo}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: filter
        },
        (payload) => {
          subscription.lastActivity = Date.now();
          this.handleSubscriptionEvent(subscription.id, payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          subscription.status = 'active';
        } else if (status === 'CLOSED') {
          subscription.status = 'failed';
        }
      });
  }

  private handleSubscriptionEvent(subscriptionId: string, payload: any): void {
    const handlers = this.eventHandlers.get(subscriptionId);
    if (!handlers) return;

    handlers.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        console.error('Error in subscription event handler:', error);
      }
    });
  }

  private groupByTournament(subscriptions: Subscription[]): Record<string, number> {
    return subscriptions.reduce((acc, sub) => {
      acc[sub.tournamentNo] = (acc[sub.tournamentNo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Cleanup all subscriptions
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.subscriptions.keys()).map(
      subscriptionId => this.removeSubscription(subscriptionId)
    );

    await Promise.all(cleanupPromises);

    this.subscriptions.clear();
    this.eventHandlers.clear();
  }
}