<!--
  Sync Impact Report
  ==================
  Version Change: 1.0.0 → 1.0.1
  Modified Principles: N/A
  Added Sections: VIS API documentation reference and optimization guidance
  Removed Sections: N/A

  Templates Requiring Updates:
  ✅ plan-template.md - No changes needed
  ✅ spec-template.md - No changes needed
  ✅ tasks-template.md - No changes needed

  Amendment Summary:
  - Added VIS API documentation URL to External API Integration section
  - Added mandatory optimization guidance for VIS API calls and data extraction
  - Corrected ratification/amendment dates to 2025-10-19

  Follow-up TODOs:
  - None
-->

# BeachRef Constitution

## Core Principles

### I. Mobile-First Architecture

Mobile devices are the primary deployment target; all architecture decisions prioritize mobile performance, offline capability, and touch interaction. Features MUST be designed for single-handed operation with accessibility in mind. Design patterns MUST follow mobile-native conventions (React Native/Expo) rather than web-to-mobile translations.

**Rationale**: Referees use the app on-court in real-world conditions with intermittent connectivity, requiring mobile-optimized UX and robust offline capabilities.

### II. Offline-First Data Architecture

All data MUST be accessible offline through multi-level caching (Memory → LocalStorage → API). Features MUST gracefully degrade when offline, queuing operations for sync when connectivity returns. Cache warming on app initialization is required for critical user journeys (tournament browsing, assignment viewing).

**Rationale**: Beach volleyball tournaments often occur in locations with poor connectivity. Referees need reliable access to assignments, schedules, and match data regardless of network conditions.

### III. Service Layer Abstraction

Business logic MUST be isolated in dedicated service classes, never embedded directly in UI components. Services MUST use dependency injection patterns for testability. Each service has a single, well-defined responsibility (Cache, Storage, Sync, Realtime, Business Operations).

**Rationale**: Service layer abstraction enables independent testing, parallel development, and graceful handling of API changes without cascading UI modifications.

### IV. Resilience & Error Boundaries

ALL external dependencies (API calls, storage operations) MUST implement resilience patterns: circuit breakers for API failures, exponential backoff for retries, error boundaries for UI isolation. Errors MUST be logged centrally and displayed to users with actionable recovery steps.

**Rationale**: Production referee workflows cannot be blocked by transient failures. Users need to complete critical tasks (viewing assignments, entering scores) even when services degrade.

### V. Design System Consistency

UI components MUST follow the established design system structure: Foundation → Brand → Typography → Status → Domain. Design tokens (colors, spacing, typography) MUST be centralized and referenced via constants, never hardcoded. Component variants MUST support accessibility requirements (contrast ratios, touch targets, screen readers).

**Rationale**: Consistent visual language and accessible design ensure referees can scan information quickly on-court and reduces cognitive load during high-pressure situations.

### VI. Type Safety & API Contracts

TypeScript strict mode MUST be enabled project-wide. All API responses MUST have typed interfaces matching VIS API contracts. No `any` types except for explicitly documented third-party library compatibility. DTOs (Data Transfer Objects) MUST be validated at API boundaries.

**Rationale**: Type safety prevents runtime errors in production and provides clear documentation of API contracts, critical for integration with the external VIS (Volleyball Information System) API.

### VII. Real-time State Synchronization

State changes (assignments, match scores, tournament status) MUST propagate via subscription services implementing the Observer pattern. Real-time updates MUST have fallback strategies for connection failures. State providers MUST expose online/offline status and sync state to UI components.

**Rationale**: Multiple referees and tournament staff share assignments and match data; real-time synchronization prevents conflicts and ensures everyone sees current information.

## Performance Standards

### Response Time Requirements

- **Tournament list loading**: <500ms (cached), <2s (API with cache warming)
- **Match detail rendering**: <200ms (cached data)
- **Assignment status updates**: <100ms (local state), <3s (API round-trip with retry)
- **Offline → Online sync**: Must queue and execute within 10s of connection restoration

### Caching Policy

- **Level 1 (Memory)**: Immediate access, session lifetime
- **Level 2 (LocalStorage)**: Persist across sessions, 6-hour expiration for tournament data
- **Level 3 (API)**: Fetch with intelligent refresh logic based on tournament dates and status

### Mobile Constraints

- **Touch Targets**: Minimum 44x44pt (iOS HIG) / 48x48dp (Material Design)
- **Animation Performance**: 60 fps for transitions, use React Native Reanimated for performance-critical animations
- **Bundle Size**: Monitor and minimize JavaScript bundle; use code splitting for non-critical screens
- **Memory Usage**: Profile and prevent memory leaks in subscription services and listeners

