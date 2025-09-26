import AsyncStorage from '@react-native-async-storage/async-storage';

// Define types locally since they might not be exported
interface PersistedClient {
  clientState: any;
  timestamp: number;
}

interface Persister {
  persistClient: (client: PersistedClient) => Promise<void>;
  restoreClient: () => Promise<PersistedClient | undefined>;
  removeClient: () => Promise<void>;
}

// AsyncStorage-based persister implementation for TanStack Query v5
export const asyncStoragePersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    try {
      const serialized = JSON.stringify(client);
      await AsyncStorage.setItem('tanstack-query-cache', serialized);
    } catch (error) {
      console.warn('Failed to persist query client:', error);
      throw error;
    }
  },
  restoreClient: async () => {
    try {
      const stored = await AsyncStorage.getItem('tanstack-query-cache');
      if (!stored) {
        return undefined;
      }
      return JSON.parse(stored) as PersistedClient;
    } catch (error) {
      console.warn('Failed to restore query client:', error);
      return undefined;
    }
  },
  removeClient: async () => {
    try {
      await AsyncStorage.removeItem('tanstack-query-cache');
    } catch (error) {
      console.warn('Failed to remove persisted query client:', error);
      throw error;
    }
  }
};

// Cache restoration configuration
export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  hydrateOptions: {},
  dehydrateOptions: {
    shouldDehydrateQuery: (query: any) => {
      // Only persist successful queries
      return query.state.status === 'success';
    },
  },
};

// Migration strategy for existing AsyncStorage data
export const migrateAsyncStorageData = async (): Promise<void> => {
  try {
    // Check for existing cache data patterns
    const existingKeys = await AsyncStorage.getAllKeys();
    const legacyCacheKeys = existingKeys.filter(key => 
      key.startsWith('cache_') || 
      key.startsWith('tournament_') || 
      key.startsWith('matches_')
    );

    if (legacyCacheKeys.length > 0) {
      // Note: Migration logic can be added here if needed
      // For now, we'll let the new system build fresh cache
    }
  } catch (error) {
    console.warn('AsyncStorage migration check failed:', error);
  }
};

// Error handling for persistence operations
export const handlePersistenceError = (error: Error): void => {
  console.error('Query persistence error:', error);
  // Optionally report to error tracking service
  // ErrorLogger.logError(error, { context: 'query-persistence' });
};