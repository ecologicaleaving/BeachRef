# BeachRef - VIS Data Architecture 

## Core Domain Types

### 1. Tournament Core Types

```typescript
// Base identificatori stabili per tutti gli oggetti VIS
interface VisEntity {
  readonly visNo: string;        // Numero VIS (immutable)
  readonly version: number;      // Per optimistic locking
  readonly lastSyncAt: string;   // ISO 8601 timestamp
}

// Core tournament basato su VIS Event + BeachTournament
interface TournamentCore extends VisEntity {
  readonly id: string;           // ID stabile generato localmente
  readonly eventNo?: string;     // Link all'Event padre VIS
  
  // Campi Core da VIS Event
  code: string;                  // Event.Code
  name: string;                  // Event.Name
  title?: string;                // BeachTournament.Title
  
  // Classificazione automatica
  gender: GenderType;            // Estratto da Code
  tournamentType: TournamentType; // FIVB, BPT, CEV, LOCAL
  
  // Date principali
  dates: TournamentDates;
  
  // Status lifecycle
  status: TournamentStatus;
}

// Date structure basata su VIS BeachTournament
interface TournamentDates {
  start: string;                    // Event.StartDate
  end: string;                      // Event.EndDate
  qualification?: {
    start?: string;                 // BeachTournament.StartDateQualification
    end?: string;                   // BeachTournament.EndDateQualification
  };
  mainDraw?: {
    start?: string;                 // BeachTournament.StartDateMainDraw  
    end?: string;                   // BeachTournament.EndDateMainDraw
  };
  effectiveDates?: string;          // Event.EffectiveDates (XML parsed)
}

// Location data da Event + BeachTournament
interface TournamentLocation {
  countryCode?: string;             // Event.CountryCode
  venues?: VenueInfo[];             // Event.Venues (XML parsed)
  
  // BeachTournament specific
  city?: string;
  venue?: string;
  courts?: number;
  surface?: string;
}

// Officials data da Event.AuxiliaryPersons + OfficialFunctions
interface TournamentOfficials {
  tournamentId: string;
  auxiliaryPersons?: AuxiliaryPerson[]; // Event.AuxiliaryPersons (XML parsed)
  officialFunctions?: OfficialFunction[]; // Event.OfficialFunctions (XML parsed)
  lastUpdated: string;
}

// Complete Tournament object
interface Tournament extends TournamentCore {
  location?: TournamentLocation;
  officials?: TournamentOfficials;
  organization?: TournamentOrganization;
  participants?: TournamentParticipants;
  
  // Flags from VIS Event
  hasBeachTournament: boolean;      // Event.HasBeachTournament
  hasVolleyTournament: boolean;     // Event.HasVolleyTournament
  hasMenTournament: boolean;        // Event.HasMenTournament  
  hasWomenTournament: boolean;      // Event.HasWomenTournament
  isVisManaged: boolean;            // Event.IsVisManaged
}
```

### 2. Match Data Types

```typescript
// Beach Match basato su VIS BeachMatch
interface BeachMatchCore extends VisEntity {
  readonly id: string;              // ID stabile generato
  readonly tournamentId: string;    // Link al Tournament
  
  // Identificatori VIS
  noInTournament?: string;          // BeachMatch.NoInTournament
  
  // Scheduling
  localDate?: string;               // BeachMatch.LocalDate
  localTime?: string;               // BeachMatch.LocalTime
  court?: string;                   // BeachMatch.Court
  round?: string;                   // BeachMatch.Round
  phase?: BeachRoundPhase;          // Enum from VIS schema
  
  // Teams
  teamA: MatchTeam;
  teamB: MatchTeam;
  
  // Score and Status
  score: MatchScore;
  status: MatchStatus;              // Mapped from BeachMatch.Status
  
  // Officials
  referees: MatchReferee[];         // From BeachMatch referee fields
}

interface MatchTeam {
  name?: string;                    // BeachMatch.TeamAName/TeamBName  
  matchPoints?: number;             // BeachMatch.MatchPointsA/B
}

interface MatchScore {
  set1?: SetScore;                  // BeachMatch.PointsTeamASet1/B + duration
  set2?: SetScore;
  set3?: SetScore;
}

interface MatchReferee {
  visNo?: string;                   // BeachMatch.NoReferee1/2
  name?: string;                    // BeachMatch.Referee1Name/2Name  
  federationCode?: string;          // BeachMatch.Referee1FederationCode/2
  role: RefereeRole;                // PRIMARY | SECONDARY
}
```

### 3. Enums and Types