## Development Workflow

### Code Organization

- **Screens** (`/app`): Expo Router file-based routing, minimal business logic
- **Components** (`/components`): Design system components (Foundation, Brand, Domain), never direct API calls
- **Services** (`/services`): All business logic, API integration, caching, state management
- **Hooks** (`/hooks`): React hooks for state access, subscriptions, and side effects
- **Types** (`/types`): TypeScript interfaces and types, shared across screens/components/services

### Testing Strategy (When Implemented)

- **Contract Tests**: Validate API responses match TypeScript interfaces
- **Integration Tests**: Service layer integration with storage and API mocks
- **Component Tests**: Design system components with accessibility validation
- **E2E Tests**: Critical user journeys (tournament selection, assignment viewing, score entry)

### Code Review Requirements

All PRs MUST:
1. Follow established service architecture patterns
2. Include TypeScript types for new data structures
3. Handle offline scenarios gracefully
4. Update relevant design tokens if modifying UI constants
5. Document new services or significant architectural changes in CLAUDE.md

### Git Workflow

- **Main Branch**: `master` (production-ready code)
- **Development Branch**: Active feature development and integration
- **Feature Branches**: `[feature-id]-[feature-name]` or descriptive names
- **Commit Messages**: Conventional commits format (`feat:`, `fix:`, `docs:`, `refactor:`)

## Technology Constraints

### Required Stack

- **Runtime**: Expo SDK ~53.0.20 with React 19 and React Native 0.79.5
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context for global state, React Query for server state (if added)
- **Storage**: AsyncStorage (sensitive data), LocalStorage/Memory (caching)
- **Icons**: Expo Vector Icons, Lucide React Native
- **Styling**: React Native StyleSheet API with design token constants

### Forbidden Patterns

- ❌ Direct API calls from components (use service layer)
- ❌ Hardcoded colors, spacing, or typography values (use design tokens)
- ❌ Inline styles for repeated patterns (use StyleSheet.create)
- ❌ `any` types without explicit justification and comment
- ❌ Blocking the UI thread for long operations (use async/await properly)
- ❌ Unhandled promise rejections or silent error swallowing

### External API Integration

- **VIS API**: RESTful integration with Volleyball Information System
  - **Documentation**: Official VIS API documentation available at https://www.fivb.org/VisSDK/VisWebService/#Introduction.html
  - **API Call Optimization**: Features MUST minimize VIS API calls through intelligent caching, request batching, and selective field queries. Avoid redundant requests for data already cached or available locally.
  - **Data Extraction Optimization**: Extract only necessary fields from VIS API responses. Use field selection parameters where available to minimize payload size and parsing overhead.
  - Use `GetEventList` for tournament data with gender variant merging
  - Use `GetBeachMatchList` with `tournament.visNo` as TournamentNo
  - All API calls MUST go through circuit breaker pattern
  - Responses MUST be cached per caching policy above

## Governance

### Constitution Authority

This constitution supersedes all other development practices and conventions. When conflicts arise between this document and other guidance (README, docs, inline comments), this constitution takes precedence.

### Amendment Process

Amendments to this constitution require:
1. Documentation of the proposed change with rationale
2. Impact analysis on existing codebase and templates
3. Version bump per semantic versioning (see below)
4. Update of dependent templates (plan, spec, tasks, commands)
5. Propagation to CLAUDE.md if architectural patterns change

### Versioning Policy

**MAJOR**: Backward-incompatible changes (e.g., removing a core principle, changing forbidden patterns to required patterns)
**MINOR**: New principles added, material expansion of existing sections, new mandatory standards
**PATCH**: Clarifications, typo fixes, wording improvements, non-semantic refinements

### Compliance Validation

All PRs MUST verify compliance with:
- Service layer abstraction (Principle III)
- Offline-first data access (Principle II)
- Resilience patterns for external dependencies (Principle IV)
- Type safety requirements (Principle VI)

Violations MUST be documented in the Complexity Tracking section of `plan.md` with explicit justification.

### Runtime Development Guidance

For ongoing development guidance and architectural context, refer to `CLAUDE.md` which provides detailed technical documentation of the current codebase structure, service architecture, and common patterns.

**Version**: 1.0.1 | **Ratified**: 2025-10-19 | **Last Amended**: 2025-10-19
