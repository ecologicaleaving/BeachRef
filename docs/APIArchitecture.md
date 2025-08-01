# Epic 4 API Architecture: Tournament Details Data Implementation

## Overview

This document provides the comprehensive architecture for implementing Epic 4's tournament details data features, including match schedules, results, team information, and player details using the FIVB VIS API.

## Current Implementation State

### Completed (Epic 3)
- ✅ **Basic Tournament Data**: `GetBeachTournamentList` integration
- ✅ **Enhanced Tournament Details**: `GetBeachTournament` integration with fallback mechanisms
- ✅ **Error Handling**: Comprehensive 401 authentication error handling
- ✅ **Caching**: 5-minute TTL for tournament data
- ✅ **Navigation**: Tournament list to detail page integration

### Epic 4 Scope
- 🔄 **Match Schedule Display**: Tournament match scheduling with day-by-day organization
- 🔄 **Results Integration**: Completed matches and tournament standings
- 🔄 **Team Information**: Team profiles, rankings, and statistics
- 🔄 **Player Details**: Individual player information and performance data
- 🔄 **Draw Structure**: Tournament brackets and round organization

---

## API Endpoint Architecture

### 1. Match Data Endpoints

#### A. GetBeachMatchList - Schedule & Results Foundation
**Purpose**: Retrieve tournament match schedules and results

**Endpoint Configuration**:
```typescript
interface MatchListRequest {
  endpoint: 'GetBeachMatchList'
  filters: {
    NoTournament: string      // Tournament number (required)
    InMainDraw?: boolean      // Main draw vs qualification
    FirstDate?: string        // Date range start (YYYY-MM-DD)
    LastDate?: string         // Date range end (YYYY-MM-DD)
    NoRound?: string          // Specific round filtering
  }
  fields: string[]           // Response field selection
}
```

**XML Request Pattern**:
```xml
<Requests>
  <Request Type="GetBeachMatchList" 
           Fields="NoInTournament LocalDate LocalTime TeamAName TeamBName Court MatchPointsA MatchPointsB Status">
    <Filter NoTournament="${tournamentNumber}" InMainDraw="true" FirstDate="${startDate}" LastDate="${endDate}"/>
  </Request>
</Requests>
```

**Implementation Function**:
```typescript
export async function fetchTournamentMatches(
  tournamentNumber: string,
  options: {
    phase?: 'qualification' | 'mainDraw'
    dateRange?: { start: string; end: string }
    round?: string
  } = {}
): Promise<BeachMatch[]>
```

#### B. GetBeachMatch - Individual Match Details
**Purpose**: Retrieve detailed information for specific matches

**Endpoint Configuration**:
```typescript
interface MatchDetailRequest {
  endpoint: 'GetBeachMatch'
  matchNumber: string
  fields: string[]
}
```

**XML Request Pattern**:
```xml
<Requests>
  <Request Type="GetBeachMatch" No="${matchNumber}" 
           Fields="NoInTournament LocalDate LocalTime TeamAName TeamBName Court MatchPointsA MatchPointsB PointsTeamASet1 PointsTeamBSet1 PointsTeamASet2 PointsTeamBSet2 PointsTeamASet3 PointsTeamBSet3 DurationSet1 DurationSet2 DurationSet3 Status"/>
</Requests>
```

**Implementation Function**:
```typescript
export async function fetchMatchDetail(matchNumber: string): Promise<BeachMatchDetail>
```

### 2. Tournament Results Endpoints

#### A. GetBeachTournamentRanking - Final Results
**Purpose**: Retrieve tournament final standings and rankings

**Endpoint Configuration**:
```typescript
interface TournamentRankingRequest {
  endpoint: 'GetBeachTournamentRanking'
  tournamentNumber: string
  phase?: 'Qualification' | 'MainDraw'
  fields: string[]
}
```

**XML Request Pattern**:
```xml
<Requests>
  <Request Type="GetBeachTournamentRanking" No="${tournamentNumber}" Phase="MainDraw"
           Fields="Rank TeamName NoTeam NoPlayer1 NoPlayer2 Player1Name Player2Name ConfederationCode EarnedPointsTeam EarningsTeam"/>
</Requests>
```

