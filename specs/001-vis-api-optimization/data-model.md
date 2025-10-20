# Data Model: VIS API Audit & Optimization

**Feature**: VIS API Audit & Optimization
**Date**: 2025-01-19
**Status**: Complete

## Overview

This document defines the data entities, relationships, and validation rules for the VIS API audit and optimization feature. All entities support the three priority user stories: API request auditing (P1), cache system optimization (P2), and request payload optimization (P3).

---

## Entity Definitions

### 1. API Request (Audit Capture)

Represents a captured VIS API call with full request/response details for audit analysis.

**Purpose**: Captures all VIS API requests for validation against documentation (FR-001, FR-002)

**Attributes**:
- `id`: string (unique identifier, UUID)
- `timestamp`: number (Unix milliseconds when request initiated)
- `endpoint`: VisApiEndpoint (enum: GetEventList, GetBeachTournamentList, GetBeachMatchList, etc.)
- `requestXml`: string (full XML payload sent to VIS API)
- `requestHeaders`: Record<string, string> (HTTP headers)
- `responseStatus`: number (HTTP status code: 200, 400, 500, etc.)
- `responseBody`: string (XML response body)
- `responseTime`: number (milliseconds from request to response)
- `payloadSize`: number (bytes of request + response combined)
- `fieldCount`: number (count of fields requested in Fields attribute)
- `cacheHit`: boolean (whether response was served from cache)
- `networkType`: 'wifi' | 'cellular' | 'offline' (connection type during request)
- `source`: 'user' | 'polling' | 'prefetch' | 'cache-refresh' (what triggered request)

**Validation Rules**:
- `id` MUST be unique UUID v4
- `timestamp` MUST be valid Unix milliseconds
- `endpoint` MUST be valid VisApiEndpoint enum value
- `requestXml` MUST be non-empty and well-formed XML
- `responseStatus` MUST be 100-599 HTTP status range
- `responseTime` MUST be >= 0
- `payloadSize` MUST be >= 0
- `fieldCount` MUST be >= 0

**Relationships**:
- Has one-to-many AuditFindings (validation issues discovered)
- References CacheEntry if cache hit occurred
- References PollingConfiguration if triggered by polling

---

### 2. Audit Finding

Represents an identified issue with API request format, field selection, or over-fetching.

**Purpose**: Documents malformed requests and optimization opportunities (FR-003, FR-004)

**Attributes**:
- `id`: string (UUID)
- `apiRequestId`: string (reference to API Request)
- `severity`: 'critical' | 'warning' | 'info' (issue severity level)
- `category`: 'malformed' | 'over-fetching' | 'incorrect-parameter' | 'missing-field' | 'excessive-batch' (issue type)
- `issue`: string (specific problem description)
- `expectedFormat`: string (correct format per VIS documentation)
- `actualFormat`: string (what was sent/received)
- `recommendation`: string (how to fix the issue)
- `impactAssessment`: { errorRate: number, payloadIncrease: number, affectedEndpoints: string[] } (quantified impact)
- `timestamp`: number (when finding was identified)
- `resolved`: boolean (whether issue has been fixed)

**Validation Rules**:
- `severity` MUST be 'critical' | 'warning' | 'info'
- `category` MUST match defined categories
- `issue` MUST be non-empty string
- `recommendation` MUST provide actionable guidance
- `impactAssessment.errorRate` MUST be 0-1 (percentage)
- `impactAssessment.payloadIncrease` MUST be >= 0 (bytes)

**Relationships**:
- Belongs to one API Request (many findings per request possible)
- May reference FieldSelectionStrategy for over-fetching issues

---

### 3. Cache Entry

Represents cached API response data with metadata for expiration and invalidation tracking.

**Purpose**: Multi-level cache storage with adaptive TTL (FR-008, FR-013)

