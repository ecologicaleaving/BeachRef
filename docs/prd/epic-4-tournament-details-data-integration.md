# Epic 4: Tournament Details Data Integration - Match Schedule & Results

## Epic Goal

Enable referees to access comprehensive tournament match schedules, results, team information, and player details through enhanced tournament detail pages, providing complete tournament data with professional scheduling views and interactive match information.

## Epic Description

**Existing System Context:**
- Current relevant functionality: Tournament detail pages with basic tournament information (Epic 3 completed)
- Technology stack: Next.js 14 App Router, TypeScript, shadcn/ui component system, FIVB VIS API integration
- Integration points: Existing tournament detail tabs, VIS API client with comprehensive error handling, Enhanced API architecture from Winston's analysis

**Enhancement Details:**
- **What's being added/changed**: 
  - Match schedule display with day-by-day organization using Accordion components
  - Tournament results and final rankings integration
  - Team information display with Avatar components
  - Individual match detail views with Dialog components
  - Enhanced tournament detail tabs (Schedule, Results, Teams)

- **How it integrates**: 
  - Extends existing VIS API client with GetBeachMatchList and GetBeachMatch endpoints
  - Builds upon Epic 3's error handling and fallback mechanisms 
  - Uses established shadcn component system with new Schedule/Results components
  - Maintains existing tournament detail page structure with new tab content

- **Success criteria**: 
  - Referees can view complete tournament match schedules organized by day
  - Tournament results and rankings are accessible with team/player information
  - Individual match details provide comprehensive match data with set scores
  - All data integrates seamlessly with existing tournament detail architecture

## Stories

### Story 4.1: Match Schedule Display Components Foundation
**Priority**: High
**Estimated Effort**: 3-4 days
**Dependencies**: Epic 3 (Tournament Detail Foundation), APIArchitecture.md specifications
**Status**: 🔄 READY FOR IMPLEMENTATION

As a referee,
I want to view tournament match schedules organized by day with clear match information,
so that I can efficiently navigate tournament scheduling and prepare for matches.

**Acceptance Criteria**:
1. Schedule tab displays matches organized by day using Accordion components
2. Each day shows match count badge and collapsible match details
3. Match cards display team names, court, time, and match status
4. Match status indicators show scheduled/live/completed states clearly
5. Mobile-responsive design maintains 48px touch targets for venue usage
6. Loading states display during schedule data fetching
7. Empty states handle tournaments with no scheduled matches gracefully

**Key Components**: Day-by-day schedule organization, match cards, status indicators

**Implementation Notes**: Foundation for match display components using existing shadcn components. No API integration in this story - uses mock data structure from APIArchitecture.md.

**UX Component Requirements**:
- **Schedule Organization**: shadcn Accordion component for collapsible day-by-day match schedules  
- **Match Display**: shadcn Card components for individual match information
- **Status Indicators**: shadcn Badge components for match status (scheduled/live/completed)
- **Loading States**: shadcn Skeleton components for schedule loading
- **Mobile Navigation**: Maintain existing 48px touch targets from Epic 3

### Story 4.2: Match Details Dialog and Individual Match Views
**Priority**: High
**Estimated Effort**: 2-3 days
**Dependencies**: Story 4.1 (Schedule Components)
**Status**: 🔄 READY FOR IMPLEMENTATION

As a referee,
I want to view detailed match information including set scores and match duration,
so that I can access comprehensive match data for officiating and analysis.

**Acceptance Criteria**:
1. Match cards have clickable actions to open detailed match information
2. Match detail dialog displays comprehensive match data using Dialog components
3. Set scores are clearly displayed for completed matches (Set 1, Set 2, Set 3)
4. Match duration and timing information is properly formatted
5. Team information displays with proper names and seeding information
6. Court assignments and scheduling details are clearly visible
7. Dialog maintains responsive design and accessibility standards

**Key Components**: Match detail dialogs, set score displays, match timing

**Implementation Notes**: Interactive match detail views with comprehensive match information display. Still uses mock data - prepares interface for Story 4.3 API integration.

**UX Component Requirements**:
- **Interactive Details**: shadcn Dialog component for detailed match information modals
- **Score Display**: Clear set score presentation with proper formatting
- **Team Information**: Team names, seeding, and confederation details
- **Timing Display**: Match duration, start time, and scheduling information

### Story 4.3: Tournament Match Schedule API Integration
**Priority**: High  
**Estimated Effort**: 4-5 days
**Dependencies**: Story 4.2 (Match Detail Views), APIArchitecture.md VIS API specifications
**Status**: 🔄 READY FOR IMPLEMENTATION

As a referee,
I want tournament match schedules to load from the VIS API with proper error handling,
so that I can access real tournament scheduling data reliably.