**Implementation Function**:
```typescript
export async function fetchTournamentRanking(
  tournamentNumber: string, 
  phase: 'qualification' | 'mainDraw' = 'mainDraw'
): Promise<TournamentRanking[]>
```

### 3. Team Information Endpoints

#### A. GetBeachTeamList - Tournament Teams
**Purpose**: Retrieve all teams participating in a tournament

**Endpoint Configuration**:
```typescript
interface TeamListRequest {
  endpoint: 'GetBeachTeamList'
  filters: {
    NoTournament: string
    PlaysInMainDraw?: boolean
    HasPlayed?: boolean
  }
  fields: string[]
}
```

**XML Request Pattern**:
```xml
<Requests>
  <Request Type="GetBeachTeamList" 
           Fields="Name NoPlayer1 NoPlayer2 Player1Name Player2Name ConfederationCode FederationCode Rank EarnedPointsTeam">
    <Filter NoTournament="${tournamentNumber}" PlaysInMainDraw="true"/>
  </Request>
</Requests>
```

**Implementation Function**:
```typescript
export async function fetchTournamentTeams(
  tournamentNumber: string,
  options: {
    mainDrawOnly?: boolean
    activeOnly?: boolean
  } = {}
): Promise<BeachTeam[]>
```

#### B. GetBeachTeam - Individual Team Details
**Purpose**: Retrieve detailed information for specific teams

**Implementation Function**:
```typescript
export async function fetchTeamDetail(teamNumber: string): Promise<BeachTeamDetail>
```

### 4. Player Information Endpoints

#### A. GetPlayer - Player Profiles
**Purpose**: Retrieve individual player information and statistics

**Endpoint Configuration**:
```typescript
interface PlayerRequest {
  endpoint: 'GetPlayer'
  playerNumber: string
  fields: string[]
}
```

**XML Request Pattern**:
```xml
<Requests>
  <Request Type="GetPlayer" No="${playerNumber}"
           Fields="Name ConfederationCode FederationCode BirthDate Gender Height"/>
</Requests>
```

**Implementation Function**:
```typescript
export async function fetchPlayerDetail(playerNumber: string): Promise<PlayerDetail>
```

### 5. Draw Structure Endpoints

#### A. GetBeachRoundList - Tournament Brackets
**Purpose**: Retrieve tournament draw structure and round organization

**Implementation Function**:
```typescript
export async function fetchTournamentDraw(tournamentNumber: string): Promise<TournamentDraw>
```

---

## Data Type Definitions

### Core Match Types
```typescript
interface BeachMatch {
  noInTournament: string
  localDate: string
  localTime: string
  teamAName: string
  teamBName: string
  court: string
  matchPointsA: number
  matchPointsB: number
  status: MatchStatus
}

interface BeachMatchDetail extends BeachMatch {
  pointsTeamASet1: number
  pointsTeamBSet1: number
  pointsTeamASet2: number
  pointsTeamBSet2: number
  pointsTeamASet3?: number
  pointsTeamBSet3?: number
  durationSet1: string
  durationSet2: string
  durationSet3?: string
}

type MatchStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'
```

### Team and Player Types
```typescript
interface BeachTeam {
  name: string
  noPlayer1: string
  noPlayer2: string
  player1Name: string
  player2Name: string
  confederationCode: string
  federationCode: string
  rank?: number
  earnedPointsTeam?: number
  earningsTeam?: number
}

interface PlayerDetail {
  name: string
  confederationCode: string
  federationCode: string
  birthDate?: string
  gender: 'M' | 'W'
  height?: number
}
```

### Tournament Results Types
```typescript
interface TournamentRanking {
  rank: number
  teamName: string
  noTeam: string
  noPlayer1: string
  noPlayer2: string
  player1Name: string
  player2Name: string
  confederationCode: string
  earnedPointsTeam: number
  earningsTeam?: number
}
```

---

## Implementation Strategy

### 1. VIS Client Extension Pattern
**File**: `lib/vis-client.ts`

Following the established pattern from Epic 3, extend the VIS client with new functions:

