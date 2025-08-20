import { TournamentDateExtractor } from './TournamentDateExtractor';
import { Tournament } from '../types/tournament';

// Test function to validate date extraction functionality with new compact format and Sunday logic
export function testTournamentDateExtraction() {
  console.log('🧪 Testing TournamentDateExtractor with new format GG-GG/MM and auto Sunday end dates...\n');

  // Test Case 1: Tournament with direct StartDate/EndDate
  const tournamentWithDirectDates: Tournament = {
    No: '12345',
    Name: 'Beach Volleyball World Championship',
    StartDate: '2024-07-15',
    EndDate: '2024-07-21',
  };

  // Test Case 1b: Tournament with only StartDate (should auto-calculate Sunday)
  const tournamentWithOnlyStartDate: Tournament = {
    No: '12345b',
    Name: 'Hamburg Beach Open (Friday start)',
    StartDate: '2024-03-15', // Friday
  };

  const result1 = TournamentDateExtractor.extractTournamentDates(tournamentWithDirectDates);
  console.log('Test 1 - Direct StartDate/EndDate:', result1);
  console.log('Status:', TournamentDateExtractor.getTournamentStatus(result1));
  console.log('Is Active:', TournamentDateExtractor.isTournamentActive(result1));
  console.log('');

  const result1b = TournamentDateExtractor.extractTournamentDates(tournamentWithOnlyStartDate);
  console.log('Test 1b - Only StartDate (auto Sunday):', result1b);
  console.log('Status:', TournamentDateExtractor.getTournamentStatus(result1b));
  console.log('');

  // Test Case 2: Tournament with Dates field
  const tournamentWithDatesField: Tournament = {
    No: '12346',
    Name: 'European Beach Tour',
    Dates: '2024-08-10 - 2024-08-12',
  };

  const result2 = TournamentDateExtractor.extractTournamentDates(tournamentWithDatesField);
  console.log('Test 2 - Dates field:', result2);
  console.log('Status:', TournamentDateExtractor.getTournamentStatus(result2));
  console.log('');

  // Test Case 3: Tournament with date in name
  const tournamentWithNameDates: Tournament = {
    No: '12347',
    Name: 'Hamburg Beach Open 15-17 March 2024',
  };

  const result3 = TournamentDateExtractor.extractTournamentDates(tournamentWithNameDates);
  console.log('Test 3 - Date in name:', result3);
  console.log('Status:', TournamentDateExtractor.getTournamentStatus(result3));
  console.log('');

  // Test Case 4: Tournament with entry deadline only
  const tournamentWithDeadline: Tournament = {
    No: '12348',
    Name: 'Future Beach Tournament',
    EntryDeadline: '2024-09-01',
  };

  const result4 = TournamentDateExtractor.extractTournamentDates(tournamentWithDeadline);
  console.log('Test 4 - Entry deadline estimation:', result4);
  console.log('Status:', TournamentDateExtractor.getTournamentStatus(result4));
  console.log('');

  // Test Case 5: Tournament with merged tournaments
  const tournamentWithMerged: Tournament = {
    No: '12349',
    Name: 'Combined Tournament',
    _mergedTournaments: [
      {
        No: '12349M',
        Name: 'Men Tournament',
        Code: 'M2024BPT',
        StartDate: '2024-06-10',
        EndDate: '2024-06-12'
      },
      {
        No: '12349W',
        Name: 'Women Tournament', 
        Code: 'W2024BPT',
        StartDate: '2024-06-13',
        EndDate: '2024-06-15'
      }
    ]
  };

  const result5 = TournamentDateExtractor.extractTournamentDates(tournamentWithMerged);
  console.log('Test 5 - Merged tournaments:', result5);
  console.log('Status:', TournamentDateExtractor.getTournamentStatus(result5));
  console.log('');

  // Test Case 6: Tournament with no date information
  const tournamentWithNoDates: Tournament = {
    No: '12350',
    Name: 'Mystery Tournament',
  };

  const result6 = TournamentDateExtractor.extractTournamentDates(tournamentWithNoDates);
  console.log('Test 6 - No date information:', result6);
  console.log('Status:', TournamentDateExtractor.getTournamentStatus(result6));
  console.log('');

  // Test Case 7: Tournament with month/year in name
  const tournamentWithMonthYear: Tournament = {
    No: '12351',
    Name: 'Qatar Beach Volleyball Championship March 2024',
  };

  const result7 = TournamentDateExtractor.extractTournamentDates(tournamentWithMonthYear);
  console.log('Test 7 - Month/year in name:', result7);
  console.log('Status:', TournamentDateExtractor.getTournamentStatus(result7));
  console.log('');

  console.log('🧪 Testing complete!');
}

// Export for console testing
if (typeof window !== 'undefined') {
  (window as any).testTournamentDateExtraction = testTournamentDateExtraction;
}