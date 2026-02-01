# Developer Quick Start: Players Entry List

**Feature**: 003-players-entry-list
**Branch**: `003-players-entry-list`
**Date**: 2025-10-21

## Overview

This guide helps developers get started with implementing the Players Entry List feature. Follow these steps to set up your environment, understand the architecture, and begin development.

---

## Prerequisites

### Required Knowledge

- TypeScript and React hooks
- React Native basics (components, StyleSheet, FlatList)
- Expo Router navigation patterns
- Async/await and Promises

### Existing Codebase Familiarity

Before starting, review these existing files:
- `components/navigation/TournamentBottomMenu.tsx` - Navigation pattern to extend
- `services/cache/CacheService.ts` - Caching infrastructure to reuse
- `services/api/VisApiClient.ts` - VIS API integration to extend
- `types/match-v2.ts` - Example of domain entity type definitions

---

## Development Environment Setup

### 1. Branch Setup

```bash
# Verify you're on the feature branch
git branch
# Should show: * 003-players-entry-list

# If not, check out the branch
git checkout 003-players-entry-list

# Pull latest changes
git pull origin 003-players-entry-list
```

### 2. Install Dependencies

```bash
# Install all project dependencies
npm install

# Verify Expo CLI is available
npx expo --version
# Should show: ~53.0.20
```

### 3. Start Development Server

```bash
# Start Expo development server
npm start

# Or for web development
npm run web
```

### 4. Verify Environment

```bash
# Run TypeScript compiler check
npx tsc --noEmit

# Run linter
npm run lint

# Run production audit (optional)
npm run audit -- --checks=typescript
```

---

## Architecture Overview

### Component Structure

```
app/tournament-teams.tsx (NEW)
    ↓ uses
screens/TournamentTeamsScreen.tsx (NEW)
    ↓ uses
hooks/useTournamentTeams.ts (NEW)
    ↓ uses
services/TournamentTeamService.ts (NEW)
    ↓ calls
services/api/VisApiClient.ts (MODIFIED: add getTournamentTeamList)
```

### Data Flow

```
1. User taps "Players" tab
    ↓
2. TournamentTeamsScreen mounts
    ↓
3. useTournamentTeams hook fetches data
    ↓
4. TournamentTeamService checks cache
    ↓
5a. Cache hit → Return cached data
5b. Cache miss → Call VIS API → Cache response
    ↓
6. Hook returns teams + filter functions
    ↓
7. Screen renders FlatList with TeamListItem components
    ↓
8. User taps team → TeamDetailModal opens
```

---

## Step-by-Step Implementation Guide

### Phase 1: Type Definitions (Start Here)

**File**: `types/tournament-team.ts`

```typescript
// 1. Create core interfaces
export interface TournamentTeam {
  teamNo: number;
  tournamentNo: number;
  player1: TeamPlayer;
  player2: TeamPlayer;
  seed: number | null;
  phaseCode: TeamPhase;
  gender: 'M' | 'W';
  status: TeamStatus;
  isWildCard: boolean;
  isReserve: boolean;
  countryCode: string;
}

export interface TeamPlayer {
  playerNo: number;
  fullName: string;
  countryCode: string;
  ranking?: number;
}

export type TeamPhase = 'MainDraw' | 'Qualification';
export type TeamStatus = 'Confirmed' | 'Withdrawn' | 'Reserve';
```

**File**: `types/api-v2.ts` (add to existing file)

```typescript
// 2. Add VIS API request/response types
export interface GetTournamentTeamListRequest {
  TournamentNo: number;
  Fields?: string[];
}

export interface GetTournamentTeamListResponse {
  BeachTeams: {
    BeachTeam: VISTeamDTO[];
  };
}

export interface VISTeamDTO {
  no: number;
  player1Name: string;
  player2Name: string;
  player1No: number;
  player2No: number;
  seed: number | null;
  phaseCode: string;
  countryCode: string;
  status?: string;
  isWildCard?: boolean;
  isReserve?: boolean;
  gender: 'M' | 'W';
}
```

---

### Phase 2: VIS API Integration

**File**: `services/api/VisApiClient.ts` (add method)