```typescript
// Epic 4 Extensions to lib/vis-client.ts

// Match Schedule and Results
export async function fetchTournamentSchedule(tournamentNumber: string): Promise<MatchSchedule>
export async function fetchTournamentResults(tournamentNumber: string): Promise<TournamentResults>
export async function fetchMatchDetail(matchNumber: string): Promise<BeachMatchDetail>

// Team and Player Information  
export async function fetchTournamentTeams(tournamentNumber: string): Promise<BeachTeam[]>
export async function fetchPlayerDetail(playerNumber: string): Promise<PlayerDetail>

// Draw Structure
export async function fetchTournamentDraw(tournamentNumber: string): Promise<TournamentDraw>
```

### 2. Error Handling Strategy
**Extend existing patterns from Epic 3**:

```typescript
// Leverage existing error handling infrastructure
import { 
  categorizeVISApiError, 
  isRetryableError, 
  requiresFallback, 
  sanitizeErrorForLogging,
  EnhancedVISApiError,
  FallbackResult
} from './vis-error-handler'

// Apply consistent error handling to all Epic 4 endpoints
export async function fetchTournamentScheduleWithFallback(
  tournamentNumber: string
): Promise<FallbackResult<MatchSchedule>>
```

### 3. Caching Strategy
**Extend existing caching patterns**:

```typescript
// Different TTL for different data types
const CACHE_CONFIG = {
  schedule: 2 * 60 * 1000,    // 2 minutes (matches change frequently)
  results: 10 * 60 * 1000,   // 10 minutes (results are more stable)
  teams: 60 * 60 * 1000,     // 60 minutes (team data rarely changes)
  players: 24 * 60 * 60 * 1000, // 24 hours (player data very stable)
}
```

### 4. API Route Architecture
**Files**: `app/api/tournament/[code]/` directory

Create new API routes following existing patterns:

```
app/api/tournament/[code]/
├── route.ts                 # Existing tournament details
├── schedule/
│   └── route.ts            # Match schedule endpoint
├── results/
│   └── route.ts            # Tournament results endpoint
├── teams/
│   └── route.ts            # Tournament teams endpoint
└── matches/
    └── [matchId]/
        └── route.ts        # Individual match details
```

---

## User Interface Integration

### 1. Enhanced Tournament Detail Tabs
**File**: `components/tournament/TournamentDetailTabs.tsx`

Extend existing tabs with new Epic 4 content:

```typescript
const tabs = [
  { id: 'overview', label: 'Overview' },      // Existing from Epic 3
  { id: 'schedule', label: 'Schedule' },      // New for Epic 4
  { id: 'results', label: 'Results' },        // New for Epic 4
  { id: 'teams', label: 'Teams' },            // New for Epic 4
  { id: 'draw', label: 'Draw' }               // New for Epic 4
]
```

### 2. Schedule Display Components
**Files**: `components/tournament/schedule/`

```typescript
// Match schedule organized by day
TournamentSchedule.tsx
├── ScheduleByDay.tsx        # Day-by-day accordion
├── MatchCard.tsx           # Individual match display
├── MatchDetail.tsx         # Detailed match information
└── CourtSchedule.tsx       # Court-based view
```

### 3. Results Display Components
**Files**: `components/tournament/results/`

```typescript
// Tournament results and rankings
TournamentResults.tsx
├── FinalRanking.tsx        # Tournament final standings
├── ResultsByRound.tsx      # Round-by-round results
├── TeamProfile.tsx         # Team information cards
└── PlayerProfile.tsx       # Player information display
```

---

## Performance Considerations

### 1. Data Loading Strategy
- **Progressive Loading**: Load overview first, then fetch detailed data on tab activation
- **Parallel Requests**: Load schedule and team data simultaneously when possible
- **Smart Caching**: Different TTL for different data volatility levels

### 2. Bundle Size Optimization
- **Code Splitting**: Load Epic 4 components only when needed
- **Tree Shaking**: Import only required VIS client functions
- **Lazy Loading**: Defer non-critical match details until user interaction

### 3. Mobile Performance
- **Virtual Scrolling**: For large match lists and team rosters
- **Image Optimization**: For player photos and team logos
- **Touch Optimization**: Maintain 48px touch targets for venue usage

