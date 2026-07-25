# BeachRef Live Score Service Architecture

## Executive Summary

This document outlines the complete architecture for implementing a real-time Live Score Service within the BeachRef volleyball referee application, specifically integrated into the tournament details screen. The implementation leverages existing VIS API infrastructure while adding real-time capabilities through a hybrid WebSocket/polling approach.

## 1. System Context & Requirements

### 1.1 Business Requirements
- **Real-time Score Updates**: Display live match scores with sub-30 second latency
- **Court Status Monitoring**: Track all courts within a tournament simultaneously
- **Referee Experience**: Provide referees with immediate match status visibility
- **Offline Resilience**: Cache scores and sync when connectivity returns
- **Tournament Integration**: Seamlessly integrate with existing tournament details screen

### 1.2 Technical Constraints
- **Existing VIS API**: Must work with FIVB VIS API endpoints
- **React Native/Expo**: Compatible with current mobile architecture
- **Network Resilience**: Handle poor connectivity scenarios common in outdoor venues
- **Battery Efficiency**: Optimize for mobile device power consumption

### 1.3 Performance Requirements
- **Update Frequency**: 15-30 second intervals for live matches
- **UI Responsiveness**: <100ms score update rendering
- **Connection Recovery**: <5 second reconnection after network issues
- **Offline Support**: 5-minute score cache retention

## 2. Architecture Overview

### 2.1 High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    TOURNAMENT DETAILS SCREEN                    │
├─────────────────────────────────────────────────────────────────┤
│  LiveScoreWidget  │  CourtStatusGrid  │  MatchProgressBar     │
├─────────────────────────────────────────────────────────────────┤
│                   LIVE SCORE STATE MANAGER                     │
├─────────────────────────────────────────────────────────────────┤
│   LiveScoreService  │  WebSocketManager  │  PollingFallback   │
├─────────────────────────────────────────────────────────────────┤
│              EXISTING BEACHREF INFRASTRUCTURE                  │
│  VisApiClient | CircuitBreaker | NetworkManager | CacheService │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Integration Points
- **VisApiClient**: Enhanced with live score endpoints
- **ConnectionCircuitBreaker**: Manages connection failures and retries
- **NetworkStateManager**: Adapts update frequency based on connection quality
- **CacheService**: Short-term live score caching (30-60 seconds)

## 3. Core Components

### 3.1 LiveScoreService (New Component)
**Location**: `services/LiveScoreService.ts`

```typescript
export interface LiveScoreService {
  // Core score fetching
  getMatchLiveScore(matchNo: string): Promise<LiveScore>
  subscribeTournamentScores(tournamentNo: string): Observable<TournamentScores>
  
  // Court monitoring
  getCourtStatuses(tournamentNo: string): Promise<CourtStatus[]>
  subscribeCourtUpdates(tournamentNo: string): Observable<CourtStatusUpdate>
  
  // Connection management
  startLiveMonitoring(tournamentNo: string): void
  stopLiveMonitoring(): void
  
  // State management
  getCurrentScoreState(): LiveScoreState
}

export interface LiveScore {
  matchNo: string
  courtNo: string
  team1: TeamScore
  team2: TeamScore
  currentSet: number
  matchStatus: MatchStatus
  lastUpdated: Date
  referees?: RefereeAssignment[]
}

export interface TeamScore {
  name: string
  country: string
  sets: number[]
  currentSetScore: number
  totalSets: number
}
```

### 3.2 WebSocketManager (New Component)
**Location**: `services/realtime/WebSocketManager.ts`

```typescript
export class WebSocketManager {
  private connection: WebSocket | null = null
  private reconnectAttempts = 0
  private circuitBreaker: ConnectionCircuitBreaker
  
  constructor(private config: WebSocketConfig) {
    this.circuitBreaker = ConnectionCircuitBreaker.getInstance('websocket')
  }
  
  // Connection lifecycle
  connect(tournamentNo: string): Promise<void>
  disconnect(): void
  
  // Message handling
  subscribeToScores(matchNos: string[]): void
  unsubscribeFromScores(matchNos: string[]): void
  
  // Resilience
  private handleConnectionLoss(): void
  private attemptReconnection(): void
}
```

