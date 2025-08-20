import { Tournament } from '../types/tournament';
import { BeachMatch } from '../types/match';
import { IVisApiService } from './interfaces/IVisApiService';
import { TournamentStorageService } from './TournamentStorageService';
import { TournamentMappingCacheService } from './TournamentMappingCache';
// Remove CacheService import to break circular dependency
// CacheService will use this class through the factory pattern

export type TournamentType = 'ALL' | 'FIVB' | 'CEV' | 'BPT' | 'LOCAL';

const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

export type GenderType = 'M' | 'W' | 'Mixed' | 'Unknown';

export class VisApiService implements IVisApiService {
  // Extract gender from tournament code (M/W prefix)
  static extractGenderFromCode(code?: string): GenderType {
    if (!code) return 'Unknown';
    
    const upperCode = code.toUpperCase();
    if (upperCode.startsWith('M')) return 'M';
    if (upperCode.startsWith('W')) return 'W';
    
    return 'Mixed';
  }

  // Get base tournament code without gender prefix
  static getBaseTournamentCode(code?: string): string {
    if (!code) return '';
    
    const upperCode = code.toUpperCase();
    if (upperCode.startsWith('M') || upperCode.startsWith('W')) {
      return upperCode.substring(1);
    }
    
    return upperCode;
  }

  // Find related tournaments by base code
  static async findRelatedTournaments(tournament: Tournament): Promise<Tournament[]> {
    if (!tournament.Code) return [tournament];
    
    try {
      const allTournaments = await this.getTournamentListWithDetails();
      const baseCode = this.getBaseTournamentCode(tournament.Code);
      
      return allTournaments.filter(t => {
        if (!t.Code) return false;
        const tBaseCode = this.getBaseTournamentCode(t.Code);
        return tBaseCode === baseCode;
      });
    } catch (error) {
      console.error('Error finding related tournaments:', error);
      return [tournament];
    }
  }

  static classifyTournament(tournament: Tournament): TournamentType {
    const code = tournament.Code || '';
    const name = tournament.Name || '';
    
    // Check for FIVB tournaments
    if (name.toLowerCase().includes('fivb') || 
        name.toLowerCase().includes('world tour') || 
        name.toLowerCase().includes('world championship')) {
      return 'FIVB';
    }
    
    // Check for BPT tournaments
    if (name.toLowerCase().includes('bpt') || 
        code.toLowerCase().includes('bpt') ||
        name.toLowerCase().includes('beach pro tour') ||
        name.toLowerCase().includes('challenge') ||
        name.toLowerCase().includes('elite16')) {
      return 'BPT';
    }
    
    // Check for CEV tournaments
    if (name.toLowerCase().includes('cev') || 
        code.toLowerCase().includes('cev') ||
        name.toLowerCase().includes('european') ||
        name.toLowerCase().includes('europa') ||
        name.toLowerCase().includes('championship')) {
      return 'CEV';
    }
    
    // Default to local tournament
    return 'LOCAL';
  }

  static async getTournamentListWithDetails(filterOptions?: {
    recentOnly?: boolean;
    year?: number;
    currentlyActive?: boolean;
    tournamentType?: TournamentType;
  }): Promise<Tournament[]> {
    try {
      console.log('VisApiService: getTournamentListWithDetails called with options:', filterOptions);
      
      // For external callers, use CacheService through lazy loading to avoid circular dependency
      const { CacheService } = await import('./CacheService');
      
      console.log('VisApiService: Initializing CacheService...');
      CacheService.initialize();
      console.log('VisApiService: CacheService initialized');
      
      console.log('VisApiService: Calling CacheService.getTournaments...');
      const result = await CacheService.getTournaments(filterOptions);
      console.log('VisApiService: CacheService.getTournaments returned:', result.source, result.data.length, 'items');
      
      return result.data;
    } catch (error) {
      console.error('Error in getTournamentListWithDetails:', error);
      
      // Final fallback to direct API
      try {
        console.log('Attempting direct API fallback after cache error');
        return await this.fetchDirectFromAPI(filterOptions);
      } catch (fallbackError) {
        console.error('Direct API fallback also failed:', fallbackError);
        throw new Error('Failed to fetch active tournaments');
      }
    }
  }

