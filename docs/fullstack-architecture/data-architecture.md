# Data Architecture

## Data Models

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

## Data Flow

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
