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

**UX Component Requirements**:
- **Breadcrumb Navigation**: shadcn Breadcrumb component for tournament list → detail navigation
- **Tournament Header Layout**: shadcn Card component with Badge components for status/type indicators
- **Tabbed Organization**: shadcn Tabs component for organizing Overview/Schedule/Results/Teams
- **Mobile Navigation**: shadcn Sheet component for mobile-optimized quick actions

### Story 3.2: Tournament Detail Data Display Enhancement
**Priority**: Medium  
**Estimated Effort**: 2-3 days
**Dependencies**: Story 3.1

As a referee,
I want to see comprehensive tournament information including schedule and results,
so that I can have all necessary tournament details in one professional interface.

**Acceptance Criteria**:
1. Schedule tab displays matches organized by day using Accordion components
2. Each day shows match count badge and collapsible match details in Table format
3. Team information displays with Avatar components for visual team representation
4. Tournament progress shown with Progress component indicating completion percentage
5. Match details accessible via Dialog components for deep information access
6. All data displays maintain professional FIVB-aligned styling and mobile responsiveness

**Key Components**: Tournament data display, schedule sections, results integration

**UX Component Requirements**:
- **Schedule Organization**: shadcn Accordion component for collapsible day-by-day match schedules
- **Match Details**: shadcn Table component for structured match information display
- **Team Information**: shadcn Avatar components for team representation
- **Progress Tracking**: shadcn Progress component for tournament completion status
- **Interactive Details**: shadcn Dialog component for detailed match information modals

### Story 3.3: Tournament List Navigation Integration
**Priority**: Medium
**Estimated Effort**: 1-2 days
**Dependencies**: Story 3.1, Story 3.2

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

### Phase 1: Foundation (Story 3.1)
**Priority**: Install required shadcn components first
```bash
npx shadcn-ui@latest add tabs breadcrumb accordion dialog sheet avatar progress
```

**Development Sequence**:
1. Create `/tournament/[code]` dynamic route structure
2. Implement breadcrumb navigation component
3. Build tournament header with Card + Badge layout  
4. Add basic tabbed organization structure
5. Integrate mobile Sheet component for quick actions

### Phase 2: Data Display (Story 3.2) 
**Focus**: Content organization and information architecture
1. Implement Accordion-based schedule organization
2. Create Table components for match details
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