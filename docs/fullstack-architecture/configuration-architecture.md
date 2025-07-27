# Configuration Architecture

## Environment Configuration

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

## Feature Flags

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
