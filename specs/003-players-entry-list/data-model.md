# Data Model: Players Entry List

**Feature**: 003-players-entry-list
**Date**: 2025-10-21
**Status**: Complete

## Overview

This document defines the TypeScript interfaces and types for tournament team data, including VIS API response structures, domain entities, and UI state models.

---

## Core Domain Entities

### TournamentTeam

Represents a team's registration in a beach volleyball tournament.

```typescript
export interface TournamentTeam {
  // Identity
  teamNo: number;                    // Unique team number within tournament
  tournamentNo: number;               // Parent tournament identifier

  // Players
  player1: TeamPlayer;                // First player details
  player2: TeamPlayer;                // Second player details

  // Tournament Data
  seed: number | null;                // Seed number (null if unseeded)
  phaseCode: TeamPhase;               // Main draw or qualification
  gender: 'M' | 'W';                  // Team gender (Men/Women)

  // Status & Designations
  status: TeamStatus;                 // Entry status
  isWildCard: boolean;                // Wild card team flag
  isReserve: boolean;                 // Reserve team flag

  // Metadata
  countryCode: string;                // ISO 3166-1 alpha-2 country code
}
```

**Validation Rules**:
- `teamNo` must be positive integer
- `tournamentNo` must match parent tournament
- `seed` must be positive integer or null
- `player1` and `player2` must have distinct `playerNo` values
- `countryCode` must be valid ISO code

**Relationships**:
- **Belongs to**: One `Tournament` (via `tournamentNo`)
- **Has**: Two `TeamPlayer` instances (player1, player2)

---

### TeamPlayer

Individual player information within a team.

```typescript
export interface TeamPlayer {
  // Identity
  playerNo: number;                   // VIS player ID
  fullName: string;                   // Full player name (e.g., "John DOE")

  // Metadata
  countryCode: string;                // Player country/federation
  ranking?: number;                   // Optional: Current world ranking
}
```

**Validation Rules**:
- `playerNo` must be positive integer
- `fullName` must be non-empty string
- `countryCode` must be valid ISO code
- `ranking` must be positive integer if provided

**Naming Convention**:
- VIS API returns names in "LASTNAME Firstname" format
- Display as-is (no formatting/reversal needed)

---

### TeamPhase (Enum)

Tournament phase classification.

```typescript
export type TeamPhase = 'MainDraw' | 'Qualification';
```

**Mapping from VIS API**:
- VIS API `PhaseCode` field may contain numeric or string codes
- Normalize to enum values during parsing:
  - "1" or "MD" → 'MainDraw'
  - "2" or "Q" → 'Qualification'

---

### TeamStatus (Enum)

Team entry status.

```typescript
export type TeamStatus = 'Confirmed' | 'Withdrawn' | 'Reserve';
```

**Status Meanings**:
- `Confirmed`: Team actively registered and participating
- `Withdrawn`: Team registered but withdrew before/during tournament
- `Reserve`: Reserve/alternate team (may be called up if another team withdraws)

**Visual Indicators**:
- Confirmed: No badge (default state)
- Withdrawn: Red "Withdrawn" badge, strikethrough styling
- Reserve: Gray "Reserve" badge, italic text

---

## VIS API Response Types

### GetTournamentTeamListRequest

```typescript
export interface GetTournamentTeamListRequest {
  TournamentNo: number;
  Fields?: string[];                  // Optional: selective field extraction
}
```

**Example Request**:
```typescript
{
  TournamentNo: 12345,
  Fields: ['No', 'Player1Name', 'Player2Name', 'Player1No', 'Player2No',
           'Seed', 'PhaseCode', 'CountryCode', 'Status', 'IsWildCard', 'IsReserve']
}
```

---

### GetTournamentTeamListResponse

```typescript
export interface GetTournamentTeamListResponse {
  BeachTeams: {
    BeachTeam: VISTeamDTO[];
  };
}

export interface VISTeamDTO {
  // VIS API field names (camelCase)
  no: number;
  player1Name: string;
  player2Name: string;
  player1No: number;
  player2No: number;
  seed: number | null;
  phaseCode: string;                  // Numeric or string code
  countryCode: string;
  status?: string;                    // Optional field
  isWildCard?: boolean;               // Optional field
  isReserve?: boolean;                // Optional field
  gender: 'M' | 'W';
}
```

**Response Normalization**:
```typescript
function parseVISTeam(dto: VISTeamDTO, tournamentNo: number): TournamentTeam {
  return {
    teamNo: dto.no,
    tournamentNo,
    player1: {
      playerNo: dto.player1No,
      fullName: dto.player1Name,
      countryCode: dto.countryCode,
    },
    player2: {
      playerNo: dto.player2No,
      fullName: dto.player2Name,
      countryCode: dto.countryCode,
    },
    seed: dto.seed,
    phaseCode: normalizePhaseCode(dto.phaseCode),
    gender: dto.gender,
    status: normalizeTeamStatus(dto.status),
    isWildCard: dto.isWildCard ?? false,
    isReserve: dto.isReserve ?? false,
    countryCode: dto.countryCode,
  };
}

function normalizePhaseCode(code: string): TeamPhase {
  const normalized = code.toUpperCase();
  if (normalized === '1' || normalized === 'MD' || normalized === 'MAINDRAW') {
    return 'MainDraw';
  }
  if (normalized === '2' || normalized === 'Q' || normalized === 'QUALIFICATION') {
    return 'Qualification';
  }
  // Default to MainDraw if unknown
  console.warn(`Unknown phase code: ${code}, defaulting to MainDraw`);
  return 'MainDraw';
}

function normalizeTeamStatus(status?: string): TeamStatus {
  if (!status) return 'Confirmed';
  const normalized = status.toUpperCase();
  if (normalized.includes('WITHDRAW')) return 'Withdrawn';
  if (normalized.includes('RESERVE')) return 'Reserve';
  return 'Confirmed';
}
```

