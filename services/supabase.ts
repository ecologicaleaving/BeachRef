import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Validate environment variables at import time
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Allow Supabase configuration for development (valid project provided)
const isSupabaseEnabled = supabaseUrl && supabaseAnonKey;

if (!isSupabaseEnabled) {
  console.warn('Supabase disabled - missing environment variables. Running in API-only mode.');
} else {
  console.log('Supabase enabled with valid project configuration.');
}

// Type-safe Supabase client with React Native optimizations
// Add client-side check to prevent SSR issues
const isClient = typeof window !== 'undefined';

export const supabase: SupabaseClient | null = isSupabaseEnabled 
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: isClient ? AsyncStorage : undefined, // Only use AsyncStorage on client
        autoRefreshToken: isClient,
        persistSession: isClient,
        detectSessionInUrl: false, // Disable for React Native
        flowType: 'pkce', // Use PKCE flow for better security
      },
      realtime: {
        params: {
          eventsPerSecond: 10, // Limit events for mobile performance
        },
      },
    })
  : null;

// Connection test helper
export const testSupabaseConnection = async (): Promise<boolean> => {
  if (!supabase) {
    console.warn('Supabase client not available - running in API-only mode');
    return false;
  }
  
  try {
    const { error } = await supabase.from('_healthcheck').select('*').limit(1);
    
    // Expected error for non-existent table indicates working connection
    if (error && (error.code === 'PGRST116' || error.message.includes('does not exist'))) {
      return true;
    }
    
    // Any other error indicates connection issues
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Supabase connection test error:', err);
    return false;
  }
};

export default supabase;