import AsyncStorage from '@react-native-async-storage/async-storage';
import { VisApiClient } from './api/VisApiClient';
import { DEFAULT_RETRY_CONFIG } from './api/VisApiClient';

interface TournamentMapping {
  code: string; // Our tournament code like "HAM2025"
  externalNo: string; // External website tournament number like "1552"
  name: string;
  location: string;
  startDate?: string;
  lastUpdated: number; // Timestamp when mapping was created
}

interface TournamentMappingCache {
  mappings: TournamentMapping[];
  lastFetch: number; // Timestamp of last fetch
  expirationPeriod: number; // 1 week in milliseconds
}

const CACHE_KEY = 'tournament_mapping_cache';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export class TournamentMappingCacheService {
  private static instance: TournamentMappingCacheService;
  private cache: TournamentMappingCache | null = null;
  private visApiClient: VisApiClient;

  private constructor() {
    this.visApiClient = new VisApiClient({
      baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
      timeoutMs: 10000,
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      enableLogging: true
    }, DEFAULT_RETRY_CONFIG);
  }

  static getInstance(): TournamentMappingCacheService {
    if (!TournamentMappingCacheService.instance) {
      TournamentMappingCacheService.instance = new TournamentMappingCacheService();
    }
    return TournamentMappingCacheService.instance;
  }

  /**
   * Get external tournament number for a given tournament code
   * Refreshes cache if needed (monthly)
   */
  async getExternalTournamentNumber(tournamentCode: string): Promise<string | null> {
    try {
      // console.log(`🏐 CACHE: Getting external number for tournament code: ${tournamentCode}`);
      
      // Load cache and check if refresh is needed
      await this.loadCache();
      
      if (this.shouldRefreshCache()) {
        // console.log(`🏐 CACHE: Cache expired or missing, refreshing tournament mappings...`);
        await this.refreshTournamentMappings();
      }

      // Find mapping for the tournament code
      const mapping = this.cache?.mappings.find(m => m.code === tournamentCode);
      if (mapping) {
        // console.log(`🏐 CACHE: Found mapping ${tournamentCode} -> ${mapping.externalNo}`);
        return mapping.externalNo;
      }

      // console.log(`🏐 CACHE: No mapping found for tournament code: ${tournamentCode}`);
      return null;
    } catch (error) {
      // console.error(`Error getting external tournament number for ${tournamentCode}:`, error);
      return null;
    }
  }

  /**
   * Get all cached tournament mappings
   */
  async getAllMappings(): Promise<TournamentMapping[]> {
    await this.loadCache();
    return this.cache?.mappings || [];
  }

  /**
   * Force refresh of tournament mappings from external website
   */
  async refreshTournamentMappings(): Promise<void> {
    try {
      // console.log(`🏐 CACHE: Starting tournament mapping refresh...`);
      
      const year = new Date().getFullYear();
      
      // console.log(`🏐 CACHE: Fetching tournament list for year ${year}`);
      
      const xmlText = await this.visApiClient.fetchBeachTournamentsListXml(year);
      // console.log(`🏐 CACHE: Received tournament list (${xmlText.length} chars)`);
      
      // Parse tournaments and create mappings
      const mappings = this.parseTournamentMappings(xmlText);
      
      // Save to cache
      const newCache: TournamentMappingCache = {
        mappings,
        lastFetch: Date.now(),
        expirationPeriod: ONE_WEEK_MS
      };

      await this.saveCache(newCache);
      this.cache = newCache;
      
      // console.log(`🏐 CACHE: ✅ Tournament mapping refresh completed. Found ${mappings.length} tournaments`);
      
    } catch (error) {
      // console.error('Error refreshing tournament mappings:', error);
      throw error;
    }
  }

  /**
   * Parse tournament list XML and extract mappings
   */
  private parseTournamentMappings(xmlText: string): TournamentMapping[] {
    const mappings: TournamentMapping[] = [];
    
    try {
      // Look for tournament entries in various XML formats
      const patterns = [
        /<Tournament[^>]*No="([^"]*)"[^>]*Code="([^"]*)"[^>]*Name="([^"]*)"[^>]*Location="([^"]*)"[^>]*StartDate="([^"]*)"[^>]*\/>/g,
        /<BeachTournament[^>]*No="([^"]*)"[^>]*Code="([^"]*)"[^>]*Name="([^"]*)"[^>]*City="([^"]*)"[^>]*StartDate="([^"]*)"[^>]*\/>/g,
        /<Event[^>]*No="([^"]*)"[^>]*Code="([^"]*)"[^>]*Name="([^"]*)"[^>]*Venue="([^"]*)"[^>]*Date="([^"]*)"[^>]*\/>/g,
        // Simpler patterns without all attributes
        /<Tournament[^>]*No="([^"]*)"[^>]*Code="([^"]*)"[^>]*Name="([^"]*)"[^>]*\/>/g,
        /<BeachTournament[^>]*No="([^"]*)"[^>]*Code="([^"]*)"[^>]*Name="([^"]*)"[^>]*\/>/g
      ];

      patterns.forEach((pattern, patternIndex) => {
        let match;
        while ((match = pattern.exec(xmlText)) !== null) {
          const [, externalNo, code, name, location, startDate] = match;
          
          if (externalNo && code && name) {
            // Create tournament code in our format if needed
            const tournamentCode = this.generateTournamentCode(code, name, location, startDate);
            
            mappings.push({
              code: tournamentCode,
              externalNo,
              name,
              location: location || '',
              startDate: startDate || '',
              lastUpdated: Date.now()
            });
            
            // console.log(`🏐 CACHE: Found tournament: ${tournamentCode} -> ${externalNo} (${name})`);
          }
        }
      });

      // Remove duplicates by code
      const uniqueMappings = mappings.filter((mapping, index, self) => 
        index === self.findIndex(m => m.code === mapping.code)
      );
      
      // console.log(`🏐 CACHE: Parsed ${uniqueMappings.length} unique tournament mappings`);
      return uniqueMappings;
      
    } catch (error) {
      // console.error('Error parsing tournament mappings:', error);
      return [];
    }
  }

  /**
   * Generate tournament code in our format from external data
   */
  private generateTournamentCode(code: string, name: string, location?: string, startDate?: string): string {
    // Try to extract year from startDate or use current year
    const year = startDate ? new Date(startDate).getFullYear().toString() : new Date().getFullYear().toString();
    
    // If code already includes year, use it as is
    if (code.includes(year)) {
      return code.toUpperCase();
    }
    
    // Extract city/location code for common patterns
    const cityCode = this.extractCityCode(name, location || '');
    
    // Generate code like "HAM2025", "BER2025", etc.
    if (cityCode) {
      return `${cityCode}${year}`;
    }
    
    // Fallback to original code with year
    return `${code.toUpperCase()}${year}`;
  }

  /**
   * Extract city code from tournament name or location
   */
  private extractCityCode(name: string, location: string): string {
    const text = `${name} ${location}`.toLowerCase();
    
    // Common city mappings
    const cityMappings: { [key: string]: string } = {
      'hamburg': 'HAM',
      'berlin': 'BER',
      'munich': 'MUN',
      'münchen': 'MUN',
      'cologne': 'COL',
      'köln': 'COL',
      'frankfurt': 'FRA',
      'vienna': 'VIE',
      'wien': 'VIE',
      'zurich': 'ZUR',
      'zürich': 'ZUR',
      'paris': 'PAR',
      'london': 'LON',
      'rome': 'ROM',
      'roma': 'ROM',
      'madrid': 'MAD',
      'barcelona': 'BCN',
      'amsterdam': 'AMS',
      'prague': 'PRG',
      'praha': 'PRG'
    };

    for (const [city, code] of Object.entries(cityMappings)) {
      if (text.includes(city)) {
        return code;
      }
    }

    return '';
  }

  /**
   * Check if cache needs to be refreshed (monthly)
   */
  private shouldRefreshCache(): boolean {
    if (!this.cache) return true;
    
    const now = Date.now();
    const cacheAge = now - this.cache.lastFetch;
    
    return cacheAge > this.cache.expirationPeriod;
  }

  /**
   * Load cache from AsyncStorage
   */
  private async loadCache(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem(CACHE_KEY);
      if (cacheData) {
        this.cache = JSON.parse(cacheData);
        // console.log(`🏐 CACHE: Loaded ${this.cache?.mappings.length || 0} tournament mappings from cache`);
      }
    } catch (error) {
      // console.error('Error loading tournament mapping cache:', error);
      this.cache = null;
    }
  }

  /**
   * Save cache to AsyncStorage
   */
  private async saveCache(cache: TournamentMappingCache): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      // console.log(`🏐 CACHE: Saved ${cache.mappings.length} tournament mappings to cache`);
    } catch (error) {
      // console.error('Error saving tournament mapping cache:', error);
    }
  }

  /**
   * Clear cache (for testing/debugging)
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      this.cache = null;
      // console.log(`🏐 CACHE: Cache cleared`);
    } catch (error) {
      // console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    await this.loadCache();
    
    if (!this.cache) {
      return { status: 'empty', mappings: 0 };
    }

    const now = Date.now();
    const cacheAge = now - this.cache.lastFetch;
    const isExpired = cacheAge > this.cache.expirationPeriod;
    
    return {
      status: isExpired ? 'expired' : 'valid',
      mappings: this.cache.mappings.length,
      lastFetch: new Date(this.cache.lastFetch).toISOString(),
      ageMs: cacheAge,
      expiresIn: this.cache.expirationPeriod - cacheAge
    };
  }
}