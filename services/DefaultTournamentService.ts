import AsyncStorage from '@react-native-async-storage/async-storage';
import { TournamentCore } from '../types/tournament-v2';

const DEFAULT_TOURNAMENT_KEY = 'default_tournament';

// Event listener system for default tournament changes
type DefaultTournamentListener = (tournament: TournamentCore | null) => void;
let listeners: DefaultTournamentListener[] = [];

export class DefaultTournamentService {
  /**
   * Add listener for default tournament changes
   */
  static addListener(listener: DefaultTournamentListener): () => void {
    listeners.push(listener);
    // Return cleanup function
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of default tournament change
   */
  private static notifyListeners(tournament: TournamentCore | null): void {
    listeners.forEach(listener => {
      try {
        listener(tournament);
      } catch (error) {
        console.error('Error in default tournament listener:', error);
      }
    });
  }
  /**
   * Set a tournament as default (clears any existing default)
   * Only allows LIVE tournaments to be set as default
   */
  static async setDefaultTournament(tournament: TournamentCore): Promise<{ success: boolean; reason?: string }> {
    // Check if tournament is LIVE using structured dates
    const startDate = tournament.dates?.startDate;
    const endDate = tournament.dates?.endDate;
    const status = this.getTournamentStatus(startDate, endDate);
    if (status !== 'LIVE NOW') {
      return {
        success: false,
        reason: `Only LIVE tournaments can be set as default. This tournament is ${status}.`
      };
    }

    // Add setAt timestamp to tournament for tracking when it was set as default
    const defaultTournament = {
      ...tournament,
      setAt: new Date().toISOString()
    } as TournamentCore & { setAt: string };

    await AsyncStorage.setItem(DEFAULT_TOURNAMENT_KEY, JSON.stringify(defaultTournament));
    this.notifyListeners(defaultTournament);
    return { success: true };
  }

  /**
   * Get the current default tournament
   * Automatically clears if tournament has finished
   */
  static async getDefaultTournament(): Promise<TournamentCore | null> {
    try {
      const stored = await AsyncStorage.getItem(DEFAULT_TOURNAMENT_KEY);
      if (!stored) return null;

      const defaultTournament = JSON.parse(stored) as TournamentCore & { setAt: string };

      // Check if tournament has finished and auto-clear if so
      if (defaultTournament.dates?.startDate || defaultTournament.dates?.endDate) {
        const status = this.getTournamentStatus(defaultTournament.dates.startDate, defaultTournament.dates.endDate);
        if (status === 'COMPLETED') {
          await this.clearDefaultTournament();
          return null;
        }
      }

      return defaultTournament;
    } catch (error) {
      console.error('Error loading default tournament:', error);
      return null;
    }
  }

  /**
   * Clear the default tournament
   */
  static async clearDefaultTournament(): Promise<void> {
    await AsyncStorage.removeItem(DEFAULT_TOURNAMENT_KEY);
    this.notifyListeners(null);
  }

  /**
   * Check if a tournament is the default
   */
  static async isDefaultTournament(visNo: string): Promise<boolean> {
    const defaultTournament = await this.getDefaultTournament();
    return defaultTournament?.visNo === visNo;
  }

  /**
   * Toggle default status for a tournament
   * If it's already default, remove it. If not, make it default.
   * Returns result object with success status and reason
   */
  static async toggleDefaultTournament(tournament: TournamentCore): Promise<{ success: boolean; isDefault: boolean; reason?: string }> {
    const isCurrentlyDefault = await this.isDefaultTournament(tournament.visNo);

    if (isCurrentlyDefault) {
      await this.clearDefaultTournament();
      return { success: true, isDefault: false }; // No longer default
    } else {
      const result = await this.setDefaultTournament(tournament);
      return {
        success: result.success,
        isDefault: result.success,
        reason: result.reason
      }; // Now default if successful
    }
  }

  /**
   * Get tournament status based on dates
   */
  static getTournamentStatus(startDate?: string, endDate?: string): string {
    if (!startDate) {
      return 'SCHEDULED';
    }
    
    const today = new Date().toISOString().split('T')[0];
    const startDateOnly = startDate.split('T')[0];
    
    if (today < startDateOnly) {
      return 'SCHEDULED';
    }
    
    if (endDate) {
      const endDateOnly = endDate.split('T')[0];
      if (today > endDateOnly) {
        return 'COMPLETED';
      }
      if (today >= startDateOnly && today <= endDateOnly) {
        return 'LIVE NOW';
      }
    } else {
      // Only start date available - consider live for reasonable duration
      const start = new Date(startDate);
      const weekAfter = new Date(start);
      weekAfter.setDate(start.getDate() + 7);
      
      const now = new Date();
      if (now >= start && now <= weekAfter) {
        return 'LIVE NOW';
      }
      if (now > weekAfter) {
        return 'COMPLETED';
      }
    }
    
    return 'SCHEDULED';
  }
}