```typescript
// Gender classificato automaticamente dal tournament code
enum GenderType {
  MALE = 'M',
  FEMALE = 'W', 
  MIXED = 'Mixed',
  UNKNOWN = 'Unknown'
}

// Tournament type classificato automaticamente
enum TournamentType {
  FIVB = 'FIVB',
  BPT = 'BPT',
  CEV = 'CEV', 
  LOCAL = 'LOCAL'
}

// Status lifecycle del tournament
enum TournamentStatus {
  UPCOMING = 'upcoming',
  QUALIFICATION = 'qualification',
  MAIN_DRAW = 'main_draw',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Match status mappato da VIS BeachMatchStatus
enum MatchStatus {
  SCHEDULED = 'scheduled',      // Maps from: 1-15, Opened
  READY = 'ready',              // Maps from: ReadyToStart
  LIVE = 'live',                // Maps from: InSet1, InSet2, InSet3, InSet4, InSet5
  SET_BREAK = 'set_break',      // Maps from: Set1Finished, Set2Finished, Set3Finished, Set4Finished
  FINISHED = 'finished',        // Maps from: Finished
  OFFICIAL = 'official',        // Maps from: OfficialResult
  CORRECTED = 'corrected',      // Maps from: Corrected
  CLOSED = 'closed'             // Maps from: Closed
}

// Beach volleyball phases da VIS schema
enum BeachRoundPhase {
  CONFEDERATION_QUOTA = 'ConfederationQuota',
  FEDERATION_QUOTA = 'FederationQuota', 
  QUALIFICATION = 'Qualification',
  MAIN_DRAW = 'MainDraw',
  PHASE_1 = '1',
  PHASE_2 = '2',
  PHASE_3 = '3', 
  PHASE_4 = '4'
}
```

## 2. VIS API Request Strategy

### Primary API Calls

```typescript
// 1. GetEventList - Per lista tournaments (raccomandato VIS)
interface GetEventListRequest {
  type: 'GetEventList';
  fields: EventFields[];
  filter: {
    HasBeachTournament: '1';      // Solo eventi con beach volleyball
    FirstDate?: string;           // YYYY-MM-DD
    LastDate?: string;            // YYYY-MM-DD  
    No?: string;                  // Specific event number
  };
}

// 2. GetBeachTournament - Per dettagli specifici tournament  
interface GetBeachTournamentRequest {
  type: 'GetBeachTournament';
  no: string;                     // Tournament number
  fields?: BeachTournamentFields[];
}

// 3. GetEvent - Per officials e auxiliary persons
interface GetEventRequest {
  type: 'GetEvent'; 
  no: string;                     // Event number
  fields: ['AuxiliaryPersons', 'OfficialFunctions', 'InfoSchedule'];
}

// 4. GetBeachMatchList - Per match data
interface GetBeachMatchListRequest {
  type: 'GetBeachMatchList';
  fields: BeachMatchFields[];
  filter: {
    NoTournament: string;         // Tournament number
  };
}
```

### Field Selection Strategy

```typescript
// Campi essenziali per tournament list (performance)
const TOURNAMENT_LIST_FIELDS = [
  'No', 'Code', 'Name', 'StartDate', 'EndDate',
  'HasBeachTournament', 'HasMenTournament', 'HasWomenTournament',
  'CountryCode', 'Type'
] as const;

// Campi dettagliati per tournament details
const TOURNAMENT_DETAIL_FIELDS = [
  ...TOURNAMENT_LIST_FIELDS,
  'Title', 'Venues', 'AuxiliaryPersons', 'OfficialFunctions',
  'InfoSchedule', 'InfoLocation', 'EffectiveDates'
] as const;

// Campi beach tournament specifici
const BEACH_TOURNAMENT_FIELDS = [
  'No', 'Code', 'Name', 'Title', 
  'StartDateQualification', 'StartDateMainDraw',
  'EndDateQualification', 'EndDateMainDraw',
  'NbTeamsQualification', 'NbTeamsMainDraw',
  'CountryCode', 'City', 'Venue', 'Courts'
] as const;

// Campi match con referee info
const BEACH_MATCH_FIELDS = [
  'No', 'NoInTournament', 'LocalDate', 'LocalTime', 
  'TeamAName', 'TeamBName', 'Court', 'Round', 'Status',
  'MatchPointsA', 'MatchPointsB',
  'PointsTeamASet1', 'PointsTeamBSet1', 'DurationSet1',
  'PointsTeamASet2', 'PointsTeamBSet2', 'DurationSet2', 
  'PointsTeamASet3', 'PointsTeamBSet3', 'DurationSet3',
  'NoReferee1', 'NoReferee2', 'Referee1Name', 'Referee2Name',
  'Referee1FederationCode', 'Referee2FederationCode'
] as const;
```

## 3. Data Transformation Layer

### VIS Response Parsers

