# Quickstart: VIS API Audit & Optimization

**Feature**: VIS API Audit & Optimization
**Branch**: `001-vis-api-optimization`
**Date**: 2025-01-19

## Overview

This guide helps developers quickly understand, implement, and test the VIS API audit and optimization feature. The feature audits API requests, optimizes cache behavior, and reduces payload sizes through intelligent field selection.

---

## Quick Reference

### Key Files

**New Services:**
- `services/monitoring/ApiAuditService.ts` - Captures and validates API requests
- `services/monitoring/AuditReportGenerator.ts` - Generates audit reports
- `services/monitoring/FieldSelectionValidator.ts` - Validates field over-fetching

**Enhanced Services:**
- `services/api/VisApiClient.ts` - Add audit capture, field validation
- `services/cache/CacheService.ts` - Add adaptive expiration
- `services/cache/MemoryCacheManager.ts` - Add hit/miss tracking
- `services/polling/PollingPerformanceMonitor.ts` - Add status-based adaptation

**New Types:**
- `types/audit.ts` - Audit entity types (ApiRequest, AuditFinding, AuditReport)

**Documentation:**
- `specs/001-vis-api-optimization/data-model.md` - Entity definitions
- `specs/001-vis-api-optimization/contracts/` - JSON schemas

---

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd /c/Users/KreshOS/Documents/00-Progetti/beachref

# Install new dependencies
npm install react-native-network-logger @sentry/react-native react-native-mmkv superstruct

# Verify installation
npm ls react-native-network-logger @sentry/react-native react-native-mmkv superstruct
```

### 2. Enable Development Monitoring

**Add to `app/_layout.tsx`:**

```typescript
import { startNetworkLogging } from 'react-native-network-logger';

if (__DEV__) {
  startNetworkLogging({
    maxRequests: 500,
    ignoredPatterns: [/^(?!.*vis-adapter)/], // Only VIS API calls
  });
}
```

### 3. Configure Sentry (Production)

**Add to `app/_layout.tsx` (before other imports):**

```typescript
import * as Sentry from '@sentry/react-native';

if (!__DEV__) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.ReactNativeTracing({
        tracingOrigins: ['localhost', /^\//],
      }),
    ],
  });
}
```

**Add to `.env`:**

```
EXPO_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### 4. Test API Monitoring

```bash
# Start development server
npm start

# Open app and navigate to tournaments
# Shake device or press CMD+D (iOS) / CMD+M (Android)
# Select "Network Logger" from debug menu
# Verify VIS API requests are being captured
```

---

## Development Workflow

### Phase 1: API Request Auditing (P1)

**Goal**: Capture and validate all VIS API requests against documentation

**Implementation Steps:**

1. **Create ApiAuditService**:
```typescript
// services/monitoring/ApiAuditService.ts
import { ApiRequest, AuditFinding } from '../../types/audit';
import { VisApiClient } from '../api/VisApiClient';

export class ApiAuditService {
  private requests: Map<string, ApiRequest> = new Map();

  captureRequest(request: ApiRequest): void {
    this.requests.set(request.id, request);
    this.validateRequest(request);
  }

  private validateRequest(request: ApiRequest): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // Validate XML format
    if (!request.requestXml.startsWith('<Requests>')) {
      findings.push(this.createFinding(
        request.id,
        'critical',
        'malformed',
        'Request XML must be wrapped in <Requests> root element',
        '<Requests><Request Type="...">...</Request></Requests>',
        request.requestXml
      ));
    }

    // Validate field count
    if (request.fieldCount > 20) {
      findings.push(this.createFinding(
        request.id,
        'warning',
        'over-fetching',
        `Request has ${request.fieldCount} fields (>20 for list views)`,
        'Use slim mode with <=10 fields for list views',
        `${request.fieldCount} fields requested`
      ));
    }

    return findings;
  }
}
```