**Attributes**:
- `key`: string (cache key, query-based)
- `value`: any (cached response data, JSON-serializable)
- `level`: 'memory' | 'mmkv' | 'async-storage' (storage tier)
- `stalenessTimestamp`: number (Unix ms when data becomes stale)
- `expirationTimestamp`: number (Unix ms when data expires and should be purged)
- `createdAt`: number (when cache entry was created)
- `lastAccessedAt`: number (most recent access time)
- `accessCount`: number (total number of times accessed)
- `dataVolatility`: 'live' | 'dynamic' | 'semi-static' | 'static' (how frequently data changes)
- `entityType`: 'tournament' | 'match' | 'referee' | 'ranking' (what type of data)
- `entityStatus`: string | null (status if applicable: 'Running', 'Scheduled', 'Finished')

**Validation Rules**:
- `key` MUST be non-empty unique string
- `level` MUST be 'memory' | 'mmkv' | 'async-storage'
- `stalenessTimestamp` MUST be >= createdAt
- `expirationTimestamp` MUST be >= stalenessTimestamp
- `accessCount` MUST be >= 0
- `dataVolatility` determines TTL: live (2-5s), dynamic (15s), semi-static (60-120s), static (24h+)

**Relationships**:
- Referenced by API Request when cache hit occurs
- May have related CacheEntries (e.g., tournament list → tournament details)

**State Transitions**:
```
FRESH (now < stalenessTimestamp)
  → STALE (stalenessTimestamp <= now < expirationTimestamp)
    → EXPIRED (now >= expirationTimestamp)
      → PURGED (removed from storage)
```

---

### 4. Field Selection Strategy

Defines which fields to request based on context (list/detail, network type, use case).

**Purpose**: Context-aware payload optimization (FR-016, FR-017, FR-018, FR-019)

**Attributes**:
- `mode`: 'slim' | 'default' | 'full' (field selection mode)
- `endpoint`: VisApiEndpoint (which API endpoint this applies to)
- `useCase`: 'list' | 'detail' | 'polling' | 'prefetch' (what triggered the request)
- `fields`: string[] | null (specific fields to request; null = all fields)
- `networkType`: 'wifi' | 'cellular' | 'offline' | 'any' (when this strategy applies)
- `estimatedPayloadSize`: number (expected response size in bytes)
- `fieldCount`: number (count of fields requested)

**Validation Rules**:
- `mode` MUST be 'slim' | 'default' | 'full'
- `useCase` MUST be 'list' | 'detail' | 'polling' | 'prefetch'
- `fields` array length MUST match `fieldCount`
- Slim mode: fieldCount <= 10 for lists, <= 5 for polling
- Default mode: fieldCount <= 20 for lists, <= 15 for details
- Full mode: fieldCount unrestricted (null = all fields)
- `estimatedPayloadSize` MUST be > 0

**Relationships**:
- Referenced by API Request to track which strategy was used
- Referenced by Audit Finding for over-fetching validation

**Preset Strategies**:

```typescript
// Slim mode (mobile data, list views)
{
  mode: 'slim',
  endpoint: 'GetBeachTournamentList',
  useCase: 'list',
  fields: ['No', 'Name', 'City', 'StartDate', 'EndDate', 'Gender', 'Level', 'Status'],
  fieldCount: 8,
  estimatedPayloadSize: 2000,
  networkType: 'cellular'
}

// Default mode (WiFi, detail views)
{
  mode: 'default',
  endpoint: 'GetBeachMatchList',
  useCase: 'detail',
  fields: ['No', 'NoRound', 'Court', 'StartDateTime', 'Status', 'TeamA', 'TeamB', 'ScoreA', 'ScoreB', 'Phase'],
  fieldCount: 10,
  estimatedPayloadSize: 5000,
  networkType: 'wifi'
}

// Full mode (offline sync, complete data)
{
  mode: 'full',
  endpoint: 'GetBeachMatch',
  useCase: 'prefetch',
  fields: null, // All fields
  fieldCount: 35,
  estimatedPayloadSize: 15000,
  networkType: 'any'
}
```

---

### 5. Polling Configuration

Defines adaptive polling behavior based on entity status and app state.

**Purpose**: Status-based adaptive polling (FR-009, FR-010, FR-011)