---

## UI State Models

### TeamListFilter

Filter state for team list display.

```typescript
export interface TeamListFilter {
  gender: 'All' | 'M' | 'W';
  phase: 'All' | 'MainDraw' | 'Qualification';
}

export const DEFAULT_TEAM_FILTER: TeamListFilter = {
  gender: 'All',
  phase: 'All',
};
```

---

### TeamListState

Complete state for team list screen.

```typescript
export interface TeamListState {
  // Data
  teams: TournamentTeam[];
  filteredTeams: TournamentTeam[];

  // Filters
  filter: TeamListFilter;

  // UI State
  loading: boolean;
  refreshing: boolean;
  error: string | null;

  // Modal State
  selectedTeam: TournamentTeam | null;
  modalVisible: boolean;
}
```

---

## Cache Models

### CachedTeamList

Cached team list with metadata.

```typescript
export interface CachedTeamList {
  tournamentNo: number;
  teams: TournamentTeam[];
  cachedAt: number;                   // Unix timestamp (milliseconds)
  expiresAt: number;                  // Unix timestamp (milliseconds)
  tournamentStartDate: string;        // ISO date string (for TTL recalculation)
}
```

**Cache Key Format**: `team-list-${tournamentNo}`

**Storage**:
- Level 1 (Memory): `Map<string, CachedTeamList>`
- Level 2 (MMKV): JSON-serialized `CachedTeamList`

---

## Type Guards

### Type Validation Helpers

```typescript
export function isValidTeam(team: unknown): team is TournamentTeam {
  if (typeof team !== 'object' || team === null) return false;
  const t = team as TournamentTeam;

  return (
    typeof t.teamNo === 'number' &&
    typeof t.tournamentNo === 'number' &&
    isValidTeamPlayer(t.player1) &&
    isValidTeamPlayer(t.player2) &&
    (t.seed === null || typeof t.seed === 'number') &&
    ['MainDraw', 'Qualification'].includes(t.phaseCode) &&
    ['M', 'W'].includes(t.gender) &&
    ['Confirmed', 'Withdrawn', 'Reserve'].includes(t.status) &&
    typeof t.isWildCard === 'boolean' &&
    typeof t.isReserve === 'boolean' &&
    typeof t.countryCode === 'string'
  );
}

export function isValidTeamPlayer(player: unknown): player is TeamPlayer {
  if (typeof player !== 'object' || player === null) return false;
  const p = player as TeamPlayer;

  return (
    typeof p.playerNo === 'number' &&
    typeof p.fullName === 'string' &&
    p.fullName.length > 0 &&
    typeof p.countryCode === 'string'
  );
}
```

---

## Entity Lifecycle

### Team Data Flow

```
1. API Request
   ↓
2. VIS API Response (VISTeamDTO[])
   ↓
3. Normalization (parseVISTeam)
   ↓
4. Domain Entity (TournamentTeam)
   ↓
5. Cache Storage (CachedTeamList)
   ↓
6. UI State (TeamListState)
   ↓
7. Filtered Display (FlatList)
```

### State Transitions

**Team Status Transitions**:
- `Confirmed` → `Withdrawn` (team withdraws before/during tournament)
- `Reserve` → `Confirmed` (reserve team called up to replace withdrawn team)
- No transitions from `Withdrawn` (permanent state)

**Cache Lifecycle**:
- **Fresh** (<TTL): Serve from cache, no API call
- **Stale** (≥TTL): Fetch from API, update cache
- **Manual Refresh**: Bypass cache, force API call, update cache

---

## Relationships Diagram

```
Tournament (1)
    ↓ has many
TournamentTeam (N)
    ↓ has exactly 2
TeamPlayer (2)

Filters:
- Gender: All | Men | Women
- Phase: All | MainDraw | Qualification

Cache:
- Key: team-list-{tournamentNo}
- TTL: Adaptive (7d → 24h → ∞)
```

---

## Constants

### Display Constants

```typescript
export const TEAM_CARD_HEIGHT = 80; // pixels (for FlatList getItemLayout)

export const PHASE_LABELS: Record<TeamPhase, string> = {
  MainDraw: 'Main Draw',
  Qualification: 'Qualification',
};

export const STATUS_LABELS: Record<TeamStatus, string> = {
  Confirmed: 'Confirmed',
  Withdrawn: 'Withdrawn',
  Reserve: 'Reserve',
};

export const STATUS_COLORS: Record<TeamStatus, string> = {
  Confirmed: 'transparent',
  Withdrawn: '#DC2626', // red-600
  Reserve: '#6B7280',   // gray-500
};
```

### VIS API Field List

```typescript
export const REQUIRED_TEAM_FIELDS = [
  'No',
  'Player1Name',
  'Player2Name',
  'Player1No',
  'Player2No',
  'Seed',
  'PhaseCode',
  'CountryCode',
  'Status',
  'IsWildCard',
  'IsReserve',
  'Gender',
];
```

---

## Migration Notes

**Existing Types (No Changes)**:
- `Tournament`, `TournamentCore` - Used for accessing tournament metadata
- `CacheService` - Reused as-is for caching logic

**New Type Files**:
- `types/tournament-team.ts` - All team-related types defined here
- `types/api-v2.ts` - Add `GetTournamentTeamListRequest` and `GetTournamentTeamListResponse`

**Type Safety**:
- All types use TypeScript strict mode
- No `any` types (use `unknown` with type guards)
- VIS API responses validated before domain entity creation
