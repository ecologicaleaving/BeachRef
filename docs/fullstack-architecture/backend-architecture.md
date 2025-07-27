# Backend Architecture

## Technology Stack

**Core Framework:**
- **Node.js 18+** runtime environment
- **Express.js 4.18+** web application framework
- **TypeScript 5.0+** for type safety

**API Integration:**
- **Axios** for HTTP client with interceptors
- **Node-cache** for in-memory caching
- **Rate limiting** with express-rate-limit

**Development & Production:**
- **Nodemon** for development auto-restart
- **PM2** for production process management
- **Winston** for structured logging

## API Layer Architecture

```
src/
├── controllers/
│   ├── tournament.controller.ts
│   ├── match.controller.ts
│   └── health.controller.ts
├── services/
│   ├── vis.service.ts
│   ├── tournament.service.ts
│   ├── match.service.ts
│   └── cache.service.ts
├── middleware/
│   ├── error.middleware.ts
│   ├── cors.middleware.ts
│   ├── rateLimit.middleware.ts
│   └── logging.middleware.ts
├── routes/
│   ├── tournament.routes.ts
│   ├── match.routes.ts
│   └── health.routes.ts
├── types/
│   ├── vis.types.ts
│   ├── api.types.ts
│   └── response.types.ts
├── config/
│   ├── database.config.ts
│   ├── vis.config.ts
│   └── app.config.ts
└── utils/
    ├── logger.ts
    ├── validators.ts
    └── helpers.ts
```

## API Endpoints Specification

**Tournament Endpoints:**
```typescript
GET /api/tournaments
- Query parameters: page, limit, dateFrom, dateTo, location, type
- Response: Paginated tournament list with metadata
- Cache: 5 minutes

GET /api/tournaments/:id
- Parameters: Tournament ID
- Response: Detailed tournament information with matches
- Cache: 3 minutes

GET /api/tournaments/:id/matches
- Parameters: Tournament ID
- Response: All matches for specific tournament
- Cache: 2 minutes
```

**Health & Monitoring:**
```typescript
GET /api/health
- Response: System status and VIS connectivity
- Cache: 30 seconds

GET /api/health/vis
- Response: Detailed VIS API status and response times
- Cache: 1 minute
```

## VIS Integration Service

**VIS Client Configuration:**
```typescript
interface VISConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  rateLimitRpm: number;
  authToken?: string;
}

class VISService {
  private client: AxiosInstance;
  private cache: NodeCache;
  
  async getTournaments(filters: TournamentFilters): Promise<Tournament[]>
  async getTournamentById(id: string): Promise<TournamentDetail>
  async getMatches(tournamentId: string): Promise<Match[]>
  async healthCheck(): Promise<HealthStatus>
}
```

**Error Handling & Resilience:**
- Exponential backoff for failed requests
- Circuit breaker pattern for VIS API failures
- Graceful degradation with cached data
- Structured error logging with Winston

## Caching Strategy

**Memory Cache (Node-cache):**
- Tournament lists: 5-minute TTL
- Tournament details: 3-minute TTL
- Match data: 2-minute TTL
- Health checks: 30-second TTL

**HTTP Response Headers:**
- ETag support for conditional requests
- Cache-Control headers for browser caching
- Last-Modified headers for data freshness
