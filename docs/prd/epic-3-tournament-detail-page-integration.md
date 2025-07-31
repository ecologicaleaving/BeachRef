# Epic 3: Tournament Detail Page Integration - Brownfield Enhancement

## Epic Goal

Enable referees to access detailed tournament information through clickable tournament entries, providing comprehensive tournament data, schedule, and results in a professional interface that maintains the existing table/list navigation pattern.

## Epic Description

**Existing System Context:**
- Current relevant functionality: Tournament table displays basic tournament info (name, dates, location, gender, type) in paginated format
- Technology stack: Next.js 14 App Router, TypeScript, shadcn/ui component system, FIVB VIS API integration
- Integration points: Existing tournament table, VIS API client, shadcn components from Epic 1 & 2

**Enhancement Details:**
- **What's being added/changed**: 
  - Tournament detail page accessible via dynamic route `/tournament/[code]`
  - Enhanced tournament data fetching from VIS API for individual tournaments
  - Professional tournament detail layout using shadcn components
  - Navigation integration between tournament list and detail views
  - Tournament schedule, results, and participant information display

- **How it integrates**: 
  - Extends existing VIS API client to fetch detailed tournament data
  - Uses Next.js App Router dynamic routing with tournament code parameter
  - Builds upon existing shadcn component system from Epic 1
  - Maintains existing pagination and table functionality from Epic 2

- **Success criteria**: 
  - Referees can click any tournament to view detailed information
  - Tournament detail page loads efficiently with professional layout
  - Navigation between list and detail views is seamless
  - All tournament data is accessible and properly formatted

## Stories

### Story 3.1: Tournament Detail Page Foundation and Routing
**Priority**: High
**Estimated Effort**: 2-3 days
**Dependencies**: Epic 1 (shadcn components), Epic 2 (tournament table)
**Status**: ✅ COMPLETED

As a referee,
I want to click on any tournament in the list to view detailed information,
so that I can access comprehensive tournament data for preparation and reference.

**Acceptance Criteria**:
1. Tournament entries in the list are clickable and navigate to `/tournament/[code]` route
2. Tournament detail page loads with professional header using Card + Badge components
3. Breadcrumb navigation shows clear path: Tournaments → Tournament Name
4. Tabbed organization provides Overview/Schedule/Results/Teams sections
5. Mobile Sheet component provides quick actions for mobile users
6. Page maintains existing responsive design patterns (48px touch targets)

**Key Components**: Dynamic routing, VIS API extension, basic detail page layout

**Implementation Notes**: Basic foundation completed with standard GetBeachTournamentList endpoint. Enhanced data integration deferred to Story 3.1.1.

**UX Component Requirements**:
- **Breadcrumb Navigation**: shadcn Breadcrumb component for tournament list → detail navigation
- **Tournament Header Layout**: shadcn Card component with Badge components for status/type indicators
- **Tabbed Organization**: shadcn Tabs component for organizing Overview/Schedule/Results/Teams
- **Mobile Navigation**: shadcn Sheet component for mobile-optimized quick actions

### Story 3.1.1: Enhanced Tournament Data Integration with GetBeachTournament
**Priority**: High
**Estimated Effort**: 3-4 days
**Dependencies**: Story 3.1, VIS API GetBeachTournament endpoint research
**Status**: 🔄 READY FOR IMPLEMENTATION

As a referee,
I want to see comprehensive tournament information including venue details, competition structure, and federation information,
so that I have all tournament context needed for professional preparation.

**Background**: Research has identified the VIS API GetBeachTournament endpoint that provides significantly more detailed tournament data than the basic GetBeachTournamentList endpoint currently used.

**Technical Approach**: Two-step API integration process:
1. Use existing GetBeachTournamentList to retrieve tournament number (No parameter)
2. Call GetBeachTournament with tournament number to get enhanced data

**Acceptance Criteria**:
1. Tournament detail page displays venue name and city information from GetBeachTournament
2. Competition structure shows main draw size, qualification details, and match format
3. Tournament dates include all phases (main draw, qualification, entry deadlines)
4. Federation and organizer information is properly displayed
5. Points system details are available for referee reference
6. Enhanced tournament status calculation uses actual tournament phase dates
7. Fallback mechanism ensures page functions if GetBeachTournament fails

**Enhanced Data Fields Available**:
- **Venue & Location**: venue, city, countryName (full name vs. code)
- **Competition Structure**: nbTeamsMainDraw, nbTeamsQualification, matchFormat, matchPointsMethod
- **Detailed Dates**: endDateMainDraw, endDateQualification, preliminaryInquiryMainDraw, deadline
- **Administration**: federationCode, organizerCode, version, isVisManaged, webSite, buyTicketsUrl  
- **Points System**: entryPointsTemplateNo, seedPointsTemplateNo, earnedPointsTemplateNo

