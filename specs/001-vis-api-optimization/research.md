# Research: VIS API Audit & Optimization

**Feature**: VIS API Audit & Optimization
**Date**: 2025-01-19
**Status**: Complete

## Overview

This document consolidates research findings for implementing API request auditing and optimization in the BeachRef mobile application. The research focuses on mobile-first, offline-capable patterns for integrating with the VIS (Volleyball Information System) XML-based REST API.

---

## 1. API Request Capture & Monitoring

### Decision

**Multi-Layered Monitoring Strategy:**
- **Development**: react-native-network-logger for in-app debugging
- **Production**: Sentry for performance monitoring and error tracking
- **Platform**: NetInfo for network state detection

### Rationale

1. **react-native-network-logger** (v1.17.0):
   - Zero native code - works with Expo managed workflow
   - In-app UI for debugging on physical devices without USB connection
   - Cross-platform support (iOS, Android, Web)
   - Configurable filtering and request limits
   - Can be toggled on/off for production builds

2. **Sentry for Production Monitoring**:
   - React Native-specific performance tracing
   - Automatic API call tracking with duration/status
   - Error aggregation and alerting
   - Session replay for mobile workflows
   - Better fit than Firebase/Datadog for React Native ecosystem

3. **NetInfo for Network Adaptation**:
   - Real-time connectivity detection
   - Connection type awareness (WiFi, cellular, offline)
   - Already integrated in BeachRef (`NetworkMonitor.ts`)
   - Enables adaptive behavior (slim mode on cellular)

### Alternatives Considered

- ❌ **Flipper**: Powerful but requires native setup incompatible with Expo
- ❌ **React Native Debugger**: Deprecated with new React Native architecture
- ❌ **Reactotron**: Better for Redux, less focused on network monitoring
- ❌ **Datadog**: Feature-rich but expensive and potentially overkill

### Implementation Notes

```typescript
// Development monitoring
import { startNetworkLogging } from 'react-native-network-logger';

if (__DEV__) {
  startNetworkLogging({
    maxRequests: 500,
    ignoredPatterns: [/^(?!.*vis-adapter)/], // Only VIS API calls
  });
}

// Production monitoring
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  integrations: [new Sentry.ReactNativeTracing()],
});
```

---

## 2. Request Validation Against Documentation

### Decision

**Runtime Schema Validation:**
- **XML Parsing**: fast-xml-parser (React Native compatible)
- **Schema Validation**: superstruct for runtime type checking
- **Over-Fetching Detection**: Proxy-based field access tracking

### Rationale

1. **fast-xml-parser**:
   - Most recommended solution for React Native (2024)
   - No Node.js standard library dependencies
   - High performance with configurable parsing options
   - Already used in BeachRef codebase

2. **superstruct**:
   - Lightweight runtime validation (<5KB)
   - Clear, actionable error messages
   - TypeScript-first API
   - Better for API validation than form libraries (Yup/Formik)

3. **Proxy-Based Field Tracking**:
   - Automatically detect which fields are accessed in UI
   - Compare against fetched fields to identify over-fetching
   - Zero overhead in production (development-only)

### Alternatives Considered

- ❌ **Yup**: Designed for form validation, not API responses
- ❌ **JSON Schema (Ajv)**: Requires XML → JSON conversion overhead
- ❌ **react-native-xml2js**: Less performant than fast-xml-parser

### Implementation Notes

```typescript
// Schema definition
import { object, string, number, array } from 'superstruct';

const TournamentSchema = object({
  No: number(),
  Name: string(),
  StartDate: string(),
  EndDate: string(),
  Status: string(),
});

// Validation
import { assert } from 'superstruct';
import { XMLParser } from 'fast-xml-parser';

async function validateVisResponse(xml: string, schema: any) {
  const parser = new XMLParser();
  const data = parser.parse(xml);

  try {
    assert(data, schema);
    return { valid: true, data };
  } catch (error) {
    Sentry.captureException(error);
    return { valid: false, error };
  }
}
```

---

## 3. Cache Optimization Patterns

### Decision

**TanStack Query v5 with Multi-Level Persistence:**
- **Primary Cache**: TanStack Query (memory + intelligent invalidation)
- **Persistence**: @tanstack/react-query-persist-client with MMKV
- **Pattern**: Stale-while-revalidate with adaptive TTL
- **Polling**: Status-based adaptive intervals

### Rationale

1. **TanStack Query** (industry standard 2024):
   - Automatic request deduplication
   - Built-in stale-while-revalidate
   - Background refetching with network awareness
   - Garbage collection with configurable retention (`gcTime`)

2. **MMKV over AsyncStorage**:
   - 30x faster overall performance
   - Memory-mapped storage for instant access
   - Built-in encryption support
   - Compatible with TanStack Query persisters

3. **Adaptive TTL Strategy**:
   - Live data (match scores): 2-5s staleTime
   - Dynamic data (match lists): 15s staleTime
   - Semi-static (tournaments): 60-120s staleTime
   - Static (archived data): 24h+ staleTime

