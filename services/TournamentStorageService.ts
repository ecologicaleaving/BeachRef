import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tournament } from '../types/tournament';
import { TournamentRefereeData } from '../types/referee-v2';

const STORAGE_KEYS = {
  SELECTED_TOURNAMENT: '@referee_selected_tournament',
  USER_PREFERENCES: '@referee_user_preferences',
  COURT_PREFERENCES: '@referee_court_preferences',
  TOURNAMENT_DETAILS_CACHE: '@referee_tournament_details_cache',
  REFEREE_DATA_CACHE: '@referee_data_cache',
} as const;

const CACHE_EXPIRY_HOURS = 6; // Cache expires after 6 hours
const REFEREE_CACHE_EXPIRY_HOURS = 24; // Referee data expires after 24 hours

export interface UserPreferences {
  selectedCourt?: string;
  notificationsEnabled: boolean;
  lastAppVersion?: string;
  onboardingCompleted: boolean;
  timezoneDisplayMode?: 'user' | 'local'; // Phase 3: Timezone preference ('user' = My Time, 'local' = Local Time)
}

interface CachedTournamentDetails {
  tournament: Tournament;
  cachedAt: string;
  expiresAt: string;
}

interface CachedRefereeData {
  refereeData: TournamentRefereeData;
  cachedAt: string;
  expiresAt: string;
}

export class TournamentStorageService {
  /**
   * Save the selected tournament to AsyncStorage
   */
  static async saveSelectedTournament(tournament: Tournament): Promise<void> {
    try {
      const tournamentData = JSON.stringify(tournament);
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_TOURNAMENT, tournamentData);
    } catch (error) {
      // console.error('Failed to save selected tournament:', error);
      throw new Error('Failed to save tournament selection');
    }
  }

  /**
   * Retrieve the selected tournament from AsyncStorage
   */
  static async getSelectedTournament(): Promise<Tournament | null> {
    try {
      const tournamentData = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_TOURNAMENT);
      if (!tournamentData) {
        return null;
      }
      
      const tournament = JSON.parse(tournamentData) as Tournament;
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
   * Cache detailed tournament data (including InfoSchedule, InfoLocation, etc.)
   */
  static async cacheTournamentDetails(tournamentNo: string, tournament: Tournament): Promise<void> {
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
   * Get cached tournament details if available and not expired
   */
  static async getCachedTournamentDetails(tournamentNo: string): Promise<Tournament | null> {
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
   * Clear expired tournament details caches
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
            const cachedData: CachedTournamentDetails = JSON.parse(cachedDataStr);
            const expiresAt = new Date(cachedData.expiresAt);
            
            if (now > expiresAt) {
              keysToRemove.push(key);
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
   * Cache referee data for a tournament with 24-hour TTL
   */
  static async cacheRefereeData(tournamentNo: string, refereeData: TournamentRefereeData): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (REFEREE_CACHE_EXPIRY_HOURS * 60 * 60 * 1000));
      
      const cachedData: CachedRefereeData = {
        refereeData,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };
      
      const cacheKey = `${STORAGE_KEYS.REFEREE_DATA_CACHE}_${tournamentNo}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Failed to cache referee data:', error);
    }
  }

  /**
   * Get cached referee data if available and not expired
   */
  static async getCachedRefereeData(tournamentNo: string): Promise<TournamentRefereeData | null> {
    try {
      const cacheKey = `${STORAGE_KEYS.REFEREE_DATA_CACHE}_${tournamentNo}`;
      const cachedDataStr = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedDataStr) {
        return null;
      }
      
      const cachedData: CachedRefereeData = JSON.parse(cachedDataStr);
      const now = new Date();
      const expiresAt = new Date(cachedData.expiresAt);
      
      // Check if cache is expired
      if (now > expiresAt) {
        // Remove expired cache
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      return cachedData.refereeData;
    } catch (error) {
      console.error('Failed to get cached referee data:', error);
      return null;
    }
  }

  /**
   * Clear expired referee data caches
   */
  static async clearExpiredRefereeCaches(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const refereeCacheKeys = keys.filter(key => 
        key.startsWith(STORAGE_KEYS.REFEREE_DATA_CACHE)
      );
      
      const now = new Date();
      const keysToRemove: string[] = [];
      
      for (const key of refereeCacheKeys) {
        try {
          const cachedDataStr = await AsyncStorage.getItem(key);
          if (cachedDataStr) {
            const cachedData: CachedRefereeData = JSON.parse(cachedDataStr);
            const expiresAt = new Date(cachedData.expiresAt);
            
            if (now > expiresAt) {
              keysToRemove.push(key);
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
      console.error('Failed to clear expired referee caches:', error);
    }
  }

  /**
   * Remove referee data cache for a specific tournament
   */
  static async clearRefereeDataCache(tournamentNo: string): Promise<void> {
    try {
      const cacheKey = `${STORAGE_KEYS.REFEREE_DATA_CACHE}_${tournamentNo}`;
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Failed to clear referee data cache:', error);
    }
  }

  /**
   * Clear all referee-related data (for testing or reset purposes)
   */
  static async clearAllData(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
      
      // Also clear tournament-specific court preferences, details cache, and referee data cache
      const allKeys = await AsyncStorage.getAllKeys();
      const courtPreferenceKeys = allKeys.filter(key => 
        key.startsWith(STORAGE_KEYS.COURT_PREFERENCES)
      );
      const tournamentDetailsKeys = allKeys.filter(key => 
        key.startsWith(STORAGE_KEYS.TOURNAMENT_DETAILS_CACHE)
      );
      const refereeDataKeys = allKeys.filter(key => 
        key.startsWith(STORAGE_KEYS.REFEREE_DATA_CACHE)
      );
      
      const keysToRemove = [...courtPreferenceKeys, ...tournamentDetailsKeys, ...refereeDataKeys];
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      
    } catch (error) {
      // console.error('Failed to clear all data:', error);
      throw new Error('Failed to clear all data');
    }
  }
}