---

## Security Considerations

### 1. Data Sanitization
```typescript
// Sanitize all VIS API responses
export function sanitizeMatchData(rawMatch: any): BeachMatch {
  return {
    noInTournament: String(rawMatch.NoInTournament || ''),
    localDate: sanitizeDate(rawMatch.LocalDate),
    localTime: sanitizeTime(rawMatch.LocalTime),
    teamAName: sanitizeString(rawMatch.TeamAName),
    teamBName: sanitizeString(rawMatch.TeamBName),
    // ... additional sanitization
  }
}
```

### 2. Error Information Exposure
- **Production Logging**: Log full errors server-side only
- **Client Errors**: Return sanitized error messages to users
- **Fallback Behavior**: Always provide basic functionality even on API failures

---

## Testing Strategy

### 1. Unit Tests
```typescript
// Test VIS API client functions
describe('Epic 4 VIS Client', () => {
  it('should fetch tournament schedule correctly')
  it('should handle 401 errors gracefully')
  it('should sanitize match data properly')
  it('should implement proper caching')
})
```

### 2. Integration Tests
```typescript
// Test API routes
describe('Tournament API Routes', () => {
  it('should return schedule data for valid tournament')
  it('should return 404 for non-existent tournaments')
  it('should implement proper error handling')
})
```

### 3. E2E Tests
```typescript
// Test user interface
describe('Tournament Detail Pages', () => {
  it('should display match schedule correctly')
  it('should show team and player information')
  it('should handle loading states properly')
})
```

---

## Migration from Epic 3

### 1. Backward Compatibility
- ✅ All existing Epic 3 functionality remains unchanged
- ✅ Existing API routes continue to work
- ✅ No breaking changes to tournament detail URLs

### 2. Progressive Enhancement
- **Optional Tabs**: New tabs only appear when data is available
- **Graceful Degradation**: Epic 4 features degrade to Epic 3 functionality on errors
- **Feature Flags**: Ability to enable/disable Epic 4 features

### 3. Database Schema (if needed)
- **No database changes required**: All data sourced from VIS API
- **Caching layer**: Redis or in-memory caching for performance

---

## Implementation Phases

### Phase 1: Schedule & Results (Week 1)
1. Extend VIS client with match endpoints
2. Implement schedule API route
3. Create schedule display components
4. Add schedule tab to tournament detail page

### Phase 2: Team Information (Week 2)
1. Implement team data endpoints
2. Create team profile components
3. Add teams tab to tournament detail page
4. Link teams to match displays

### Phase 3: Player Details & Draw (Week 3)
1. Implement player data endpoints
2. Create player profile components
3. Implement tournament draw structure
4. Add final polish and optimizations

### Phase 4: Integration & Testing (Week 4)
1. Comprehensive testing across all features
2. Performance optimization
3. Mobile responsiveness validation
4. Production deployment preparation

---

## Success Metrics

### 1. Technical Metrics
- **API Response Times**: < 2s for all Epic 4 endpoints
- **Error Rate**: < 1% for VIS API calls
- **Cache Hit Rate**: > 80% for frequently accessed data

### 2. User Experience Metrics
- **Page Load Time**: Tournament details load within 3s
- **Mobile Performance**: 48px touch targets maintained
- **Accessibility**: Full keyboard navigation support

### 3. Business Metrics
- **User Engagement**: Increased time on tournament detail pages
- **Feature Adoption**: > 70% of users accessing schedule/results tabs
- **Error Recovery**: < 5% of users experience API failure impacts

---

## Conclusion

This architecture provides a comprehensive foundation for implementing Epic 4's tournament details data features. It leverages the established patterns from Epic 3 while extending functionality to provide complete tournament schedule, results, team, and player information.

The implementation follows the existing two-tier VIS API approach with proper fallback mechanisms, maintains the current error handling patterns, and provides a scalable foundation for future enhancements.

**Ready for Developer Implementation**: This architecture provides all necessary technical specifications, endpoint details, error handling patterns, and integration points needed to implement Epic 4 successfully.