**Implementation Components**:
- Extend `lib/vis-client.ts` with `getTournamentNumber()` and `fetchTournamentDetailByNumber()` functions
- Update `TournamentDetail` interface with comprehensive field structure
- Enhance `parseEnhancedBeachTournamentResponse()` XML parsing function
- Update `TournamentHeader` component to display venue and enhanced status
- Enhance `TournamentDetailTabs` Overview tab with competition structure details

**Error Handling**: Comprehensive fallback strategy ensures tournament pages remain functional if GetBeachTournament endpoint returns 401/403 errors, falling back to basic GetBeachTournamentList data.

### Story 3.2: Tournament Schedule and Results Display
**Priority**: Medium  
**Estimated Effort**: 3-4 days
**Dependencies**: Story 3.1.1 (enhanced data), VIS API match data endpoints
**Status**: 🔄 PENDING RESEARCH

As a referee,
I want to see comprehensive tournament schedule and results information,
so that I can track match progress and access detailed match information for officiating.

**Research Required**: VIS API endpoints for match data:
- GetBeachTournamentMatchSchedule - for schedule information
- GetBeachTournamentResults - for completed match results
- Match detail endpoints for individual match information

**Acceptance Criteria**:
1. Schedule tab displays matches organized by day using Accordion components
2. Each day shows match count badge and collapsible match details in Table format
3. Team information displays with Avatar components for visual team representation
4. Tournament progress shown with Progress component indicating completion percentage
5. Match details accessible via Dialog components for deep information access
6. All data displays maintain professional FIVB-aligned styling and mobile responsiveness
7. Real-time match status updates when available

**Key Components**: Match schedule display, results integration, team information

**UX Component Requirements**:
- **Schedule Organization**: shadcn Accordion component for collapsible day-by-day match schedules
- **Match Details**: shadcn Table component for structured match information display
- **Team Information**: shadcn Avatar components for team representation
- **Progress Tracking**: shadcn Progress component for tournament completion status
- **Interactive Details**: shadcn Dialog component for detailed match information modals

### Story 3.3: Tournament List Navigation Integration
**Priority**: Medium
**Estimated Effort**: 1-2 days
**Dependencies**: Story 3.1.1
**Status**: 🔄 READY FOR IMPLEMENTATION

As a referee,
I want seamless navigation between the tournament list and detail views,
so that I can efficiently browse tournaments and access detailed information.

**Acceptance Criteria**:
1. Enhanced breadcrumb navigation maintains tournament context throughout browsing
2. Mobile floating action button provides quick return to tournament list
3. Browser back/forward buttons work correctly with tournament detail routing
4. Navigation maintains responsive design with 48px minimum touch targets
5. Tournament list preserves pagination state when returning from detail view
6. Navigation transitions are smooth and provide appropriate loading feedback

**Key Components**: Navigation integration, breadcrumbs, mobile-responsive patterns

**Implementation Notes**: Navigation foundation already implemented in Story 3.1. This story focuses on enhancement and mobile optimization.

**UX Component Requirements**:
- **Enhanced Breadcrumbs**: Extended shadcn Breadcrumb with tournament context
- **Quick Navigation**: Floating action buttons for mobile quick return functionality
- **Responsive Navigation**: Optimized touch targets and mobile-first navigation patterns
- **Back Navigation**: Seamless integration with browser history and routing

## Compatibility Requirements

- ✅ Existing tournament table and pagination APIs remain unchanged
- ✅ VIS API integration patterns follow existing lib/vis-client.ts structure  
- ✅ UI components follow existing shadcn theme and responsive patterns
- ✅ Performance impact is minimal with efficient data fetching

## Risk Mitigation

- **Primary Risk**: VIS API performance impact from additional detailed tournament data requests
- **Mitigation**: Implement efficient caching strategy and progressive data loading
- **Rollback Plan**: Tournament detail routes can be disabled via feature flag, reverting to existing table-only functionality

## Definition of Done

- ✅ All stories completed with acceptance criteria met
- ✅ Existing tournament table functionality verified through testing
- ✅ Tournament detail pages integrate properly with existing navigation
- ✅ Documentation updated for new routing and API patterns
- ✅ No regression in existing tournament list and pagination features

## UX Design Specifications

### Required shadcn Component Installation

**New Components Needed for Epic 3:**
```bash
# Essential components for tournament details
npx shadcn-ui@latest add tabs breadcrumb accordion dialog sheet avatar progress
```