2. **Integrate with VisApiClient**:
```typescript
// services/api/VisApiClient.ts (enhance existing)
import { ApiAuditService } from '../monitoring/ApiAuditService';

export class VisApiClient {
  private auditService?: ApiAuditService;

  constructor(config: VisApiClientConfig, auditService?: ApiAuditService) {
    // ...existing code
    this.auditService = auditService;
  }

  async request<T>(endpoint: VisApiEndpoint, params: any): Promise<T> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      const response = await fetch(/* ... */);
      const responseTime = Date.now() - startTime;

      // Capture for audit
      if (this.auditService && __DEV__) {
        this.auditService.captureRequest({
          id: requestId,
          timestamp: startTime,
          endpoint,
          requestXml: xmlPayload,
          responseStatus: response.status,
          responseTime,
          payloadSize: xmlPayload.length + responseBody.length,
          // ... other fields
        });
      }

      return response;
    } catch (error) {
      // ... error handling
    }
  }
}
```

3. **Test Audit Capture**:
```typescript
// __tests__/services/monitoring/ApiAuditService.test.ts
import { ApiAuditService } from '../../../services/monitoring/ApiAuditService';

describe('ApiAuditService', () => {
  it('should capture API requests', () => {
    const service = new ApiAuditService();
    const request: ApiRequest = {
      id: 'test-123',
      endpoint: 'GetBeachTournamentList',
      requestXml: '<Requests><Request Type="GetBeachTournamentList">...</Request></Requests>',
      fieldCount: 8,
      // ... other fields
    };

    service.captureRequest(request);
    const captured = service.getRequest('test-123');
    expect(captured).toEqual(request);
  });

  it('should detect malformed requests', () => {
    const service = new ApiAuditService();
    const request: ApiRequest = {
      id: 'test-456',
      requestXml: '<Request Type="..."></Request>', // Missing <Requests> wrapper
      // ... other fields
    };

    service.captureRequest(request);
    const findings = service.getFindings('test-456');
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe('malformed');
  });
});
```

### Phase 2: Cache Optimization (P2)

**Goal**: Implement adaptive caching with stale-while-revalidate

**Implementation Steps:**

1. **Migrate to MMKV**:
```typescript
// services/cache/MmkvStorage.ts (new file)
import { MMKV } from 'react-native-mmkv';

export class MmkvStorage {
  private storage: MMKV;

  constructor() {
    this.storage = new MMKV({
      id: 'beachref-cache',
      encryptionKey: process.env.EXPO_PUBLIC_MMKV_KEY,
    });
  }

  set(key: string, value: any): void {
    this.storage.set(key, JSON.stringify(value));
  }

  get(key: string): any | null {
    const value = this.storage.getString(key);
    return value ? JSON.parse(value) : null;
  }

  delete(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clearAll();
  }
}
```

2. **Enhance CacheService with Adaptive TTL**:
```typescript
// services/cache/CacheService.ts (enhance existing)
import { DataVolatility, CacheEntry } from '../../types/audit';

export class CacheService {
  private determineVolatility(entityType: string, status?: string): DataVolatility {
    if (status === 'Running') return 'live'; // 2-5s TTL
    if (entityType === 'match' && status === 'Scheduled') return 'dynamic'; // 15s TTL
    if (entityType === 'tournament') return 'semi-static'; // 60-120s TTL
    return 'static'; // 24h+ TTL
  }

  private getTTL(volatility: DataVolatility): number {
    const TTL_MAP = {
      live: 5000,
      dynamic: 15000,
      'semi-static': 120000,
      static: 86400000,
    };
    return TTL_MAP[volatility];
  }

  async set(key: string, value: any, entityType: string, status?: string): Promise<void> {
    const volatility = this.determineVolatility(entityType, status);
    const ttl = this.getTTL(volatility);

    const entry: CacheEntry = {
      key,
      value,
      level: 'mmkv',
      stalenessTimestamp: Date.now() + ttl,
      expirationTimestamp: Date.now() + ttl * 2,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      dataVolatility: volatility,
      entityType,
      entityStatus: status || null,
    };

    await this.mmkvStorage.set(key, entry);
  }
}
```

