# **Serverless Migration Architecture Brief**

## **Executive Summary**
Migrate from hybrid Express.js + Vercel serverless to **pure Vercel serverless** architecture to resolve deployment conflicts and improve scalability.

---

## **Current State Analysis**

### **Existing Backend Services to Migrate:**
- **VIS Service**: External API integration with caching, circuit breaker, retry logic
- **Tournament Service**: Tournament data processing and filtering  
- **Health Service**: System health monitoring
- **Referee Service**: Referee search and filtering
- **Middleware**: Rate limiting, error handling, CORS, request logging

### **Key Infrastructure Components:**
- **Caching**: NodeCache for API response caching
- **Logging**: Winston-based structured logging
- **Error Handling**: Circuit breaker pattern, retry mechanisms
- **Rate Limiting**: Express-rate-limit middleware
- **CORS**: Cross-origin resource sharing

---

## **Target Architecture**

### **Serverless Function Structure:**
```
/api/
├── health/
│   └── index.ts           # Health checks
├── tournaments/
│   ├── index.ts           # List tournaments
│   └── [id].ts           # Tournament details
├── referees/
│   └── search.ts         # Referee search
└── vis/
    ├── test.ts           # VIS API testing
    └── tournaments.ts    # VIS tournament proxy
```

### **Shared Utilities (Keep):**
- `/lib/vis-service.ts` - VIS API client
- `/lib/cache-utils.ts` - Serverless-compatible caching
- `/lib/error-utils.ts` - Error handling utilities
- `/lib/logger.ts` - Vercel-compatible logging

---

## **Migration Requirements**

### **Critical Changes Needed:**

1. **Remove Express Dependencies:**
   - Delete `/backend/` directory entirely
   - Remove Express, CORS middleware
   - Eliminate server startup/shutdown logic

2. **Adapt Caching Strategy:**
   - Replace NodeCache with Vercel Edge Cache or Redis
   - Implement cache headers for CDN caching
   - Use Vercel KV for session-based caching

3. **Rework Rate Limiting:**
   - Move from express-rate-limit to Vercel Edge Functions
   - Implement IP-based limiting using Vercel middleware
   - Use environment variables for rate limits

4. **Logging Adaptation:**
   - Replace Winston with Vercel-compatible logging
   - Use `console.log` with structured format
   - Integrate with Vercel Analytics/Monitoring

5. **Error Handling:**
   - Convert Express error middleware to utility functions
   - Implement per-function error boundaries
   - Maintain circuit breaker pattern for VIS API

### **Function-Specific Migrations:**

**Health API** (`/api/health/index.ts`):
- ✅ Already migrated
- Maintain uptime, environment checks

**Tournament API** (`/api/tournaments/`):
- Migrate `TournamentService` logic
- Preserve pagination, filtering
- Maintain VIS API integration

**Referee API** (`/api/referees/search.ts`):
- ✅ Already exists
- Ensure feature parity with Express version

**VIS Proxy APIs**:
- Migrate circuit breaker logic
- Maintain caching strategy
- Preserve error handling

---

## **Implementation Priority**

### **Phase 1** (Critical):
1. Create shared utility libraries
2. Migrate Tournament API endpoints
3. Test VIS API integration
4. Implement serverless caching

### **Phase 2** (Secondary):
1. Enhanced error handling
2. Rate limiting implementation  
3. Logging standardization
4. Performance optimization

### **Phase 3** (Optional):
1. Monitoring integration
2. Advanced caching strategies
3. API documentation

---

## **Deployment Configuration**

### **Updated vercel.json:**
```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "npm install --prefix frontend",
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node@3.0.6"
    }
  },
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

### **Environment Variables Required:**
- `VIS_API_URL`
- `VIS_API_KEY` 
- `NODE_ENV`
- `RATE_LIMIT_MAX`
- `CACHE_TTL`

---

## **Success Metrics**
- ✅ Clean deployments without build conflicts
- ✅ All existing API endpoints functional
- ✅ Response times under 2s
- ✅ 99%+ uptime for serverless functions
- ✅ Proper error handling and logging

**Estimated Migration Time**: 2-3 days for core functionality, 1 week for full feature parity.