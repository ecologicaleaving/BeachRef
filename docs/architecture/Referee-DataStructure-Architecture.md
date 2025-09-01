# Referee Data Structure Architecture

## Overview

This document describes the complete referee data architecture in the BeachRef application, covering referee profiles, match assignments, status tracking, and integration with the VIS (Volleyball Information System) API.

## Data Architecture Overview

```
VIS Referee API → RefereeService → Domain Models → UI Components
      ↓               ↓              ↓              ↓
   XML/JSON      Data Parsing   Type-Safe       React Native
   Response      & Validation   Interfaces      Components
```

## Core Data Structures

### Referee Profile Structure

#### RefereeProfile (Primary Interface)

```typescript
export interface RefereeProfile {
  refereeNo: string;                // Unique referee identifier
  name: string;                     // Full referee name
  certificationLevel: string;       // Certification level (e.g., "FIVB", "Continental")
  federationCode: string;           // Country/federation code (e.g., "USA", "BRA")
  languages: string[];              // Spoken languages array
}
```

#### RefereeFromDB (Database Integration)

```typescript
export interface RefereeFromDB {
  No: string;                       // Database primary key
  Name: string;                     // Referee full name
  FederationCode?: string;          // Optional federation code
  Level?: string;                   // Optional certification level
  isSelected?: boolean;             // UI selection state
}
```

**Usage**: `RefereeFromDB` represents the raw database/API format, while `RefereeProfile` is the normalized application format.

## Match Assignment Architecture

### RefereeAssignment (Match-v2 Domain)

The primary referee assignment interface used throughout the application:

```typescript
export interface RefereeAssignment {
  readonly refereeId: string;       // Unique referee identifier
  readonly refereeName: string;     // Display name
  readonly function: string;        // Role description ("First Referee", "Second Referee")
  readonly federationCode?: string; // Referee's country code
  readonly status: 'ASSIGNED' | 'CONFIRMED' | 'DECLINED' | 'PENDING'; // Assignment status
}
```

### RefereeAssignment (Legacy Interface)

Legacy interface maintained for backward compatibility:

```typescript
export interface RefereeAssignment {
  matchNo: string;                  // VIS match number
  tournamentNo: string;             // Tournament identifier
  matchInTournament: string;        // Match number within tournament
  teamAName: string;                // Team A name
  teamBName: string;                // Team B name
  localDate: Date;                  // Match date
  localTime: string;                // Match time
  court: string;                    // Court identifier
  status: 'Scheduled' | 'Running' | 'Finished' | 'Cancelled'; // Match status
  round: string;                    // Tournament round
  roundPhase?: string;              // Optional phase information
  refereeRole: 'referee1' | 'referee2'; // Referee position
}
```

### RefereeAssignmentStatus (Status Management)

Organizes assignments by their current status:

```typescript
export interface RefereeAssignmentStatus {
  current: RefereeAssignment[];     // Currently active assignments
  upcoming: RefereeAssignment[];    // Future scheduled assignments
  completed: RefereeAssignment[];   // Completed assignments
  cancelled: RefereeAssignment[];   // Cancelled assignments
}
```

## VIS API Integration

### XML Attribute Mapping

The VIS API provides referee information through match XML attributes:

| VIS XML Attribute | Domain Field | Description |
|-------------------|--------------|-------------|
| `Referee1Name` | `refereeName` | First referee name |
| `Referee2Name` | `refereeName` | Second referee name |
| `Referee1FederationCode` | `federationCode` | First referee country |
| `Referee2FederationCode` | `federationCode` | Second referee country |
| `NoReferee1` | `refereeId` | First referee number |
| `NoReferee2` | `refereeId` | Second referee number |
| `NoRefereeChallenge` | `refereeId` | Challenge referee number |

### Data Transformation Pipeline

```typescript
// In VisResponseParser.parseMatchReferees()
private static parseMatchReferees(matchXml: string): readonly RefereeAssignment[] {
  const referees: RefereeAssignment[] = [];
  
  // Extract referee 1
  const referee1Name = this.extractXmlAttribute(matchXml, 'Referee1Name');
  if (referee1Name) {
    referees.push({
      refereeId: 'ref1',
      refereeName: referee1Name,
      function: 'First Referee',
      federationCode: this.extractXmlAttribute(matchXml, 'Referee1FederationCode'),
      status: 'ASSIGNED'
    });
  }
  
  // Extract referee 2
  const referee2Name = this.extractXmlAttribute(matchXml, 'Referee2Name');
  if (referee2Name) {
    referees.push({
      refereeId: 'ref2',
      refereeName: referee2Name,
      function: 'Second Referee',
      federationCode: this.extractXmlAttribute(matchXml, 'Referee2FederationCode'),
      status: 'ASSIGNED'
    });
  }
  
  return referees;
}
```