3. **Add Hit/Miss Tracking**:
```typescript
// services/cache/CachePerformanceMonitor.ts (enhance existing)
export class CachePerformanceMonitor {
  private hits: number = 0;
  private misses: number = 0;

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
  }
}
```

### Phase 3: Payload Optimization (P3)

**Goal**: Implement context-aware field selection

**Implementation Steps:**

1. **Define Field Modes**:
```typescript
// types/field-selection.ts (new file)
import { VisApiEndpoint } from './api-v2';

export const FIELD_MODES = {
  slim: {
    [VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST]: [
      'No', 'Name', 'City', 'StartDate', 'EndDate', 'Gender', 'Level', 'Status'
    ],
    [VisApiEndpoint.GET_BEACH_MATCH_LIST]: [
      'No', 'TeamA', 'TeamB', 'Status', 'Court', 'StartDateTime'
    ],
  },
  default: {
    [VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST]: [
      'No', 'Name', 'City', 'StartDate', 'EndDate', 'Location', 'Status', 'NoOfMatches', 'Gender', 'Level'
    ],
    [VisApiEndpoint.GET_BEACH_MATCH_LIST]: [
      'No', 'TeamA', 'TeamB', 'Status', 'Court', 'StartDateTime', 'ScoreA', 'ScoreB', 'Phase', 'Round'
    ],
  },
  full: {
    [VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST]: null, // All fields
    [VisApiEndpoint.GET_BEACH_MATCH_LIST]: null,
  },
};
```

2. **Create Field Selection Hook**:
```typescript
// hooks/useFieldMode.ts (new file)
import { useState, useEffect } from 'react';
import { NetworkMonitor } from '../services/NetworkMonitor';
import { FieldMode } from '../types/field-selection';

export function useFieldMode(): FieldMode {
  const [networkType, setNetworkType] = useState<'wifi' | 'cellular' | 'offline'>('wifi');

  useEffect(() => {
    const monitor = NetworkMonitor.getInstance();

    const updateNetworkType = async () => {
      const state = await monitor.getNetworkState();
      setNetworkType(state.type);
    };

    updateNetworkType();
    return monitor.addListener(updateNetworkType);
  }, []);

  // Adaptive mode selection
  if (networkType === 'offline') return 'slim';
  if (networkType === 'cellular') return 'slim';
  return 'default';
}
```

3. **Integrate with API Calls**:
```typescript
// Usage in component
import { useFieldMode } from '../hooks/useFieldMode';
import { FIELD_MODES } from '../types/field-selection';

function TournamentList() {
  const fieldMode = useFieldMode();

  const { data } = useQuery({
    queryKey: ['tournaments', { mode: fieldMode }],
    queryFn: () => fetchTournaments({
      fields: FIELD_MODES[fieldMode][VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST],
    }),
  });

  return <FlatList data={data} />;
}
```

---

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- ApiAuditService.test.ts
npm test -- CacheService.test.ts
npm test -- useFieldMode.test.ts

# Run with coverage
npm test -- --coverage
```

### Integration Tests

```bash
# Test full audit workflow
npm test -- vis-api-audit.test.ts

