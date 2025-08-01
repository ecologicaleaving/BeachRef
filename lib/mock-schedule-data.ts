/**
 * Mock Schedule Data for Story 4.1 Development
 * 
 * This provides mock match data structure for UI development.
 * Story 4.3 will replace this with real VIS API integration.
 */

export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

export interface MockBeachMatch {
  noInTournament: string        // "M001", "M002", etc.
  localDate: string            // "2025-08-15"
  localTime: string            // "09:00"
  teamAName: string            // "Smith/Jones"
  teamBName: string            // "Wilson/Davis"
  court: string                // "Court 1"
  status: MatchStatus
}

export interface MockBeachMatchDetail extends MockBeachMatch {
  // Additional fields for Story 4.2 (extends Story 4.1 structure)
  matchPointsA: number          // Sets won by Team A
  matchPointsB: number          // Sets won by Team B
  pointsTeamASet1: number       // Set 1 score for Team A
  pointsTeamBSet1: number       // Set 1 score for Team B
  pointsTeamASet2: number       // Set 2 score for Team A
  pointsTeamBSet2: number       // Set 2 score for Team B
  pointsTeamASet3?: number      // Set 3 score for Team A (optional)
  pointsTeamBSet3?: number      // Set 3 score for Team B (optional)
  durationSet1: string          // "32:15" (mm:ss format)
  durationSet2: string          // "28:43"
  durationSet3?: string         // Optional third set
  totalDuration: string         // "1:23:45" (h:mm:ss format)
  actualStartTime: string       // "09:15" (actual vs scheduled time)
  courtSurface: 'sand' | 'indoor' | 'grass'
  roundName: string             // "Pool A", "Quarterfinals", etc.
  phase: 'qualification' | 'mainDraw' | 'finals'
  teamASeed?: number            // Team A seeding
  teamBSeed?: number            // Team B seeding
  teamAConfederation?: string   // Team A confederation
  teamBConfederation?: string   // Team B confederation
  teamARanking?: number         // Team A ranking
  teamBRanking?: number         // Team B ranking
}

/**
 * Mock match data for comprehensive UI testing
 */
export const mockScheduleData: MockBeachMatch[] = [
  // Day 1 - August 15, 2025
  {
    noInTournament: "M001",
    localDate: "2025-08-15",
    localTime: "09:00",
    teamAName: "Smith/Jones",
    teamBName: "Wilson/Davis",
    court: "Court 1",
    status: "scheduled"
  },
  {
    noInTournament: "M002",
    localDate: "2025-08-15",
    localTime: "09:30",
    teamAName: "Anderson/Brown",
    teamBName: "Johnson/Miller",
    court: "Court 2",
    status: "live"
  },
  {
    noInTournament: "M003",
    localDate: "2025-08-15",
    localTime: "10:00",
    teamAName: "Taylor/Garcia",
    teamBName: "Martinez/Lopez",
    court: "Court 1",
    status: "completed"
  },
  {
    noInTournament: "M004",
    localDate: "2025-08-15",
    localTime: "10:30",
    teamAName: "White/Clark",
    teamBName: "Lewis/Walker",
    court: "Court 3",
    status: "cancelled"
  },
  {
    noInTournament: "M005",
    localDate: "2025-08-15",
    localTime: "11:00",
    teamAName: "Hall/Allen",
    teamBName: "Young/King",
    court: "Court 2",
    status: "scheduled"
  },

  // Day 2 - August 16, 2025
  {
    noInTournament: "M006",
    localDate: "2025-08-16",
    localTime: "08:30",
    teamAName: "Wright/Hill",
    teamBName: "Green/Adams",
    court: "Court 1",
    status: "scheduled"
  },
  {
    noInTournament: "M007",
    localDate: "2025-08-16",
    localTime: "09:00",
    teamAName: "Baker/Gonzalez",
    teamBName: "Nelson/Carter",
    court: "Court 2",
    status: "scheduled"
  },
  {
    noInTournament: "M008",
    localDate: "2025-08-16",
    localTime: "09:30",
    teamAName: "Mitchell/Perez",
    teamBName: "Roberts/Turner",
    court: "Court 3",
    status: "scheduled"
  },

  // Day 3 - August 17, 2025
  {
    noInTournament: "M009",
    localDate: "2025-08-17",
    localTime: "10:00",
    teamAName: "Phillips/Campbell",
    teamBName: "Parker/Evans",
    court: "Court 1",
    status: "scheduled"
  },
  {
    noInTournament: "M010",
    localDate: "2025-08-17",
    localTime: "11:00",
    teamAName: "Edwards/Collins",
    teamBName: "Stewart/Sanchez",
    court: "Court 2",
    status: "scheduled"
  }
]