**Acceptance Criteria**:
1. Tournament schedule tab loads match data using GetBeachMatchList VIS API endpoint
2. Match schedule displays real tournament data organized by date
3. Individual match details load using GetBeachMatch endpoint when available
4. Error handling follows Epic 3 patterns with graceful fallback to basic data
5. Caching implements appropriate TTL (2 minutes for schedule data)
6. Loading performance meets < 3s target for schedule display
7. API integration maintains backward compatibility with existing tournament detail functionality

**Key Components**: VIS API client extension, GetBeachMatchList integration, match data caching

**Research Required**: VIS API endpoint testing with real tournament data from APIArchitecture.md specifications:
- GetBeachMatchList with tournament number filtering
- GetBeachMatch for individual match details
- Error handling patterns for authentication and network issues

**Implementation Components**:
- Extend `lib/vis-client.ts` with `fetchTournamentMatches()` and `fetchMatchDetail()` functions
- Create `app/api/tournament/[code]/schedule/route.ts` API route
- Update `TournamentDetailTabs` component to integrate schedule data
- Implement caching strategy with 2-minute TTL for schedule data

### Story 4.4: Tournament Results and Rankings Integration  
**Priority**: Medium
**Estimated Effort**: 3-4 days
**Dependencies**: Story 4.3 (Schedule API Integration)
**Status**: 🔄 READY FOR IMPLEMENTATION

As a referee,
I want to view tournament results and final rankings with team information,
so that I can access complete tournament outcomes and standings.

**Acceptance Criteria**:
1. Results tab displays tournament final rankings using GetBeachTournamentRanking endpoint
2. Team rankings show position, team names, player names, and points earned
3. Completed matches display final scores and match results
4. Tournament progress indicator shows completion percentage using Progress component
5. Team information displays with confederation and federation details
6. Results data integrates with existing error handling and caching patterns
7. Empty states handle tournaments without completed results gracefully

**Key Components**: Tournament rankings, team information display, results integration

**Implementation Components**:
- Extend VIS API client with `fetchTournamentRanking()` function
- Create `app/api/tournament/[code]/results/route.ts` API route
- Implement Results tab with ranking display and team information
- Add Progress component for tournament completion status

**UX Component Requirements**:
- **Results Display**: Clear tournament final standings with ranking positions
- **Team Information**: Team names, player details, confederation information
- **Progress Tracking**: shadcn Progress component for tournament completion status
- **Achievement Display**: Points earned, prize money, and ranking achievements

### Story 4.5: Enhanced Tournament Detail Tabs Integration
**Priority**: Medium
**Estimated Effort**: 2-3 days  
**Dependencies**: Story 4.4 (Results Integration)
**Status**: 🔄 READY FOR IMPLEMENTATION

As a referee,
I want seamless navigation between Overview, Schedule, and Results tabs with consistent data,
so that I can efficiently access all tournament information in one interface.

**Acceptance Criteria**:
1. Tournament detail page includes Overview, Schedule, and Results tabs
2. Tab navigation maintains existing responsive design and accessibility patterns
3. Cross-tab data consistency ensures tournament information aligns across views
4. Tab loading is optimized with progressive data loading (load on tab activation)
5. Error states in one tab don't affect functionality of other tabs
6. Mobile navigation maintains existing 48px touch targets and responsive design
7. Deep linking supports direct access to specific tabs (e.g., `/tournament/CODE?tab=schedule`)

**Key Components**: Tab integration, progressive loading, cross-tab consistency

**Implementation Notes**: Final integration story that brings together all Epic 4 components into cohesive tournament detail experience.

**UX Component Requirements**:
- **Enhanced Tab Navigation**: Extended tournament detail tabs with Schedule and Results
- **Progressive Loading**: Load tab content only when activated for performance
- **Consistent Design**: Maintain Epic 3 design patterns across all new tabs
- **Deep Linking**: URL parameter support for direct tab access

## Compatibility Requirements

- ✅ All existing Epic 3 tournament detail functionality remains unchanged
- ✅ VIS API integration follows established error handling patterns from Epic 3
- ✅ UI components follow existing shadcn theme and responsive patterns  
- ✅ Performance impact is minimal with efficient caching and progressive loading
- ✅ Mobile-first design maintains 48px touch targets for venue glove usage

## Risk Mitigation

- **Primary Risk**: VIS API performance impact from additional match data requests
- **Mitigation**: Implement efficient caching strategy (2-minute TTL for schedule, 10-minute for results) and progressive data loading
- **Secondary Risk**: Large tournament schedule data impacting mobile performance
- **Mitigation**: Virtual scrolling for large match lists and optimized data structures
- **Rollback Plan**: Epic 4 features can be disabled via feature flag, reverting to Epic 3 tournament detail functionality

## Definition of Done

- ✅ All stories completed with acceptance criteria met
- ✅ Existing tournament detail functionality verified through testing
- ✅ Match schedule and results integrate properly with existing navigation
- ✅ API integration follows Epic 3 error handling and caching patterns
- ✅ Mobile responsive design maintains venue usage requirements
- ✅ Performance meets < 3s loading targets for all Epic 4 features

