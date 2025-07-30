# Epic 1: Referee UX Enhancement with shadcn Component System

## Epic Overview

**Epic Goal**: Transform BeachRef into a professional referee dashboard with modern UI components, enhanced mobile experience, and FIVB-aligned design system while maintaining all existing functionality and VIS API integration.

**Epic Status**: Draft

**Epic Duration**: Sprint 1 (UX Implementation Focus)

## Integration Requirements
- Preserve existing VIS API data flow and error handling
- Maintain Next.js App Router SSR patterns with new components
- Ensure mobile-first responsive design for tournament-day referee usage
- Implement progressive enhancement to support various connectivity conditions

## Stories Overview

### Story 1.1: shadcn Foundation Setup
**Priority**: High
**Estimated Effort**: 1-2 days
**Dependencies**: None

As a referee,
I want the application to have a professional component foundation,
so that future UI enhancements provide consistent, accessible experience.

**Key Components**: shadcn/ui CLI installation, theme configuration

### Story 1.2: Enhanced Loading States Implementation
**Priority**: High  
**Estimated Effort**: 1 day
**Dependencies**: Story 1.1

As a referee,
I want professional loading indicators when tournament data is fetching,
so that I have clear feedback during VIS API delays in tournament venues.

**Key Components**: Skeleton components, loading transitions

### Story 1.3: Tournament Table Enhancement
**Priority**: High
**Estimated Effort**: 2-3 days
**Dependencies**: Story 1.1, Story 1.2

As a referee,
I want an enhanced tournament table with better visual hierarchy and mobile support,
so that I can efficiently scan tournament information during preparation.

**Key Components**: shadcn Table component, mobile responsive patterns

### Story 1.4: Tournament Information Cards
**Priority**: Medium
**Estimated Effort**: 2 days  
**Dependencies**: Story 1.1, Story 1.3

As a referee,
I want tournament information displayed in card format for better mobile scanning,
so that I can quickly identify relevant tournaments during busy tournament days.

**Key Components**: Card components, Badge components, view toggles

### Story 1.5: Professional Error Handling Enhancement
**Priority**: High
**Estimated Effort**: 1-2 days
**Dependencies**: Story 1.1

As a referee,
I want clear, professional error messaging when tournament data fails to load,
so that I understand what's happening and can take appropriate action during tournaments.

**Key Components**: Alert components, Toast notifications

### Story 1.6: Mobile-First Responsive Optimization
**Priority**: High
**Estimated Effort**: 2-3 days
**Dependencies**: All previous stories

As a referee,
I want the interface optimized for mobile tournament-day usage,
so that I can efficiently access tournament information from my phone during events.

**Key Components**: Mobile responsive patterns, touch optimization

## Technical Context

### Current Architecture Integration Points
- **Data Layer**: `lib/vis-client.ts` - VIS API integration (preserve)
- **Components**: `components/tournament/TournamentTable.tsx` - enhance with shadcn
- **Styling**: Current Tailwind configuration - extend with shadcn theme
- **Build**: Next.js App Router + Vercel deployment - maintain compatibility

### Risk Mitigation Strategy
This epic follows a **gradual enhancement approach**:
1. Start with foundation setup (no UI changes)
2. Replace components incrementally 
3. Maintain existing functionality throughout
4. End with comprehensive mobile optimization

### Success Criteria
- ✅ All existing tournament data display functionality preserved
- ✅ Professional UI matching FIVB aesthetic implemented
- ✅ Mobile experience optimized for referee tournament usage
- ✅ shadcn component system fully integrated
- ✅ Performance maintained or improved
- ✅ Build and deployment pipeline working smoothly

## Implementation Notes

### Component Priority Order
1. **Foundation** (Story 1.1) - Setup without breaking existing
2. **Loading States** (Story 1.2) - Immediate visual improvement
3. **Table Enhancement** (Story 1.3) - Core functionality upgrade
4. **Error Handling** (Story 1.5) - Critical user experience
5. **Card View** (Story 1.4) - Additional interface option
6. **Mobile Optimization** (Story 1.6) - Final polish and integration

### Key shadcn Components to Implement

**Primary Installation Command:**
```bash
npx shadcn-ui@latest add table card badge sheet toast tabs skeleton alert button input
```

**Component Mapping:**
- **Table** - Desktop tournament display with sorting/filtering
- **Card** - Mobile-first tournament cards with touch optimization
- **Sheet** - Tournament detail overlay with tabbed content
- **Badge** - Status indicators (tournament status, gender, level)
- **Skeleton** - Professional loading states matching content layout
- **Alert & Toast** - Error handling and real-time notifications
- **Tabs** - Tournament detail organization (Info, Schedule, Referees, Live)
- **Input** - Search functionality with real-time filtering
- **Button** - Actions, toggles, and view switching

**UX Specification Reference:** Detailed component guidelines in `docs/front-end-spec.md`

---

*This epic structure is designed to minimize risk to the existing system while systematically building a professional referee-focused interface that sets the foundation for future dashboard and filtering features.*

---

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>