**Attributes**:
- `entityType`: 'match' | 'tournament' | 'assignment' (what is being polled)
- `entityId`: string (specific entity identifier)
- `entityStatus`: string (current status: 'Running', 'Scheduled', 'Finished', etc.)
- `intervalMs`: number | null (polling interval in milliseconds; null = disabled)
- `enabled`: boolean (whether polling is currently active)
- `backgroundInterval`: number | null (interval when app backgrounded; null = pause)
- `lastPollTimestamp`: number (Unix ms of most recent poll)
- `nextPollTimestamp`: number (Unix ms when next poll scheduled)
- `pollCount`: number (total polls executed)
- `appState`: 'active' | 'background' | 'inactive' (current app state)

**Validation Rules**:
- `intervalMs` MUST be >= 1000 (minimum 1 second) or null
- `backgroundInterval` MUST be >= `intervalMs` * 2 or null (slower in background)
- `lastPollTimestamp` MUST be <= now
- `nextPollTimestamp` MUST be >= lastPollTimestamp + intervalMs
- `pollCount` MUST be >= 0
- Running status: intervalMs = 3000-5000ms
- Scheduled status: intervalMs = 30000-60000ms
- Finished status: intervalMs = null (disabled)

**Relationships**:
- References CacheEntry for polled data
- References API Request for poll results
- May trigger FieldSelectionStrategy (slim mode for polling)

**Status-Based Interval Logic**:

```typescript
function determineInterval(entityType: string, status: string): number | null {
  if (status === 'Running') return 5000; // 5s for live matches
  if (status === 'Scheduled') {
    const timeUntilStart = getTimeUntilStart();
    if (timeUntilStart < 5 * 60 * 1000) return 15000; // 15s if starting soon
    return 60000; // 1 minute if not imminent
  }
  if (status === 'Finished') return null; // Disable polling
  return 60000; // Default 1 minute
}
```

**State Transitions**:
```
ENABLED (polling active)
  → PAUSED (app backgrounded, polling suspended)
    → RESUMED (app foregrounded, polling reactivated)
  → DISABLED (entity status = Finished, polling stopped)
```

---

### 6. Audit Report

Aggregated summary of audit findings for developer review.

**Purpose**: Consolidated audit output (FR-004, SC-001, SC-002, SC-007)

**Attributes**:
- `id`: string (UUID)
- `generatedAt`: number (Unix ms when report generated)
- `periodStart`: number (audit period start time)
- `periodEnd`: number (audit period end time)
- `totalRequests`: number (API requests captured)
- `malformedRequests`: number (requests with format errors)
- `overFetchingInstances`: number (requests with excessive fields)
- `averagePayloadSize`: number (bytes)
- `averageResponseTime`: number (milliseconds)
- `cacheHitRate`: number (percentage 0-1)
- `findings`: AuditFinding[] (all issues discovered)
- `recommendations`: string[] (prioritized fix suggestions)
- `complianceScore`: number (0-100, based on findings severity)

**Validation Rules**:
- `periodEnd` MUST be >= periodStart
- `malformedRequests` MUST be <= totalRequests
- `overFetchingInstances` MUST be <= totalRequests
- `cacheHitRate` MUST be 0-1
- `complianceScore` MUST be 0-100

**Calculated Fields**:
- `complianceScore` = 100 - (criticalFindings * 10 + warningFindings * 3 + infoFindings * 1)
- `cacheHitRate` = cachedRequests / totalRequests

**Relationships**:
- Contains multiple AuditFindings
- References multiple API Requests analyzed

---

## Entity Relationships Diagram

```
┌─────────────────┐
│  API Request    │──────┬──────────────────────────────────┐
│  (Audit)        │      │                                  │
└─────────────────┘      │                                  │
        │                │                                  │
        │ 1:N            │                                  │
        ▼                ▼                                  ▼
┌─────────────────┐  ┌──────────────────┐      ┌──────────────────────┐
│ Audit Finding   │  │  Cache Entry     │      │ Field Selection      │
│                 │  │                  │      │ Strategy             │
└─────────────────┘  └──────────────────┘      └──────────────────────┘
        │                    │                          │
        └────────────────────┴──────────────────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │ Polling Config   │
                   │                  │
                   └──────────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │  Audit Report    │
                   │  (Aggregated)    │
                   └──────────────────┘
```

