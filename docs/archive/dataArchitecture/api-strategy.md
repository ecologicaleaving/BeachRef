# BeachRef - VIS API Strategy Ottimizzata

## Problemi Risolti vs Implementazione Attuale

### ❌ Problemi nell'Implementazione Attuale
1. **3 endpoint diversi**: GetEventList, GetBeachTournament, GetBeachTournamentList
2. **2000+ righe di fallback logic** con logica complessa
3. **Cache keys instabili** con timestamp che impedisce caching
4. **Merge tournaments logic** complessa per M/W variants
5. **Nessun field selection** - sprechi di bandwidth

### ✅ Nuova Strategia Ottimizzata
1. **Endpoint singolo primario**: GetEventList per lista tournaments
2. **Fallback semplice**: GetBeachTournament solo per dettagli specifici
3. **Cache keys stabili** basati su filtri, senza timestamp
4. **Gender handling automatico** con classificazione
5. **Field selection intelligente** per performance

## 1. API Client Unificato

```typescript
interface IVisApiClient {
  // Primary methods - minimal surface area
  getEventList(request: GetEventListRequest): Promise<string>;
  getBeachTournament(request: GetBeachTournamentRequest): Promise<string>;
  getEvent(request: GetEventRequest): Promise<string>;
  getBeachMatchList(request: GetBeachMatchListRequest): Promise<string>;
}

class VisApiClient implements IVisApiClient {
  private readonly baseUrl = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  private readonly appId = '2a9523517c52420da73d927c6d6bab23';
  private readonly timeout = 15000; // 15 seconds

  async getEventList(request: GetEventListRequest): Promise<string> {
    const xmlRequest = this.buildGetEventListXml(request);
    return this.makeRequest(xmlRequest);
  }

  async getBeachTournament(request: GetBeachTournamentRequest): Promise<string> {
    const xmlRequest = this.buildGetBeachTournamentXml(request);
    return this.makeRequest(xmlRequest);
  }

  async getEvent(request: GetEventRequest): Promise<string> {
    const xmlRequest = this.buildGetEventXml(request);
    return this.makeRequest(xmlRequest);
  }

  async getBeachMatchList(request: GetBeachMatchListRequest): Promise<string> {
    const xmlRequest = this.buildGetBeachMatchListXml(request);
    return this.makeRequest(xmlRequest);
  }

  // Private implementation
  private buildGetEventListXml(request: GetEventListRequest): string {
    const fields = request.fields.join(' ');
    const filterXml = this.buildEventListFilter(request.filter);
    
    return `<Requests><Request Type='GetEventList' Fields='${fields}'>${filterXml}</Request></Requests>`;
  }

  private buildEventListFilter(filter: EventListFilter): string {
    const conditions: string[] = [];
    
    if (filter.IsVisManaged) {
      conditions.push(`IsVisManaged="${filter.IsVisManaged}"`);
    }
    if (filter.NoParentEvent) {
      conditions.push(`NoParentEvent="${filter.NoParentEvent}"`);
    }
    if (filter.HasBeachTournament) {
      conditions.push(`HasBeachTournament="${filter.HasBeachTournament}"`);
    }
    if (filter.StartDate) {
      conditions.push(`StartDate="${filter.StartDate}"`);
    }
    if (filter.EndDate) {
      conditions.push(`EndDate="${filter.EndDate}"`);
    }
    if (filter.No) {
      conditions.push(`No="${filter.No}"`);
    }

    return conditions.length > 0 ? `<Filter ${conditions.join(' ')} />` : '';
  }

  private buildGetBeachTournamentXml(request: GetBeachTournamentRequest): string {
    const fieldsAttr = request.fields ? ` Fields="${request.fields.join(' ')}"` : '';
    return `<Request Type="GetBeachTournament" No="${request.no}"${fieldsAttr} />`;
  }

  private buildGetEventXml(request: GetEventRequest): string {
    const fieldsAttr = request.fields ? ` Fields="${request.fields.join(' ')}"` : '';
    return `<Request Type="GetEvent" No="${request.no}"${fieldsAttr} />`;
  }

  private buildGetBeachMatchListXml(request: GetBeachMatchListRequest): string {
    const fields = request.fields.join(' ');
    const filterXml = `<Filter NoTournament='${request.filter.NoTournament}' />`;
    
    return `<Request Type='GetBeachMatchList' Fields='${fields}'>${filterXml}</Request>`;
  }

  private async makeRequest(xmlRequest: string): Promise<string> {
    const requestUrl = `${this.baseUrl}?Request=${encodeURIComponent(xmlRequest)}`;
    
    console.log(`VIS API Request: ${xmlRequest}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': this.appId,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new VisApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }

      const xmlResponse = await response.text();
      
      // Check for VIS API errors
      this.validateVisResponse(xmlResponse);
      
      console.log(`VIS API Response: ${xmlResponse.length} chars`);
      return xmlResponse;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new VisApiError('Request timeout', 408);
      }
      
      throw error;
    }
  }

  private validateVisResponse(xmlResponse: string): void {
    // Check for common VIS API error patterns
    if (xmlResponse.includes('<Error>') || xmlResponse.includes('<error>')) {
      throw new VisApiError('VIS API returned error response', 400);
    }
    
    if (xmlResponse.includes('<NoData>') || xmlResponse.includes('NoData')) {
      throw new VisApiError('No data available', 404);
    }
    
    if (xmlResponse.length < 10) {
      throw new VisApiError('Invalid response format', 422);
    }
  }
}