# Verify cache hit rates
npm test -- cache-performance.test.ts
```

### Manual Testing Checklist

**P1 - API Auditing:**
- [ ] Navigate to tournaments - verify requests captured in Network Logger
- [ ] Check console for any malformed request warnings
- [ ] Validate no BadRequestSyntax errors in Sentry

**P2 - Cache Optimization:**
- [ ] Navigate back to tournament list - verify instant load (cache hit)
- [ ] Open live match - verify 3-5s polling intervals
- [ ] Match finishes - verify polling stops
- [ ] Background app - verify polling pauses

**P3 - Payload Optimization:**
- [ ] On WiFi - verify default mode field count (~10 fields)
- [ ] On cellular - verify slim mode field count (~6-8 fields)
- [ ] Compare payload sizes in Network Logger

---

## Monitoring & Debugging

### Development Tools

**1. Network Logger (In-App)**
```typescript
// Access via dev menu
// Shake device → "Network Logger"
// Filter by VIS API calls only
// View request/response details
```

**2. Console Logging**
```typescript
// Enable verbose logging
if (__DEV__) {
  console.log('[API Audit]', auditFinding);
  console.log('[Cache]', cacheEntry);
  console.log('[Field Selection]', fieldStrategy);
}
```

**3. Sentry Performance Monitoring**
```typescript
// View in Sentry dashboard
// Performance → Transactions → API calls
// Check response times, error rates, throughput
```

### Production Monitoring

**Key Metrics to Track:**
- Cache hit rate (target: >70%)
- Average payload size (target: 40% reduction)
- API call volume (target: 50% reduction during peak)
- BadRequestSyntax error rate (target: 0%)
- Average response time (cached: <100ms, API: <2s)

**Sentry Alerts:**
- Critical: BadRequestSyntax errors > 0
- Warning: Cache hit rate < 50%
- Warning: Average payload size > baseline * 1.2
- Info: API call volume spike >200% of baseline

---

## Troubleshooting

### Issue: Network Logger Not Showing Requests

**Solution:**
```typescript
// Verify logger is started
import { startNetworkLogging } from 'react-native-network-logger';
startNetworkLogging(); // Must be called in _layout.tsx

// Check ignored patterns
startNetworkLogging({
  ignoredPatterns: [], // Remove filters temporarily
});
```

### Issue: Cache Not Persisting

**Solution:**
```typescript
// Verify MMKV initialization
const storage = new MMKV({ id: 'beachref-cache' });
console.log('MMKV Keys:', storage.getAllKeys());

// Check encryption key
const storage = new MMKV({
  id: 'beachref-cache',
  encryptionKey: process.env.EXPO_PUBLIC_MMKV_KEY, // Must be set
});
```

### Issue: Over-Fetching Not Detected

**Solution:**
```typescript
// Verify field validation
const validator = new FieldSelectionValidator();
const finding = validator.validate(apiRequest);
console.log('Over-fetching finding:', finding);

// Check field count threshold
if (apiRequest.fieldCount > 20) {
  // Should trigger over-fetching warning
}
```

---

## Performance Benchmarks

### Baseline (Before Optimization)

- Average payload size: 12KB
- Cache hit rate: 45%
- API calls per session: 120
- Average response time: 1.8s

### Target (After Optimization)

- Average payload size: <7KB (40%+ reduction) ✅ SC-002
- Cache hit rate: >70% ✅ SC-003
- API calls per session: <60 (50% reduction) ✅ SC-010
- Average response time: <2s (API), <100ms (cached) ✅ SC-006

---

## Next Steps

1. **Run `/speckit.tasks`** to generate implementation tasks
2. **Review `data-model.md`** for entity definitions
3. **Check `contracts/`** for JSON schemas
4. **Implement P1** (API Auditing) first
5. **Measure baseline metrics** before optimization
6. **Implement P2** (Cache) and **P3** (Field Selection)
7. **Validate success criteria** (SC-001 through SC-010)

---

## Resources

- **VIS API Docs**: https://www.fivb.org/VisSDK/VisWebService/
- **TanStack Query**: https://tanstack.com/query/latest
- **MMKV**: https://github.com/mrousavy/react-native-mmkv
- **Sentry React Native**: https://docs.sentry.io/platforms/react-native/
- **Spec**: `/specs/001-vis-api-optimization/spec.md`
- **Plan**: `/specs/001-vis-api-optimization/plan.md`
- **Research**: `/specs/001-vis-api-optimization/research.md`
