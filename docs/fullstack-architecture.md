# VisConnect Fullstack Architecture Document

## Executive Summary

VisConnect is a clean, professional web application providing direct access to FIVB beach volleyball tournament data through VIS (Volleyball Information System) integration. This document outlines the complete fullstack architecture for the MVP implementation, focusing on simplicity, performance, and professional data presentation.

**Architecture Overview:**
- **Pattern:** Monolith Architecture with integrated frontend and backend
- **Frontend:** React 18+ with TypeScript and shadcn/ui components
- **Backend:** Node.js with Express framework
- **Integration:** Direct RESTful API communication with FIVB VIS
- **Deployment:** Single cloud-hosted application with responsive web interface

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VisConnect System                        │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript + shadcn/ui)                     │
│  ├─ Tournament List Component                                   │
│  ├─ Tournament Detail Component                                 │
│  ├─ Match Results Component                                     │
│  └─ Filtering & Search Components                               │
├─────────────────────────────────────────────────────────────────┤
│  Backend API Layer (Node.js + Express)                         │
│  ├─ VIS Integration Service                                     │
│  ├─ Tournament Data Controller                                  │
│  ├─ Match Data Controller                                       │
│  └─ Health Check & Monitoring                                   │
├─────────────────────────────────────────────────────────────────┤
│  External Integration                                           │
│  └─ FIVB VIS API (HTTPS RESTful)                               │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Simplicity First:** Monolith architecture for MVP with clear upgrade path
2. **Performance Focused:** Sub-3-second load times for all data operations
3. **Professional UI:** shadcn/ui components ensuring consistent, clean presentation
4. **Direct Integration:** No intermediate database, direct VIS API consumption
5. **Responsive Design:** Desktop and mobile optimization built-in

## Frontend Architecture

### Technology Stack

**Core Framework:**
- **React 18.2+** with TypeScript 5.0+
- **Vite** for build tooling and development server
- **React Router v6** for client-side routing

**UI Framework:**
- **shadcn/ui** component library for professional interface
- **Tailwind CSS** for styling (included with shadcn/ui)
- **Radix UI** primitives (shadcn/ui foundation)
- **Lucide React** for iconography

**State Management:**
- **React Query (TanStack Query)** for API state management
- **React Context** for global application state
- **Local state** with useState/useReducer for component-level state

### Component Architecture

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── Footer.tsx
│   ├── tournament/
│   │   ├── TournamentList.tsx
│   │   ├── TournamentDetail.tsx
│   │   ├── TournamentCard.tsx
│   │   └── TournamentFilters.tsx
│   ├── match/
│   │   ├── MatchResults.tsx
│   │   ├── MatchTable.tsx
│   │   └── MatchCard.tsx
│   └── common/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── DataTable.tsx
├── pages/
│   ├── TournamentsPage.tsx
│   ├── TournamentDetailPage.tsx
│   └── NotFoundPage.tsx
├── hooks/
│   ├── useTournaments.ts
│   ├── useTournamentDetail.ts
│   └── useFilters.ts
├── services/
│   ├── api.ts
│   ├── tournament.service.ts
│   └── match.service.ts
├── types/
│   ├── tournament.types.ts
│   ├── match.types.ts
│   └── api.types.ts
└── utils/
    ├── date.utils.ts
    ├── format.utils.ts
    └── constants.ts
