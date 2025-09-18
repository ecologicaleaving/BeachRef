// Simple test to verify status 2 to LIVE transition logic

// Mock data for testing
const createMockMatch = (id, courtNumber, scheduledDateTime, status, team1Name = "Team A", team2Name = "Team B") => ({
  id,
  court: { courtNumber },
  scheduledDateTime,
  status,
  rawStatus: status,
  team1: { teamName: team1Name },
  team2: { teamName: team2Name }
});

// Test scenarios
console.log('🧪 Testing Status 2 to LIVE Transition Logic\n');

// Test data: matches on same court in chronological order
const matches = [
  // Court 1 matches
  createMockMatch('match1', '1', '2024-01-15T10:00:00Z', 9),   // Finished
  createMockMatch('match2', '1', '2024-01-15T11:00:00Z', 2),   // ReadyToStart (should go LIVE)
  createMockMatch('match3', '1', '2024-01-15T12:00:00Z', 1),   // Scheduled (should NOT go LIVE)

  // Court 2 matches
  createMockMatch('match4', '2', '2024-01-15T10:00:00Z', 2),   // ReadyToStart, no previous (should go LIVE)
  createMockMatch('match5', '2', '2024-01-15T11:00:00Z', 2),   // ReadyToStart, previous not finished (should NOT go LIVE)

  // TBD matches (should never go LIVE)
  createMockMatch('match6', '3', '2024-01-15T10:00:00Z', 2, "TBD", "Team X"),
];

// Implement the function logic for testing
const canReadyToStartMatchGoLive = (match, allMatches) => {
  const matchStatus = match.rawStatus || match.status;
  const isReadyToStart = matchStatus === 2 || matchStatus === '2';

  if (!isReadyToStart) return false;
  if (match.team1.teamName === 'TBD' || match.team2.teamName === 'TBD') return false;

  const currentCourtNumber = match.court.courtNumber;
  const currentMatchTime = new Date(match.scheduledDateTime);

  const previousMatchesOnCourt = allMatches
    .filter(m => m.court.courtNumber === currentCourtNumber)
    .filter(m => {
      const matchTime = new Date(m.scheduledDateTime);
      return matchTime < currentMatchTime;
    })
    .sort((a, b) => new Date(b.scheduledDateTime).getTime() - new Date(a.scheduledDateTime).getTime());

  if (previousMatchesOnCourt.length === 0) return true;

  const mostRecentPreviousMatch = previousMatchesOnCourt[0];
  const previousMatchStatus = mostRecentPreviousMatch.rawStatus || mostRecentPreviousMatch.status;

  if (typeof previousMatchStatus === 'number') {
    return previousMatchStatus >= 9;
  }

  return false;
};

// Test each match
matches.forEach(match => {
  const canGoLive = canReadyToStartMatchGoLive(match, matches);
  const statusText = match.status === 2 ? 'ReadyToStart' :
                     match.status === 1 ? 'Scheduled' :
                     match.status >= 9 ? 'Finished' : `Status ${match.status}`;

  console.log(`${match.id} (Court ${match.court.courtNumber}): ${statusText} → ${canGoLive ? '🔴 CAN GO LIVE' : '⚪ Stay as scheduled'}`);
  console.log(`  Teams: ${match.team1.teamName} vs ${match.team2.teamName}`);
  console.log(`  Time: ${match.scheduledDateTime}`);
  console.log('');
});

console.log('✅ Test completed successfully!');