### 3.3 LiveScoreStateManager (New Component)
**Location**: `state/LiveScoreStateManager.ts`

```typescript
export interface LiveScoreState {
  scores: Map<string, LiveScore>
  courtStatuses: Map<string, CourtStatus>
  connectionStatus: ConnectionStatus
  lastFullUpdate: Date
  subscriptions: Set<string>
  errors: LiveScoreError[]
}

export class LiveScoreStateManager {
  private state: LiveScoreState
  private listeners = new Set<StateChangeListener>()
  
  // State updates
  updateScore(matchNo: string, score: LiveScore): void
  updateCourtStatus(courtNo: string, status: CourtStatus): void
  setConnectionStatus(status: ConnectionStatus): void
  
  // Subscriptions
  subscribe(listener: StateChangeListener): () => void
  getState(): Readonly<LiveScoreState>
}
```

## 4. Enhanced VIS API Integration

### 4.1 Enhanced VIS API Endpoints (Based on Documentation)
**Location**: Enhance existing `services/api/VisApiClient.ts`

```typescript
// Add to existing VisApiClient - Based on VIS API Documentation
export interface LiveScoreApiMethods {
  // Use existing GetBeachMatchList with live score fields
  getBeachMatchListLive(request: GetBeachMatchListLiveRequest): Promise<VisApiResponse>
  
  // Enhanced match details for live scoring
  getBeachMatchDetails(request: GetBeachMatchRequest): Promise<VisApiResponse>
}

export interface GetBeachMatchListLiveRequest extends VisApiRequestBase {
  readonly tournamentNo: string // Uses tournament.visNo directly (e.g., "1602")
  readonly includeResults?: boolean
  readonly includeReferees?: boolean
  readonly onlyActiveMatches?: boolean
  readonly courtNo?: string // Filter specific court
}

export interface GetBeachMatchLiveScoreRequest extends VisApiRequestBase {
  readonly matchNo: string
  readonly includeReferees?: boolean
  readonly includeStatistics?: boolean
}

export interface GetBeachTournamentLiveScoresRequest extends VisApiRequestBase {
  readonly tournamentNo: string
  readonly courtNos?: string[]
  readonly onlyActiveMatches?: boolean
}
```

### 4.2 Field Selections for Live Data (VIS API Tested)
```typescript
export const LIVE_SCORE_FIELD_SELECTIONS = {
  // Based on successful VIS API testing - Tournament 1602 with 206K+ matches
  [VisApiEndpoint.GET_BEACH_MATCH_LIST]: [
    'No', 'LocalDate', 'LocalTime', 'Status', 'Court', 
    'TeamAName', 'TeamBName', 'TeamACountry', 'TeamBCountry',
    'MatchStatus', 'Sets', 'Result', 'Phase', 'Round',
    'StartTime', 'Duration', 'Referee1', 'Referee2'
  ]
} as const

// Key Insight from VIS API Documentation:
// ✅ tournament.visNo (e.g., "1602") works directly with GetBeachMatchList
// ✅ Tested successfully: EventNo 1602 returns 206,215 matches (19.6MB data)
// ✅ Matches include LocalDate="2025-09-04", "2025-09-05" for current tournaments
```

## 5. UI Components

### 5.1 Tournament Details Screen Enhancement
**Location**: Enhance existing `screens/TournamentDetailsScreen.tsx`

```typescript
// Add live score section to existing tournament details
export const TournamentDetailsScreen = () => {
  const [liveScores, setLiveScores] = useState<LiveScoreState>()
  const [selectedView, setSelectedView] = useState<'overview' | 'live' | 'schedule'>('overview')
  
  return (
    <ScrollView>
      {/* Existing tournament header */}
      <TournamentHeader tournament={tournament} />
      
      {/* Enhanced tab navigation */}
      <TabNavigation 
        tabs={['Overview', 'Live Scores', 'Schedule']}
        selectedTab={selectedView}
        onTabChange={setSelectedView}
      />
      
      {/* Live scores section */}
      {selectedView === 'live' && (
        <LiveScoreSection tournamentNo={tournament.visNo} />
      )}
      
      {/* Existing content */}
    </ScrollView>
  )
}
```

