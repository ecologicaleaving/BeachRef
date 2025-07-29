# Referee Enhancement - Frontend Specification

## 1. Introduction

This document defines the UI/UX specifications for adding referee information display and filtering capabilities to the existing VisConnect beach volleyball tournament application. This is a brownfield enhancement that extends the current React 18 + TypeScript frontend with shadcn/ui components to include referee data visualization and filtering functionality.

### Enhancement Context

**Existing System:**
- React 18 + TypeScript frontend with shadcn/ui component library
- Tournament and match visualization with MatchCard, TournamentFilters, and MatchList components
- VIS API integration for tournament data
- TanStack Query for state management
- Existing filtering infrastructure with useFilters hook

**Enhancement Scope:**
- Add referee information display to match cards and table views
- Integrate referee filtering into existing filter system
- Maintain responsive design and accessibility standards
- Ensure graceful handling of missing referee data

## 2. Component Enhancement Specifications

### 2.1 MatchCard Component Enhancement

**Current Component:** `/frontend/src/components/tournament/MatchCard.tsx`

**Enhancement Requirements:**
- Add referee information section between match score and footer
- Display main referee and assistant referees if available
- Handle missing referee data gracefully
- Maintain existing responsive behavior

**New UI Elements:**

```typescript
interface RefereeDisplayProps {
  referees?: {
    main?: {
      name: string;
      country?: string;
      level?: string;
    };
    assistant?: {
      name: string;
      country?: string;
      level?: string;
    };
  };
}
```

**Visual Design:**
```
┌─────────────────────────────────────┐
│ Status Badge    │    Date/Time      │
│ Round Info      │                   │
├─────────────────────────────────────┤
│ Team 1 vs Team 2                    │
│ Country badges, Winner trophy       │
├─────────────────────────────────────┤
│ Match Score (if not Scheduled)      │
├─────────────────────────────────────┤
│ 👨‍⚖️ REFEREE SECTION (NEW)           │
│ Main: John Smith (BRA)              │
│ Asst: Maria Lopez (ESP)             │
├─────────────────────────────────────┤
│ Court Info │ Duration │ Winner      │
└─────────────────────────────────────┘
```

**Implementation Details:**
- Use `User` icon from Lucide React for referee section
- Apply `text-xs text-muted-foreground` for styling consistency
- Add referee section with `border-t` separator
- Handle empty states with "TBD" text
- Maintain 4px padding and existing spacing patterns

### 2.2 TournamentFilters Component Enhancement

**Current Component:** `/frontend/src/components/tournament/TournamentFilters.tsx`

**Enhancement Requirements:**
- Add referee filter option to existing filter grid
- Integrate with existing useFilters hook pattern
- Support autocomplete/search for referee names
- Include referee filter in active filters summary

**New Filter Component:**
```typescript
interface RefereeFilterProps {
  selectedReferees: string[];
  onRefereesChange: (referees: string[]) => void;
  availableReferees?: { name: string; count: number }[];
}
```

**Visual Integration:**
```
┌─────────────── FILTERS ────────────────┐
│ Search tournaments...                  │
├────────────────────────────────────────┤
│ Date Range │ Location │ Type          │
│ [Filter 1] │[Filter 2]│[Filter 3]     │
├────────────────────────────────────────┤
│ Referee (NEW)                          │
│ [Multi-select with autocomplete]       │
├────────────────────────────────────────┤
│ Advanced Filters ▼                     │
└────────────────────────────────────────┘
```

**Implementation Details:**
- Use shadcn/ui `Select` component with multi-select capability
- Add to existing grid layout: `grid-cols-1 md:grid-cols-4`
- Integrate with `buildFilterSummary` utility
- Support clearing individual referee filters
- Maintain consistent styling with existing filters

### 2.3 MatchList Component Enhancement

**Current Component:** `/frontend/src/components/tournament/MatchList.tsx`

**Enhancement Requirements:**
- Add referee column to desktop table view
- Include referee information in mobile card view
- Maintain existing table structure and responsive behavior
- Handle missing referee data in table cells

