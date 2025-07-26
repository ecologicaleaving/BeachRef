class TestData {
  static const Map<String, dynamic> sampleUser = {
    'id': '123e4567-e89b-12d3-a456-426614174000',
    'email': 'test@example.com',
    'name': 'Test User',
    'role': 'referee',
    'created_at': '2024-01-01T00:00:00Z',
  };
  
  static const Map<String, dynamic> sampleMatch = {
    'id': 'match-123',
    'tournament_id': 'tournament-456',
    'team_a': 'Team Alpha',
    'team_b': 'Team Beta',
    'status': 'scheduled',
    'court': 'Court 1',
    'scheduled_time': '2024-07-26T14:00:00Z',
  };
  
  static const Map<String, dynamic> sampleTournament = {
    'id': 'tournament-456',
    'name': 'Beach Championship 2024',
    'location': 'Miami Beach',
    'start_date': '2024-07-25',
    'end_date': '2024-07-28',
    'status': 'active',
  };
  
  static const List<String> validEmails = [
    'test@example.com',
    'user.name+tag@domain.co.uk',
    'referee@beachvolleyball.org',
  ];
  
  static const List<String> invalidEmails = [
    'invalid.email',
    'test@',
    '@domain.com',
    '',
  ];
}