4. **Status-Based Polling**:
   - Running matches: 3-5s intervals
   - Scheduled matches: 30-60s intervals
   - Finished matches: polling disabled
   - Background state: polling suspended

### Alternatives Considered

- ❌ **Redux + Redux Persist**: More boilerplate, manual invalidation
- ❌ **React Context + AsyncStorage**: No deduplication or refetching
- ❌ **SWR**: Similar but less feature-complete for mobile
- ❌ **Apollo Client**: Overkill for REST API (designed for GraphQL)

### Implementation Notes

```typescript
import { QueryClient } from '@tanstack/react-query';
import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV({ id: 'beachref-cache' });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute default
      gcTime: 6 * 60 * 60 * 1000, // 6 hours
      networkMode: 'offlineFirst',
      refetchOnReconnect: true,
    },
  },
});

// Adaptive polling
const { data } = useQuery({
  queryKey: ['match', matchId],
  queryFn: () => fetchMatch(matchId),
  refetchInterval: (data) => {
    if (!data) return false;
    return data.status === 'Running' ? 5000 : data.status === 'Scheduled' ? 60000 : false;
  },
});
```

---

## 4. Field Selection Strategies

### Decision

**Context-Aware Field Modes:**
- **Slim Mode**: List views, thumbnails, cellular networks (6-8 fields)
- **Default Mode**: Standard detail views (10-15 fields)
- **Full Mode**: Offline sync, complete data (all fields)
- **Network-Adaptive**: Automatic mode switching based on connection type

### Rationale

1. **Payload Reduction**:
   - Slim mode: 60-80% smaller payloads vs. full
   - Default mode: 40-50% reduction
   - Critical for mobile bandwidth conservation

2. **Battery & Performance**:
   - Less data = less parsing, less memory, less CPU
   - Faster JSON deserialization
   - Reduced garbage collection pressure

3. **Progressive Enhancement**:
   - Load minimal data first (instant UX)
   - Fetch additional fields on-demand (progressive)
   - Batch related requests when needed

### Alternatives Considered

- ❌ **GraphQL**: Would require VIS API rewrite (REST/XML only)
- ❌ **Client-Side Filtering**: Wastes bandwidth fetching unused fields
- ❌ **Fixed Field Sets**: Not adaptable to network conditions

### Implementation Notes

```typescript
const FIELD_MODES = {
  slim: {
    tournament: ['No', 'Name', 'StartDate', 'EndDate', 'Status'],
    match: ['No', 'TeamA', 'TeamB', 'Status', 'Court', 'Time'],
  },
  default: {
    tournament: ['No', 'Name', 'StartDate', 'EndDate', 'Location', 'Status', 'NoOfMatches'],
    match: ['No', 'TeamA', 'TeamB', 'Status', 'Court', 'Time', 'ScoreA', 'ScoreB', 'Phase'],
  },
  full: {
    tournament: null, // All fields
    match: null,
  },
};

// Adaptive field selection
function useFieldMode(): 'slim' | 'default' | 'full' {
  const { isConnected, type } = useNetworkState();

  if (!isConnected) return 'slim';
  if (type === 'cellular') return 'slim';
  return 'default';
}
```

---

## 5. Request Deduplication

### Decision

**TanStack Query Built-In Deduplication + Manual Abort Controllers:**
- **Primary**: Automatic deduplication by query key
- **Secondary**: AbortController for request cancellation
- **Tertiary**: Debouncing for user input (search)

### Rationale

1. **TanStack Query Automatic**:
   - Multiple components using same query key = single request
   - All consumers share the same promise
   - Zero additional code required

2. **AbortController for Cancellation**:
   - Cancel outdated search/filter requests
   - Prevent parsing stale responses
   - Reduce wasted CPU/network

3. **Debouncing is Complementary**:
   - Debounce prevents rapid-fire calls (user typing)
   - Does NOT prevent duplicate requests (different concern)
   - Use for input fields, not API deduplication

### Alternatives Considered

- ❌ **fetch-dedupe library**: Redundant with TanStack Query
- ❌ **Manual promise tracking**: Complex, error-prone
- ❌ **Redux-Saga takeLatest**: Requires Redux

### Implementation Notes

```typescript
// Automatic deduplication (no code needed)
// Multiple components with same query key share 1 request
const { data } = useQuery({ queryKey: ['tournaments'] });

// Manual cancellation for search
function useSearch() {
  return useQuery({
    queryKey: ['search', searchTerm],
    queryFn: async ({ signal }) => {
      const response = await fetch(url, { signal });
      return response.json();
    },
  });
}
```

---

## 6. Offline-First Optimization

### Decision

**Multi-Level Cache with MMKV + Event-Driven Invalidation:**
- **Storage**: Migrate from AsyncStorage to MMKV (30x faster)
- **Architecture**: Memory → MMKV → API (3 levels)
- **Sync**: Optimistic updates with background queue
- **Invalidation**: Event-driven via WebSocket/polling