---

## Data Lifecycle

### API Request Lifecycle

1. **Capture**: API request initiated → API Request entity created
2. **Execution**: Request sent to VIS API → responseStatus/responseTime/payloadSize recorded
3. **Validation**: Response validated against schema → AuditFindings created if issues detected
4. **Caching**: Response stored → CacheEntry created/updated
5. **Reporting**: Periodic aggregation → AuditReport generated

### Cache Entry Lifecycle

1. **Creation**: API response received → CacheEntry created in memory
2. **Persistence**: Entry persisted to MMKV if valuable
3. **Staleness**: Time passes → entry becomes STALE (still usable)
4. **Expiration**: More time passes → entry EXPIRED (should refetch)
5. **Purge**: Garbage collection → entry removed from storage

### Polling Configuration Lifecycle

1. **Initialization**: User opens match/tournament → PollingConfiguration created
2. **Active Polling**: Timer triggers → API Requests created at intervalMs
3. **Status Change**: Match finishes → intervalMs set to null, enabled = false
4. **Background**: App backgrounded → backgroundInterval applied (slower or paused)
5. **Cleanup**: User navigates away → polling disabled, config removed

---

## Storage Strategy

### Memory Cache (Level 1)
- **Entities**: CacheEntry (level: 'memory')
- **Retention**: Session lifetime only
- **Size Limit**: 50MB maximum
- **Eviction**: LRU (Least Recently Used)

### MMKV Persistent Storage (Level 2)
- **Entities**: CacheEntry (level: 'mmkv')
- **Retention**: Based on expirationTimestamp
- **Size Limit**: 100MB maximum
- **Eviction**: Expired entries purged daily

### Audit Database (Development/Staging Only)
- **Entities**: API Request, Audit Finding, Audit Report
- **Retention**: 7 days rolling window
- **Storage**: MMKV with separate audit namespace
- **Production**: Disabled (use Sentry instead)

---

## Type Definitions (TypeScript)

```typescript
// Enums
export enum VisApiEndpoint {
  GET_EVENT_LIST = 'GetEventList',
  GET_BEACH_TOURNAMENT_LIST = 'GetBeachTournamentList',
  GET_BEACH_TOURNAMENT = 'GetBeachTournament',
  GET_BEACH_MATCH_LIST = 'GetBeachMatchList',
  GET_BEACH_MATCH = 'GetBeachMatch',
  GET_BEACH_ROUND_LIST = 'GetBeachRoundList',
  GET_EVENT_REFEREE_LIST = 'GetEventRefereeList',
}

export type NetworkType = 'wifi' | 'cellular' | 'offline';
export type RequestSource = 'user' | 'polling' | 'prefetch' | 'cache-refresh';
export type Severity = 'critical' | 'warning' | 'info';
export type FindingCategory = 'malformed' | 'over-fetching' | 'incorrect-parameter' | 'missing-field' | 'excessive-batch';
export type CacheLevel = 'memory' | 'mmkv' | 'async-storage';
export type DataVolatility = 'live' | 'dynamic' | 'semi-static' | 'static';
export type EntityType = 'tournament' | 'match' | 'referee' | 'ranking';
export type FieldMode = 'slim' | 'default' | 'full';
export type UseCase = 'list' | 'detail' | 'polling' | 'prefetch';
export type AppState = 'active' | 'background' | 'inactive';

// Entities
export interface ApiRequest {
  id: string;
  timestamp: number;
  endpoint: VisApiEndpoint;
  requestXml: string;
  requestHeaders: Record<string, string>;
  responseStatus: number;
  responseBody: string;
  responseTime: number;
  payloadSize: number;
  fieldCount: number;
  cacheHit: boolean;
  networkType: NetworkType;
  source: RequestSource;
}

export interface AuditFinding {
  id: string;
  apiRequestId: string;
  severity: Severity;
  category: FindingCategory;
  issue: string;
  expectedFormat: string;
  actualFormat: string;
  recommendation: string;
  impactAssessment: {
    errorRate: number;
    payloadIncrease: number;
    affectedEndpoints: string[];
  };
  timestamp: number;
  resolved: boolean;
}

export interface CacheEntry {
  key: string;
  value: any;
  level: CacheLevel;
  stalenessTimestamp: number;
  expirationTimestamp: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  dataVolatility: DataVolatility;
  entityType: EntityType;
  entityStatus: string | null;
}

export interface FieldSelectionStrategy {
  mode: FieldMode;
  endpoint: VisApiEndpoint;
  useCase: UseCase;
  fields: string[] | null;
  networkType: NetworkType | 'any';
  estimatedPayloadSize: number;
  fieldCount: number;
}

export interface PollingConfiguration {
  entityType: EntityType;
  entityId: string;
  entityStatus: string;
  intervalMs: number | null;
  enabled: boolean;
  backgroundInterval: number | null;
  lastPollTimestamp: number;
  nextPollTimestamp: number;
  pollCount: number;
  appState: AppState;
}

export interface AuditReport {
  id: string;
  generatedAt: number;
  periodStart: number;
  periodEnd: number;
  totalRequests: number;
  malformedRequests: number;
  overFetchingInstances: number;
  averagePayloadSize: number;
  averageResponseTime: number;
  cacheHitRate: number;
  findings: AuditFinding[];
  recommendations: string[];
  complianceScore: number;
}
```