**Desktop Table Enhancement:**
```
┌─────────┬───────┬──────────┬────────┬───────┬────────┬─────────────┐
│ Status  │ Round │ Date/Time│ Teams  │ Score │ Court  │ Referee     │
├─────────┼───────┼──────────┼────────┼───────┼────────┼─────────────┤
│ Live    │ QF1   │ 10:00    │ BRA vs │ 21-19 │ Court 1│ J.Smith     │
│         │       │          │ ESP    │ 18-21 │        │ (Main)      │
└─────────┴───────┴──────────┴────────┴───────┴────────┴─────────────┘
```

**Implementation Details:**
- Add `Referee` column header with `TableHead`
- Display main referee name with "(Main)" indicator
- Show "TBD" for missing referee assignments
- Use consistent `text-sm` styling
- Include country code if available: "J.Smith (BRA)"

### 2.4 New RefereeFilter Component

**New Component:** `/frontend/src/components/tournament/RefereeFilter.tsx`

**Purpose:** Dedicated referee filtering component with autocomplete functionality

**Component Structure:**
```typescript
interface RefereeFilterProps {
  selectedReferees: string[];
  onRefereesChange: (referees: string[]) => void;
  availableReferees?: Array<{
    name: string;
    country?: string;
    matchCount: number;
  }>;
  isLoading?: boolean;
}
```

**Features:**
- Autocomplete search for referee names
- Multi-select with badges for selected referees
- Loading state for referee data fetching
- Clear all selected referees option
- Accessibility support with proper ARIA labels

## 3. Data Model Extensions

### 3.1 Enhanced Match Interface

**Extension to:** `/frontend/src/types/tournament.types.ts`

```typescript
export interface Match {
  // ... existing fields
  referees?: {
    main?: {
      id: string;
      name: string;
      country?: string;
      level?: 'International' | 'Continental' | 'National';
    };
    assistant?: {
      id: string;
      name: string;
      country?: string;
      level?: 'International' | 'Continental' | 'National';
    };
  };
}
```

### 3.2 Enhanced TournamentFilters Interface

```typescript
export interface TournamentFilters {
  // ... existing fields
  referees?: string[]; // Array of referee names/IDs
}
```

### 3.3 New Referee Types

```typescript
export interface Referee {
  id: string;
  name: string;
  country?: string;
  level?: 'International' | 'Continental' | 'National';
  certifications?: string[];
}

export interface RefereeFilterOptions {
  referees: Array<{
    name: string;
    country?: string;
    matchCount: number;
  }>;
}
```

## 4. Responsive Design Specifications

### 4.1 Mobile Behavior (320px - 767px)

**MatchCard Referee Section:**
- Single line format: "Ref: J.Smith (BRA)"
- Truncate long names with ellipsis
- Show only main referee on mobile

**TournamentFilters:**
- Referee filter moves to advanced filters section
- Simplified single-select on mobile
- Collapsible with existing advanced filters

**MatchList:**
- Referee info included in existing mobile card view
- Added to footer section with other metadata

### 4.2 Tablet Behavior (768px - 1023px)

**MatchCard:**
- Two-line referee section for main + assistant
- Abbreviated country codes

**TournamentFilters:**
- Referee filter in main grid (4-column layout)
- Multi-select with compact display

**MatchList:**
- Full table with referee column
- Abbreviated referee names if needed

### 4.3 Desktop Behavior (1024px+)

**MatchCard:**
- Full referee information display
- Main and assistant referees with full names
- Country codes and levels if available

**TournamentFilters:**
- Full referee filter with autocomplete
- Multi-select with badge display

**MatchList:**
- Complete referee column with full details
- Hover states for additional referee information

## 5. Error Handling & Empty States

### 5.1 Missing Referee Data

**MatchCard Display:**
```
👨‍⚖️ Referee: TBD
```

**Table Display:**
```
│ TBD     │
```

**Filter Behavior:**
- Exclude matches without referee data from referee filter options
- Show count of matches with referee data

### 5.2 Loading States

**Referee Filter:**
- Skeleton loader for autocomplete options
- Disabled state during referee data fetch
- Loading spinner in dropdown

