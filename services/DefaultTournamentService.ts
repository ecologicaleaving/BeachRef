import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_TOURNAMENT_KEY = 'default_tournament';

export interface DefaultTournament {
  visNo: string;
  name: string;
  setAt: string; // ISO timestamp
  startDate?: string; // Tournament start date
  endDate?: string; // Tournament end date
}

export class DefaultTournamentService {
  /**
   * Set a tournament as default (clears any existing default)
   * Only allows LIVE tournaments to be set as default
   */
  static async setDefaultTournament(
    visNo: string, 
    name: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<{ success: boolean; reason?: string }> {
    // Check if tournament is LIVE
    const status = this.getTournamentStatus(startDate, endDate);
    if (status !== 'LIVE NOW') {
      return { 
        success: false, 
        reason: `Only LIVE tournaments can be set as default. This tournament is ${status}.` 
      };
    }

    const defaultTournament: DefaultTournament = {
      visNo,
      name,
      setAt: new Date().toISOString(),
      startDate,
      endDate
    };

    await AsyncStorage.setItem(DEFAULT_TOURNAMENT_KEY, JSON.stringify(defaultTournament));
    return { success: true };
  }

  /**
   * Get the current default tournament
   * Automatically clears if tournament has finished
   */
  static async getDefaultTournament(): Promise<DefaultTournament | null> {
    try {
      const stored = await AsyncStorage.getItem(DEFAULT_TOURNAMENT_KEY);
      if (!stored) return null;

      const defaultTournament = JSON.parse(stored) as DefaultTournament;
      
      // Check if tournament has finished and auto-clear if so
      if (defaultTournament.startDate || defaultTournament.endDate) {
        const status = this.getTournamentStatus(defaultTournament.startDate, defaultTournament.endDate);
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
  static async toggleDefaultTournament(
    visNo: string, 
    name: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<{ success: boolean; isDefault: boolean; reason?: string }> {
    const isCurrentlyDefault = await this.isDefaultTournament(visNo);
    
    if (isCurrentlyDefault) {
      await this.clearDefaultTournament();
      return { success: true, isDefault: false }; // No longer default
    } else {
      const result = await this.setDefaultTournament(visNo, name, startDate, endDate);
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