## Assignment Status Management

### Status Flow

```
PENDING → ASSIGNED → CONFIRMED
    ↓         ↓         ↓
DECLINED ← DECLINED ← DECLINED
```

#### Status Definitions

- **PENDING**: Assignment proposed but not yet confirmed
- **ASSIGNED**: Assignment made and communicated to referee
- **CONFIRMED**: Referee has confirmed availability
- **DECLINED**: Referee has declined or been reassigned

### Assignment Lifecycle

1. **Creation**: Match created with referee requirements
2. **Assignment**: Referees assigned to match positions
3. **Notification**: Referees notified of assignments
4. **Confirmation**: Referees confirm or decline assignments
5. **Match Day**: Assignments locked and tracked
6. **Completion**: Post-match status updates

## Data Filtering & Search

### RefereeMatchFilter

```typescript
export interface RefereeMatchFilter {
  refereeName?: string;            // Filter by referee name
  date?: string;                   // Filter by match date
  court?: string;                  // Filter by court
  status?: string;                 // Filter by assignment status
}
```

### RefereeListOptions

```typescript
export type RefereeListSortBy = 'name' | 'federation' | 'matches';
export type RefereeListSortOrder = 'asc' | 'desc';

export interface RefereeListOptions {
  sortBy: RefereeListSortBy;       // Primary sort field
  sortOrder: RefereeListSortOrder; // Sort direction
  searchQuery?: string;            // Text search across fields
  federationFilter?: string;       // Filter by country/federation
}
```

## Statistics & Analytics

### RefereeStatistics

```typescript
export interface RefereeStatistics {
  totalMatches: number;                      // Total matches assigned
  matchesByDate: Record<string, number>;     // Matches per date
  matchesByCourt: Record<string, number>;    // Matches per court
  matchesByStatus: Record<string, number>;   // Matches per status
}
```

### Statistical Calculations

```typescript
// Example usage in referee dashboard
function calculateRefereeWorkload(assignments: RefereeAssignment[]): RefereeStatistics {
  return {
    totalMatches: assignments.length,
    matchesByDate: groupBy(assignments, 'localDate'),
    matchesByCourt: groupBy(assignments, 'court'),
    matchesByStatus: groupBy(assignments, 'status')
  };
}
```

## Service Layer Architecture

### RefereeAssignmentsService

Primary service for managing referee assignments:

```typescript
class RefereeAssignmentsService {
  // Assignment retrieval
  static async getAssignmentsForReferee(refereeName: string): Promise<RefereeAssignment[]>
  
  // Assignment status management
  static async updateAssignmentStatus(matchNo: string, refereeId: string, status: string): Promise<void>
  
  // Assignment creation
  static async createAssignment(assignment: RefereeAssignment): Promise<void>
  
  // Statistics
  static async getRefereeStatistics(refereeName: string): Promise<RefereeStatistics>
}
```

### Assignment Status Monitoring

```typescript
class AssignmentStatusProvider {
  // Real-time assignment status tracking
  private statusSubscription: Subscription;
  private assignmentCounts: AssignmentCounts;
  
  // Methods for UI state management
  refreshAssignmentStatus(): Promise<void>
  getAssignmentCounts(): AssignmentCounts
  subscribeToStatusUpdates(): void
}
```

## UI Integration Patterns

### Referee Selection Components

```typescript
// Referee dropdown with search and filter
interface RefereePickerProps {
  selectedReferee?: RefereeProfile;
  onRefereeSelect: (referee: RefereeProfile) => void;
  filterOptions?: RefereeListOptions;
  disabled?: boolean;
}
```

### Assignment Display Components

```typescript
// Assignment card for referee dashboard
interface RefereeAssignmentCardProps {
  assignment: RefereeAssignment;
  showMatchDetails?: boolean;
  onStatusUpdate?: (status: AssignmentStatus) => void;
  interactive?: boolean;
}
```

## Data Persistence Strategy

### Local Storage Schema

```json
{
  "refereeProfiles": {
    "referee_id": {
      "name": "John Smith",
      "federationCode": "USA",
      "certificationLevel": "FIVB",
      "languages": ["English", "Spanish"]
    }
  },
  "assignments": {
    "match_id_referee_id": {
      "matchNo": "M001",
      "refereeId": "ref_123",
      "status": "CONFIRMED",
      "lastUpdated": "2025-01-01T10:00:00Z"
    }
  }
}
```

