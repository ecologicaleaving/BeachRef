import AsyncStorage from '@react-native-async-storage/async-storage';
import { TournamentCore } from '../types/tournament-v2';
import { VisCompliantMatch, convertLegacyToVisCompliant } from '../types/match-vis-compliant';
import { BeachMatch } from '../types/match';

const STORAGE_KEYS = {
  SELECTED_TOURNAMENT: '@referee_selected_tournament',
  USER_PREFERENCES: '@referee_user_preferences',
  COURT_PREFERENCES: '@referee_court_preferences',
  TOURNAMENT_DETAILS_CACHE: '@referee_tournament_details_cache',
} as const;

const CACHE_EXPIRY_HOURS = 6; // Cache expires after 6 hours

export interface UserPreferences {
  selectedCourt?: string;
  notificationsEnabled: boolean;
  lastAppVersion?: string;
  onboardingCompleted: boolean;
}

interface CachedTournamentDetails {
  tournament: TournamentCore;
  cachedAt: string;
  expiresAt: string;
}

interface CachedVisCompliantTournamentDetails {
  tournament: TournamentCore;
  matches: VisCompliantMatch[];
  cachedAt: string;
  expiresAt: string;
}

export class TournamentStorageService {
  /**
   * Save the selected tournament to AsyncStorage
   */
  static async saveSelectedTournament(tournament: TournamentCore): Promise<void> {
    try {
      const tournamentData = JSON.stringify(tournament);
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_TOURNAMENT, tournamentData);
      // console.log('Tournament saved to storage:', tournament.visNo);
    } catch (error) {
      // console.error('Failed to save selected tournament:', error);
      throw new Error('Failed to save tournament selection');
    }
  }

  /**
   * Retrieve the selected tournament from AsyncStorage
   */
  static async getSelectedTournament(): Promise<TournamentCore | null> {
    try {
      const tournamentData = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_TOURNAMENT);
      if (!tournamentData) {
        return null;
      }
      
      const tournament = JSON.parse(tournamentData) as TournamentCore;
      // console.log('Tournament loaded from storage:', tournament.visNo);
      return tournament;
    } catch (error) {
      // console.error('Failed to load selected tournament:', error);
      return null;
    }
  }

  /**
   * Clear the selected tournament from AsyncStorage
   */
  static async clearSelectedTournament(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_TOURNAMENT);
      // console.log('Tournament selection cleared from storage');
    } catch (error) {
      // console.error('Failed to clear selected tournament:', error);
      throw new Error('Failed to clear tournament selection');
    }
  }

  /**
   * Check if user has a tournament selected (determines navigation state)
   */
  static async hasSelectedTournament(): Promise<boolean> {
    try {
      const tournament = await this.getSelectedTournament();
      return tournament !== null;
    } catch (error) {
      // console.error('Failed to check tournament selection:', error);
      return false;
    }
  }

  /**
   * Save user preferences
   */
  static async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      const preferencesData = JSON.stringify(preferences);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, preferencesData);
      // console.log('User preferences saved');
    } catch (error) {
      // console.error('Failed to save user preferences:', error);
      throw new Error('Failed to save user preferences');
    }
  }

  /**
   * Get user preferences with defaults
   */
  static async getUserPreferences(): Promise<UserPreferences> {
    try {
      const preferencesData = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (!preferencesData) {
        // Return default preferences for new users
        return {
          notificationsEnabled: true,
          onboardingCompleted: false,
        };
      }
      
      return JSON.parse(preferencesData) as UserPreferences;
    } catch (error) {
      // console.error('Failed to load user preferences:', error);
      // Return default preferences on error
      return {
        notificationsEnabled: true,
        onboardingCompleted: false,
      };
    }
  }

  /**
   * Update specific preference
   */
  static async updatePreference<K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ): Promise<void> {
    try {
      const preferences = await this.getUserPreferences();
      preferences[key] = value;
      await this.saveUserPreferences(preferences);
    } catch (error) {
      // console.error(`Failed to update preference ${key}:`, error);
      throw new Error(`Failed to update ${key} preference`);
    }
  }

  /**
   * Save court preferences for the current tournament
   */
  static async saveCourtPreference(tournamentNo: string, court: string): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.COURT_PREFERENCES}_${tournamentNo}`;
      await AsyncStorage.setItem(key, court);
      // console.log(`Court preference saved for tournament ${tournamentNo}: ${court}`);
    } catch (error) {
      // console.error('Failed to save court preference:', error);
      throw new Error('Failed to save court preference');
    }
  }

  /**
   * Get court preference for a specific tournament
   */
  static async getCourtPreference(tournamentNo: string): Promise<string | null> {
    try {
      const key = `${STORAGE_KEYS.COURT_PREFERENCES}_${tournamentNo}`;
      return await AsyncStorage.getItem(key);
    } catch (error) {
      // console.error('Failed to load court preference:', error);
      return null;
    }
  }

  /**
   * Check if this is a new user (no previous selections or preferences)
   */
  static async isNewUser(): Promise<boolean> {
    try {
      const hasSelectedTournament = await this.hasSelectedTournament();
      const preferences = await this.getUserPreferences();
      
      // User is considered new if they haven't selected a tournament 
      // and haven't completed onboarding
      return !hasSelectedTournament && !preferences.onboardingCompleted;
    } catch (error) {
      // console.error('Failed to check if new user:', error);
      // Assume new user on error for safety
      return true;
    }
  }

  /**
   * Mark user as having completed initial setup/onboarding
   */
  static async completeOnboarding(): Promise<void> {
    try {
      await this.updatePreference('onboardingCompleted', true);
    } catch (error) {
      // console.error('Failed to complete onboarding:', error);
      throw new Error('Failed to complete onboarding');
    }
  }

  /**
   * Get navigation state for app launch
   * Returns 'selection' for new users, 'dashboard' for returning users
   */
  static async getNavigationState(): Promise<'selection' | 'dashboard'> {
    try {
      const hasSelectedTournament = await this.hasSelectedTournament();
      return hasSelectedTournament ? 'dashboard' : 'selection';
    } catch (error) {
      // console.error('Failed to determine navigation state:', error);
      // Default to selection screen for safety
      return 'selection';
    }
  }

  /**
   * Cache detailed tournament data (legacy method - maintains backward compatibility)
   */
  static async cacheTournamentDetails(tournamentNo: string, tournament: TournamentCore): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000));
      
      const cachedData: CachedTournamentDetails = {
        tournament,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };
      
      const cacheKey = `${STORAGE_KEYS.TOURNAMENT_DETAILS_CACHE}_${tournamentNo}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
    } catch (error) {
      // console.error('Failed to cache tournament details:', error);
    }
  }

  /**
   * Get cached tournament details if available and not expired (legacy method)
   */
  static async getCachedTournamentDetails(tournamentNo: string): Promise<TournamentCore | null> {
    try {
      const cacheKey = `${STORAGE_KEYS.TOURNAMENT_DETAILS_CACHE}_${tournamentNo}`;
      const cachedDataStr = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedDataStr) {
        return null;
      }
      
      const cachedData: CachedTournamentDetails = JSON.parse(cachedDataStr);
      const now = new Date();
      const expiresAt = new Date(cachedData.expiresAt);
      
      // Check if cache is expired
      if (now > expiresAt) {
        // Remove expired cache
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      return cachedData.tournament;
    } catch (error) {
      // console.error('Failed to get cached tournament details:', error);
      return null;
    }
  }

  /**
   * Cache VIS-compliant tournament data with matches
   */
  static async cacheVisCompliantTournamentDetails(
    tournamentNo: string, 
    tournament: TournamentCore,
    matches?: VisCompliantMatch[]
  ): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000));
      
      const cachedData: CachedVisCompliantTournamentDetails = {
        tournament,
        matches: matches || [],
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };
      
      const cacheKey = `${STORAGE_KEYS.TOURNAMENT_DETAILS_CACHE}_vis_${tournamentNo}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
    } catch (error) {
      // console.error('Failed to cache VIS-compliant tournament details:', error);
    }
  }

  /**
   * Get cached VIS-compliant tournament details with matches if available and not expired
   */
  static async getCachedVisCompliantTournamentDetails(tournamentNo: string): Promise<{
    tournament: TournamentCore;
    matches: VisCompliantMatch[];
  } | null> {
    try {
      const cacheKey = `${STORAGE_KEYS.TOURNAMENT_DETAILS_CACHE}_vis_${tournamentNo}`;
      const cachedDataStr = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedDataStr) {
        return null;
      }
      
      const cachedData: CachedVisCompliantTournamentDetails = JSON.parse(cachedDataStr);
      const now = new Date();
      const expiresAt = new Date(cachedData.expiresAt);
      
      // Check if cache is expired
      if (now > expiresAt) {
        // Remove expired cache
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      return {
        tournament: cachedData.tournament,
        matches: cachedData.matches
      };
    } catch (error) {
      // console.error('Failed to get cached VIS-compliant tournament details:', error);
      return null;
    }
  }

  /**
   * Migrate legacy match data to VIS-compliant format during cache retrieval
   */
  static async migrateLegacyMatchesToVisCompliant(matches: BeachMatch[]): Promise<VisCompliantMatch[]> {
    const migratedMatches: VisCompliantMatch[] = [];
    
    for (const legacyMatch of matches) {
      try {
        const visCompliantMatch = convertLegacyToVisCompliant(legacyMatch);
        migratedMatches.push(visCompliantMatch);
      } catch (conversionError) {
        // console.warn('Failed to convert legacy match to VIS-compliant:', conversionError);
        // Skip matches that can't be converted rather than failing entirely
      }
    }
    
    return migratedMatches;
  }

  /**
   * Clear expired tournament details caches (includes both legacy and VIS-compliant caches)
   */
  static async clearExpiredTournamentCaches(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const tournamentCacheKeys = keys.filter(key => 
        key.startsWith(STORAGE_KEYS.TOURNAMENT_DETAILS_CACHE)
      );
      
      const now = new Date();
      const keysToRemove: string[] = [];
      
      for (const key of tournamentCacheKeys) {
        try {
          const cachedDataStr = await AsyncStorage.getItem(key);
          if (cachedDataStr) {
            // Handle both legacy and VIS-compliant cache formats
            if (key.includes('_vis_')) {
              const cachedData: CachedVisCompliantTournamentDetails = JSON.parse(cachedDataStr);
              const expiresAt = new Date(cachedData.expiresAt);
              
              if (now > expiresAt) {
                keysToRemove.push(key);
              }
            } else {
              const cachedData: CachedTournamentDetails = JSON.parse(cachedDataStr);
              const expiresAt = new Date(cachedData.expiresAt);
              
              if (now > expiresAt) {
                keysToRemove.push(key);
              }
            }
          }
        } catch {
          // If parsing fails, remove the key
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      // console.error('Failed to clear expired caches:', error);
    }
  }

  /**
   * Clear all referee-related data (for testing or reset purposes)
   */
  static async clearAllData(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
      
      // Also clear tournament-specific court preferences and details cache
      const allKeys = await AsyncStorage.getAllKeys();
      const courtPreferenceKeys = allKeys.filter(key => 
        key.startsWith(STORAGE_KEYS.COURT_PREFERENCES)
      );
      const tournamentDetailsKeys = allKeys.filter(key => 
        key.startsWith(STORAGE_KEYS.TOURNAMENT_DETAILS_CACHE)
      );
      
      const keysToRemove = [...courtPreferenceKeys, ...tournamentDetailsKeys];
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      
      // console.log('All referee data cleared from storage');
    } catch (error) {
      // console.error('Failed to clear all data:', error);
      throw new Error('Failed to clear all data');
    }
  }
}