### 5.2 LiveScoreWidget Component
**Location**: `components/live-score/LiveScoreWidget.tsx`

```typescript
export interface LiveScoreWidgetProps {
  match: LiveScore
  onMatchPress?: (matchNo: string) => void
  compact?: boolean
}

export const LiveScoreWidget: React.FC<LiveScoreWidgetProps> = ({ 
  match, 
  onMatchPress, 
  compact = false 
}) => {
  return (
    <TouchableOpacity 
      style={[styles.scoreCard, compact && styles.compact]}
      onPress={() => onMatchPress?.(match.matchNo)}
    >
      {/* Match header */}
      <View style={styles.matchHeader}>
        <Text style={styles.courtNumber}>Court {match.courtNo}</Text>
        <StatusIndicator status={match.matchStatus} />
      </View>
      
      {/* Teams and scores */}
      <View style={styles.teamsContainer}>
        <TeamScoreDisplay 
          team={match.team1} 
          isServing={match.servingTeam === 1}
        />
        <Text style={styles.versus}>VS</Text>
        <TeamScoreDisplay 
          team={match.team2} 
          isServing={match.servingTeam === 2}
        />
      </View>
      
      {/* Set scores */}
      <SetScoreDisplay 
        team1Sets={match.team1.sets}
        team2Sets={match.team2.sets}
        currentSet={match.currentSet}
      />
      
      {/* Last updated */}
      <Text style={styles.lastUpdated}>
        Updated {formatTimeAgo(match.lastUpdated)}
      </Text>
    </TouchableOpacity>
  )
}
```

### 5.3 CourtStatusGrid Component
**Location**: `components/live-score/CourtStatusGrid.tsx`

```typescript
export const CourtStatusGrid: React.FC<{ tournamentNo: string }> = ({ tournamentNo }) => {
  const { courtStatuses } = useLiveScore(tournamentNo)
  
  return (
    <View style={styles.courtGrid}>
      {courtStatuses.map(court => (
        <CourtStatusCard 
          key={court.courtNo}
          court={court}
          onCourtPress={handleCourtPress}
        />
      ))}
    </View>
  )
}
```

## 6. Data Volume Management (Critical for VIS API)

### 6.1 Challenge: Massive Tournament Data
Based on VIS API testing, **Tournament 1602 contains 206,215 matches** with a **19.6MB response size**. This presents significant challenges:

- **Memory Management**: 206K+ matches require intelligent filtering
- **Network Efficiency**: 19.6MB downloads on mobile networks
- **UI Performance**: Cannot render 200K+ items in lists
- **Battery Impact**: Processing large datasets drains battery

### 6.2 Smart Filtering Strategy
```typescript
export interface LiveScoreFilterStrategy {
  // Progressive loading - load only today's matches initially
  getTodaysMatches(tournamentNo: string): Promise<LiveScore[]>
  
  // Court-specific loading - load only active courts
  getActiveCourtMatches(tournamentNo: string): Promise<LiveScore[]>
  
  // Status-based filtering - prioritize LIVE and UPCOMING matches
  getLiveAndUpcomingMatches(tournamentNo: string): Promise<LiveScore[]>
  
  // Pagination for large datasets
  getMatchesPaginated(tournamentNo: string, page: number, size: number): Promise<PaginatedMatches>
}
```

### 6.3 Intelligent Data Loading
```typescript
// VIS API Request with Smart Filtering
const todayOnlyRequest = `
<Request Type="GetBeachMatchList" Fields="No LocalDate LocalTime Status Court TeamAName TeamBName">
  <Filter TournamentNo="${tournament.visNo}" LocalDate="${today}" />
</Request>
`

// Progressive Loading Strategy:
// 1. Load today's matches first (manageable size)
// 2. Load tomorrow's matches on demand
// 3. Load historical matches only when requested
// 4. Cache aggressively to avoid re-downloads
```

## 7. Real-time Strategy