**Existing Components Leveraged:**
- ✅ Card, Badge, Button (from Epic 1)
- ✅ Table, Skeleton, Toast (from Epic 1) 
- ✅ Pagination, Select, Separator (from Epic 2)

### UX Component Architecture

#### **Tournament Detail Page Layout Structure**
```
┌─ Breadcrumb Navigation ─────────────────────────┐
├─ Tournament Header (Card + Badges) ─────────────┤
├─ Tabbed Content Organization ───────────────────┤
│  ├─ Overview Tab                               │
│  ├─ Schedule Tab (Accordion + Table)           │
│  ├─ Results Tab (Table + Progress)             │
│  └─ Teams Tab (Avatar + Details)               │
├─ Mobile Quick Actions (Sheet)                  │
└─ Floating Navigation (Mobile)                  ┘
```

#### **Referee User Journey Optimization**
1. **Discovery**: Click tournament from paginated list
2. **Context**: Immediate tournament header with status badges
3. **Navigation**: Clear breadcrumb path for easy return
4. **Exploration**: Tabbed organization reduces cognitive load
5. **Detail Access**: Accordion/Dialog for deep information
6. **Mobile Support**: Sheet-based actions for venue usage

#### **Mobile-First Responsive Strategy**
- **Touch Targets**: 48px minimum for tournament venue glove usage
- **Progressive Disclosure**: Accordion for schedule organization
- **Quick Actions**: Sheet component for mobile action panels
- **Navigation**: Floating buttons for rapid tournament list return

### Component Integration Patterns

#### **Tournament Header Pattern**
```typescript
<Card className="mb-6">
  <CardHeader>
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{tournament.type}</Badge>
          <Badge variant={getStatusVariant(tournament.status)}>
            {tournament.status}
          </Badge>
        </div>
        <h1 className="text-3xl font-bold">{tournament.name}</h1>
      </div>
    </div>
  </CardHeader>
</Card>
```

#### **Schedule Organization Pattern**
```typescript
<Accordion type="single" collapsible>
  {groupedMatches.map((day) => (
    <AccordionItem key={day.date} value={day.date}>
      <AccordionTrigger>
        <div className="flex items-center justify-between w-full">
          <span className="font-semibold">{day.date}</span>
          <Badge variant="outline">{day.matches.length} matches</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <Table>/* Match details */</Table>
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

#### **Mobile Navigation Pattern**
```typescript
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="sm" className="md:hidden">
      <Menu className="h-4 w-4" />
    </Button>
  </SheetTrigger>
  <SheetContent side="bottom" className="h-[80vh]">
    <TournamentQuickActions tournament={tournament} />
  </SheetContent>
</Sheet>
```

## Technical Context

### VIS API GetBeachTournament Integration Discovery
**Key Finding**: The VIS API provides a `GetBeachTournament` endpoint that delivers comprehensive tournament data far beyond the basic `GetBeachTournamentList` endpoint currently used.

**Two-Step Integration Process**:
1. **Step 1**: Use existing `GetBeachTournamentList` to retrieve tournament `No` parameter
2. **Step 2**: Call `GetBeachTournament` with tournament number for detailed data

**Enhanced Data Available**:
- **Tournament Metadata**: Full title, venue, city, full country name, season, federation details
- **Competition Structure**: Main draw size, qualification details, wild card slots, match format
- **Comprehensive Dates**: All tournament phases with specific start/end dates and deadlines
- **Administration**: Organizer codes, VIS management status, official website, ticket URLs
- **Points System**: Complete points calculation templates for entry, seeding, and earned points

**API Request Format** (GetBeachTournament):
```xml
<VISA>
  <Request>
    <RequestMessage>
      <Type>GetBeachTournament</Type>
      <No>[TOURNAMENT_NUMBER]</No>
    </RequestMessage>
  </Request>