---

## Validation & Constraints

### Cross-Entity Validation

1. **Cache Hit Validation**: If `ApiRequest.cacheHit = true`, referenced `CacheEntry` MUST exist
2. **Finding-Request Consistency**: `AuditFinding.apiRequestId` MUST reference valid `ApiRequest.id`
3. **Polling-Entity Consistency**: `PollingConfiguration.entityId` MUST reference existing tournament/match/assignment
4. **Field Count Consistency**: `FieldSelectionStrategy.fieldCount` MUST match `fields.length` (unless fields = null)

### Data Integrity Rules

1. **No Orphaned Findings**: All `AuditFinding` MUST have valid `apiRequestId`
2. **Cache Expiration**: `CacheEntry.expirationTimestamp` MUST be in future or entry should be purged
3. **Polling Status Sync**: `PollingConfiguration.entityStatus` MUST match current entity status
4. **Report Period**: `AuditReport.periodEnd` MUST be >= `periodStart`

---

## Performance Considerations

### Indexing Strategy

- **API Request**: Index on `timestamp`, `endpoint`, `cacheHit`
- **Cache Entry**: Index on `key`, `level`, `expirationTimestamp`
- **Audit Finding**: Index on `apiRequestId`, `severity`, `category`
- **Polling Config**: Index on `entityId`, `enabled`, `nextPollTimestamp`

### Memory Optimization

- **Lazy Loading**: Load full `ApiRequest` details only when needed for audit
- **Field Pruning**: Store only essential fields in memory cache
- **Batch Operations**: Aggregate multiple findings per API request
- **TTL-Based Cleanup**: Purge expired cache entries and old audit data

---

## Migration from Existing Types

### Existing Types to Enhance

1. **`types/api-v2.ts`**: Add audit-related fields to existing `VisApiResponse`
2. **`services/cache/CacheService.ts`**: Extend with `CacheEntry` tracking
3. **`services/PollingPerformanceMonitor.ts`**: Integrate `PollingConfiguration` entity

### New Type Files

1. **`types/audit.ts`**: All audit-related entities (ApiRequest, AuditFinding, AuditReport)
2. **`types/cache-v2.ts`**: Enhanced cache entities with multi-level support
3. **`types/field-selection.ts`**: Field selection strategy types

---

This data model provides the foundation for implementing all three priority user stories while maintaining type safety, data integrity, and performance optimization for the mobile-first architecture.