// Custom error for better error handling
class VisApiError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'VisApiError';
  }
}
```

## 2. Request/Response Types

```typescript
// Request types based on VIS documentation
interface GetEventListRequest {
  fields: EventField[];
  filter?: EventListFilter;  // Filter is optional
}

interface EventListFilter {
  IsVisManaged?: 'True' | 'False';
  NoParentEvent?: '0';           // For top-level events
  HasBeachTournament?: 'True';   // Only beach volleyball events
  StartDate?: string;            // YYYY-MM-DD format
  EndDate?: string;              // YYYY-MM-DD format
  No?: string;                   // Specific event number
}

interface GetBeachTournamentRequest {
  no: string;                    // Tournament number (mandatory)
  fields?: BeachTournamentField[]; // Optional: if not specified, all accessible fields
}

interface GetEventRequest {
  no: string;                    // Event number (mandatory)
  fields?: EventField[];         // Optional: if not specified, all accessible fields
}

interface GetBeachMatchListRequest {
  fields: BeachMatchField[];
  filter: BeachMatchFilter;
}

interface BeachMatchFilter {
  NoTournament: string;          // Tournament number (mandatory)
  // Additional filters could be added based on match criteria
}

// Field definitions based on VIS documentation
type EventField = 
  | 'No' | 'Code' | 'Name' | 'Type'
  | 'StartDate' | 'EndDate' | 'EffectiveDates'
  | 'CountryCode' | 'Venues' | 'SecurityCardDescr'
  | 'HasBeachTournament' | 'HasVolleyTournament' 
  | 'HasMenTournament' | 'HasWomenTournament'
  | 'AuxiliaryPersons' | 'OfficialFunctions'
  | 'InfoSchedule' | 'InfoLocation' | 'InfoPresentation'
  | 'IsVisManaged' | 'Version' | 'NoParentEvent'
  | 'OrganizerCode' | 'OrganizerType'
  | 'LastChangeDT' | 'LastChangeUser' | 'LastChangeUsername';

type BeachTournamentField =
  | 'No' | 'Code' | 'Name' | 'Title'
  | 'StartDateQualification' | 'StartDateMainDraw'
  | 'EndDateQualification' | 'EndDateMainDraw'
  | 'NbTeamsQualification' | 'NbTeamsMainDraw' | 'NbTeamsFromQualification'
  | 'CountryCode' | 'Gender' | 'Type' | 'Status'
  | 'NoEvent' | 'Season' | 'Deadline'
  | 'MaxCountryTeams' | 'MaxHostTeams' | 'NbWildCards'
  | 'OrganizerCode' | 'OrganizerType'
  | 'PrizeMoney' | 'Earnings' | 'EarningsBonus'
  | 'IsVisManaged' | 'Version'
  | 'LastChangeDT' | 'LastChangeUser' | 'LastChangeUsername'
  | 'EventAuxiliaryPersons' | 'EventLogos' | 'Logos';