### Rationale

1. **MMKV Performance**:
   - 30x faster than AsyncStorage overall
   - 500%+ faster reads, 100%+ faster writes
   - Memory-mapped for instant access
   - Built-in encryption

2. **Progressive Enhancement**:
   - App fully functional offline with cached data
   - Graceful degradation when network unavailable
   - Background sync when connection restored
   - Visual indicators for offline/syncing state

3. **Event-Driven Invalidation**:
   - Real-time updates trigger specific cache invalidation
   - Status changes (match started/finished) invalidate related queries
   - Granular invalidation (not full cache flush)

### Alternatives Considered

- ❌ **AsyncStorage**: Current implementation, 30x slower
- ❌ **WatermelonDB**: Good for complex relational data, overkill for caching
- ❌ **Realm**: Heavy-weight, requires native modules
- ❌ **SQLite**: More setup, slower for key-value storage

### Implementation Notes

```typescript
import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV({
  id: 'beachref-cache',
  encryptionKey: process.env.MMKV_KEY,
});

// Multi-level cache
class CacheManager {
  async get(key: string) {
    // Level 1: Memory
    if (this.memory.has(key)) return this.memory.get(key);

    // Level 2: MMKV
    const cached = mmkv.getString(key);
    if (cached && !this.isExpired(cached)) {
      this.memory.set(key, cached); // Promote to memory
      return cached;
    }

    // Level 3: API
    const fresh = await this.api.fetch(key);
    this.set(key, fresh);
    return fresh;
  }
}

// Optimistic updates
const mutation = useMutation({
  mutationFn: updateScore,
  onMutate: async (newScore) => {
    // Cancel refetches
    await queryClient.cancelQueries({ queryKey: ['match', id] });

    // Snapshot previous
    const previous = queryClient.getQueryData(['match', id]);

    // Optimistic update
    queryClient.setQueryData(['match', id], old => ({
      ...old,
      score: newScore,
    }));

    return { previous };
  },
  onError: (err, vars, context) => {
    // Rollback on error
    queryClient.setQueryData(['match', id], context.previous);
  },
});
```

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 weeks)
1. ✅ Add react-native-network-logger for development
2. ✅ Implement context-aware field selection (slim/default/full)
3. ✅ Configure TanStack Query defaults (staleTime, gcTime)
4. ✅ Set up Sentry for production monitoring

### Phase 2: Performance (2-3 weeks)
1. Migrate AsyncStorage → MMKV
2. Implement adaptive TTL based on data volatility
3. Add status-based polling intervals
4. Optimize field projection in edge functions

### Phase 3: Advanced (3-4 weeks)
1. Implement offline sync queue
2. Add event-driven cache invalidation
3. Build runtime schema validation
4. Create API audit dashboard

### Phase 4: Monitoring (Ongoing)
1. Analyze Sentry metrics
2. Fix over-fetching patterns
3. Optimize cache hit rates
4. Tune TTL values

---

## Key Metrics

**Cache Performance:**
- Cache hit rate: Target >70% (success criteria)
- Average response time: <100ms (cached), <2s (API)
- Storage usage: <2MB

**Network Efficiency:**
- Payload reduction: Target 40%+ (success criteria)
- API call reduction: Target 50%+ during peak (success criteria)
- Duplicate requests prevented: >90%

**Offline Capability:**
- Offline access success: >95%
- Sync queue success: >98%
- Time to sync: <10s after reconnect

**User Experience:**
- Time to first render: <500ms (constitution requirement)
- Data freshness: Stale data <10% of serves
- Error rate: <1% failed requests

---

## Technology Decisions Summary

| Technology | Purpose | Justification |
|------------|---------|---------------|
| **react-native-network-logger** | Dev monitoring | Zero native code, in-app debugging |
| **Sentry** | Production monitoring | React Native optimized, performance tracing |
| **fast-xml-parser** | XML parsing | React Native compatible, high performance |
| **superstruct** | Schema validation | Lightweight, clear errors, TypeScript-first |
| **TanStack Query v5** | Cache & state | Industry standard, automatic deduplication |
| **MMKV** | Persistent storage | 30x faster than AsyncStorage |
| **NetInfo** | Network detection | Already integrated, mobile-optimized |
| **AbortController** | Request cancellation | Standard Web API, broad support |

---

## References

- VIS API Documentation: https://www.fivb.org/VisSDK/VisWebService/
- TanStack Query Docs: https://tanstack.com/query/latest
- MMKV Performance: https://github.com/mrousavy/react-native-mmkv
- Sentry React Native: https://docs.sentry.io/platforms/react-native/
- BeachRef Constitution: `/.specify/memory/constitution.md`
- VIS Implementation Guide: `/docs/Guidelines/VISImplementationGuide.md`
- VIS Cache Guidelines: `/docs/Guidelines/VISCacheGuidelines.md`