/**
 * Group matches by date for accordion organization
 */
export function groupMatchesByDay(matches: MockBeachMatch[]): Record<string, MockBeachMatch[]> {
  return matches.reduce((groups, match) => {
    const date = match.localDate
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(match)
    return groups
  }, {} as Record<string, MockBeachMatch[]>)
}

/**
 * Format date for display in accordion headers
 */
export function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long', 
    day: 'numeric'
  })
}

/**
 * Sort matches by time within a day
 */
export function sortMatchesByTime(matches: MockBeachMatch[]): MockBeachMatch[] {
  return matches.sort((a, b) => a.localTime.localeCompare(b.localTime))
}

/**
 * Convert basic match to detailed match data
 * This simulates the detailed match data that would come from VIS API
 */
export function convertToDetailedMatch(match: MockBeachMatch): MockBeachMatchDetail {
  // Generate realistic detailed data based on match status
  const isCompleted = match.status === 'completed'
  
  return {
    ...match,
    matchPointsA: isCompleted ? Math.floor(Math.random() * 2) + 1 : 0,
    matchPointsB: isCompleted ? Math.floor(Math.random() * 2) + 1 : 0,
    pointsTeamASet1: isCompleted ? 15 + Math.floor(Math.random() * 10) : 0,
    pointsTeamBSet1: isCompleted ? 15 + Math.floor(Math.random() * 10) : 0,
    pointsTeamASet2: isCompleted ? 15 + Math.floor(Math.random() * 10) : 0,
    pointsTeamBSet2: isCompleted ? 15 + Math.floor(Math.random() * 10) : 0,
    pointsTeamASet3: isCompleted && Math.random() > 0.5 ? 10 + Math.floor(Math.random() * 8) : undefined,
    pointsTeamBSet3: isCompleted && Math.random() > 0.5 ? 10 + Math.floor(Math.random() * 8) : undefined,
    durationSet1: isCompleted ? `${20 + Math.floor(Math.random() * 20)}:${10 + Math.floor(Math.random() * 50)}` : "00:00",
    durationSet2: isCompleted ? `${20 + Math.floor(Math.random() * 20)}:${10 + Math.floor(Math.random() * 50)}` : "00:00",
    durationSet3: isCompleted && Math.random() > 0.5 ? `${15 + Math.floor(Math.random() * 10)}:${10 + Math.floor(Math.random() * 50)}` : undefined,
    totalDuration: isCompleted ? `1:${10 + Math.floor(Math.random() * 50)}:${10 + Math.floor(Math.random() * 50)}` : "0:00:00",
    actualStartTime: match.localTime, // For now, use scheduled time
    courtSurface: 'sand' as const,
    roundName: "Pool A",
    phase: 'qualification' as const,
    teamASeed: Math.floor(Math.random() * 20) + 1,
    teamBSeed: Math.floor(Math.random() * 20) + 1,
    teamAConfederation: "FIVB",
    teamBConfederation: "FIVB",
    teamARanking: Math.floor(Math.random() * 50) + 1,
    teamBRanking: Math.floor(Math.random() * 50) + 1,
  }
}

/**
 * Get mock schedule data for a tournament
 * This simulates the API call that will be implemented in Story 4.3
 */
export async function getMockScheduleData(tournamentCode: string): Promise<MockBeachMatch[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800))
  
  // Return mock data (in real implementation, this would fetch from VIS API)
  return mockScheduleData
}

/**
 * Get detailed match data for a specific match
 * This simulates the detailed match API call for the dialog
 */
export async function getMockMatchDetail(matchId: string): Promise<MockBeachMatchDetail> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Find the basic match data
  const basicMatch = mockScheduleData.find(match => match.noInTournament === matchId)
  if (!basicMatch) {
    throw new Error(`Match ${matchId} not found`)
  }
  
  // Convert to detailed match data
  return convertToDetailedMatch(basicMatch)
}