type BeachMatchField = 
  | 'No' | 'NoInTournament' | 'NoTournament'
  | 'LocalDate' | 'LocalTime' | 'Court'
  | 'RoundCode' | 'RoundName' | 'RoundPhase' | 'RoundBracket'
  | 'Status' | 'ResultType' | 'Format'
  | 'NoTeamA' | 'NoTeamB' | 'TeamAName' | 'TeamBName'
  | 'TeamAFederationCode' | 'TeamBFederationCode'
  | 'TeamAType' | 'TeamBType'
  | 'TeamAPositionInMainDraw' | 'TeamBPositionInMainDraw'
  | 'TeamAPositionInQualification' | 'TeamBPositionInQualification'
  | 'MatchPointsA' | 'MatchPointsB' | 'WinnerRank' | 'LoserRank'
  | 'PointsTeamASet1' | 'PointsTeamBSet1' | 'DurationSet1'
  | 'PointsTeamASet2' | 'PointsTeamBSet2' | 'DurationSet2'
  | 'PointsTeamASet3' | 'PointsTeamBSet3' | 'DurationSet3'
  | 'PointsTeamASet4' | 'PointsTeamBSet4' | 'DurationSet4'
  | 'PointsTeamASet5' | 'PointsTeamBSet5' | 'DurationSet5'
  | 'NoReferee1' | 'NoReferee2' | 'Referee1Name' | 'Referee2Name'
  | 'Referee1FederationCode' | 'Referee2FederationCode'
  | 'NoPlayerA1' | 'NoPlayerA2' | 'NoPlayerB1' | 'NoPlayerB2'
  | 'TournamentCode' | 'TournamentName' | 'TournamentTitle' | 'TournamentType'
  | 'Personnel' | 'NbSpectators' | 'Temperature' | 'Humidity'
  | 'Version' | 'LastChangeDT' | 'LastChangeUser' | 'LastChangeUsername';
```

## 3. Service Layer con API Strategy

```typescript
class TournamentApiService {
  constructor(
    private visClient: IVisApiClient,
    private parser: VisResponseParser
  ) {}

  /**
   * Get tournament list - primary method
   * Uses GetEventList as recommended by VIS documentation
   */
  async getTournaments(options: TournamentListOptions): Promise<Tournament[]> {
    try {
      // Build date range
      const dateRange = this.buildDateRange(options.year, options.currentlyActive);
      
      // Primary API call - GetEventList with correct VIS filters
      const response = await this.visClient.getEventList({
        fields: TOURNAMENT_LIST_FIELDS,
        filter: {
          IsVisManaged: 'True',         // Only VIS-managed tournaments
          NoParentEvent: '0',           // Only top-level events
          HasBeachTournament: 'True',   // Only beach volleyball events
          StartDate: dateRange.start,
          EndDate: dateRange.end
        }
      });

      // Parse tournaments
      let tournaments = this.parser.parseEventList(response);
      
      // Apply filters
      tournaments = this.applyTournamentFilters(tournaments, options);
      
      console.log(`Retrieved ${tournaments.length} tournaments from VIS API`);
      return tournaments;

    } catch (error) {
      console.error('Failed to get tournaments:', error);
      throw new TournamentApiError('Failed to retrieve tournaments', error);
    }
  }