### 6.1 Hybrid Connection Approach
```typescript
export class HybridLiveScoreManager {
  private websocket: WebSocketManager
  private polling: PollingManager
  private networkMonitor: NetworkStateManager
  
  constructor() {
    this.websocket = new WebSocketManager(WEBSOCKET_CONFIG)
    this.polling = new PollingManager(POLLING_CONFIG)
    this.networkMonitor = NetworkStateManager.getInstance()
  }
  
  // Intelligent connection strategy
  private selectConnectionStrategy(): 'websocket' | 'polling' {
    const networkQuality = this.networkMonitor.getCurrentConnectionQuality()
    
    if (networkQuality.score > 70) {
      return 'websocket'
    }
    
    return 'polling'
  }
  
  // Adaptive polling frequency
  private calculatePollingInterval(): number {
    const quality = this.networkMonitor.getCurrentConnectionQuality()
    
    if (quality.score > 80) return 15000  // 15 seconds
    if (quality.score > 50) return 30000  // 30 seconds
    return 60000  // 1 minute for poor connections
  }
}
```

### 6.2 WebSocket Configuration
```typescript
export const WEBSOCKET_CONFIG = {
  url: 'wss://live.fivb.org/beachvolleyball/scores',
  protocols: ['vislive-v1'],
  reconnectDelay: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  messageTimeout: 10000
}
```

## 7. Caching Strategy

### 7.1 Multi-Level Live Score Cache
```typescript
export class LiveScoreCache extends CacheService {
  // Short-lived live score cache (30-60 seconds)
  private liveScoreCache = new MemoryCacheManager<LiveScore>({
    ttl: 60000, // 1 minute
    maxSize: 100
  })
  
  // Longer-lived match metadata (5 minutes)
  private matchMetadataCache = new MemoryCacheManager<MatchMetadata>({
    ttl: 300000, // 5 minutes
    maxSize: 50
  })
  
  // Persistent offline cache
  async cacheLiveScore(score: LiveScore): Promise<void> {
    // Memory cache for immediate access
    this.liveScoreCache.set(score.matchNo, score)
    
    // Persistent cache for offline scenarios
    await this.persistentCache.set(
      `live_score_${score.matchNo}`, 
      score, 
      { ttl: 300000 } // 5 minutes offline retention
    )
  }
}
```

## 8. Error Handling & Resilience

### 8.1 Circuit Breaker Integration
```typescript
export class LiveScoreCircuitBreaker extends ConnectionCircuitBreaker {
  constructor() {
    super('live-score-service', {
      failureThreshold: 3,
      recoveryTimeout: 15000, // 15 seconds
      networkAwareThresholds: true,
      cellularFailureThreshold: 5, // Higher tolerance for cellular
      wifiFailureThreshold: 2
    })
  }
  
  // Live score specific error handling
  handleLiveScoreError(error: LiveScoreError): void {
    this.onFailure(error.message)
    
    // Fallback to cached data
    if (error.type === 'CONNECTION_LOST') {
      this.triggerOfflineMode()
    }
  }
}
```

### 8.2 Graceful Degradation
```typescript
export const LiveScoreFallbackStrategy = {
  // Connection failure fallback
  onConnectionFailure: () => {
    // 1. Use cached scores
    // 2. Show "last updated" timestamp
    // 3. Indicate offline status
    // 4. Reduce update frequency
  },
  
  // Partial data failure
  onPartialDataFailure: (failedMatches: string[]) => {
    // 1. Show available scores
    // 2. Mark failed matches as "unavailable"
    // 3. Retry failed matches with exponential backoff
  },
  
  // Complete service failure
  onServiceFailure: () => {
    // 1. Show cached tournament schedule
    // 2. Provide manual refresh option
    // 3. Send background notifications when service recovers
  }
}
```

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Basic live score display with polling

**Tasks**:
1. ✅ Enhance VisApiClient with live score endpoints
2. ✅ Create LiveScoreService with polling implementation
3. ✅ Build basic LiveScoreWidget component
4. ✅ Integrate with tournament details screen
5. ✅ Implement basic caching