```typescript
// 3. Add team list fetching method
export class VisApiClient {
  // ... existing methods ...

  async getTournamentTeamList(
    request: GetTournamentTeamListRequest
  ): Promise<GetTournamentTeamListResponse> {
    const fields = request.Fields || REQUIRED_TEAM_FIELDS;
    const xml = this.buildGetTournamentTeamListXML(request.TournamentNo, fields);

    const response = await this.executeRequest<GetTournamentTeamListResponse>(
      xml,
      'GetTournamentTeamList'
    );

    return response;
  }

  private buildGetTournamentTeamListXML(tournamentNo: number, fields: string[]): string {
    const fieldElements = fields.map(f => `<Field>${f}</Field>`).join('');
    return `
      <GetTournamentTeamList>
        <TournamentNo>${tournamentNo}</TournamentNo>
        <Fields>${fieldElements}</Fields>
      </GetTournamentTeamList>
    `;
  }
}

const REQUIRED_TEAM_FIELDS = [
  'No', 'Player1Name', 'Player2Name', 'Player1No', 'Player2No',
  'Seed', 'PhaseCode', 'CountryCode', 'Status', 'IsWildCard', 'IsReserve', 'Gender'
];
```

---

### Phase 3: Service Layer

**File**: `services/TournamentTeamService.ts` (create new)

```typescript
// 4. Create business logic service
import { CacheService } from './cache/CacheService';
import { VisApiClient } from './api/VisApiClient';
import { TournamentTeam } from '../types/tournament-team';

export class TournamentTeamService {
  private cacheService = CacheService.getInstance();
  private visApi: VisApiClient;

  constructor(visApi: VisApiClient) {
    this.visApi = visApi;
  }

  async getTeamList(tournamentNo: number): Promise<TournamentTeam[]> {
    const cacheKey = `team-list-${tournamentNo}`;
    const ttl = this.calculateTTL(tournamentNo);

    return await this.cacheService.get(
      cacheKey,
      async () => {
        const response = await this.visApi.getTournamentTeamList({
          TournamentNo: tournamentNo
        });
        return this.parseTeamListResponse(response, tournamentNo);
      },
      'tournament-team-list',
      ttl
    );
  }

  private calculateTTL(tournamentNo: number): number {
    // Implement adaptive TTL logic (see data-model.md)
    // For now, use fixed 24h
    return 24 * 60 * 60 * 1000;
  }

  private parseTeamListResponse(
    response: GetTournamentTeamListResponse,
    tournamentNo: number
  ): TournamentTeam[] {
    // Implement VIS DTO → Domain entity transformation
    // See data-model.md for normalization logic
    return [];
  }
}
```

---

### Phase 4: React Hook

**File**: `hooks/useTournamentTeams.ts` (create new)

```typescript
// 5. Create custom hook for component use
import { useState, useEffect, useMemo } from 'react';
import { TournamentTeam, TeamListFilter } from '../types/tournament-team';
import { TournamentTeamService } from '../services/TournamentTeamService';

export function useTournamentTeams(tournamentNo: number) {
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TeamListFilter>({
    gender: 'All',
    phase: 'All',
  });

  useEffect(() => {
    loadTeams();
  }, [tournamentNo]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamService = new TournamentTeamService(/* ... */);
      const data = await teamService.getTeamList(tournamentNo);
      setTeams(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const matchesGender = filter.gender === 'All' || team.gender === filter.gender;
      const matchesPhase = filter.phase === 'All' || team.phaseCode === filter.phase;
      return matchesGender && matchesPhase;
    });
  }, [teams, filter]);

  return {
    teams: filteredTeams,
    loading,
    error,
    filter,
    setFilter,
    refresh: loadTeams,
  };
}
```

---

### Phase 5: UI Components

**File**: `components/tournament/TeamListItem.tsx` (create new)

```typescript
// 6. Create team card component
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TournamentTeam } from '../../types/tournament-team';

interface TeamListItemProps {
  team: TournamentTeam;
  onPress: (team: TournamentTeam) => void;
}

export function TeamListItem({ team, onPress }: TeamListItemProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(team)}
      activeOpacity={0.7}
    >
      <View style={styles.seedContainer}>
        <Text style={styles.seed}>{team.seed || '-'}</Text>
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.playerName}>{team.player1.fullName}</Text>
        <Text style={styles.playerName}>{team.player2.fullName}</Text>
        <Text style={styles.country}>{team.countryCode}</Text>
      </View>
      {team.isWildCard && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>WC</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 80, // TEAM_CARD_HEIGHT constant
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  // ... more styles
});
```