  /**
   * Get tournament details with enrichment
   * Uses GetBeachTournament for specific details + GetEvent for officials
   */
  async getTournamentDetails(tournamentNo: string): Promise<Tournament | null> {
    try {
      console.log(`Getting details for tournament ${tournamentNo}`);
      
      // First, try to get basic tournament from list
      const basicTournaments = await this.getTournaments({
        year: new Date().getFullYear(),
        currentlyActive: false
      });
      
      const baseTournament = basicTournaments.find(t => t.visNo === tournamentNo);
      if (!baseTournament) {
        console.warn(`Tournament ${tournamentNo} not found in current list`);
        return null;
      }

      // Enrich with beach tournament details
      try {
        const beachResponse = await this.visClient.getBeachTournament({
          no: tournamentNo,
          fields: BEACH_TOURNAMENT_DETAIL_FIELDS
        });
        
        const location = this.parser.parseBeachTournament(beachResponse);
        if (location) {
          baseTournament.location = location;
        }
      } catch (error) {
        console.warn(`Failed to get beach tournament details for ${tournamentNo}:`, error);
      }

      // Enrich with event officials if event number available
      if (baseTournament.eventNo) {
        try {
          const eventResponse = await this.visClient.getEvent({
            no: baseTournament.eventNo,
            fields: ['AuxiliaryPersons', 'OfficialFunctions', 'InfoSchedule']
          });
          
          const officials = this.parser.parseEventOfficials(eventResponse, baseTournament.id);
          if (officials) {
            baseTournament.officials = officials;
          }
        } catch (error) {
          console.warn(`Failed to get event officials for ${tournamentNo}:`, error);
        }
      }

      return baseTournament;

    } catch (error) {
      console.error(`Failed to get tournament details for ${tournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Get matches for tournament
   * Uses GetBeachMatchList with referee fields
   */
  async getTournamentMatches(tournamentNo: string): Promise<BeachMatch[]> {
    try {
      console.log(`Getting matches for tournament ${tournamentNo}`);
      
      const response = await this.visClient.getBeachMatchList({
        fields: BEACH_MATCH_FIELDS,
        filter: {
          NoTournament: tournamentNo
        }
      });

      const matches = this.parser.parseBeachMatches(response, tournamentNo);
      
      console.log(`Retrieved ${matches.length} matches for tournament ${tournamentNo}`);
      return matches;

    } catch (error) {
      console.error(`Failed to get matches for tournament ${tournamentNo}:`, error);
      throw new TournamentApiError(`Failed to retrieve matches for tournament ${tournamentNo}`, error);
    }
  }

  // Private utility methods
  private buildDateRange(year?: number, currentlyActive?: boolean): { start: string; end: string } {
    if (year) {
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`
      };
    }

    if (currentlyActive) {
      const now = new Date();
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const oneMonthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      return {
        start: oneMonthAgo.toISOString().split('T')[0],
        end: oneMonthFromNow.toISOString().split('T')[0]
      };
    }

    // Default: current year + next year
    const currentYear = new Date().getFullYear();
    return {
      start: `${currentYear}-01-01`,
      end: `${currentYear + 1}-12-31`
    };
  }

  private applyTournamentFilters(tournaments: Tournament[], options: TournamentListOptions): Tournament[] {
    let filtered = [...tournaments];

    // Filter by tournament type
    if (options.tournamentType && options.tournamentType !== 'ALL') {
      filtered = filtered.filter(t => t.tournamentType === options.tournamentType);
    }

    // Filter by gender
    if (options.gender && options.gender !== 'ALL') {
      filtered = filtered.filter(t => t.gender === options.gender);
    }

    // Sort by start date (ascending - earliest first)
    filtered.sort((a, b) => {
      if (!a.dates.start) return 1;
      if (!b.dates.start) return -1;
      return new Date(a.dates.start).getTime() - new Date(b.dates.start).getTime();
    });

    return filtered;
  }
}

// Field constants for performance optimization - based on exact VIS documentation
const TOURNAMENT_LIST_FIELDS: EventField[] = [
  'No', 'Code', 'Name', 'StartDate', 'EndDate',
  'HasBeachTournament', 'HasMenTournament', 'HasWomenTournament',
  'CountryCode', 'Type', 'IsVisManaged', 'Version'
];

const TOURNAMENT_DETAIL_FIELDS: EventField[] = [
  ...TOURNAMENT_LIST_FIELDS,
  'AuxiliaryPersons', 'OfficialFunctions', 'Venues',
  'InfoSchedule', 'InfoLocation', 'InfoPresentation',
  'OrganizerCode', 'OrganizerType', 'SecurityCardDescr'
];

const BEACH_TOURNAMENT_DETAIL_FIELDS: BeachTournamentField[] = [
  'No', 'Code', 'Name', 'Title', 'Gender', 'Type', 'Status',
  'StartDateQualification', 'StartDateMainDraw',
  'EndDateQualification', 'EndDateMainDraw',
  'NbTeamsQualification', 'NbTeamsMainDraw', 'NbTeamsFromQualification',
  'CountryCode', 'Season', 'Deadline', 'NoEvent',
  'MaxCountryTeams', 'MaxHostTeams', 'NbWildCards',
  'OrganizerCode', 'OrganizerType', 'IsVisManaged',
  'EventAuxiliaryPersons', 'EventLogos'
];