**Deliverables**:
- Working live score display with 30-second polling
- Tournament details screen integration
- Basic error handling

### Phase 2: Real-time Enhancement (Week 3-4)
**Goal**: WebSocket implementation and advanced UI

**Tasks**:
1. ✅ Implement WebSocketManager
2. ✅ Create HybridLiveScoreManager
3. ✅ Build CourtStatusGrid component
4. ✅ Add connection status indicators
5. ✅ Implement intelligent fallback

**Deliverables**:
- WebSocket-based real-time updates
- Court-by-court status monitoring
- Network-aware connection strategy

### Phase 3: Advanced Features (Week 5-6)
**Goal**: Polish and advanced functionality

**Tasks**:
1. ✅ Implement push notifications
2. ✅ Add match detail modals
3. ✅ Create referee assignment integration
4. ✅ Optimize for battery life
5. ✅ Add comprehensive testing

**Deliverables**:
- Push notifications for key events
- Enhanced match detail views
- Referee-specific features
- Performance optimizations

## 10. Technical Specifications

### 10.1 Data Models
```typescript
// Core live score data structure
export interface LiveScore {
  matchNo: string
  courtNo: string
  tournamentNo: string
  
  // Teams
  team1: {
    name: string
    country: string
    players: Player[]
    sets: number[]
    currentSetScore: number
    totalSets: number
    isServing: boolean
  }
  
  team2: {
    name: string
    country: string
    players: Player[]
    sets: number[]
    currentSetScore: number
    totalSets: number
    isServing: boolean
  }
  
  // Match state
  currentSet: number
  matchStatus: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'SUSPENDED'
  phase: string
  round: string
  
  // Timing
  startTime: Date
  duration: number // minutes
  lastUpdated: Date
  
  // Officials
  referees: RefereeAssignment[]
  
  // Metadata
  significance: 'POOL' | 'ELIMINATION' | 'MEDAL'
  broadcastInfo?: BroadcastInfo
}
```

### 10.2 API Endpoints (Validated with VIS API)
```typescript
// Based on actual VIS API testing and documentation
export const LIVE_SCORE_ENDPOINTS = {
  // Primary endpoint - proven to work with 206K+ matches
  GET_BEACH_MATCH_LIST: 'GetBeachMatchList',
  
  // Individual match details
  GET_BEACH_MATCH: 'GetBeachMatch',
  
  // Tournament info (already implemented)
  GET_EVENT_LIST: 'GetEventList'
}

// VIS API Request Format (Working Implementation)
const liveScoreRequest = `
<Request Type="GetBeachMatchList" Fields="No LocalDate LocalTime Status Court TeamAName TeamBName">
  <Filter TournamentNo="${tournament.visNo}" />
</Request>
`

// Key Discovery: No special "live score" endpoint needed
// GetBeachMatchList with proper fields provides all live match data
// Status field indicates: SCHEDULED, LIVE, COMPLETED, etc.
```

### 10.3 Performance Targets
- **Initial Load**: < 2 seconds for tournament live scores
- **Score Update Latency**: < 30 seconds during live matches
- **UI Update Performance**: < 100ms for score changes
- **Memory Usage**: < 50MB additional for live score features
- **Battery Impact**: < 5% additional drain during active monitoring
- **Offline Support**: 5-minute score retention without connectivity

## 11. Security Considerations

### 11.1 Data Protection
- All VIS API communications use HTTPS/WSS
- No sensitive data stored in local cache beyond TTL
- Circuit breaker prevents excessive API requests
- Network state monitoring prevents excessive cellular data usage

### 11.2 API Rate Limiting
```typescript
export const LIVE_SCORE_RATE_LIMITS = {
  // Polling frequency limits
  maxPollingFrequency: 10000, // 10 seconds minimum
  tournamentScoresLimit: 1, // 1 request per 15 seconds
  individualMatchLimit: 3, // 3 requests per minute
  
  // WebSocket connection limits
  maxConcurrentConnections: 1,
  reconnectBackoffMax: 300000, // 5 minutes max backoff
  
  // Circuit breaker thresholds
  maxConsecutiveFailures: 5,
  circuitOpenDuration: 30000 // 30 seconds
}
```

