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
 * Get mock schedule data for a tournament
 * This simulates the API call that will be implemented in Story 4.3
 */
export async function getMockScheduleData(tournamentCode: string): Promise<MockBeachMatch[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800))
  
  // Return mock data (in real implementation, this would fetch from VIS API)
  return mockScheduleData
}