</VISA>
```

**Implementation Strategy**: Primary endpoint with comprehensive fallback to ensure tournament pages remain functional if GetBeachTournament returns authentication errors.

### Current Architecture Integration Points
- **Data Layer**: `lib/vis-client.ts` - Extends VIS API integration for detailed tournament data
- **Components**: Builds upon existing shadcn components from Epic 1
- **Routing**: Uses Next.js App Router dynamic routing `/tournament/[code]`
- **Navigation**: Integrates with existing tournament table from Epic 2

### Implementation Strategy
This epic follows an **additive enhancement approach**:
1. Add tournament detail routing without affecting existing pages
2. Extend VIS API client for detailed tournament data
3. Create detail page components using established shadcn patterns
4. Integrate navigation between list and detail views

### Success Criteria
- ✅ Tournament detail pages accessible via clean URLs (`/tournament/[code]`)
- ✅ Professional UI using shadcn components (Card, Badge, Tabs, Accordion, Table)
- ✅ Efficient data loading with VIS API caching and progressive loading
- ✅ Mobile-responsive design with 48px touch targets for venue usage
- ✅ Seamless navigation with breadcrumbs and floating mobile actions
- ✅ Tabbed content organization reducing referee cognitive load
- ✅ Accordion-based schedule organization for efficient information access
- ✅ Dialog components for detailed match information without losing context
- ✅ Progress indicators for tournament completion status
- ✅ Avatar components for professional team representation
- ✅ Build and deployment pipeline compatibility maintained

## Implementation Phase Guidelines

### Phase 1: Foundation (Story 3.1) - ✅ COMPLETED 
**Status**: Tournament detail page foundation implemented with basic GetBeachTournamentList data

### Phase 1.1: Enhanced Data Integration (Story 3.1.1) - 🔄 READY FOR DEV
**Priority**: Implement GetBeachTournament endpoint integration

**Critical Implementation Details**:

**Step 1 - VIS Client Extension** (`lib/vis-client.ts`):
```typescript
// New function to get tournament number from existing data
export async function getTournamentNumber(code: string): Promise<string> {
  // Use existing GetBeachTournamentList to find tournament number
}

// New function for detailed tournament data
export async function fetchTournamentDetailByNumber(tournamentNo: string): Promise<TournamentDetail> {
  // Call GetBeachTournament with tournament number
}

// Enhanced XML parsing for GetBeachTournament response
export function parseEnhancedBeachTournamentResponse(xmlData: string): TournamentDetail {
  // Parse comprehensive tournament data fields
}
```

**Step 2 - Interface Enhancement** (`lib/types.ts`):
```typescript
export interface TournamentDetail extends Tournament {
  // Enhanced fields from GetBeachTournament
  title?: string;
  countryName?: string;
  season?: string;
  federationCode?: string;
  organizerCode?: string;
  tournamentNumber?: string;
  competitionStructure?: {
    nbTeamsMainDraw?: number;
    nbTeamsQualification?: number;
    matchFormat?: string;
    // Additional competition details
  };
  dates?: {
    endDateMainDraw?: string;
    endDateQualification?: string;
    preliminaryInquiryMainDraw?: string;
    deadline?: string;
  };
  administration?: {
    version?: string;
    isVisManaged?: boolean;
    webSite?: string;
    buyTicketsUrl?: string;
  };
}
```

**Step 3 - Component Enhancement**:
- Update `TournamentHeader` to display venue and comprehensive status
- Enhance `TournamentDetailTabs` Overview tab with competition structure
- Ensure fallback handling for GetBeachTournament failures

**⚠️ Critical Issue Identified**: Tournament name parsing in GetBeachTournament response
- **Problem**: XML parsing was returning country name ("Australia") instead of tournament name ("AUS NT Thompsons Beach")
- **Root Cause**: Tournament title field extraction from XML structure needs refinement
- **Priority**: MUST FIX before Story 3.1.1 completion
- **Testing Required**: Verify tournament name display for multiple tournament codes (MAUS0324, MQUI2025, etc.)

**Development Sequence**:
1. Extend VIS client with GetBeachTournament integration
2. Update TournamentDetail interface with comprehensive fields
3. Implement enhanced XML parsing function
4. Update tournament header component with venue display
5. Enhance overview tab with competition structure details
6. Implement comprehensive fallback error handling

### Phase 2: Schedule and Results (Story 3.2) - 🔄 PENDING RESEARCH
**Focus**: Match data integration requiring VIS API endpoint research
1. Research GetBeachTournamentMatchSchedule endpoint
2. Research GetBeachTournamentResults endpoint
3. Add Avatar components for team representation
4. Integrate Progress components for tournament status
5. Build Dialog components for detailed match information

### Phase 3: Navigation (Story 3.3)
**Focus**: Seamless user flow and mobile optimization
1. Enhance breadcrumb functionality with tournament context
2. Add floating action buttons for mobile quick navigation
3. Ensure browser back/forward compatibility
4. Optimize responsive touch targets (48px minimum)
5. Implement smooth navigation transitions

### Quality Assurance Checkpoints
- ✅ All components maintain FIVB professional aesthetic
- ✅ Mobile responsiveness tested on actual referee devices
- ✅ Navigation flow preserves tournament list pagination state
- ✅ Loading states provide appropriate feedback during VIS API calls
- ✅ Error handling maintains existing patterns and user experience

---

*This epic extends BeachRef's tournament viewing capabilities by adding detailed tournament information access while preserving all existing functionality and following established technical patterns. The integrated UX specifications ensure professional referee workflow optimization with comprehensive shadcn component utilization.*

---

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>