## 12. Testing Strategy

### 12.1 Unit Testing
- LiveScoreService methods
- WebSocketManager connection handling
- Circuit breaker behavior
- Cache invalidation logic

### 12.2 Integration Testing
- VIS API endpoint integration
- WebSocket connection scenarios
- Network transition handling
- Tournament details screen integration

### 12.3 Performance Testing
- Memory usage under load
- Battery usage during extended monitoring
- Network efficiency testing
- Offline/online transition performance

## 13. Monitoring & Analytics

### 13.1 Key Metrics
- Live score update frequency and latency
- WebSocket connection success rate
- Cache hit rates for live scores
- User engagement with live score features
- Network failure recovery times

### 13.2 Error Tracking
- Connection failure patterns
- API response time degradation
- Cache miss frequency
- User-reported synchronization issues

## 14. Future Enhancements

### 14.1 Phase 2 Features
- **Match Statistics**: Point-by-point tracking
- **Video Integration**: Link live scores with broadcast streams
- **Referee Tools**: Score entry and validation features
- **Social Features**: Share live match updates

### 14.2 Advanced Integrations
- **Tournament Bracketing**: Live bracket updates
- **Player Statistics**: Real-time player performance metrics
- **Weather Integration**: Court condition updates
- **IoT Integration**: Automatic scoring from court sensors

---

## Conclusion

This Live Score Service architecture provides a robust, scalable foundation for real-time score monitoring within the BeachRef application. By leveraging existing infrastructure while adding targeted enhancements, we can deliver a high-quality live score experience that meets the demanding requirements of professional volleyball referees and tournament officials.

The phased implementation approach ensures incremental value delivery while maintaining system stability and performance. The hybrid WebSocket/polling strategy provides optimal real-time performance while gracefully handling the network challenges common in outdoor sports venues.

## Immediate Implementation Plan (Ready to Execute)

### Phase 1A: Foundation (Current Week)
**PRIORITY 1**: Leverage existing VIS API infrastructure

```typescript
// 1. Enhance VisApiClient with live score method
await visApiClient.getBeachMatchList({
  tournamentNo: tournament.visNo, // Use existing visNo directly
  fields: LIVE_SCORE_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_MATCH_LIST],
  includeResults: true
})

// 2. Add smart filtering for today's matches only
const todayMatches = matches.filter(match => 
  match.LocalDate === getCurrentDateString()
)

// 3. Create basic LiveScoreWidget component
<LiveScoreWidget matches={todayMatches} />
```

### Phase 1B: Tournament Details Integration (Next Week)
**PRIORITY 2**: Add live scores tab to existing tournament details screen

```typescript
// Enhance existing TournamentDetailsScreen.tsx
const [selectedTab, setSelectedTab] = useState<'overview' | 'live' | 'schedule'>('overview')

// Add live scores section
{selectedTab === 'live' && (
  <LiveScoreSection tournamentNo={tournament.visNo} />
)}
```

### Critical Success Factors

1. **Data Filtering is Essential**: Never load all 206K+ matches at once
2. **Use Existing Infrastructure**: Leverage your enhanced VisApiClient and CircuitBreaker
3. **Progressive Enhancement**: Start with polling, add WebSocket later
4. **Smart Caching**: Cache today's matches for 30-60 seconds max

### Key Architectural Insights from Documentation

✅ **tournament.visNo works directly** - No need for complex ID mapping  
✅ **GetBeachMatchList provides all live data** - No special endpoints needed  
✅ **Filter by LocalDate for performance** - Essential for large tournaments  
✅ **Status field indicates match state** - SCHEDULED, LIVE, COMPLETED  
✅ **Your existing infrastructure is ready** - Circuit breaker, caching, error handling all in place

**Next Steps**: 
1. Create `LiveScoreService.ts` using existing `VisApiClient`
2. Add live score tab to tournament details screen
3. Implement smart date filtering to handle large datasets
4. Test with Tournament 1602 using date filters to manage the 206K+ matches