**Match Components:**
- Referee section shows loading placeholder
- Maintains component structure during load

### 5.3 Error States

**API Errors:**
- Graceful fallback to "Referee information unavailable"
- Error boundary prevents component crash
- Retry mechanism for referee data fetch

## 6. Accessibility Requirements

### 6.1 WCAG AA Compliance

**Referee Section:**
- Proper heading structure with aria-labels
- Screen reader friendly referee information
- Keyboard navigation support

**Filter Component:**
- Proper form labels and descriptions
- Autocomplete accessibility attributes
- Clear focus indicators

### 6.2 Implementation Details

```typescript
// Referee section accessibility
<div role="region" aria-label="Referee information">
  <div className="flex items-center gap-1">
    <User className="h-3 w-3" aria-hidden="true" />
    <span className="sr-only">Referee:</span>
    <span>{refereeName}</span>
  </div>
</div>

// Filter accessibility
<Select aria-label="Filter by referee">
  <SelectTrigger>
    <SelectValue placeholder="Select referees..." />
  </SelectTrigger>
</Select>
```

## 7. Performance Considerations

### 7.1 Data Fetching Strategy

**Referee Data:**
- Fetch referee information with match data (single request)
- Cache referee filter options for tournament duration
- Debounced autocomplete search (300ms delay)

**Filtering Performance:**
- Client-side filtering for referee names
- Server-side filtering integration via API
- Optimistic UI updates during filter changes

### 7.2 Bundle Size Impact

**New Dependencies:**
- No additional dependencies required
- Utilizes existing shadcn/ui components
- Estimated bundle size increase: <5KB

## 8. Implementation Guidelines

### 8.1 Development Approach

1. **Phase 1:** Extend Match interface and mock data
2. **Phase 2:** Enhance MatchCard component with referee display
3. **Phase 3:** Add referee filtering to TournamentFilters
4. **Phase 4:** Update MatchList with referee column
5. **Phase 5:** Testing and accessibility validation

### 8.2 Code Quality Standards

**TypeScript:**
- Strict type checking for all referee-related interfaces
- Proper optional chaining for referee data access
- Type guards for referee data validation

**Component Standards:**
- Follow existing shadcn/ui patterns
- Maintain consistent spacing and styling
- Proper error boundaries and loading states

**Testing Requirements:**
- Unit tests for all new components
- Integration tests for filter functionality
- Accessibility testing with screen readers
- Visual regression testing for responsive behavior

## 9. Integration Points

### 9.1 useFilters Hook Extension

```typescript
// Add to existing useFilters hook
const updateReferees = useCallback((referees: string[]) => {
  updateFilters(prev => ({ ...prev, referees }));
}, [updateFilters]);

return {
  // ... existing returns
  updateReferees,
  // Add referees to existing filter functions
};
```

### 9.2 API Integration

**New Endpoint Requirements:**
- `/api/referees/search?q=` for autocomplete
- Extended match API to include referee data
- Filter API to support referee filtering

**Request/Response Examples:**
```typescript
// Match with referee data
interface MatchResponse {
  // ... existing fields
  referees?: {
    main?: RefereeInfo;
    assistant?: RefereeInfo;
  };
}

// Referee search response
interface RefereeSearchResponse {
  referees: Array<{
    name: string;
    country?: string;
    matchCount: number;
  }>;
}
```

## 10. Testing Strategy

### 10.1 Component Testing

**MatchCard Tests:**
- Referee display with complete data
- Referee display with missing data
- Responsive behavior across breakpoints
- Accessibility compliance

**Filter Tests:**
- Multi-select referee filtering
- Autocomplete functionality
- Clear filter operations
- Integration with existing filter system

### 10.2 Integration Testing

**End-to-End Tests:**
- Complete referee filtering workflow
- Match display with referee information
- Responsive behavior validation
- Error handling scenarios

### 10.3 Accessibility Testing

**Automated Tests:**
- axe-core integration for accessibility rules
- Screen reader compatibility testing
- Keyboard navigation validation
- Color contrast verification

## 11. Wireframes & Visual Examples