```

### Key Components Specification

**TournamentList Component:**
- Displays tournaments in shadcn/ui Table component
- Integrated filtering with date range picker and location selector
- Pagination using shadcn/ui Pagination component
- Loading states with shadcn/ui Skeleton components
- Responsive design with mobile-optimized card view

**TournamentDetail Component:**
- Comprehensive tournament information display
- Match listings with expandable details
- Navigation breadcrumbs using shadcn/ui Breadcrumb
- Error handling with shadcn/ui Alert components

**Filtering System:**
- Date range picker using shadcn/ui Calendar and Popover
- Multi-select dropdown for locations using shadcn/ui Select
- Real-time filter application with debouncing
- Clear filters functionality

### Performance Optimization

**Code Splitting:**
- Route-based code splitting with React.lazy()
- Component-level lazy loading for large components
- Dynamic imports for non-critical functionality

**Caching Strategy:**
- React Query cache configuration (5-minute stale time)
- Browser caching for static assets
- Service worker for offline capability (future enhancement)

**Bundle Optimization:**
- Tree shaking for unused code elimination
- Vite bundle analysis and optimization
- Optimized shadcn/ui component imports

## Backend Architecture

### Technology Stack

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

### API Layer Architecture

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

### API Endpoints Specification

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

### VIS Integration Service

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

### Caching Strategy

**Memory Cache (Node-cache):**
- Tournament lists: 5-minute TTL
- Tournament details: 3-minute TTL
- Match data: 2-minute TTL
- Health checks: 30-second TTL

**HTTP Response Headers:**
- ETag support for conditional requests
- Cache-Control headers for browser caching
- Last-Modified headers for data freshness

## Integration Architecture

### FIVB VIS API Integration

**Connection Specifications:**
- **Protocol:** HTTPS RESTful API
- **Authentication:** API key-based (stored in environment variables)
- **Rate Limiting:** Configurable RPM limits with queue management
- **Data Format:** JSON request/response

**API Mapping:**
```typescript
// VIS API to VisConnect Data Mapping
interface VISTournament {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: VISLocation;
  level: string;
  status: string;
}

interface Tournament {
  id: string;
  name: string;
  dates: {
    start: Date;
    end: Date;
  };
  location: {
    city: string;
    country: string;
    venue?: string;
  };
  level: TournamentLevel;
  status: TournamentStatus;
  matchCount: number;
}
```

**Error Handling:**
- VIS API timeout handling (10-second timeout)
- Retry logic with exponential backoff
- Fallback to cached data when VIS unavailable
- User-friendly error messages for UI

### Data Synchronization

**Real-time Updates:**
- Polling strategy for tournament updates (configurable interval)
- Cache invalidation on data updates
- Background sync for improved performance

**Data Validation:**
- Schema validation for VIS API responses
- Data transformation and normalization
- Input sanitization for user filters

## Security Architecture

### Security Requirements (MVP)

**Data Protection:**
- All VIS API communications encrypted with HTTPS
- API keys stored in environment variables
- No sensitive data stored in browser localStorage

**Application Security:**
- CORS middleware configured for frontend domain
- Rate limiting to prevent API abuse
- Input validation and sanitization
- Security headers (helmet.js)

**Privacy Compliance:**
- No user data collection in MVP
- Public tournament data only
- GDPR compliance for EU users (data minimization)

### Security Implementation

```typescript
// Security Middleware Stack
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: false,
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
}));
```

## Performance Architecture

### Performance Requirements

**Load Time Targets:**
- Initial page load: < 2 seconds
- Tournament data retrieval: < 3 seconds
- Navigation between pages: < 1 second
- Mobile performance: Lighthouse score > 90

### Performance Optimization Strategies

**Frontend Optimization:**
- Code splitting at route and component level
- Image optimization with next-gen formats
- Critical CSS inlining
- Service worker for asset caching (future)

**Backend Optimization:**
- In-memory caching with Node-cache
- Database query optimization (future enhancement)
- CDN for static asset delivery
- Gzip compression for API responses

**Network Optimization:**
- HTTP/2 support
- Keep-alive connections to VIS API
- Request batching for multiple tournament requests
- Pagination for large datasets

### Monitoring & Analytics

**Performance Monitoring:**
- Response time tracking for all API endpoints
- VIS API latency monitoring
- Frontend performance metrics (Core Web Vitals)
- Error rate monitoring and alerting

**Logging Strategy:**
```typescript
// Structured Logging with Winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});
```

## Deployment Architecture

### Hosting Strategy

**Platform:** Cloud hosting (AWS/Vercel/Netlify)
- Frontend: Static hosting with CDN
- Backend: Container-based deployment
- Database: None required for MVP

### Environment Configuration

**Development Environment:**
```bash
# Frontend Development
npm run dev              # Vite dev server
npm run build           # Production build
npm run preview         # Preview production build