```typescript
class VisResponseParser {
  
  // Parse GetEventList response per tournaments
  static parseEventList(xmlResponse: string): TournamentCore[] {
    const eventMatches = xmlResponse.match(/<Event[^>]*\/>/g) || [];
    
    return eventMatches.map(event => {
      const attrs = this.parseXmlAttributes(event);
      
      return {
        id: this.generateTournamentId(attrs.No, attrs.Code),
        visNo: attrs.No,
        eventNo: attrs.No,
        code: attrs.Code || this.generateCode(attrs),
        name: attrs.Name || 'Unknown Tournament',
        title: attrs.Title,
        gender: this.extractGender(attrs.Code),
        tournamentType: this.classifyTournament(attrs),
        dates: {
          start: attrs.StartDate || '',
          end: attrs.EndDate || ''
        },
        status: this.inferStatus(attrs),
        hasBeachTournament: attrs.HasBeachTournament === '1',
        hasVolleyTournament: attrs.HasVolleyTournament === '1', 
        hasMenTournament: attrs.HasMenTournament === '1',
        hasWomenTournament: attrs.HasWomenTournament === '1',
        isVisManaged: attrs.IsVisManaged === '1',
        version: 1,
        lastSyncAt: new Date().toISOString()
      };
    });
  }
  
  // Parse GetBeachTournament response for details
  static parseBeachTournament(xmlResponse: string): TournamentLocation | null {
    const match = xmlResponse.match(/<BeachTournament[^>]*\/>/);
    if (!match) return null;
    
    const attrs = this.parseXmlAttributes(match[0]);
    
    return {
      countryCode: attrs.CountryCode,
      city: attrs.City,
      venue: attrs.Venue || attrs.DefaultVenue,
      courts: attrs.Courts ? parseInt(attrs.Courts) : undefined,
      surface: attrs.Surface
    };
  }
  
  // Parse GetEvent response for officials
  static parseEventOfficials(xmlResponse: string, tournamentId: string): TournamentOfficials | null {
    const match = xmlResponse.match(/<Event[^>]*>/);
    if (!match) return null;
    
    const attrs = this.parseXmlAttributes(match[0]);
    
    return {
      tournamentId,
      auxiliaryPersons: this.parseAuxiliaryPersons(attrs.AuxiliaryPersons),
      officialFunctions: this.parseOfficialFunctions(attrs.OfficialFunctions),
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Parse GetBeachMatchList response  
  static parseBeachMatches(xmlResponse: string, tournamentId: string): BeachMatchCore[] {
    const matchElements = xmlResponse.match(/<BeachMatch[^>]*\/>/g) || [];
    
    return matchElements.map(match => {
      const attrs = this.parseXmlAttributes(match);
      
      return {
        id: this.generateMatchId(tournamentId, attrs.No),
        visNo: attrs.No,
        tournamentId,
        noInTournament: attrs.NoInTournament,
        localDate: attrs.LocalDate,
        localTime: attrs.LocalTime, 
        court: attrs.Court,
        round: attrs.Round,
        teamA: {
          name: attrs.TeamAName,
          matchPoints: this.parseNumber(attrs.MatchPointsA)
        },
        teamB: {
          name: attrs.TeamBName, 
          matchPoints: this.parseNumber(attrs.MatchPointsB)
        },
        score: this.parseMatchScore(attrs),
        status: this.mapMatchStatus(attrs.Status),
        referees: this.parseMatchReferees(attrs),
        version: 1,
        lastSyncAt: new Date().toISOString()
      };
    });
  }
  
  // Utility methods
  private static extractGender(code?: string): GenderType {
    if (!code) return GenderType.UNKNOWN;
    const upper = code.toUpperCase();
    if (upper.startsWith('M')) return GenderType.MALE;
    if (upper.startsWith('W')) return GenderType.FEMALE;
    return GenderType.MIXED;
  }
  
  private static classifyTournament(attrs: any): TournamentType {
    const name = (attrs.Name || '').toLowerCase();
    const code = (attrs.Code || '').toLowerCase();
    
    if (name.includes('fivb') || name.includes('world')) return TournamentType.FIVB;
    if (name.includes('bpt') || name.includes('beach pro tour')) return TournamentType.BPT;
    if (name.includes('cev') || name.includes('european')) return TournamentType.CEV;
    return TournamentType.LOCAL;
  }
  
  private static generateTournamentId(visNo: string, code?: string): string {
    return `trn_${visNo}_${code || 'unknown'}`;
  }
}
```

## 4. Repository Implementation