### 11.1 MatchCard with Referee Information

```
┌─────────────────────────────────────┐
│ 🟢 Live        │    Today 10:30     │
│ Quarterfinal   │                    │
├─────────────────────────────────────┤
│ John Doe / Mike Smith (BRA) 🏆      │
│ Jane Wilson / Sara Brown (ESP)      │
├─────────────────────────────────────┤
│            21-19, 18-21, 15-12      │
├─────────────────────────────────────┤
│ 👨‍⚖️ Main Ref: Carlos Silva (BRA)   │
│    Assistant: Anna Garcia (ESP)     │
├─────────────────────────────────────┤
│ 📍 Court 1  │ ⏱️ 48 min │ Winner: BRA │
└─────────────────────────────────────┘
```

### 11.2 Enhanced Filter Panel

```
┌────────────── FILTERS ──────────────┐
│ 🔍 Search tournaments...            │
├─────────────────────────────────────┤
│ 📅 Date Range  │🗺️ Location │🏆 Type│
│ [Last 30 days] │[Multi-sel] │[All] │
├─────────────────────────────────────┤
│ 👨‍⚖️ Referee                         │
│ [Search referees...] 🔽             │
│ ✓ Carlos Silva (3 matches)          │
│ ✓ Anna Garcia (2 matches)           │
└─────────────────────────────────────┘
```

### 11.3 Enhanced Match Table

```
┌──────────┬─────────┬──────────┬─────────────┬───────────┬──────────┬──────────────┐
│ Status   │ Round   │ Date     │ Teams       │ Score     │ Court    │ Referee      │
├──────────┼─────────┼──────────┼─────────────┼───────────┼──────────┼──────────────┤
│ 🟢 Live  │ QF1     │ 10:30    │ BRA vs ESP  │ 21-19     │ Court 1  │ C.Silva      │
│          │         │          │             │ 18-21     │          │ (BRA)        │
├──────────┼─────────┼──────────┼─────────────┼───────────┼──────────┼──────────────┤
│ ⏸️ Sched │ QF2     │ 12:00    │ USA vs ITA  │ -         │ Court 2  │ TBD          │
└──────────┴─────────┴──────────┴─────────────┴───────────┴──────────┴──────────────┘
```

## 12. Implementation Checklist

### 12.1 Development Tasks

- [ ] Extend Match interface with referee data types
- [ ] Create RefereeFilter component with autocomplete
- [ ] Enhance MatchCard with referee display section
- [ ] Add referee column to MatchList table
- [ ] Integrate referee filtering with useFilters hook
- [ ] Update TournamentFilters layout for referee filter
- [ ] Add referee filter to filter summary and clear operations
- [ ] Implement responsive behavior for all screen sizes
- [ ] Handle empty states and error scenarios
- [ ] Add loading states for referee data fetching

### 12.2 Testing Tasks

- [ ] Unit tests for RefereeFilter component
- [ ] Unit tests for enhanced MatchCard
- [ ] Unit tests for enhanced MatchList
- [ ] Integration tests for filter functionality
- [ ] Accessibility testing with screen readers
- [ ] Visual regression testing across breakpoints
- [ ] Performance testing for filter operations
- [ ] End-to-end testing for complete user workflows

### 12.3 Documentation Tasks

- [ ] Update component documentation
- [ ] Create Storybook stories for new components
- [ ] Document accessibility implementation
- [ ] Update API integration documentation
- [ ] Create user testing guidelines

## 13. Future Enhancements

### 13.1 Phase 2 Considerations

**Advanced Referee Features:**
- Referee performance statistics
- Referee assignment history
- Referee certification levels display
- Integration with referee management system

**Enhanced Filtering:**
- Filter by referee certification level
- Filter by referee experience
- Combined referee and tournament type filtering
- Save custom referee filter presets

**Improved UX:**
- Referee profile pages
- Referee photo integration
- Advanced referee search with fuzzy matching
- Real-time referee assignment updates

---

*This specification ensures the referee enhancement maintains consistency with the existing VisConnect design system while providing comprehensive referee information display and filtering capabilities for beach volleyball tournament management.*