# Backend Development
npm run dev             # Nodemon with TypeScript
npm run build          # TypeScript compilation
npm run start          # Production server
```

**Production Deployment:**
- Automated CI/CD pipeline
- Environment variable management
- Health check endpoints
- Graceful shutdown handling

### Scalability Considerations

**Horizontal Scaling:**
- Stateless application design
- Load balancer configuration
- Auto-scaling based on CPU/memory usage

**Performance Scaling:**
- CDN for global content delivery
- Caching layers for reduced VIS API calls
- Database optimization (future enhancement)

## Data Architecture

### Data Models

**Tournament Data Model:**
```typescript
interface Tournament {
  id: string;
  name: string;
  dates: {
    start: Date;
    end: Date;
  };
  location: {
    city: string;
    country: string;
    venue?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  level: 'World Tour' | 'Continental' | 'National' | 'Regional';
  status: 'Upcoming' | 'Live' | 'Completed' | 'Cancelled';
  matchCount: number;
  prizeMoney?: number;
  surface: 'Sand' | 'Indoor';
  gender: 'Men' | 'Women' | 'Mixed';
}
```

**Match Data Model:**
```typescript
interface Match {
  id: string;
  tournamentId: string;
  teams: {
    team1: {
      player1: string;
      player2: string;
      country: string;
    };
    team2: {
      player1: string;
      player2: string;
      country: string;
    };
  };
  score: {
    set1?: { team1: number; team2: number; };
    set2?: { team1: number; team2: number; };
    set3?: { team1: number; team2: number; };
  };
  status: 'Scheduled' | 'Live' | 'Completed' | 'Postponed';
  scheduledTime: Date;
  actualStartTime?: Date;
  duration?: number;
  round: string;
  court: string;
  winner?: 'team1' | 'team2';
}
```

### Data Flow

**Request Flow:**
1. User interacts with React component
2. Component calls custom hook (e.g., useTournaments)
3. Hook uses React Query to fetch data
4. API call routed through backend service
5. Backend service calls VIS API
6. Data transformed and cached
7. Response returned to frontend
8. UI updates with new data

**Caching Flow:**
1. Initial request checks cache
2. If cache miss, fetch from VIS API
3. Store in cache with TTL
4. Return data to client
5. Subsequent requests serve from cache until TTL expires

## Testing Architecture

### Testing Strategy

**Unit Testing:**
- Frontend: Jest + React Testing Library
- Backend: Jest + Supertest
- Coverage target: > 80%

**Integration Testing:**
- API endpoint testing
- VIS API integration testing
- End-to-end user flows

**Testing Structure:**
```
tests/
├── unit/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── utils/
├── integration/
│   ├── api/
│   ├── vis-integration/
│   └── data-flow/
└── e2e/
    ├── tournament-listing/
    ├── tournament-detail/
    └── filtering/
```

### Quality Assurance

**Code Quality:**
- ESLint + Prettier for code formatting
- TypeScript strict mode enabled
- Pre-commit hooks with Husky
- SonarQube for code quality analysis

**Performance Testing:**
- Lighthouse CI for performance regression testing
- Load testing for API endpoints
- VIS API stress testing

## Accessibility Architecture

### WCAG 2.1 AA Compliance

**Implementation Strategy:**
- shadcn/ui components with built-in accessibility
- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support

**Accessibility Features:**
```typescript
// Example accessible component structure
const TournamentTable = () => {
  return (
    <Table>
      <TableCaption>FIVB Beach Volleyball Tournaments</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Tournament Name</TableHead>
          <TableHead scope="col">Dates</TableHead>
          <TableHead scope="col">Location</TableHead>
          <TableHead scope="col">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tournaments.map((tournament) => (
          <TableRow key={tournament.id}>
            <TableCell>
              <Link 
                to={`/tournaments/${tournament.id}`}
                aria-label={`View details for ${tournament.name}`}
              >
                {tournament.name}
              </Link>
            </TableCell>
            {/* ... other cells */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

**Color and Contrast:**
- High contrast mode support
- Color-blind friendly color palette
- Focus indicators with sufficient contrast

## Configuration Architecture

### Environment Configuration

**Development Configuration:**
```typescript
// config/development.ts
export const developmentConfig = {
  server: {
    port: 3001,
    cors: {
      origin: 'http://localhost:3000',
    },
  },
  vis: {
    baseURL: 'https://vis-api.fivb.com/api/v1',
    timeout: 10000,
    rateLimitRpm: 60,
  },
  cache: {
    ttl: 300, // 5 minutes
    checkPeriod: 120,
  },
  logging: {
    level: 'debug',
  },
};
```

**Production Configuration:**
```typescript
// config/production.ts
export const productionConfig = {
  server: {
    port: process.env.PORT || 3001,
    cors: {
      origin: process.env.FRONTEND_URL,
    },
  },
  vis: {
    baseURL: process.env.VIS_API_URL,
    timeout: 8000,
    rateLimitRpm: 120,
    authToken: process.env.VIS_API_KEY,
  },
  cache: {
    ttl: 300,
    checkPeriod: 60,
  },
  logging: {
    level: 'info',
  },
};
```

### Feature Flags

**Configuration Management:**
```typescript
interface FeatureFlags {
  enableAdvancedFiltering: boolean;
  enableRealTimeUpdates: boolean;
  enableOfflineMode: boolean;
  enableAnalytics: boolean;
}

const featureFlags: FeatureFlags = {
  enableAdvancedFiltering: process.env.NODE_ENV === 'production',
  enableRealTimeUpdates: false, // Future enhancement
  enableOfflineMode: false, // Future enhancement
  enableAnalytics: false, // Privacy-focused MVP
};
```

## Error Handling Architecture

### Error Classification

**Error Types:**
1. **Network Errors:** VIS API connectivity issues
2. **Data Errors:** Invalid or missing tournament data
3. **User Errors:** Invalid filter inputs
4. **System Errors:** Application runtime errors

### Error Handling Strategy

**Frontend Error Handling:**
```typescript
// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('React Error Boundary:', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            We're experiencing technical difficulties. Please try again later.
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
```

**Backend Error Handling:**
```typescript
// Global Error Handler Middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Application Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  if (err instanceof VISAPIError) {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'Unable to fetch tournament data',
      retryAfter: 60,
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Invalid request',
      message: err.message,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
  });
};
```

## Migration & Upgrade Path

### Future Enhancement Architecture

**Database Integration Path:**
- Current: Direct VIS API calls
- Future: PostgreSQL database with data synchronization
- Migration strategy: Gradual transition with data validation

**Microservices Migration:**
- Current: Monolith architecture
- Future: Containerized microservices
- Services: Tournament Service, Match Service, User Service, Notification Service

**Advanced Features Roadmap:**
1. **Phase 2:** User authentication and personalization
2. **Phase 3:** Real-time updates with WebSocket
3. **Phase 4:** Mobile application (React Native)
4. **Phase 5:** Advanced analytics and reporting

### Scalability Transition Plan

**Current MVP Architecture:**
- Single server deployment
- In-memory caching
- Direct VIS API integration

**Scale-up Path:**
1. **Database Layer:** Add PostgreSQL for data persistence
2. **Caching Layer:** Implement Redis for distributed caching
3. **Load Balancing:** Multiple server instances with load balancer
4. **CDN Integration:** Global content delivery network
5. **Microservices:** Service decomposition for independent scaling

## Technical Debt Management

### Code Quality Standards

**TypeScript Configuration:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true
  }
}
```

**Linting Standards:**
- ESLint with TypeScript parser
- Prettier for code formatting
- Import sorting and organization
- Unused variable detection

**Documentation Standards:**
- JSDoc comments for all public functions
- API documentation with OpenAPI/Swagger
- Component documentation with Storybook (future)
- Architecture decision records (ADRs)

### Refactoring Strategy

**Continuous Improvement:**
- Regular dependency updates
- Performance monitoring and optimization
- Code review standards
- Technical debt tracking and resolution

## Conclusion

This fullstack architecture document provides a comprehensive blueprint for implementing VisConnect as a professional, scalable web application that meets all PRD requirements. The architecture emphasizes:

1. **Simplicity:** Monolith approach for MVP with clear upgrade path
2. **Performance:** Sub-3-second load times with efficient caching
3. **Professional UI:** shadcn/ui components for consistent design
4. **Scalability:** Foundation for future enhancements and scaling
5. **Security:** HTTPS encryption and secure API practices

The implementation follows modern web development best practices while maintaining focus on the core MVP objectives: providing clean, professional access to FIVB tournament data through a responsive web interface.

**Next Steps:**
1. Development environment setup
2. VIS API integration and testing
3. Frontend component implementation
4. Performance optimization and testing
5. Production deployment and monitoring

This architecture ensures VisConnect delivers immediate value while establishing a solid foundation for future growth and feature expansion.