  /**
   * Direct API fetch method - used as fallback when cache is unavailable
   * This preserves the exact original implementation behavior
   */
  static async fetchDirectFromAPI(filterOptions?: {
    recentOnly?: boolean;
    year?: number;
    currentlyActive?: boolean;
    tournamentType?: TournamentType;
  }): Promise<Tournament[]> {
    try {
      // Use GetEventList for better data quality with enriched fields for tournament cards
      const fields = 'Name Title StartDate EndDate Code City Country CountryName Location Venue Courts Surface Gender Teams MaxTeams PrizeMoney Prize Currency Category Type Series Status AuxiliaryPersons OfficialFunctions HasVolleyTournament HasBeachTournament No';
      
      let xmlRequest: string;
      
      if (filterOptions?.year) {
        // Request tournaments for specific year with date filters
        const yearStart = `${filterOptions.year}-01-01`;
        const yearEnd = `${filterOptions.year}-12-31`;
        xmlRequest = `<Requests><Request Type='GetEventList' Fields='${fields}'><Filter HasBeachTournament='1' FirstDate='${yearStart}' LastDate='${yearEnd}' /></Request></Requests>`;
        console.log(`🏐 API: Requesting GetEventList tournaments for year ${filterOptions.year} (${yearStart} to ${yearEnd})`);
      } else {
        // Default to current year + next year (2025-2026) instead of ALL tournaments
        const currentYear = new Date().getFullYear();
        const yearStart = `${currentYear}-01-01`;
        const yearEnd = `${currentYear + 1}-12-31`;
        xmlRequest = `<Requests><Request Type='GetEventList' Fields='${fields}'><Filter HasBeachTournament='1' FirstDate='${yearStart}' LastDate='${yearEnd}' /></Request></Requests>`;
        console.log(`🏐 API: Requesting GetEventList tournaments for current period (${yearStart} to ${yearEnd})`);
      }
      
      const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
      console.log(`🏐 API: Full request URL: ${requestUrl}`);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for large response

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      
      // Search for Baden specifically without logging the full XML (too long)
      if (xmlText.includes('Baden')) {
        console.log('🏐 Baden found in XML response!');
        const badenMatches = xmlText.match(/<Event[^>]*Baden[^>]*\/>/g);
        if (badenMatches) {
          console.log(`🏐 RAW BADEN XML ENTRIES:`, badenMatches);
        }
      } else {
        // Search for Baden in different ways
        console.log('🏐 Searching for Baden with different patterns...');
        const patterns = ['Baden', 'BVB-BAD'];
        patterns.forEach(pattern => {
          const regex = new RegExp(pattern, 'gi');
          const matches = xmlText.match(regex);
          if (matches) {
            console.log(`🏐 Found ${pattern}:`, matches);
            // Find the full Event tag containing this match
            const eventRegex = new RegExp(`<Event[^>]*${pattern}[^>]*\/>`, 'gi');
            const eventMatches = xmlText.match(eventRegex);
            if (eventMatches) {
              console.log(`🏐 Full Event tag for ${pattern}:`, eventMatches);
            }
          }
        });
        
        // Also log total XML length to understand if Baden is just later in the response
        console.log(`🏐 Total XML length: ${xmlText.length} characters`);
        console.log(`🏐 XML contains NbItems:`, xmlText.match(/NbItems="(\d+)"/)?.[1] || 'unknown');
      }
      
      const allTournaments = this.parseGetEventListTournaments(xmlText);
      console.log(`🏐 Parsed ${allTournaments.length} total tournaments from GetEventList API`);
      
      // Debug: Show what years are available in the API data
      const yearsAvailable = new Set<number>();
      const monthsAvailable = new Set<string>();
      allTournaments.forEach(tournament => {
        if (tournament.StartDate) {
          try {
            const startDate = new Date(tournament.StartDate);
            const year = startDate.getFullYear();
            const month = startDate.getMonth() + 1;
            yearsAvailable.add(year);
            monthsAvailable.add(`${year}-${month.toString().padStart(2, '0')}`);
          } catch (error) {
            // Invalid date, skip
          }
        }
      });
      console.log(`🏐 Years available in API data: ${Array.from(yearsAvailable).sort().join(', ')}`);
      console.log(`🏐 Months available in API data: ${Array.from(monthsAvailable).sort().join(', ')}`);
      
      // Show date range of tournaments
      const dates = allTournaments
        .map(t => t.StartDate)
        .filter(Boolean)
        .map(date => new Date(date))
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (dates.length > 0) {
        console.log(`🏐 Tournament date range: ${dates[0].toISOString().split('T')[0]} to ${dates[dates.length - 1].toISOString().split('T')[0]}`);
      }
      
      // Apply filtering based on parameters
      let filteredTournaments = allTournaments;
      
      if (filterOptions?.year) {
        // Filter by specific year when year is provided
        console.log(`🏐 Filtering tournaments for requested year: ${filterOptions.year}`);
        const beforeFilterCount = allTournaments.length;
        
        filteredTournaments = allTournaments.filter(tournament => {
          if (!tournament.StartDate) return false;
          
          try {
            const startDate = new Date(tournament.StartDate);
            const tournamentYear = startDate.getFullYear();
            const isMatchingYear = tournamentYear === filterOptions.year;
            
            return isMatchingYear;
          } catch (error) {
            console.warn(`Invalid date for tournament ${tournament.No}: ${tournament.StartDate}`);
            return false;
          }
        });
        
        console.log(`🏐 Year filtering result: ${beforeFilterCount} → ${filteredTournaments.length} tournaments for year ${filterOptions.year}`);
        
        // Special debug for 2024
        if (filterOptions.year === 2024) {
          console.log('🏐 Sample tournaments with dates:');
          allTournaments.slice(0, 5).forEach(t => {
            if (t.StartDate) {
              const startDate = new Date(t.StartDate);
              const year = startDate.getFullYear();
              console.log(`  - ${t.Name}: ${t.StartDate} (year: ${year})`);
            }
          });
          
          const tournaments2024 = allTournaments.filter(t => {
            if (!t.StartDate) return false;
            try {
              const startDate = new Date(t.StartDate);
              return startDate.getFullYear() === 2024;
            } catch {
              return false;
            }
          });
          console.log(`🏐 Found ${tournaments2024.length} tournaments specifically for 2024`);
          if (tournaments2024.length > 0) {
            console.log('🏐 2024 tournaments found:', tournaments2024.slice(0, 3).map(t => `${t.Name} (${t.StartDate})`));
          }
        }
      } else if (filterOptions?.recentOnly !== false) {
        // Default behavior: filter to recent tournaments (within +/- 1 month from today)
        console.log('🏐 Applying default recent-only filter (±1 month)');
        const today = new Date();
        const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        const oneMonthFromNow = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
        
        filteredTournaments = allTournaments.filter(tournament => {
          if (!tournament.StartDate) return false;
          
          try {
            const startDate = new Date(tournament.StartDate);
            const isWithinRange = startDate >= oneMonthAgo && startDate <= oneMonthFromNow;
            
            if (!isWithinRange) {
              console.log(`Filtering out old tournament: ${tournament.Name} (${tournament.StartDate})`);
            }
            
            return isWithinRange;
          } catch (error) {
            console.warn(`Invalid date for tournament ${tournament.No}: ${tournament.StartDate}`);
            return false;
          }
        });
      }
      
      const recentTournaments = filteredTournaments;
      console.log(`🏐 After filtering: ${recentTournaments.length} tournaments remain`);
      
      // Sort tournaments by start date (ascending - earliest first)
      const sortedTournaments = recentTournaments.sort((a, b) => {
        if (!a.StartDate) return 1;
        if (!b.StartDate) return -1;
        
        try {
          const dateA = new Date(a.StartDate);
          const dateB = new Date(b.StartDate);
          return dateA.getTime() - dateB.getTime();
        } catch {
          return 0;
        }
      });
      
      console.log(`🏐 Final result: ${sortedTournaments.length} tournaments after filtering and sorting:`);
      
      // Debug tournament classification
      const tournamentsByType = {
        FIVB: 0,
        BPT: 0,
        CEV: 0,
        LOCAL: 0
      };
      
      sortedTournaments.forEach(t => {
        const type = this.classifyTournament(t);
        tournamentsByType[type]++;
        console.log(`- ${t.Name} (${t.Code}) - ${t.StartDate} to ${t.EndDate} [${type}]`);
      });
      
      console.log('Tournament breakdown by type:', tournamentsByType);
      
      // Apply tournament type filtering if specified
      if (filterOptions?.tournamentType && filterOptions.tournamentType !== 'ALL') {
        const filteredByType = sortedTournaments.filter(tournament => 
          this.classifyTournament(tournament) === filterOptions.tournamentType
        );
        
        console.log(`Filtered by type ${filterOptions.tournamentType}: ${filteredByType.length} tournaments`);
        return filteredByType;
      }
      
      return sortedTournaments;
    } catch (error) {
      console.error('Error fetching active tournaments from direct API:', error);
      
      // Provide fallback mock data to prevent app from hanging
      console.log('API call failed, using fallback mock data to prevent app hanging. Error:', error.message);
      return [
        {
          No: '1001',
          Code: 'MBPT2024-01',
          Name: 'Beach Pro Tour - Elite 16 Men',
          Title: 'Beach Pro Tour Elite 16',
          StartDate: '2024-01-15',
          EndDate: '2024-01-21',
          Country: 'International',
          City: 'Demo City',
          Status: 'Running',
          Version: 1
        },
        {
          No: '1002', 
          Code: 'WBPT2024-01',
          Name: 'Beach Pro Tour - Elite 16 Women',
          Title: 'Beach Pro Tour Elite 16',
          StartDate: '2024-01-15',
          EndDate: '2024-01-21',
          Country: 'International', 
          City: 'Demo City',
          Status: 'Running',
          Version: 1
        }
      ] as Tournament[];
    }
  }

  static async getBeachMatchList(tournamentNo: string): Promise<BeachMatch[]> {
    console.log(`VisApiService: getBeachMatchList called for tournament ${tournamentNo}`);
    
    try {
      // For external callers, use CacheService through lazy loading to avoid circular dependency
      const { CacheService } = await import('./CacheService');
      
      // Initialize cache service if not already done
      CacheService.initialize();
      console.log(`VisApiService: Cache service initialized, trying cache first`);
      
      const result = await CacheService.getMatches(tournamentNo);
      
      console.log(`VisApiService: Cache result:`, {
        hasResult: !!result,
        hasData: !!(result && result.data),
        dataLength: result?.data?.length,
        source: result?.source
      });
      
      if (result && result.data) {
        console.log(`VisApiService: Got ${result.data.length} matches from ${result.source} cache for tournament ${tournamentNo}`);
        
        // If cache returns empty matches, try direct API (common for completed tournaments)
        if (result.data.length === 0) {
          console.warn(`VisApiService: Cache returned 0 matches for tournament ${tournamentNo}, trying direct API for completed tournament`);
          const directMatches = await this.fetchMatchesDirectFromAPI(tournamentNo);
          console.log(`VisApiService: Direct API returned ${directMatches.length} matches for completed tournament ${tournamentNo}`);
          return directMatches;
        }
        
        // Check for live matches and establish real-time subscriptions
        await this.handleLiveMatchSubscriptions(result.data);
        
        return result.data;
      }

      // If cache fails, fallback to direct API
      console.warn('VisApiService: Cache service failed, falling back to direct API');
      const directMatches = await this.fetchMatchesDirectFromAPI(tournamentNo);
      console.log(`VisApiService: Direct API fallback returned ${directMatches.length} matches`);
      return directMatches;
    } catch (error) {
      console.error(`VisApiService: Error in getBeachMatchList for tournament ${tournamentNo}:`, error);
      
      // Final fallback to direct API
      try {
        console.log('VisApiService: Attempting direct API fallback after cache error');
        const result = await this.fetchMatchesDirectFromAPI(tournamentNo);
        console.log(`VisApiService: Direct API fallback completed with ${result.length} matches`);
        return result;
      } catch (fallbackError) {
        console.error('VisApiService: Direct API fallback also failed:', fallbackError);
        throw new Error('Failed to fetch tournament matches');
      }
    }
  }

  /**
   * Format XML for readable logging
   */
  static formatXmlForLogging(xmlText: string): string {
    try {
      // Remove excessive whitespace and format for better readability
      let formatted = xmlText
        .replace(/>\s+</g, '><') // Remove whitespace between tags
        .replace(/</g, '\n<')     // New line before each tag
        .trim();
      
      // Add indentation for nested tags
      let indentLevel = 0;
      const lines = formatted.split('\n');
      const indentedLines = lines.map(line => {
        if (line.includes('</') && !line.includes('/>')) {
          indentLevel--;
        }
        const indentedLine = '  '.repeat(Math.max(0, indentLevel)) + line;
        if (line.includes('<') && !line.includes('</') && !line.includes('/>')) {
          indentLevel++;
        }
        return indentedLine;
      });
      
      return indentedLines.join('\n');
    } catch (error) {
      // If formatting fails, return first 1000 characters
      return xmlText.substring(0, 1000) + (xmlText.length > 1000 ? '...' : '');
    }
  }