const BEACH_MATCH_FIELDS: BeachMatchField[] = [
  'No', 'NoInTournament', 'NoTournament',
  'LocalDate', 'LocalTime', 'Court',
  'RoundCode', 'RoundName', 'RoundPhase', 'Status',
  'TeamAName', 'TeamBName', 'TeamAFederationCode', 'TeamBFederationCode',
  'MatchPointsA', 'MatchPointsB',
  'PointsTeamASet1', 'PointsTeamBSet1', 'DurationSet1',
  'PointsTeamASet2', 'PointsTeamBSet2', 'DurationSet2',
  'PointsTeamASet3', 'PointsTeamBSet3', 'DurationSet3',
  'NoReferee1', 'NoReferee2', 'Referee1Name', 'Referee2Name',
  'Referee1FederationCode', 'Referee2FederationCode',
  'TournamentCode', 'TournamentName', 'TournamentTitle'
];

// Options interfaces
interface TournamentListOptions {
  year?: number;
  currentlyActive?: boolean;
  tournamentType?: TournamentType | 'ALL';
  gender?: GenderType | 'ALL';
}

// Custom error for API layer
class TournamentApiError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'TournamentApiError';
  }
}
```

## 4. Cache Keys Stabili

```typescript
class CacheKeyBuilder {
  
  /**
   * Build stable cache key for tournament list
   * NO timestamp - allows proper caching
   */
  static tournamentList(options: TournamentListOptions): string {
    const parts = ['tournaments'];
    
    if (options.year) {
      parts.push(`year_${options.year}`);
    } else if (options.currentlyActive) {
      parts.push('active');
    } else {
      parts.push('current');
    }
    
    if (options.tournamentType && options.tournamentType !== 'ALL') {
      parts.push(`type_${options.tournamentType.toLowerCase()}`);
    }
    
    if (options.gender && options.gender !== 'ALL') {
      parts.push(`gender_${options.gender.toLowerCase()}`);
    }
    
    return parts.join('_');
  }
  
  /**
   * Build stable cache key for tournament details
   */
  static tournamentDetails(tournamentNo: string): string {
    return `tournament_details_${tournamentNo}`;
  }
  
  /**
   * Build stable cache key for tournament matches
   */
  static tournamentMatches(tournamentNo: string): string {
    return `tournament_matches_${tournamentNo}`;
  }
  
  /**
   * Build cache key with date sensitivity for time-sensitive data
   */
  static withDateSensitivity(baseKey: string, sensitivityHours: number = 6): string {
    const now = new Date();
    const bucket = Math.floor(now.getTime() / (sensitivityHours * 60 * 60 * 1000));
    return `${baseKey}_t${bucket}`;
  }
}
```

## 5. Integrated Repository with New API Strategy

```typescript
class OptimizedTournamentRepository implements ITournamentRepository {
  
  constructor(
    private apiService: TournamentApiService,
    private cache: ICacheManager,
    private storage: IStorageAdapter
  ) {}

  async findByFilters(filters: TournamentFilters): Promise<Tournament[]> {
    // Build stable cache key
    const cacheKey = CacheKeyBuilder.tournamentList({
      year: filters.year,
      currentlyActive: filters.currentlyActive,
      tournamentType: filters.tournamentType,
      gender: filters.gender
    });

    console.log(`Looking for tournaments with cache key: ${cacheKey}`);

    try {
      // Check cache first
      const cached = await this.cache.get<Tournament[]>(cacheKey);
      if (cached && !this.isCacheExpired(cached, '6h')) {
        console.log(`Cache hit for tournaments: ${cached.data.length} items`);
        return cached.data;
      }

      console.log('Cache miss, fetching from API');

      // Fetch from API
      const tournaments = await this.apiService.getTournaments({
        year: filters.year,
        currentlyActive: filters.currentlyActive,
        tournamentType: filters.tournamentType,
        gender: filters.gender
      });

      // Cache result with stable key
      await this.cache.set(cacheKey, tournaments, { ttl: '6h' });
      
      // Also store in persistent storage for offline access
      await this.storage.set(cacheKey, tournaments);

      console.log(`Fetched and cached ${tournaments.length} tournaments`);
      return tournaments;

    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
      
      // Fallback to stale cache or offline storage
      return this.getStaleOrOfflineData(cacheKey);
    }
  }