### Cache Management

```typescript
interface RefereeCacheEntry {
  profiles: RefereeProfile[];
  assignments: RefereeAssignment[];
  statistics: RefereeStatistics;
  lastUpdated: string;
  expiresAt: string;
}
```

## Real-time Updates

### Assignment Status Sync

```typescript
class RefereeAssignmentSync {
  private websocketConnection: WebSocket;
  private statusUpdateQueue: AssignmentStatusUpdate[];
  
  // Real-time assignment status updates
  onAssignmentStatusChange(callback: (update: AssignmentStatusUpdate) => void): void
  
  // Offline queue management
  queueStatusUpdate(update: AssignmentStatusUpdate): void
  syncPendingUpdates(): Promise<void>
}
```

### Event Types

```typescript
type AssignmentEvent = 
  | 'ASSIGNMENT_CREATED'
  | 'ASSIGNMENT_UPDATED' 
  | 'ASSIGNMENT_CANCELLED'
  | 'REFEREE_CONFIRMED'
  | 'REFEREE_DECLINED'
  | 'MATCH_STATUS_CHANGED';
```

## Error Handling & Validation

### Data Validation

```typescript
function validateRefereeAssignment(assignment: RefereeAssignment): ValidationResult {
  const errors: string[] = [];
  
  if (!assignment.refereeId) errors.push('Referee ID is required');
  if (!assignment.refereeName) errors.push('Referee name is required');
  if (!assignment.function) errors.push('Referee function is required');
  if (!VALID_STATUSES.includes(assignment.status)) errors.push('Invalid status');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### Error Recovery

```typescript
class RefereeDataRecovery {
  // Recover from corrupted assignment data
  static async recoverAssignmentData(refereeId: string): Promise<RefereeAssignment[]>
  
  // Validate and repair referee profiles
  static async validateRefereeProfiles(profiles: RefereeProfile[]): Promise<RefereeProfile[]>
  
  // Sync with authoritative source
  static async syncWithVISAPI(): Promise<SyncResult>
}
```

## Performance Optimization

### Lazy Loading Strategy

```typescript
// Load referee data on demand
const refereeProfiles = useMemo(() => 
  visibleReferees.map(id => getRefereeProfile(id)), 
  [visibleReferees]
);

// Paginated assignment loading
const assignments = useInfiniteQuery(
  ['referee-assignments', refereeId], 
  ({ pageParam = 0 }) => loadAssignments(refereeId, pageParam)
);
```

### Memory Management

- Assignment data is cached with TTL (Time To Live)
- Unused referee profiles are garbage collected
- Assignment history is archived after tournament completion

## API Endpoint Integration

### VIS API Endpoints

| Endpoint | Purpose | Returns | Referee Data |
|----------|---------|---------|-------------|
| `GetBeachMatchList` | Match listings | Basic referee assignments | Names, federation codes |
| `GetBeachLive` | Live match data | Detailed referee info | Real-time assignment status |
| `GetRefereeList` | Referee directory | Complete referee profiles | Full profile data |
| `GetAssignments` | Assignment data | Referee schedules | Assignment details |

### Data Synchronization

```typescript
class RefereeDataSync {
  // Sync referee profiles from VIS
  async syncRefereeProfiles(): Promise<SyncResult>
  
  // Sync assignment data
  async syncAssignments(tournamentId: string): Promise<SyncResult>
  
  // Incremental updates
  async syncIncrementalUpdates(since: Date): Promise<SyncResult>
}
```

## Migration & Compatibility

### Legacy Data Migration

```typescript
// Migrate from legacy RefereeAssignment to new format
function migrateLegacyAssignment(legacy: LegacyRefereeAssignment): RefereeAssignment {
  return {
    refereeId: legacy.refereeNo,
    refereeName: legacy.name,
    function: legacy.refereeRole === 'referee1' ? 'First Referee' : 'Second Referee',
    federationCode: legacy.federationCode,
    status: mapLegacyStatus(legacy.status)
  };
}
```

### Version Compatibility Matrix

| Data Version | Supported | Migration Required | Notes |
|--------------|-----------|-------------------|-------|
| v1.0 (Legacy) | ✅ | ✅ | Auto-migration on load |
| v2.0 (Current) | ✅ | ❌ | Native support |
| v3.0 (Future) | 🚧 | TBD | Planned enhancement |

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-01  
**Maintainer**: Architecture Team  
**Status**: Living Document - Updates with feature development**