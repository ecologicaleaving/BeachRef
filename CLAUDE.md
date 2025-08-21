# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
**BeachRef** is a professional Expo React Native application for beach volleyball referees built with TypeScript and Expo Router. The app provides comprehensive tournament management, referee assignments, match monitoring, and real-time synchronization with the VIS (Volleyball Information System) API. Built on React 19 and React Native 0.79.5 with the new architecture enabled.

## Development Commands

### Core Development
- `npm start` or `npx expo start` - Start the development server
- `npm run android` - Start with Android emulator
- `npm run ios` - Start with iOS simulator  
- `npm run web` - Start web version

### Code Quality
- `npm run lint` - Run ESLint with Expo config

### Project Management
- `npm run reset-project` - Reset to blank project (moves current code to app-example/)

## Architecture Overview

### Core Domains
- **Tournament Management**: Tournament selection, details, and date extraction
- **Referee Assignments**: Assignment tracking, status management, and notifications
- **Match Monitoring**: Live match updates, court monitoring, and referee tools
- **Offline/Sync**: Robust caching, offline functionality, and data synchronization

### Navigation Architecture
The project uses Expo Router with a comprehensive screen-based navigation system:

**Main Screens** (`/app` directory):
- `/app/_layout.tsx` - Root layout with app initialization and cache warmup
- `/app/index.tsx` - Main dashboard screen
- `/app/tournament-selection.tsx` - Tournament browsing and selection
- `/app/tournament-detail.tsx` - Tournament details with match lists and tabs
- `/app/referee-dashboard.tsx` - Referee assignment overview
- `/app/ref-mode.tsx` - Referee mode tools (under construction)
- `/app/schedule-results.tsx` - Schedule and results view
- Multiple specialized screens for court monitoring, assignments, match details

**Navigation Components**:
- `BottomTabNavigation` - Primary app navigation
- `NavigationHeader` - Consistent header with back navigation
- Stack-based navigation with modal support

### Service Layer Architecture

**Cache Management Services**:
- `CacheService.ts` - Primary caching layer with 6-hour expiration
- `CacheWarmupService.ts` - Background cache warming and scheduling
- `MemoryCacheManager.ts` - In-memory caching for performance
- `CachePerformanceMonitor.ts` - Cache performance tracking

**Data & Storage Services**:
- `TournamentStorageService.ts` - Tournament data persistence
- `LocalStorageManager.ts` - Local storage abstraction with error handling
- `visApi.ts` - VIS API integration with request/response handling

**Real-time & Sync Services**:
- `RealtimeSubscriptionService.ts` - Real-time data subscriptions
- `TournamentStatusMonitor.ts` - Tournament status change monitoring
- `SyncManager.ts` - Online/offline data synchronization
- `NetworkMonitor.ts` - Network connectivity monitoring

**Business Logic Services**:
- `RefereeAssignmentsService.ts` - Assignment management
- `MatchResultsService.ts` - Match result handling
- `TournamentOperationsService.ts` - Tournament operations

**Resilience & Error Handling**:
- `ConnectionCircuitBreaker.ts` - Circuit breaker pattern for API calls
- `RealtimeFallbackService.ts` - Fallback strategies for real-time failures
- `ErrorLogger.ts` - Centralized error logging

### Component Architecture

**Design System Components** (`/components`):
- **Foundation**: `Container`, `Button`, `ContrastControls` - Core UI building blocks
- **Brand**: `BrandLogo`, `BrandHeader`, loading/error states - Brand consistency
- **Typography**: `Text`, `MatchCard`, `StatusIndicator` - Text system
- **Status**: `StatusBadge`, `StatusIcon`, `StatusBar` - Status communication
- **Icons**: Comprehensive icon system with accessibility support

**Domain Components**:
- **referee/**: Referee-specific cards and lists
- **MatchList/**: Complex match filtering and display with referee grouping
- **tournament/**: Tournament status and assignment indicators
- **Assignment/**: Assignment cards and status management
- **MatchResult/**: Score entry and result submission workflows

**Specialized Components**:
- **TouchTarget/**: Touch target optimization for mobile
- **Hierarchy/**: Information hierarchy and scan-optimized layouts
- **navigation/**: Navigation-specific components

### State Management Architecture

**Assignment Status Management**:
- `useAssignmentStatus` hook with `AssignmentStatusProvider`
- Tracks current assignments, status counts, online state, sync status
- Real-time updates through subscription services

**Cache State Management**:
- Multi-level state: Memory → LocalStorage → API
- Automatic cache invalidation and refresh strategies
- Performance monitoring and optimization

**Persistent State**:
- LocalStorage for user preferences (filters, selected dates)
- AsyncStorage for sensitive referee data
- Robust error handling for storage failures

### Data Architecture

**VIS API Integration**:
- RESTful API integration with the Volleyball Information System
- Tournament data fetching with gender variant merging via `GetEventList`
- Match data retrieval using `GetBeachMatchList` with EventNo from tournaments
- **IMPORTANT**: Use `tournament.visNo` directly as TournamentNo in `GetBeachMatchList` calls
- **API Call Flow**: `GetEventList` → Extract EventNo → Use EventNo in `GetBeachMatchList`
- Referee assignment synchronization

**Caching Strategy**:
- **Level 1**: Memory cache for immediate access
- **Level 2**: LocalStorage for persistence across sessions
- **Level 3**: API calls with intelligent refresh logic
- Cache warming on app initialization
- 6-hour expiration for tournament data

**Data Flow**:
1. VIS API → Cache Services → Local Storage
2. Cache Services → State Management → UI Components
3. UI Interactions → Business Logic Services → API Updates
4. Real-time Updates → Subscription Services → State Updates

### Error Handling & Resilience

**Error Boundaries**:
- `GracefulErrorBoundary` - App-level error recovery
- `RealtimeErrorBoundary` - Real-time feature error isolation

**Resilience Patterns**:
- Circuit breaker for API failures
- Exponential backoff for retries
- Graceful degradation for offline scenarios
- Fallback UI states for loading/error conditions

**Offline Functionality**:
- Full offline browsing of cached tournaments
- Offline assignment viewing
- Queue-based sync when connection returns
- Visual indicators for offline state

### Key Technical Patterns
- **Dependency Injection**: Service factory patterns for testability
- **Observer Pattern**: Real-time subscription management
- **Strategy Pattern**: Multiple cache and sync strategies
- **Circuit Breaker**: API failure resilience
- **Repository Pattern**: Data access abstraction
- **Facade Pattern**: Complex service orchestration

### Dependencies
- **Navigation**: Expo Router with React Navigation v7
- **UI**: Expo Vector Icons, Lucide React, Expo Blur effects
- **Data**: AsyncStorage, NetInfo for connectivity
- **Development**: TypeScript, ESLint with Expo config, Jest for testing
- **Performance**: React Native Reanimated, gesture handler
- **Expo SDK**: Version ~53.0.20 with new architecture enabled