**File**: `screens/TournamentTeamsScreen.tsx` (create new)

```typescript
// 7. Create screen with virtualized list
import React from 'react';
import { FlatList } from 'react-native';
import { useTournamentTeams } from '../hooks/useTournamentTeams';
import { TeamListItem } from '../components/tournament/TeamListItem';

export function TournamentTeamsScreen({ tournamentNo }: { tournamentNo: number }) {
  const { teams, loading, filter, setFilter, refresh } = useTournamentTeams(tournamentNo);

  return (
    <FlatList
      data={teams}
      renderItem={({ item }) => (
        <TeamListItem
          team={item}
          onPress={handleTeamPress}
        />
      )}
      keyExtractor={(item) => item.teamNo.toString()}
      getItemLayout={(data, index) => ({
        length: 80, // TEAM_CARD_HEIGHT
        offset: 80 * index,
        index,
      })}
      refreshing={loading}
      onRefresh={refresh}
    />
  );
}
```

---

## Testing Strategy

### Manual Testing Checklist

1. **Data Loading**
   - [ ] List loads from API on first visit
   - [ ] List loads from cache on subsequent visits
   - [ ] Pull-to-refresh forces API call

2. **Filtering**
   - [ ] Gender filter shows only selected gender
   - [ ] Phase filter shows only selected phase
   - [ ] Filters combine correctly (AND logic)

3. **Performance**
   - [ ] Scrolling at 60 FPS with 64+ teams
   - [ ] No jank when changing filters
   - [ ] Modal opens instantly

4. **Offline Mode**
   - [ ] Cached data shows when offline
   - [ ] Offline indicator appears
   - [ ] Refresh fails gracefully when offline

### Test Tournaments

Use these VIS tournaments for testing:
- **Tournament 12345**: Large tournament (50+ teams)
- **Tournament 67890**: Small tournament (<20 teams)
- **Tournament 11111**: Tournament with qualifications

---

## Common Pitfalls & Solutions

### Issue: FlatList Performance Poor

**Symptom**: Scrolling stutters with 30+ teams

**Solution**:
- Ensure `getItemLayout` is provided with constant height
- Check that `keyExtractor` returns stable keys
- Verify `removeClippedSubviews={true}` on Android

### Issue: Cache Not Working

**Symptom**: API called every time despite caching

**Solution**:
- Check cache key format matches pattern `team-list-${tournamentNo}`
- Verify TTL calculation returns valid number (not NaN or negative)
- Ensure CacheService.getInstance() is used (singleton pattern)

### Issue: VIS API Response Empty

**Symptom**: Response has no teams even though tournament has registrations

**Solution**:
- VIS API may return `<BeachTeam>` (single) instead of array for 1 team
- Normalize response to always be array: `Array.isArray(dto) ? dto : [dto]`
- Handle case where `BeachTeams.BeachTeam` is undefined (no teams registered yet)

---

## Next Steps

1. ✅ Review this quickstart guide
2. **Implement Phase 1**: Type definitions
3. **Implement Phase 2**: VIS API integration
4. **Implement Phase 3**: Service layer
5. **Implement Phase 4**: React hook
6. **Implement Phase 5**: UI components
7. **Run `/speckit.tasks`** to generate detailed task breakdown
8. **Follow task checklist** for complete implementation

## Resources

- **Feature Spec**: [spec.md](./spec.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contract**: [contracts/vis-api-team-list.yaml](./contracts/vis-api-team-list.yaml)
- **Research**: [research.md](./research.md)
- **VIS API Docs**: https://www.fivb.org/VisSDK/VisWebService/

## Getting Help

- Review existing similar implementations (e.g., `TournamentRefereeList.tsx`)
- Check `CLAUDE.md` for architecture patterns
- Consult `.specify/memory/constitution.md` for project principles
- Ask for code review early and often