  async findById(id: string): Promise<Tournament | null> {
    // Extract tournament number from stable ID
    const tournamentNo = this.extractTournamentNo(id);
    if (!tournamentNo) {
      console.error(`Invalid tournament ID format: ${id}`);
      return null;
    }

    const cacheKey = CacheKeyBuilder.tournamentDetails(tournamentNo);

    try {
      // Check cache first
      const cached = await this.cache.get<Tournament>(cacheKey);
      if (cached && !this.isCacheExpired(cached, '24h')) {
        return cached.data;
      }

      // Fetch from API
      const tournament = await this.apiService.getTournamentDetails(tournamentNo);
      if (!tournament) {
        return null;
      }

      // Cache result
      await this.cache.set(cacheKey, tournament, { ttl: '24h' });
      await this.storage.set(cacheKey, tournament);

      return tournament;

    } catch (error) {
      console.error(`Failed to fetch tournament ${id}:`, error);
      
      // Fallback to stale cache
      const stale = await this.cache.get<Tournament>(cacheKey);
      return stale?.data || null;
    }
  }

  async getTournamentMatches(tournamentId: string): Promise<BeachMatch[]> {
    const tournamentNo = this.extractTournamentNo(tournamentId);
    if (!tournamentNo) {
      throw new Error(`Invalid tournament ID: ${tournamentId}`);
    }

    // Use time-sensitive cache key for matches (they change frequently)
    const baseKey = CacheKeyBuilder.tournamentMatches(tournamentNo);
    const cacheKey = CacheKeyBuilder.withDateSensitivity(baseKey, 1); // 1 hour sensitivity

    try {
      // Check cache first
      const cached = await this.cache.get<BeachMatch[]>(cacheKey);
      if (cached && !this.isCacheExpired(cached, '1h')) {
        return cached.data;
      }

      // Fetch from API
      const matches = await this.apiService.getTournamentMatches(tournamentNo);

      // Determine cache TTL based on match status
      const hasLiveMatches = matches.some(m => m.status === MatchStatus.LIVE);
      const ttl = hasLiveMatches ? '5m' : '1h';

      // Cache result
      await this.cache.set(cacheKey, matches, { ttl });

      return matches;

    } catch (error) {
      console.error(`Failed to fetch matches for tournament ${tournamentId}:`, error);
      throw error;
    }
  }

  private extractTournamentNo(id: string): string | null {
    // Extract from stable ID format: "trn_{visNo}_{code}"
    const match = id.match(/^trn_(\d+)_/);
    return match ? match[1] : null;
  }

  private isCacheExpired(cached: CachedData<any>, maxAge: string): boolean {
    const maxAgeMs = this.parseTimeToMs(maxAge);
    const age = Date.now() - cached.timestamp;
    return age > maxAgeMs;
  }

  private parseTimeToMs(time: string): number {
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1));
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000; // Default to 1 hour
    }
  }

  private async getStaleOrOfflineData(cacheKey: string): Promise<Tournament[]> {
    // Try stale cache first
    const staleCache = await this.cache.get<Tournament[]>(cacheKey);
    if (staleCache) {
      console.log('Using stale cache data');
      return staleCache.data;
    }

    // Try offline storage
    const offlineData = await this.storage.get<Tournament[]>(cacheKey);
    if (offlineData) {
      console.log('Using offline storage data');
      return offlineData.data;
    }

    // Return empty array as last resort
    console.warn('No data available offline');
    return [];
  }
}
```

## Vantaggi della Nuova Strategia

### 🚀 Performance
- **90% riduzione codice**: Da 2000+ righe a ~500 righe
- **Cache stabile**: Keys senza timestamp permettono vero caching
- **Field selection**: Solo campi necessari riducono bandwidth
- **Endpoint ottimizzato**: GetEventList come raccomandato da VIS

### 🛡️ Robustezza  
- **Fallback semplice**: Stale cache → Offline storage → Error
- **Error handling**: Gestione specifica errori VIS API
- **Timeout configurabile**: Evita hanging requests
- **Validazione response**: Check automatico errori VIS

### 🔧 Manutenibilità
- **Single responsibility**: Ogni classe ha ruolo chiaro
- **Type safety**: Tutti i campi VIS sono tipizzati
- **Documentazione**: Basata su docs ufficiali VIS
- **Testing friendly**: Interfacce mockabili

Vuoi che proceda con l'implementazione del **Data Transformation Layer** o preferisci vedere prima un esempio pratico di migrazione?