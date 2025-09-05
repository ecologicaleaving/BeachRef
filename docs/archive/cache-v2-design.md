# Cache Architecture V2: Simple and Functional

**Document Version:** 2.0  
**Created:** January 2025  
**Purpose:** Simplified cache architecture based on proven SWR foundation  

---

## Design Philosophy

**Simple**: Single responsibility per layer, clear boundaries, unified error handling  
**Functional**: Maintains proven SWR pattern while eliminating cache coherence issues  
**Based on what worked**: Preserves the successful 5-layer VIS architecture foundation  

---

## V2 Architecture Overview

### Single Unified Cache Layer
Replace the complex multi-tier cache system with a single, powerful cache layer:

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐
│  VisRepo    │───▶│  UnifiedCache    │───▶│  VIS API    │
│ (Orchestr.) │    │  (SWR + Memory)  │    │             │
└─────────────┘    └──────────────────┘    └─────────────┘
```

### Core Principles

1. **Single Cache Authority**: One cache layer handles all storage, TTL, and invalidation
2. **Unified Error Handling**: All cache errors flow through single error pathway
3. **Simplified State**: Cache state is either FRESH, STALE, or EMPTY - no complex coordination
4. **Clear Boundaries**: Repository orchestrates, Cache stores, API fetches - period

---

## V2 Components

### 1. UnifiedCache (Replaces SWRCacheStore + MemoryCacheManager)

**Responsibilities:**
- SWR pattern implementation (serve stale, fetch fresh)
- In-memory performance layer
- LocalStorage persistence
- TTL management
- Single error handling pathway

**Key Features:**
```typescript
class UnifiedCache {
  // Single method for all cache operations
  async getWithSWR<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T>
  
  // Simple invalidation
  invalidate(key: string | pattern): void
  
  // Unified error handling
  private handleError(error: unknown, context: string): CacheError
}
```

### 2. Simplified VisRepository 

**Responsibilities:**
- Business logic orchestration
- Request parameter validation
- Response transformation coordination
- Direct UnifiedCache interaction

**Eliminates:**
- Complex cache layer coordination
- Error propagation cascades
- Multiple cache state management

### 3. Streamlined Error Flow

```
API Error → UnifiedCache.handleError() → CacheError → Repository → UI
```

**Single Error Type:**
```typescript
class CacheError extends Error {
  code: string;
  context: Record<string, unknown>;
  recoverable: boolean;
}
```

---

## Implementation Strategy

### Phase 1: Create UnifiedCache
1. Combine SWR + Memory cache logic into single class
2. Implement unified error handling
3. Add comprehensive debugging

### Phase 2: Simplify Repository
1. Remove multi-cache coordination logic  
2. Direct UnifiedCache integration
3. Eliminate error cascade pathways

### Phase 3: Testing & Migration
1. A/B testing with existing cache
2. Gradual migration path
3. Performance validation

---

## Key Benefits

**Eliminates Current Issues:**
- ✅ No more cache coherence failures
- ✅ Single error pathway eliminates "undefined" errors
- ✅ Simplified debugging with single cache layer
- ✅ No cascade failures between cache layers

**Maintains Proven Patterns:**
- ✅ SWR strategy preserved
- ✅6-hour TTL for tournament data
- ✅ Background revalidation
- ✅ Offline functionality

**Improves Developer Experience:**
- ✅ Single cache API to learn
- ✅ Clear error messages with context
- ✅ Simplified debugging
- ✅ Easier testing

---

## Migration Path

### Backward Compatibility
- Keep existing cache interfaces during transition
- Feature flag for V2 cache usage
- Gradual rollout by data type

### Risk Mitigation  
- Preserve all existing cache data
- Rollback plan to V1 cache
- Performance monitoring during transition

---

## Success Metrics

**Error Reduction:**
- Target: Zero "undefined" errors
- Measure: Repository error rates
- Timeline: Within 1 week of deployment

**Performance Maintenance:**
- Target: Same or better cache hit ratios
- Measure: API call reduction
- Timeline: Within 2 weeks of deployment

**Developer Experience:**
- Target: 50% reduction in cache-related debugging time
- Measure: Developer feedback and issue reports
- Timeline: Within 1 month of deployment

---

## Next Steps

1. **Create UnifiedCache implementation** - Core cache logic consolidation
2. **Update VisRepository integration** - Eliminate multi-cache coordination  
3. **Implement error handling** - Single pathway for all cache errors
4. **Add comprehensive testing** - Unit and integration tests
5. **Performance validation** - Ensure no regression in cache performance