## UX Design Specifications

### Required shadcn Component Usage

**New Components for Epic 4:**
```bash
# Components already available from Epic 3
✅ tabs, breadcrumb, accordion, dialog, sheet, avatar, progress, card, badge, button
✅ skeleton, toast (from Epic 1)

# No new component installations required - Epic 4 uses existing Epic 3 components
```

**Component Usage Patterns**:
- ✅ **Accordion**: Day-by-day match schedule organization
- ✅ **Dialog**: Individual match detail displays  
- ✅ **Card**: Match information cards and team profiles
- ✅ **Badge**: Match status indicators and tournament progress
- ✅ **Progress**: Tournament completion percentage
- ✅ **Avatar**: Team and player representation (if photos available)

### Mobile-First Design Requirements

**Touch Target Standards**:
- ✅ 48px minimum touch targets for all interactive elements
- ✅ Tournament venue glove usage compatibility
- ✅ Single-handed mobile navigation patterns

**Responsive Breakpoints**:
- ✅ Mobile: Schedule displayed in single column with collapsible days
- ✅ Tablet: Two-column layout for match cards within days  
- ✅ Desktop: Multi-column layout with expanded match information

**Performance Requirements**:
- ✅ Initial tournament detail load: < 3s
- ✅ Schedule tab activation: < 2s  
- ✅ Individual match detail dialog: < 1s
- ✅ Results tab activation: < 2s

## API Architecture Integration

### VIS API Endpoints (from APIArchitecture.md)

**Primary Endpoints for Epic 4**:
1. **GetBeachMatchList** - Tournament match schedules and results
2. **GetBeachMatch** - Individual match details with set scores  
3. **GetBeachTournamentRanking** - Final tournament standings

**Implementation Pattern**:
```typescript
// Following Epic 3 established patterns
export async function fetchTournamentMatches(tournamentNumber: string): Promise<BeachMatch[]>
export async function fetchMatchDetail(matchNumber: string): Promise<BeachMatchDetail>  
export async function fetchTournamentRanking(tournamentNumber: string): Promise<TournamentRanking[]>
```

**Error Handling**: Extends Epic 3's comprehensive error handling with fallback mechanisms for match data

**Caching Strategy**:
- Schedule data: 2-minute TTL (frequent updates during live tournaments)
- Results data: 10-minute TTL (more stable after completion)
- Match details: 5-minute TTL (balance between freshness and performance)

## Epic 4 Course Correction Integration

### Epic Structure Alignment
- ✅ **Epic 3**: Tournament detail foundation, navigation, error handling - COMPLETED
- 🔄 **Epic 4**: Match schedule, results, and comprehensive tournament data - READY FOR IMPLEMENTATION  
- 📋 **Future Epics**: Additional tournament features, advanced analytics, offline capabilities

### Story Sequencing Logic
1. **Story 4.1**: Build UI components first (match schedule display foundation)
2. **Story 4.2**: Add interactive features (match detail dialogs)  
3. **Story 4.3**: Integrate real API data (schedule API integration)
4. **Story 4.4**: Extend functionality (results and rankings)
5. **Story 4.5**: Complete integration (enhanced tabs and navigation)

This sequence ensures UI foundation before API complexity, following Epic 3's successful implementation pattern.

## Implementation Timeline

### Phase 1: UI Foundation (Week 1)
- Story 4.1: Match schedule display components
- Story 4.2: Match detail dialogs and views

### Phase 2: API Integration (Week 2)  
- Story 4.3: Tournament match schedule API integration
- VIS API client extension and caching implementation

### Phase 3: Results & Rankings (Week 3)
- Story 4.4: Tournament results and rankings integration
- Performance optimization and error handling refinement

### Phase 4: Final Integration (Week 4)
- Story 4.5: Enhanced tournament detail tabs integration
- Comprehensive testing and mobile optimization
- Production deployment preparation

## Success Metrics

### Technical Metrics
- **API Response Times**: < 2s for all Epic 4 endpoints
- **Error Rate**: < 1% for VIS API calls (maintaining Epic 3 standards)
- **Cache Hit Rate**: > 80% for frequently accessed schedule/results data
- **Mobile Performance**: Schedule loading < 3s on 3G networks

### User Experience Metrics  
- **Page Load Time**: Tournament schedule tab loads within 2s
- **Feature Adoption**: > 70% of tournament detail page users accessing Schedule tab
- **Mobile Usability**: 48px touch targets maintained across all Epic 4 features
- **Error Recovery**: < 5% of users experience match data loading failures

### Business Metrics
- **User Engagement**: 40% increase in time spent on tournament detail pages
- **Data Completeness**: 95% of tournaments display complete schedule information
- **Referee Satisfaction**: Comprehensive tournament data accessible in single interface

---

**Epic 4 Ready for Implementation**: This epic provides complete specifications for tournament match schedule and results integration, following established Epic 3 patterns while extending functionality with comprehensive VIS API data integration.