# Epic 2: Tournament Data Pagination with Current Year Default - Brownfield Enhancement

## Epic Goal

Implement tournament pagination that loads only current year (2025) tournaments by default, with page sizes of 20 tournaments per page, using shadcn Pagination and Select components to improve performance and navigation.

## Epic Description

**Existing System Context:**
- Current functionality: `/api/tournaments` endpoint returns all tournaments (500+), TournamentTable displays all at once
- Technology stack: Next.js 14 App Router, `/app/api/tournaments/route.ts`, React Server Components, shadcn/ui v0.8+
- Integration points: VIS API client in `lib/vis-client.ts`, TournamentTable in `components/tournament/TournamentTable.tsx`

**Enhancement Details:**
- **What's being added:** 
  - `/api/tournaments` endpoint accepts `?year=2025&page=1&limit=20` parameters
  - Default to current year 2025, page 1, 20 results per page
  - shadcn Pagination component for desktop, simplified mobile controls
  - Year selector dropdown using shadcn Select component
- **How it integrates:** Extends existing API route, updates TournamentTable props, adds pagination state management
- **Success criteria:** Initial page load under 2 seconds, clear page navigation, URL reflects pagination state

## Stories

### Story 2.1: Backend Pagination API Implementation

**Specific Implementation Tasks:**
- Modify `/app/api/tournaments/route.ts` to accept query parameters:
  - `year` (default: 2025) 
  - `page` (default: 1)
  - `limit` (default: 20, max: 100)
- Return paginated response format:
  ```typescript
  {
    tournaments: Tournament[],
    pagination: {
      currentPage: number,
      totalPages: number,
      totalTournaments: number,
      hasNextPage: boolean,
      hasPrevPage: boolean
    }
  }
  ```
- Filter tournaments by `startDate` year in VIS API client
- Add input validation and error handling for invalid parameters
- Maintain backward compatibility (no params = current behavior)

**Acceptance Criteria:**
- `/api/tournaments?year=2025&page=1&limit=20` returns exactly 20 current year tournaments
- `/api/tournaments` (no params) maintains existing behavior
- Response includes pagination metadata
- Invalid parameters return appropriate error responses

### Story 2.2: Pagination UI Components with shadcn

**Specific Implementation Tasks:**
- Install shadcn components: `npx shadcn-ui@latest add pagination select`
- Create `components/ui/TournamentPagination.tsx`:
  - Desktop: Use shadcn `<Pagination>` component with numbered pages
  - Mobile: Custom prev/next buttons with 48px minimum touch targets
  - Page indicator showing "Page X of Y"
- Create `components/ui/YearSelector.tsx`:
  - Use shadcn `<Select>` component
  - Options: 2023, 2024, 2025 (current), with 2025 as default
  - Show tournament count per year in dropdown
- Add URL state management using Next.js `useSearchParams` and `useRouter`
- Implement loading states using existing `TournamentTableSkeleton`

**Acceptance Criteria:**
- Pagination controls render correctly on mobile (48px touch targets) and desktop
- Year selector defaults to 2025, shows available years
- URL updates when pagination changes: `/tournaments?year=2025&page=2`
- Loading states appear during page transitions

### Story 2.3: Tournament Table Pagination Integration

**Specific Implementation Tasks:**
- Update `TournamentTable` component props interface:
  ```typescript
  interface TournamentTableProps {
    initialData?: PaginatedTournamentResponse | null;
    currentYear?: number;
    currentPage?: number;
  }
  ```
- Modify `fetchTournaments` function to include pagination parameters
- Add pagination state management with React hooks:
  - `useState` for current page, year, loading states
  - `useEffect` for URL parameter synchronization
  - `useCallback` for page change handlers
- Integrate `TournamentPagination` and `YearSelector` components
- Update `app/page.tsx` to pass URL search params as initial props
- Preserve all existing features: sorting, view toggle, error handling, offline support

**Acceptance Criteria:**
- Tournament table loads 20 current year tournaments by default
- Pagination controls update table data without page refresh
- All existing functionality preserved: sorting, card/table view toggle, mobile responsiveness
- URL reflects current pagination state and is shareable
- Browser back/forward buttons work correctly

## Compatibility Requirements

- ✅ `/api/tournaments` without parameters maintains existing behavior (all tournaments)
- ✅ TournamentTable component interface extends existing props (no breaking changes)
- ✅ All existing tournament display features preserved
- ✅ Mobile-first responsive design patterns maintained
- ✅ shadcn component styling consistent with Epic 1 implementation

## Risk Mitigation

**Primary Risk:** Pagination breaks existing tournament sorting, filtering, or mobile responsiveness

**Mitigation:** 
- Feature flag: `ENABLE_PAGINATION=true` environment variable
- Maintain existing API behavior when pagination params not provided
- Use progressive enhancement: pagination enhances existing functionality
- Comprehensive testing of existing features with pagination enabled

**Rollback Plan:** 
- Set `ENABLE_PAGINATION=false` to disable pagination features
- API falls back to existing behavior (return all tournaments)
- TournamentTable renders without pagination controls
- All existing functionality remains intact

## Definition of Done

**Technical Implementation:**
- ✅ API returns paginated tournament data with metadata
- ✅ shadcn Pagination and Select components properly installed and configured
- ✅ URL state management working with Next.js routing
- ✅ Loading states implemented with existing skeleton patterns

**User Experience:**
- ✅ Default view shows current year (2025) tournaments, page 1
- ✅ Pagination navigation works on mobile (48px touch targets) and desktop
- ✅ Year selector allows switching between 2023, 2024, 2025
- ✅ Page loads under 2 seconds for 20 tournaments vs. 500+

**Compatibility:**
- ✅ All Epic 1 features preserved: responsive design, sorting, view toggle, offline support
- ✅ No breaking changes to existing component interfaces
- ✅ Backward compatible API (no params = existing behavior)

---

**Created:** 2025-07-30  
**Product Owner:** Sarah  
**Epic Type:** Brownfield Enhancement  
**Estimated Stories:** 3  
**Risk Level:** Low (additive functionality, backward compatible)

---

*This epic provides specific implementation guidance for adding tournament pagination while preserving all existing functionality and following established shadcn/ui patterns from Epic 1.*