```typescript
interface ITournamentRepository {
  // Read operations
  findById(id: string): Promise<Tournament | null>;
  findByFilters(filters: TournamentFilters): Promise<Tournament[]>;
  
  // Write operations  
  sync(options: SyncOptions): Promise<Tournament[]>;
  upsert(tournament: Tournament): Promise<Tournament>;
  
  // Cache operations
  invalidateCache(pattern?: string): Promise<void>;
}

class VisTournamentRepository implements ITournamentRepository {
  
  constructor(
    private visClient: IVisApiClient,
    private cache: ICacheManager,
    private storage: IStorageAdapter
  ) {}
  
  async findByFilters(filters: TournamentFilters): Promise<Tournament[]> {
    const cacheKey = this.buildCacheKey(filters);
    
    // Check cache first
    const cached = await this.cache.get<Tournament[]>(cacheKey);
    if (cached && !this.isCacheExpired(cached)) {
      return cached.data;
    }
    
    // Fetch from VIS API
    const tournaments = await this.fetchTournamentsFromVis(filters);
    
    // Cache result
    await this.cache.set(cacheKey, tournaments, { ttl: '6h' });
    
    return tournaments;
  }
  
  private async fetchTournamentsFromVis(filters: TournamentFilters): Promise<Tournament[]> {
    // Primary call: GetEventList
    const eventListResponse = await this.visClient.getEventList({
      fields: TOURNAMENT_LIST_FIELDS,
      filter: {
        HasBeachTournament: '1',
        FirstDate: filters.startDate,
        LastDate: filters.endDate
      }
    });
    
    const tournaments = VisResponseParser.parseEventList(eventListResponse);
    
    // For each tournament, enrich with details if needed
    if (filters.includeDetails) {
      await this.enrichTournamentDetails(tournaments);
    }
    
    return tournaments;
  }
  
  private async enrichTournamentDetails(tournaments: Tournament[]): Promise<void> {
    const enrichPromises = tournaments.map(async (tournament) => {
      try {
        // Get beach tournament details
        const beachDetails = await this.visClient.getBeachTournament({
          no: tournament.visNo,
          fields: BEACH_TOURNAMENT_FIELDS
        });
        
        tournament.location = VisResponseParser.parseBeachTournament(beachDetails);
        
        // Get officials if event number available
        if (tournament.eventNo) {
          const eventDetails = await this.visClient.getEvent({
            no: tournament.eventNo,
            fields: ['AuxiliaryPersons', 'OfficialFunctions']
          });
          
          tournament.officials = VisResponseParser.parseEventOfficials(eventDetails, tournament.id);
        }
      } catch (error) {
        console.warn(`Failed to enrich tournament ${tournament.visNo}:`, error);
      }
    });
    
    await Promise.allSettled(enrichPromises);
  }
}
```

## 5. Caching Strategy

```typescript
interface CacheStrategy {
  tournaments: {
    list: '6h';           // Tournament lists
    details: '24h';       // Full tournament details  
    officials: '12h';     // Officials data
  };
  matches: {
    scheduled: '1h';      // Scheduled matches
    live: '30s';          // Live matches
    finished: '24h';      // Finished matches
  };
}

class SmartCacheManager implements ICacheManager {
  
  async get<T>(key: string): Promise<CachedData<T> | null> {
    // L1: Memory cache (hot data)
    const memoryResult = await this.memoryCache.get<T>(key);
    if (memoryResult && !this.isExpired(memoryResult)) {
      return memoryResult;
    }
    
    // L2: Persistent cache (warm data)  
    const persistentResult = await this.persistentCache.get<T>(key);
    if (persistentResult && !this.isExpired(persistentResult)) {
      // Warm memory cache
      this.memoryCache.set(key, persistentResult.data, { ttl: '15m' });
      return persistentResult;
    }
    
    return null;
  }
  
  async set<T>(key: string, data: T, options: CacheOptions): Promise<void> {
    const memoryCacheTtl = this.getMemoryTtl(options.ttl);
    
    await Promise.all([
      this.memoryCache.set(key, data, { ttl: memoryCacheTtl }),
      this.persistentCache.set(key, data, options)
    ]);
  }
  
  private getMemoryTtl(persistentTtl: string): string {
    // Memory cache has shorter TTL for hot data
    const mapping = {
      '30s': '30s',
      '1h': '15m', 
      '6h': '30m',
      '12h': '1h',
      '24h': '2h'
    };
    return mapping[persistentTtl] || '15m';
  }
}
```

Questa architettura garantisce:

✅ **Stabilità**: ID immutabili e versioning
✅ **Performance**: Cache intelligente multi-livello  
✅ **Flessibilità**: Field selection per ottimizzazione
✅ **Robustezza**: Fallback strategy e error handling
✅ **Allineamento VIS**: Basata su documentazione ufficiale

Vuoi che proceda con l'implementazione di una parte specifica?