  /**
   * Try the GetEventList pattern like external website volleyball.uab.at
   * Uses: GetEventList with Fields='Name StartDate EndDate Code AuxiliaryPersons OfficialFunctions'
   */
  /**
   * Try GetBeachTournament API call with No parameter
   * Based on our successful tests with Baden 2025 tournaments
   */
  static async tryGetBeachTournament(tournamentNo: string): Promise<Tournament | null> {
    try {
      // Request specific fields including event-related ones to find parent event
      const fields = 'No Code Name StartDate EndDate StartDateQualification EndDateMainDraw EndMainDrawDate City Country CountryCode CountryName Location Venue Address AuxiliaryPersons OfficialFunctions Officials Referees TechnicalOfficials PlayerList MatchOfficials NoEvent EventNo ParentEvent HasVolleyTournament HasBeachTournament';
      const xmlRequest = `<Request Type="GetBeachTournament" No="${tournamentNo}" Fields="${fields}" />`;
      const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
        },
      });

      if (response.status === 401) {
        return null;
      }

      if (!response.ok) {
        return null;
      }

      const xmlText = await response.text();

      if (xmlText.length < 50) {
        return null;
      }

      // Parse the BeachTournament XML response
      const tournamentMatch = xmlText.match(/<BeachTournament[^>]*>/);
      if (!tournamentMatch) {
        return null;
      }

      const tournamentXml = tournamentMatch[0];

      // Extract all available attributes based on documentation and our tests
      const extractAttribute = (attr: string): string => {
        const match = tournamentXml.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        return match ? match[1] : '';
      };

      // Build enhanced tournament object with all available fields
      const tournament: Tournament = {
        No: extractAttribute('No') || tournamentNo,
        Code: extractAttribute('Code'),
        Name: extractAttribute('Name'),
        Title: extractAttribute('Title'),
        
        // Dates
        StartDate: extractAttribute('StartDate'),
        EndDate: extractAttribute('EndDate'),
        StartDateQualification: extractAttribute('StartDateQualification'),
        StartDateMainDraw: extractAttribute('StartDateMainDraw'),
        EndDateQualification: extractAttribute('EndDateQualification'),
        EndDateMainDraw: extractAttribute('EndDateMainDraw'),
        
        // Location data (key additions from our tests)
        City: extractAttribute('DefaultCity') || extractAttribute('City'),
        Country: extractAttribute('Country'),
        CountryName: extractAttribute('CountryName'),
        CountryCode: extractAttribute('CountryCode'),
        Location: extractAttribute('Location'),
        Venue: extractAttribute('DefaultVenue') || extractAttribute('Venue'),
        Address: extractAttribute('Address'),
        
        // Tournament structure
        NbTeamsQualification: extractAttribute('NbTeamsQualification'),
        NbTeamsFromQualification: extractAttribute('NbTeamsFromQualification'),
        NbTeamsMainDraw: extractAttribute('NbTeamsMainDraw'),
        NbWildCards: extractAttribute('NbWildCards'),
        
        // Officials and functions
        AuxiliaryPersons: extractAttribute('AuxiliaryPersons'),
        OfficialFunctions: extractAttribute('OfficialFunctions'),
        Officials: extractAttribute('Officials'),
        Referees: extractAttribute('Referees'),
        TechnicalOfficials: extractAttribute('TechnicalOfficials'),
        MatchOfficials: extractAttribute('MatchOfficials'),
        
        // Event relationship
        NoEvent: extractAttribute('NoEvent'),
        EventNo: extractAttribute('EventNo'),
        ParentEvent: extractAttribute('ParentEvent'),
        
        // Tournament flags
        HasVolleyTournament: extractAttribute('HasVolleyTournament') === '1',
        HasBeachTournament: extractAttribute('HasBeachTournament') === '1',
        
        // Tournament metadata
        Status: extractAttribute('Status'),
        Version: extractAttribute('Version'),
        Gender: extractAttribute('Gender'),
        Type: extractAttribute('Type'),
        Season: extractAttribute('Season'),
        
        // Organization
        FederationCode: extractAttribute('FederationCode'),
        OrganizerCode: extractAttribute('OrganizerCode'),
        OrganizerType: extractAttribute('OrganizerType'),
        
        // Additional fields from our successful tests
        WebSite: extractAttribute('WebSite'),
        BuyTicketsUrl: extractAttribute('BuyTicketsUrl'),
        IsFreeEntrance: extractAttribute('IsFreeEntrance') === '1',
        IsVisManaged: extractAttribute('IsVisManaged') === '1',
        
        // Technical details
        DefaultTimeZone: extractAttribute('DefaultTimeZone'),
        DefaultLocalTimeOffset: extractAttribute('DefaultLocalTimeOffset'),
        MatchPointsMethod: extractAttribute('MatchPointsMethod'),
        DefaultMatchFormat: extractAttribute('DefaultMatchFormat'),
      };

      return tournament;

    } catch (error) {
      return null;
    }
  }

  /**
   * Try GetEvent to fetch OfficialFunctions for the event
   */
  static async tryGetEventOfficials(eventNo: string): Promise<{auxiliaryPersons: string | null, infoSchedule: string | null, infoLocation: string | null} | null> {
    try {
      // Request Event with AuxiliaryPersons, InfoSchedule, and InfoLocation fields
      const xmlRequest = `<Request Type="GetEvent" No="${eventNo}" Fields="AuxiliaryPersons InfoSchedule InfoLocation" />`;
      const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
        },
      });

      if (response.status === 401) {
        return null;
      }
      
      if (!response.ok) {
        return null;
      }
      
      const xmlText = await response.text();
      
      
      // Parse the Event XML response
      const eventMatch = xmlText.match(/<Event[^>]*>/);
      if (!eventMatch) {
        return null;
      }
      
      const eventXml = eventMatch[0];
      
      // Extract AuxiliaryPersons, InfoSchedule, and InfoLocation attributes
      const auxiliaryPersonsMatch = eventXml.match(/AuxiliaryPersons="([^"]*)"/);
      const infoScheduleMatch = eventXml.match(/InfoSchedule="([^"]*)"/);
      const infoLocationMatch = eventXml.match(/InfoLocation="([^"]*)"/);
      
      const auxiliaryPersons = auxiliaryPersonsMatch ? auxiliaryPersonsMatch[1] : null;
      const infoSchedule = infoScheduleMatch ? infoScheduleMatch[1] : null;
      const infoLocation = infoLocationMatch ? infoLocationMatch[1] : null;
      
      
      return { auxiliaryPersons, infoSchedule, infoLocation };
    } catch (error) {
      return null;
    }
  }

  static async tryGetEventListPattern(tournamentNo: string): Promise<Tournament | null> {
    try {
      
      // Use the exact request pattern from the external website
      const fields = 'Name StartDate EndDate Code AuxiliaryPersons OfficialFunctions HasVolleyTournament HasBeachTournament';
      const xmlRequest = `<Requests><Request Type='GetEventList' Fields='${fields}'><Filter No='${tournamentNo}' HasBeachTournament='1' /></Request></Requests>`;
      
      
      const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
        },
      });

      if (response.ok) {
        const xmlText = await response.text();
        
        const parsed = this.parseGetEventListResponse(xmlText, tournamentNo);
        if (parsed) {
          return parsed;
        }
      } else {
      }
      
      return null;
    } catch (error) {
      console.error(`Error trying GetEventList pattern for tournament ${tournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Parse GetEventList response XML 
   */
  static parseGetEventListResponse(xmlText: string, tournamentNo: string): Tournament | null {
    try {
      // Look for Event elements in the response
      const eventMatches = xmlText.match(/<Event[^>]*\/>/g);
      if (!eventMatches) {
        return null;
      }


      // Find the event with our tournament number
      const targetEvent = eventMatches.find(event => 
        event.includes(`No="${tournamentNo}"`)
      );

      if (!targetEvent) {
        // Try first event if only one found
        if (eventMatches.length === 1) {
          return this.parseEventElement(eventMatches[0]);
        }
        return null;
      }

      return this.parseEventElement(targetEvent);

    } catch (error) {
      console.error('Error parsing GetEventList response:', error);
      return null;
    }
  }

  /**
   * Parse individual Event element from GetEventList response
   */
  static parseEventElement(eventXml: string): Tournament | null {
    try {
      const extractAttribute = (attr: string): string | undefined => {
        const match = eventXml.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        const value = match ? match[1] : undefined;
        if (value) {
        }
        return value;
      };

      const tournament: Tournament = {
        No: extractAttribute('No') || '',
        Code: extractAttribute('Code'),
        Name: extractAttribute('Name'),
        StartDate: extractAttribute('StartDate'),
        EndDate: extractAttribute('EndDate'),
        // Additional fields that might be available
        Title: extractAttribute('Title'),
        City: extractAttribute('City'),
        Country: extractAttribute('Country'),
        Location: extractAttribute('Location'),
        Status: extractAttribute('Status'),
        Type: extractAttribute('Type'),
        Category: extractAttribute('Category'),
        Series: extractAttribute('Series')
      };

      // Also try to extract referee/official information
      const auxiliaryPersons = extractAttribute('AuxiliaryPersons');
      const officialFunctions = extractAttribute('OfficialFunctions');
      
      if (auxiliaryPersons) {
        (tournament as any).AuxiliaryPersons = auxiliaryPersons;
      }
      
      if (officialFunctions) {
        (tournament as any).OfficialFunctions = officialFunctions;
      }

      // Only return if we have the basic required fields
      if (tournament.No && tournament.Name) {
        return tournament;
      }

      return null;
    } catch (error) {
      console.error('Error parsing Event element:', error);
      return null;
    }
  }

  /**
   * Try to get basic tournament details with common information fields
   */
  static async tryBasicTournamentDetails(tournamentNo: string): Promise<Tournament | null> {
    try {
      
      // Try with common tournament information fields
      const fieldsToTry = [
        'No Code Name Title City Country CountryName Location StartDate EndDate Status Type Category Series Prize PrizeMoney Currency Venue Courts Surface Gender ContactName ContactEmail ContactPhone Website Description',
        'No Code Name Title City Country StartDate EndDate Status Type Category Series Prize Venue Courts Surface',
        'No Code Name Title City Country StartDate EndDate Status Type Category Prize'
      ];

      for (const fields of fieldsToTry) {
        
        const xmlRequest = `<Request Type='GetBeachTournament' Fields='${fields}' NoTournament='${tournamentNo}' />`;
        const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
        
        try {
          const response = await fetch(requestUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/xml, text/xml',
              'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
            },
          });

          if (response.ok) {
            const xmlText = await response.text();
            
            const parsed = this.parseBasicTournamentDetails(xmlText);
            if (parsed) {
              return parsed;
            }
          } else {
          }
        } catch (error) {
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error trying basic tournament details:', error);
      return null;
    }
  }

  /**
   * Parse basic tournament details from XML response
   */
  static parseBasicTournamentDetails(xmlText: string): Tournament | null {
    try {
      // Look for BeachTournament tags with attributes
      const tournamentMatch = xmlText.match(/<BeachTournament[^>]*\/>/);
      if (!tournamentMatch) {
        return null;
      }

      const tournamentTag = tournamentMatch[0];

      // Extract attributes using regex
      const extractAttribute = (attr: string): string | undefined => {
        const match = tournamentTag.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        const value = match ? match[1] : undefined;
        if (value) {
        }
        return value;
      };

      const tournament: Tournament = {
        No: extractAttribute('No') || '',
        Code: extractAttribute('Code'),
        Name: extractAttribute('Name'),
        Title: extractAttribute('Title'),
        City: extractAttribute('City'),
        Country: extractAttribute('Country'),
        CountryName: extractAttribute('CountryName'),
        Location: extractAttribute('Location'),
        StartDate: extractAttribute('StartDate'),
        EndDate: extractAttribute('EndDate'),
        Status: extractAttribute('Status'),
        Type: extractAttribute('Type'),
        Category: extractAttribute('Category'),
        Series: extractAttribute('Series'),
        Prize: extractAttribute('Prize'),
        PrizeMoney: extractAttribute('PrizeMoney'),
        Currency: extractAttribute('Currency'),
        Venue: extractAttribute('Venue'),
        Courts: extractAttribute('Courts'),
        Surface: extractAttribute('Surface'),
        Gender: extractAttribute('Gender'),
        ContactName: extractAttribute('ContactName'),
        ContactEmail: extractAttribute('ContactEmail'),
        ContactPhone: extractAttribute('ContactPhone'),
        Website: extractAttribute('Website'),
        Description: extractAttribute('Description')
      };

      // Only return if we have the basic required fields
      if (tournament.No) {
        return tournament;
      }

      return null;
    } catch (error) {
      console.error('Error parsing basic tournament details:', error);
      return null;
    }
  }

  /**
   * Get beach tournament details including officials/referees if available
   * Uses multiple approaches including the GetEventList pattern from external website
   */
  static async getBeachTournamentDetails(tournamentNo: string): Promise<Tournament | null> {
    try {
      // First, try to get from cache
      const cachedDetails = await TournamentStorageService.getCachedTournamentDetails(tournamentNo);
      if (cachedDetails) {
        return cachedDetails;
      }

      // Method 0: Try GetBeachTournament with correct No parameter (based on our successful tests)
      const beachTournamentResult = await this.tryGetBeachTournament(tournamentNo);
      if (beachTournamentResult) {
        // Get additional data from the Event (contains AuxiliaryPersons)
        let finalResult = beachTournamentResult;
        if (beachTournamentResult.NoEvent) {
          const eventData = await this.tryGetEventOfficials(beachTournamentResult.NoEvent);
          if (eventData) {
            // Merge Event AuxiliaryPersons, InfoSchedule, and InfoLocation into tournament data
            finalResult = {
              ...beachTournamentResult,
              AuxiliaryPersons: eventData.auxiliaryPersons || beachTournamentResult.AuxiliaryPersons,
              InfoSchedule: eventData.infoSchedule,
              InfoLocation: eventData.infoLocation
            };
          }
        }
        
        // Cache the final result
        await TournamentStorageService.cacheTournamentDetails(tournamentNo, finalResult);
        return finalResult;
      }
      
      // Method 1: Try GetEventList pattern like external website (volleyball.uab.at)
      const eventListResult = await this.tryGetEventListPattern(tournamentNo);
      if (eventListResult) {
        // Cache the result
        await TournamentStorageService.cacheTournamentDetails(tournamentNo, eventListResult);
        return eventListResult;
      }
      
      // Try basic tournament details first with common fields
      const basicDetails = await this.tryBasicTournamentDetails(tournamentNo);
      if (basicDetails) {
        // Cache the result
        await TournamentStorageService.cacheTournamentDetails(tournamentNo, basicDetails);
        return basicDetails;
      }

      
      // Method 1: Try to map our tournament to external website tournament number
      const mappedResult = await this.tryExternalWebsiteMapping(tournamentNo);
      if (mappedResult && mappedResult.hasRefereeData) {
        return mappedResult;
      }

      // Method 2: Try direct ShowBeachEvent pattern
      const showEventResult = await this.tryShowBeachEventPattern(tournamentNo);
      if (showEventResult && showEventResult.hasRefereeData) {
        return showEventResult;
      }

      // Method 3: Try GetBeachTournament with different field combinations
      const fieldCombinations = [
        'No Code Name Officials Referees TechnicalOfficials',
        'No Code Name StartDate EndDate Officials Referees',
        'No Code Name StartDate EndDate Officials Referees TechnicalOfficials PlayerList EntryList'
      ];

      for (const fields of fieldCombinations) {
        
        const xmlRequest = `<Request Type='GetBeachTournament' Fields='${fields}' NoTournament='${tournamentNo}' />`;
        const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
        
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml',
            'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
          },
        });

        if (response.status === 401) {
          break; // Try next method
        }

        if (!response.ok) {
          continue;
        }

        const xmlText = await response.text();
        
        const parsed = this.parseBeachTournamentDetails(xmlText);
        if (parsed && parsed.hasOfficials) {
          return parsed;
        }
      }
      
      // Method 4: Try GetBeachTournamentList with targeted query
      return await this.getBeachTournamentListDetails(tournamentNo);
      
    } catch (error) {
      console.warn(`All methods failed for tournament ${tournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Try to map our tournament to external website tournament number using cache
   * Step 1: Check cache for tournament code mapping (refreshed weekly)
   * Step 2: Use cached external number to get referee data
   * Step 3: Cache the tournament detail data for future use
   */
  static async tryExternalWebsiteMapping(tournamentNo: string): Promise<any> {
    try {
      
      // Step 1: Get our tournament details to generate/find tournament code
      const ourTournament = await this.getOurTournamentDetails(tournamentNo);
      if (!ourTournament) {
        return null;
      }
      
      const tournamentCode = ourTournament.code || this.generateTournamentCodeFromOurData(ourTournament);
      
      // Step 2: Get external tournament number from cache (with auto-refresh)
      const mappingCache = TournamentMappingCacheService.getInstance();
      const externalTournamentNo = await mappingCache.getExternalTournamentNumber(tournamentCode);
      
      if (!externalTournamentNo) {
        // Try fallback mapping by name/location
        return await this.tryFallbackMapping(tournamentNo, ourTournament);
      }
      
      
      // Step 3: Check if we have cached tournament detail data
      const cachedDetail = await this.getCachedTournamentDetail(externalTournamentNo);
      if (cachedDetail && cachedDetail.referees && cachedDetail.referees.length > 0) {
        return {
          ...cachedDetail,
          source: 'cache',
          mappedFromTournament: tournamentNo,
          externalTournamentNo: externalTournamentNo
        };
      }
      
      // Step 4: Fetch fresh tournament details using external number
      const detailUrl = `${VIS_BASE_URL}?Query=ShowBeachEvent&No=${externalTournamentNo}`;
      
      const detailResponse = await fetch(detailUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
        },
      });

      if (detailResponse.ok) {
        const detailXml = await detailResponse.text();
        
        const eventReferees = this.parseEventRefereeData(detailXml, externalTournamentNo);
        if (eventReferees && eventReferees.referees.length > 0) {
          
          // Cache the tournament detail for future use
          await this.cacheTournamentDetail(externalTournamentNo, eventReferees);
          
          return {
            ...eventReferees,
            source: 'api',
            mappedFromTournament: tournamentNo,
            externalTournamentNo: externalTournamentNo
          };
        }
      }
      
      return null;
    } catch (error) {
      console.warn(`External website mapping failed for tournament ${tournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Map our tournament number to external website tournament number
   * Parse the tournament list XML and find matching tournament
   */
  private static async mapTournamentNumber(ourTournamentNo: string, listXml: string): Promise<string | null> {
    try {
      
      // Get our tournament details to match name/location
      const ourTournament = await this.getOurTournamentDetails(ourTournamentNo);
      if (!ourTournament) {
        return null;
      }
      
      // Parse external tournament list for matches
      // Look for tournament entries with similar names/locations
      const tournamentMatches = this.findTournamentMatches(listXml, ourTournament);
      
      if (tournamentMatches.length > 0) {
        tournamentMatches.forEach((match, index) => {
        });
        
        // Return the best match (first one for now)
        return tournamentMatches[0].no;
      }
      
      return null;
    } catch (error) {
      console.error(`Error mapping tournament ${ourTournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Get details of our tournament for mapping
   */
  private static async getOurTournamentDetails(tournamentNo: string): Promise<any> {
    try {
      // Try to get tournament details from API
      const tournaments = await this.fetchDirectFromAPI();
      const tournament = tournaments.find(t => t.No === tournamentNo);
      
      if (tournament) {
        return {
          name: tournament.Name || tournament.Code,
          location: tournament.Location || tournament.City || tournament.Country,
          startDate: tournament.StartDate,
          code: tournament.Code
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting our tournament details for ${tournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Find matching tournaments in external XML list
   */
  private static findTournamentMatches(listXml: string, ourTournament: any): any[] {
    const matches: any[] = [];
    
    try {
      // Look for tournament entries in various formats
      const patterns = [
        /<Tournament[^>]*No="([^"]*)"[^>]*Name="([^"]*)"[^>]*Location="([^"]*)"[^>]*\/>/g,
        /<BeachTournament[^>]*No="([^"]*)"[^>]*Name="([^"]*)"[^>]*City="([^"]*)"[^>]*\/>/g,
        /<Event[^>]*No="([^"]*)"[^>]*Name="([^"]*)"[^>]*Venue="([^"]*)"[^>]*\/>/g
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(listXml)) !== null) {
          const [, no, name, location] = match;
          
          // Check if this might be our tournament
          if (this.isTournamentMatch(ourTournament, { name, location })) {
            matches.push({ no, name, location });
          }
        }
      });
      
    } catch (error) {
      console.error('Error parsing tournament matches:', error);
    }
    
    return matches;
  }

  /**
   * Check if external tournament matches our tournament
   */
  private static isTournamentMatch(ourTournament: any, externalTournament: any): boolean {
    const ourName = (ourTournament.name || '').toLowerCase();
    const ourLocation = (ourTournament.location || '').toLowerCase();
    const extName = (externalTournament.name || '').toLowerCase();
    const extLocation = (externalTournament.location || '').toLowerCase();
    
    // Check for name matches
    if (ourName.includes('hamburg') && extName.includes('hamburg')) return true;
    if (ourName.includes('berlin') && extName.includes('berlin')) return true;
    if (ourName.includes('munich') && extName.includes('munich')) return true;
    
    // Check for location matches
    if (ourLocation.includes('hamburg') && extLocation.includes('hamburg')) return true;
    if (ourLocation.includes('germany') && extLocation.includes('germany')) return true;
    
    // Check for exact name matches (partial)
    if (ourName.length > 5 && extName.includes(ourName)) return true;
    if (extName.length > 5 && ourName.includes(extName)) return true;
    
    return false;
  }

  /**
   * Generate tournament code from our tournament data
   */
  private static generateTournamentCodeFromOurData(tournament: any): string {
    const year = new Date().getFullYear().toString();
    const name = (tournament.name || '').toLowerCase();
    const location = (tournament.location || '').toLowerCase();
    
    // Extract city code for common patterns
    if (name.includes('hamburg') || location.includes('hamburg')) return `HAM${year}`;
    if (name.includes('berlin') || location.includes('berlin')) return `BER${year}`;
    if (name.includes('munich') || location.includes('munich')) return `MUN${year}`;
    if (name.includes('vienna') || location.includes('vienna')) return `VIE${year}`;
    
    // Fallback to first 3 chars of name + year
    const nameCode = (tournament.name || tournament.code || 'TRN').substring(0, 3).toUpperCase();
    return `${nameCode}${year}`;
  }

  /**
   * Try fallback mapping when no cached mapping exists
   */
  private static async tryFallbackMapping(tournamentNo: string, ourTournament: any): Promise<any> {
    try {
      
      // Get fresh tournament list and try to find match
      const year = new Date().getFullYear();
      const listUrl = `${VIS_BASE_URL}?Query=ShowBeachEvents&Jahr=${year}`;
      
      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
        },
      });

      if (listResponse.ok) {
        const listXml = await listResponse.text();
        const matches = this.findTournamentMatches(listXml, ourTournament);
        
        if (matches.length > 0) {
          const bestMatch = matches[0];
          
          // Try to get referee data with this number
          const detailUrl = `${VIS_BASE_URL}?Query=ShowBeachEvent&No=${bestMatch.no}`;
          const detailResponse = await fetch(detailUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/xml, text/xml',
              'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
            },
          });

          if (detailResponse.ok) {
            const detailXml = await detailResponse.text();
            const eventReferees = this.parseEventRefereeData(detailXml, bestMatch.no);
            
            if (eventReferees && eventReferees.referees.length > 0) {
              return {
                ...eventReferees,
                source: 'fallback',
                mappedFromTournament: tournamentNo,
                externalTournamentNo: bestMatch.no
              };
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn(`Fallback mapping failed for tournament ${tournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Get cached tournament detail data
   */
  private static async getCachedTournamentDetail(externalTournamentNo: string): Promise<any> {
    try {
      const cacheKey = `tournament_detail_${externalTournamentNo}`;
      const cached = await import('@react-native-async-storage/async-storage').then(
        module => module.default.getItem(cacheKey)
      );
      
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const cacheAge = Date.now() - parsedCache.timestamp;
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        
        if (cacheAge < oneWeek) {
          console.log(`🏐 CACHE: Using cached detail for tournament ${externalTournamentNo}`);
          return parsedCache.data;
        } else {
          console.log(`🏐 CACHE: Detail cache expired for tournament ${externalTournamentNo}`);
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting cached tournament detail for ${externalTournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Cache tournament detail data
   */
  private static async cacheTournamentDetail(externalTournamentNo: string, detailData: any): Promise<void> {
    try {
      const cacheKey = `tournament_detail_${externalTournamentNo}`;
      const cacheData = {
        data: detailData,
        timestamp: Date.now()
      };
      
      await import('@react-native-async-storage/async-storage').then(
        module => module.default.setItem(cacheKey, JSON.stringify(cacheData))
      );
      
      console.log(`🏐 CACHE: Cached detail for tournament ${externalTournamentNo}`);
    } catch (error) {
      console.error(`Error caching tournament detail for ${externalTournamentNo}:`, error);
    }
  }

  /**
   * Try the ShowBeachEvent pattern like the external website
   * Uses the exact pattern: Query=ShowBeachEvent&No=1552
   */
  static async tryShowBeachEventPattern(tournamentNo: string): Promise<any> {
    try {
      
      // Test both the provided tournament number and the known working number from external site
      const testNumbers = [tournamentNo];
      
      // If we're testing Hamburg, also try the known working external website number
      if (tournamentNo.includes('8239') || tournamentNo === '8239') {
        testNumbers.push('1552'); // Hamburg tournament number from external website
      }
      
      for (const testNo of testNumbers) {
        
        // Use the exact query pattern from the external website
        // External site uses: Query=ShowBeachEvent&No=1552
        const requestUrl = `${VIS_BASE_URL}?Query=ShowBeachEvent&No=${testNo}`;
        
        
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml',
            'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
          },
        });

        if (response.ok) {
          const xmlText = await response.text();
          
          // Parse for referee data in event format
          const eventReferees = this.parseEventRefereeData(xmlText, testNo);
          if (eventReferees && eventReferees.referees.length > 0) {
            return {
              ...eventReferees,
              usedTournamentNo: testNo,
              originalTournamentNo: tournamentNo
            };
          } else {
          }
        } else {
        }
      }
      
      // Try XML Request format as fallback for the original tournament number
      const xmlRequests = [
        `<Request Type='ShowBeachEvent' No='${tournamentNo}' />`,
        `<Request Type='GetBeachEvent' No='${tournamentNo}' />`
      ];

      for (const xmlRequest of xmlRequests) {
        
        const fallbackUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
        
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml',
            'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
          },
        });

        if (fallbackResponse.ok) {
          const fallbackXml = await fallbackResponse.text();
          
          const fallbackReferees = this.parseEventRefereeData(fallbackXml, tournamentNo);
          if (fallbackReferees && fallbackReferees.referees.length > 0) {
            return fallbackReferees;
          }
        }
      }

      return null;
    } catch (error) {
      console.warn(`ShowBeachEvent pattern failed for tournament ${tournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Try GetBeachTournamentList with extended fields to see what's available
   * Focus on extracting referee data for the specific tournament
   */
  static async getBeachTournamentListDetails(tournamentNo: string): Promise<any> {
    try {
      console.log(`🏐 TOURNAMENT ${tournamentNo}: Extracting tournament officials...`);
      
      // Focus on referee-specific fields
      const refereeFields = [
        'No Code Name Officials Referees TechnicalOfficials',
        'No Code Name StartDate EndDate Officials Referees',
        'No Code Name Officials Referees Players Teams',
        'No Code Name StartDate EndDate Location City Country Officials Referees Players Teams Participants'
      ];

      for (const fields of refereeFields) {
        console.log(`🏐 TOURNAMENT ${tournamentNo}: Trying fields: ${fields}`);
        
        // Use filter to get ONLY the specific tournament
        const xmlRequest = `<Request Type='GetBeachTournamentList' Fields='${fields}'><Filter NoTournament='${tournamentNo}' /></Request>`;
        const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
        
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml',
            'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
          },
        });

        if (!response.ok) {
          console.log(`🏐 TOURNAMENT ${tournamentNo}: Query failed with status ${response.status}`);
          continue;
        }

        const xmlText = await response.text();
        
        // Only log if we get a small response (specific tournament) or if it contains our tournament
        if (xmlText.length < 10000 || xmlText.includes(`No="${tournamentNo}"`)) {
          console.log(`🏐 TOURNAMENT ${tournamentNo}: ✅ SUCCESS! Response length: ${xmlText.length} chars`);
          console.log(`🏐 TOURNAMENT ${tournamentNo}: Formatted XML:`, this.formatXmlForLogging(xmlText));
        } else {
          console.log(`🏐 TOURNAMENT ${tournamentNo}: ✅ SUCCESS but large response (${xmlText.length} chars) - filtering for our tournament...`);
        }
        
        // Parse specifically for our tournament
        const tournamentReferees = this.parseSpecificTournamentReferees(xmlText, tournamentNo);
        if (tournamentReferees && tournamentReferees.referees.length > 0) {
          console.log(`🏐 TOURNAMENT ${tournamentNo}: 🎯 FOUND ${tournamentReferees.referees.length} REFEREES!`);
          return tournamentReferees;
        }
      }
      
      console.log(`🏐 TOURNAMENT ${tournamentNo}: No referee data found in officials fields`);
      return null;
    } catch (error) {
      console.warn(`🏐 TOURNAMENT ${tournamentNo}: GetBeachTournamentList failed:`, error);
      return null;
    }
  }

  /**
   * Parse specific tournament XML to extract referee data
   */
  private static parseSpecificTournamentReferees(xmlText: string, tournamentNo: string): any {
    try {
      
      // Parse BeachTournament elements
      const tournamentMatches = xmlText.match(/<BeachTournament[^>]*\/>/g);
      if (!tournamentMatches) {
        return null;
      }

      
      // Find our specific tournament
      const targetTournament = tournamentMatches.find(tournament => 
        tournament.includes(`No="${tournamentNo}"`)
      );

      if (!targetTournament) {
        return null;
      }


      // Extract all attributes from the tournament element
      const extractAttribute = (name: string): string | undefined => {
        const attrMatch = targetTournament.match(new RegExp(`${name}="([^"]*)"`, 'i'));
        return attrMatch ? attrMatch[1] : undefined;
      };

      // Look for referee-related attributes
      const refereeAttributes = {
        officials: extractAttribute('Officials'),
        referees: extractAttribute('Referees'),
        technicalOfficials: extractAttribute('TechnicalOfficials'),
        players: extractAttribute('Players'),
        teams: extractAttribute('Teams'),
        participants: extractAttribute('Participants')
      };


      // Parse referee data if available
      const referees: any[] = [];
      
      // Check if Officials field contains referee data
      if (refereeAttributes.officials) {
        const officialsReferees = this.parseRefereeField(refereeAttributes.officials);
        referees.push(...officialsReferees);
      }

      // Check if Referees field contains referee data
      if (refereeAttributes.referees) {
        const refereesData = this.parseRefereeField(refereeAttributes.referees);
        referees.push(...refereesData);
      }

      // Check if TechnicalOfficials field contains referee data
      if (refereeAttributes.technicalOfficials) {
        const techOfficials = this.parseRefereeField(refereeAttributes.technicalOfficials);
        referees.push(...techOfficials);
      }

      return {
        tournamentNo,
        referees,
        hasRefereeData: referees.length > 0,
        attributes: refereeAttributes
      };

    } catch (error) {
      console.error(`Error parsing tournament ${tournamentNo} referees:`, error);
      return null;
    }
  }

  /**
   * Parse event XML data for referee information and location details (like external website)
   */
  private static parseEventRefereeData(xmlText: string, tournamentNo: string): any {
    try {
      console.log(`🏐 TOURNAMENT ${tournamentNo}: Parsing event XML for referee data and location info...`);
      
      // Only log full XML if it's reasonably small (specific to our tournament)
      if (xmlText.length < 5000) {
        console.log(`🏐 TOURNAMENT ${tournamentNo}: Full XML content:`, this.formatXmlForLogging(xmlText));
      } else {
        console.log(`🏐 TOURNAMENT ${tournamentNo}: Large XML response (${xmlText.length} chars) - parsing for tournament data...`);
      }
      
      const referees: any[] = [];
      const locationInfo: any = {};
      
      // Extract location information from XML
      this.extractLocationInfo(xmlText, locationInfo, tournamentNo);
      
      // Look for various referee patterns in event XML
      // Pattern 1: Look for referee-related XML elements
      const refereePatterns = [
        /<Referee[^>]*Name="([^"]*)"[^>]*FederationCode="([^"]*)"[^>]*\/>/g,
        /<Official[^>]*Name="([^"]*)"[^>]*Federation="([^"]*)"[^>]*\/>/g,
        /<Schiedsrichter[^>]*Name="([^"]*)"[^>]*Land="([^"]*)"[^>]*\/>/g,
        /<Person[^>]*Name="([^"]*)"[^>]*Country="([^"]*)"[^>]*Type="Referee"[^>]*\/>/g
      ];

      refereePatterns.forEach((pattern, patternIndex) => {
        let match;
        while ((match = pattern.exec(xmlText)) !== null) {
          referees.push({
            No: `event_ref_${patternIndex}_${referees.length + 1}`,
            Name: match[1],
            FederationCode: match[2],
            Source: `event_pattern_${patternIndex + 1}`
          });
        }
      });

      // Pattern 2: Look for referee lists in text content
      const textContent = xmlText.replace(/<[^>]*>/g, ' ');
      
      // Look for "Schiedsrichter:" section (German for referees)
      const schiedsrichterMatch = textContent.match(/Schiedsrichter[:\s]+([^]*?)(?=\n\n|\n[A-Z]|$)/i);
      if (schiedsrichterMatch) {
        console.log(`🏐 TOURNAMENT ${tournamentNo}: Found Schiedsrichter section: ${schiedsrichterMatch[1].substring(0, 200)}`);
        
        // Parse referee entries like "ESP Padron Jose Maria"
        const refereeEntries = schiedsrichterMatch[1].match(/([A-Z]{2,3})[:\s]+([^\n]+)/g);
        if (refereeEntries) {
          refereeEntries.forEach((entry, index) => {
            const entryMatch = entry.match(/([A-Z]{2,3})[:\s]+(.+)/);
            if (entryMatch) {
              referees.push({
                No: `text_ref_${index + 1}`,
                Name: entryMatch[2].trim(),
                FederationCode: entryMatch[1],
                Source: 'text_parsing'
              });
            }
          });
        }
      }

      // Pattern 3: Look for "Officials:" section  
      const officialsMatch = textContent.match(/Officials[:\s]+([^]*?)(?=\n\n|\n[A-Z]|$)/i);
      if (officialsMatch) {
        console.log(`🏐 TOURNAMENT ${tournamentNo}: Found Officials section: ${officialsMatch[1].substring(0, 200)}`);
        
        // Similar parsing for officials
        const officialEntries = officialsMatch[1].match(/([A-Z]{2,3})[:\s]+([^\n]+)/g);
        if (officialEntries) {
          officialEntries.forEach((entry, index) => {
            const entryMatch = entry.match(/([A-Z]{2,3})[:\s]+(.+)/);
            if (entryMatch) {
              referees.push({
                No: `official_ref_${index + 1}`,
                Name: entryMatch[2].trim(),
                FederationCode: entryMatch[1],
                Source: 'officials_parsing'
              });
            }
          });
        }
      }

      // Remove duplicates based on name and federation
      const uniqueReferees = referees.filter((referee, index, self) => 
        index === self.findIndex(r => r.Name === referee.Name && r.FederationCode === referee.FederationCode)
      );

      console.log(`🏐 TOURNAMENT ${tournamentNo}: Found ${uniqueReferees.length} unique referees in event data:`, uniqueReferees);
      console.log(`🏐 TOURNAMENT ${tournamentNo}: Extracted location information:`, locationInfo);

      return {
        tournamentNo,
        referees: uniqueReferees,
        locationInfo,
        hasRefereeData: uniqueReferees.length > 0,
        hasLocationData: Object.keys(locationInfo).length > 0,
        source: 'event_data'
      };

    } catch (error) {
      console.error(`🏐 TOURNAMENT ${tournamentNo}: Error parsing event referee data:`, error);
      return null;
    }
  }

  /**
   * Extract location information from tournament XML
   */
  private static extractLocationInfo(xmlText: string, locationInfo: any, tournamentNo: string): void {
    try {
      console.log(`🏐 TOURNAMENT ${tournamentNo}: Extracting location information...`);

      // Look for location attributes in XML elements
      const locationPatterns = [
        /City="([^"]*)"/g,
        /Country="([^"]*)"/g,
        /Location="([^"]*)"/g,
        /Venue="([^"]*)"/g,
        /Place="([^"]*)"/g,
        /Ort="([^"]*)"/g,  // German for place
        /Land="([^"]*)"/g,  // German for country
        /Stadt="([^"]*)"/g  // German for city
      ];

      const attributes = ['City', 'Country', 'Location', 'Venue', 'Place', 'Ort', 'Land', 'Stadt'];
      
      locationPatterns.forEach((pattern, index) => {
        const matches = [...xmlText.matchAll(pattern)];
        if (matches.length > 0) {
          const attributeName = attributes[index];
          const values = matches.map(match => match[1]).filter(val => val && val.trim().length > 0);
          if (values.length > 0) {
            locationInfo[attributeName] = values;
            console.log(`🏐 TOURNAMENT ${tournamentNo}: Found ${attributeName}:`, values);
          }
        }
      });

      // Look for location info in text content
      const textContent = xmlText.replace(/<[^>]*>/g, ' ');
      
      // Look for common location patterns in text
      const locationTextPatterns = [
        /(?:Location|Venue|Place)[:\s]+([^\n]+)/gi,
        /(?:City|Stadt)[:\s]+([^\n]+)/gi,
        /(?:Country|Land)[:\s]+([^\n]+)/gi,
        /(\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2,3}|\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g // City, Country pattern
      ];

      locationTextPatterns.forEach((pattern, index) => {
        const matches = [...textContent.matchAll(pattern)];
        if (matches.length > 0) {
          const patternName = `textPattern${index + 1}`;
          const values = matches.map(match => 
            match[1] ? match[1].trim() : match[0].trim()
          ).filter(val => val && val.length > 2);
          if (values.length > 0) {
            locationInfo[patternName] = values;
            console.log(`🏐 TOURNAMENT ${tournamentNo}: Found location text pattern ${index + 1}:`, values);
          }
        }
      });

      // Extract dates if available
      const datePatterns = [
        /(\d{1,2}[.-]\d{1,2}[.-]\d{2,4})/g,
        /(\d{4}-\d{1,2}-\d{1,2})/g,
        /StartDate="([^"]*)"/g,
        /EndDate="([^"]*)"/g
      ];

      datePatterns.forEach((pattern, index) => {
        const matches = [...xmlText.matchAll(pattern)];
        if (matches.length > 0) {
          const patternName = `dates_pattern${index + 1}`;
          const values = matches.map(match => match[1]).filter(val => val && val.trim().length > 0);
          if (values.length > 0) {
            locationInfo[patternName] = values;
            console.log(`🏐 TOURNAMENT ${tournamentNo}: Found date pattern ${index + 1}:`, values);
          }
        }
      });

    } catch (error) {
      console.error(`🏐 TOURNAMENT ${tournamentNo}: Error extracting location info:`, error);
    }
  }

  /**
   * Parse referee field data (could be comma-separated, XML, or other format)
   */
  private static parseRefereeField(fieldData: string): any[] {
    if (!fieldData || fieldData.trim() === '') return [];


    // Try different parsing strategies
    const referees: any[] = [];

    // Strategy 1: Comma-separated values
    if (fieldData.includes(',')) {
      const parts = fieldData.split(',').map(s => s.trim()).filter(s => s.length > 0);
      parts.forEach((part, index) => {
        referees.push({
          No: `ref_${index + 1}`,
          Name: part,
          Source: 'comma_separated'
        });
      });
    }
    // Strategy 2: Semicolon-separated values  
    else if (fieldData.includes(';')) {
      const parts = fieldData.split(';').map(s => s.trim()).filter(s => s.length > 0);
      parts.forEach((part, index) => {
        referees.push({
          No: `ref_${index + 1}`,
          Name: part,
          Source: 'semicolon_separated'
        });
      });
    }
    // Strategy 3: XML-like structure
    else if (fieldData.includes('<') && fieldData.includes('>')) {
      // Try to parse XML structure
      const nameMatches = fieldData.match(/Name="([^"]*)"/g);
      if (nameMatches) {
        nameMatches.forEach((match, index) => {
          const name = match.match(/Name="([^"]*)"/)?.[1];
          if (name) {
            referees.push({
              No: `ref_xml_${index + 1}`,
              Name: name,
              Source: 'xml_structure'
            });
          }
        });
      }
    }
    // Strategy 4: Single value
    else if (fieldData.length > 0) {
      referees.push({
        No: 'ref_single',
        Name: fieldData,
        Source: 'single_value'
      });
    }

    return referees;
  }

  /**
   * Parse tournament details XML to extract officials/referees
   */
  private static parseBeachTournamentDetails(xmlText: string): any {
    try {
      
      // Parse the BeachTournaments XML format looking for officials data
      const tournamentMatches = xmlText.match(/<BeachTournament[^>]*\/>/g);
      if (!tournamentMatches) {
        return null;
      }

      
      // Look for tournaments that have official/referee data
      const tournamentsWithOfficials = tournamentMatches.filter(tournament => {
        return tournament.toLowerCase().includes('official') || 
               tournament.toLowerCase().includes('referee') ||
               tournament.includes('Officials=') ||
               tournament.includes('Referees=');
      });

      if (tournamentsWithOfficials.length > 0) {
        tournamentsWithOfficials.slice(0, 3).forEach((tournament, index) => {
        });
        
        // Let's test the officials training tournament specifically
        this.testOfficialsTournament();
        
        return { 
          hasOfficials: true, 
          tournamentsWithOfficials,
          totalTournaments: tournamentMatches.length 
        };
      }

      // Even if no officials found in attributes, check if the structure supports it
      
      return {
        hasOfficials: false,
        structureSupported: true,
        totalTournaments: tournamentMatches.length,
        sampleTournament: tournamentMatches[0]
      };
    } catch (error) {
      console.error('Error parsing tournament details XML:', error);
      return null;
    }
  }

  /**
   * Test the officials training tournament to see referee data structure
   */
   static async testOfficialsTournament(): Promise<void> {
    try {
      
      // Test GetBeachTournament on the officials training tournament (No="2")
      const fieldsToTest = [
        'No Code Name StartDate Officials Referees',
        'No Code Name Officials Referees TechnicalOfficials',
        'No Code Name StartDate EndDate Officials Referees Players Teams Participants'
      ];

      for (const fields of fieldsToTest) {
        
        const xmlRequest = `<Request Type='GetBeachTournament' Fields='${fields}' NoTournament='2' />`;
        const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
        
        try {
          const response = await fetch(requestUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/xml, text/xml',
              'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
            },
          });

          if (response.ok) {
            const xmlText = await response.text();
            break; // Found working combination
          } else {
          }
        } catch (error) {
        }
      }

      // Also test GetBeachMatchList on officials tournament to see if it has referee assignments
      try {
        const matches = await this.fetchMatchesDirectFromAPI('2');
        
        if (matches.length > 0) {
          // Successfully fetched matches
        }
      } catch (error) {
      }

    } catch (error) {
    }
  }

  /**
   * Direct API fetch method for matches - used as fallback when cache is unavailable
   * This preserves the exact original implementation behavior
   */
  static async fetchMatchesDirectFromAPI(tournamentNo: string): Promise<BeachMatch[]> {
    try {
      // Build the XML request including referee data
      const fields = 'No NoInTournament LocalDate LocalTime TeamAName TeamBName Court MatchPointsA MatchPointsB PointsTeamASet1 PointsTeamBSet1 PointsTeamASet2 PointsTeamBSet2 PointsTeamASet3 PointsTeamBSet3 DurationSet1 DurationSet2 DurationSet3 Status Round NoReferee1 NoReferee2 Referee1Name Referee2Name Referee1FederationCode Referee2FederationCode';
      const xmlRequest = `<Request Type='GetBeachMatchList' Fields='${fields}'><Filter NoTournament='${tournamentNo}' /></Request>`;
      const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
      
      console.log(`DEBUG MATCH API: Fetching matches for tournament ${tournamentNo} from direct API...`);
      console.log(`DEBUG MATCH API: Using XML request: ${xmlRequest}`);
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      console.log(`VisApiService: fetchMatchesDirectFromAPI got XML response length: ${xmlText.length}`);
      
      // Log first part of XML response to debug
      if (xmlText.length > 0) {
        console.log(`DEBUG MATCH API: XML response preview (first 500 chars):`, xmlText.substring(0, 500));
        
        // Special check for tournament 1601 to see what it returns
        if (tournamentNo === '1601') {
          console.log(`DEBUG 1601 MATCHES: Full XML response for tournament 1601:`, xmlText.substring(0, 2000));
        }
      } else {
        console.warn(`DEBUG MATCH API: Empty XML response for tournament ${tournamentNo}`);
      }
      
      const matches = this.parseBeachMatchList(xmlText);
      
      console.log(`VisApiService: Parsed ${matches.length} matches for tournament ${tournamentNo}`);
      
      // Log some match details if available
      if (matches.length > 0) {
        console.log(`VisApiService: Sample matches:`, matches.slice(0, 3).map(m => ({
          No: m.No,
          TeamA: m.TeamAName,
          TeamB: m.TeamBName,
          Status: m.Status,
          Date: m.LocalDate
        })));
      } else {
        console.warn(`VisApiService: No matches found for tournament ${tournamentNo} - checking if tournament is completed/archived`);
      }
      
      return matches;
    } catch (error) {
      console.error(`Error fetching matches for tournament ${tournamentNo} from direct API:`, error);
      throw new Error('Failed to fetch tournament matches');
    }
  }

  /**
   * Handle real-time subscriptions for live matches
   */
  static async handleLiveMatchSubscriptions(matches: BeachMatch[]): Promise<void> {
    try {
      const liveMatches = matches.filter(match => this.isLiveMatch(match));
      if (liveMatches.length > 0) {
        console.log(`Found ${liveMatches.length} live matches, real-time subscriptions would be established here`);
        // TODO: Move this to a higher level service to avoid circular dependency
        // await RealtimeSubscriptionService.subscribeLiveMatches(liveMatches);
      }
    } catch (error) {
      console.warn('Failed to establish live match subscriptions:', error);
      // Non-blocking error - match data should still be served
    }
  }

  /**
   * Check if a match is live and requires real-time updates
   */
  static isLiveMatch(match: BeachMatch): boolean {
    const status = match.Status?.toLowerCase();
    return status === 'live' || 
           status === 'inprogress' || 
           status === 'running';
  }

  private static parseBeachMatchList(xmlText: string): BeachMatch[] {
    try {
      // Check for VIS API errors first
      if (xmlText.includes('<Error>') || xmlText.includes('<error>')) {
        console.warn('VIS API returned error for match list request:', xmlText);
        return [];
      }
      
      // Check for NoData response (common for completed tournaments)
      if (xmlText.includes('<NoData>') || xmlText.includes('NoData') || xmlText.includes('no data')) {
        console.warn('VIS API returned NoData for match list - tournament may be archived');
        return [];
      }
      
      // Parse the BeachMatches XML format
      const matchMatches = xmlText.match(/<BeachMatch[^>]*\/>/g);
      if (!matchMatches) {
        console.warn('No BeachMatch elements found in XML response');
        return [];
      }

      const parsedMatches = matchMatches.map((match) => {
        const extractAttribute = (name: string): string | undefined => {
          const attrMatch = match.match(new RegExp(`${name}="([^"]*)"`, 'i'));
          return attrMatch ? attrMatch[1] : undefined;
        };

        const beachMatch = {
          No: extractAttribute('No') || '',
          NoInTournament: extractAttribute('NoInTournament'),
          LocalDate: extractAttribute('LocalDate'),
          LocalTime: extractAttribute('LocalTime'),
          TeamAName: extractAttribute('TeamAName'),
          TeamBName: extractAttribute('TeamBName'),
          Court: extractAttribute('Court'),
          MatchPointsA: extractAttribute('MatchPointsA'),
          MatchPointsB: extractAttribute('MatchPointsB'),
          PointsTeamASet1: extractAttribute('PointsTeamASet1'),
          PointsTeamBSet1: extractAttribute('PointsTeamBSet1'),
          PointsTeamASet2: extractAttribute('PointsTeamASet2'),
          PointsTeamBSet2: extractAttribute('PointsTeamBSet2'),
          PointsTeamASet3: extractAttribute('PointsTeamASet3'),
          PointsTeamBSet3: extractAttribute('PointsTeamBSet3'),
          DurationSet1: extractAttribute('DurationSet1'),
          DurationSet2: extractAttribute('DurationSet2'),
          DurationSet3: extractAttribute('DurationSet3'),
          Version: extractAttribute('Version'),
          Status: extractAttribute('Status'),
          Round: extractAttribute('Round'),
          NoReferee1: extractAttribute('NoReferee1'),
          NoReferee2: extractAttribute('NoReferee2'),
          Referee1Name: extractAttribute('Referee1Name'),
          Referee2Name: extractAttribute('Referee2Name'),
          Referee1FederationCode: extractAttribute('Referee1FederationCode'),
          Referee2FederationCode: extractAttribute('Referee2FederationCode'),
        };
        
        return beachMatch;
      });
      
      return parsedMatches;
    } catch (error) {
      console.error('VisApiService: Error parsing BeachMatches XML:', error);
      return [];
    }
  }

  /**
   * Parse GetEventList tournaments from XML response
   */
  private static parseGetEventListTournaments(xmlText: string): Tournament[] {
    try {
      // Parse the Events XML format from GetEventList
      const eventMatches = xmlText.match(/<Event[^>]*\/>/g);
      
      if (!eventMatches) {
        return [];
      }


      return eventMatches.map((match) => {
        const extractAttribute = (name: string): string | undefined => {
          const attrMatch = match.match(new RegExp(`${name}="([^"]*)"`, 'i'));
          return attrMatch ? attrMatch[1] : undefined;
        };

        const tournament: Tournament = {
          No: extractAttribute('No') || '',
          NoTournament: extractAttribute('No') || '', // Campo numero progressivo per match loading
          Code: extractAttribute('Code'),
          Name: extractAttribute('Name'),
          StartDate: extractAttribute('StartDate'), // Direct from API!
          EndDate: extractAttribute('EndDate'),     // Direct from API!
          // Enhanced fields for tournament cards
          Title: extractAttribute('Title'),
          City: extractAttribute('City'),
          Country: extractAttribute('Country'),
          CountryName: extractAttribute('CountryName'),
          Location: extractAttribute('Location'),
          Venue: extractAttribute('Venue'),
          Courts: extractAttribute('Courts'),
          Surface: extractAttribute('Surface'),
          Gender: extractAttribute('Gender'),
          Teams: extractAttribute('Teams'),
          MaxTeams: extractAttribute('MaxTeams'),
          PrizeMoney: extractAttribute('PrizeMoney'),
          Prize: extractAttribute('Prize'),
          Currency: extractAttribute('Currency'),
          Category: extractAttribute('Category'),
          Type: extractAttribute('Type'),
          Series: extractAttribute('Series'),
          Status: extractAttribute('Status'),
          Version: extractAttribute('Version'),
        };

        // Add referee/official information if available
        const auxiliaryPersons = extractAttribute('AuxiliaryPersons');
        const officialFunctions = extractAttribute('OfficialFunctions');
        
        if (auxiliaryPersons) {
          (tournament as any).AuxiliaryPersons = auxiliaryPersons;
        }
        
        if (officialFunctions) {
          (tournament as any).OfficialFunctions = officialFunctions;
        }

        // Log complete tournament object for debugging (only for Baden tournaments to avoid spam)
        if (tournament.Name?.toLowerCase().includes('baden')) {
          console.log(`🏐 RAW XML MATCH for Baden:`, match);
          console.log(`🏐 PARSED TOURNAMENT OBJECT (${tournament.Name}):`, JSON.stringify(tournament, null, 2));
        }

        return tournament;
      });
    } catch (error) {
      console.error('Error parsing GetEventList tournaments XML:', error);
      return [];
    }
  }

  private static parseBeachTournamentList(xmlText: string): Tournament[] {
    try {
      // Parse the BeachTournaments XML format
      const tournamentMatches = xmlText.match(/<BeachTournament[^>]*\/>/g);
      
      if (!tournamentMatches) {
        return [];
      }

      return tournamentMatches.map((match) => {
        const extractAttribute = (name: string): string | undefined => {
          const attrMatch = match.match(new RegExp(`${name}="([^"]*)"`, 'i'));
          return attrMatch ? attrMatch[1] : undefined;
        };

        return {
          No: extractAttribute('No') || '',
          Code: extractAttribute('Code'),
          Name: extractAttribute('Name'),
          Title: extractAttribute('Title'),
          StartDate: extractAttribute('StartDate'),
          EndDate: extractAttribute('EndDate'),
          City: extractAttribute('City'),
          Country: extractAttribute('Country'),
          CountryName: extractAttribute('CountryName'),
          Location: extractAttribute('Location'),
          Version: extractAttribute('Version'),
        };
      });
    } catch (error) {
      console.error('Error parsing BeachTournaments XML:', error);
      return [];
    }
  }
}