# Epic 1: Referee UX Enhancement with shadcn Component System

**Epic Goal**: Transform BeachRef into a professional referee dashboard with modern UI components, enhanced mobile experience, and FIVB-aligned design system while maintaining all existing functionality and VIS API integration.

**Integration Requirements**: 
- Preserve existing VIS API data flow and error handling
- Maintain Next.js App Router SSR patterns with new components
- Ensure mobile-first responsive design for tournament-day referee usage
- Implement progressive enhancement to support various connectivity conditions

## Story 1.1: shadcn Foundation Setup
As a referee,
I want the application to have a professional component foundation,
so that future UI enhancements provide consistent, accessible experience.

### Acceptance Criteria
1. shadcn/ui CLI installation completed without breaking existing build
2. Tailwind configuration updated to support shadcn theming
3. Basic theme configuration implemented with FIVB-inspired color palette
4. Development environment validates shadcn component imports work correctly

### Integration Verification
- IV1: Existing tournament table still renders and functions normally
- IV2: VIS API integration continues to work without modification
- IV3: Vercel build process completes successfully with new dependencies

## Story 1.2: Enhanced Loading States Implementation
As a referee,
I want professional loading indicators when tournament data is fetching,
so that I have clear feedback during VIS API delays in tournament venues.

### Acceptance Criteria
1. LoadingSpinner component replaced with shadcn Skeleton components
2. Loading states implemented for all VIS API calls in tournament table
3. Mobile-optimized skeleton patterns for tournament card layouts
4. Smooth transitions between loading and loaded states

### Integration Verification
- IV1: Existing error handling continues to work during failed API calls  
- IV2: Loading state performance matches or improves current implementation
- IV3: Mobile loading experience provides clear visual feedback

## Story 1.3: Tournament Table Enhancement
As a referee,
I want an enhanced tournament table with better visual hierarchy and mobile support,
so that I can efficiently scan tournament information during preparation.

### Acceptance Criteria
1. Current tournament table replaced with shadcn Table component
2. Enhanced typography and spacing for better readability
3. Improved mobile responsive behavior with horizontal scroll handling
4. Maintained sorting and data display functionality from existing implementation

### Integration Verification
- IV1: All tournament data fields continue to display correctly
- IV2: Existing country flag integration works with new table structure
- IV3: Performance remains optimal for large tournament datasets

## Story 1.4: Tournament Information Cards
As a referee,
I want tournament information displayed in card format for better mobile scanning,
so that I can quickly identify relevant tournaments during busy tournament days.

### Acceptance Criteria
1. Tournament data optionally displayed in shadcn Card components
2. Card layout optimized for mobile touch interaction with 44px minimum targets
3. Tournament status badges implemented using shadcn Badge components
4. Card view toggleable with existing table view for user preference

### Integration Verification
- IV1: Card view maintains all tournament data integrity
- IV2: Performance remains optimal when switching between card and table views
- IV3: Mobile interaction patterns work smoothly on tournament venue networks

## Story 1.5: Professional Error Handling Enhancement
As a referee,
I want clear, professional error messaging when tournament data fails to load,
so that I understand what's happening and can take appropriate action during tournaments.

### Acceptance Criteria
1. Error boundaries enhanced with shadcn Alert components
2. Toast notifications implemented for transient errors using shadcn Toast
3. Error messages provide clear next steps for referees
4. Retry functionality integrated with enhanced error UI

### Integration Verification
- IV1: Existing error logging to `/api/errors` continues to function
- IV2: Error recovery patterns maintain existing VIS API retry logic
- IV3: Mobile error display remains readable in various lighting conditions

## Story 1.6: Mobile-First Responsive Optimization
As a referee,
I want the interface optimized for mobile tournament-day usage,
so that I can efficiently access tournament information from my phone during events.

### Acceptance Criteria
1. All shadcn components implement mobile-first responsive patterns
2. Touch targets meet minimum 44px requirements for tournament glove usage
3. High contrast theme options for outdoor tournament visibility
4. Offline-ready UI states for poor venue connectivity

### Integration Verification
- IV1: Desktop experience remains fully functional and professional
- IV2: Existing responsive breakpoints work with new component system
- IV3: Performance optimized for mobile networks common in tournament venues

---

*This story sequence is designed to minimize risk to the existing system by starting with foundation setup that doesn't change UI, gradually replacing components from least to most complex, maintaining existing functionality while enhancing presentation, and ending with mobile optimization that builds on proven component base.*