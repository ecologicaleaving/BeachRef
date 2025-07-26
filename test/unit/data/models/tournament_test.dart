import 'package:flutter_test/flutter_test.dart';
import 'package:beachref/data/models/tournament.dart';

void main() {
  group('Tournament', () {
    final now = DateTime.now();
    final tournament = Tournament(
      id: 'test-id',
      visId: 'vis-123',
      name: 'Test Tournament',
      location: 'Test Location',
      startDate: now,
      endDate: now.add(const Duration(days: 3)),
      competitionLevel: 'World Tour',
      tournamentType: 'Main Draw',
      status: TournamentStatus.scheduled,
      teams: const [
        Team(id: 'team1', name: 'Team A', players: ['Player 1', 'Player 2']),
        Team(id: 'team2', name: 'Team B', players: ['Player 3', 'Player 4']),
      ],
      lastUpdated: now,
      createdAt: now,
      updatedAt: now,
    );

    group('constructor', () {
      test('creates tournament with all required properties', () {
        expect(tournament.id, 'test-id');
        expect(tournament.visId, 'vis-123');
        expect(tournament.name, 'Test Tournament');
        expect(tournament.location, 'Test Location');
        expect(tournament.competitionLevel, 'World Tour');
        expect(tournament.tournamentType, 'Main Draw');
        expect(tournament.status, TournamentStatus.scheduled);
        expect(tournament.teams.length, 2);
      });
    });

    group('fromJson', () {
      test('creates tournament from valid JSON', () {
        final json = {
          'id': 'test-id',
          'vis_id': 'vis-123',
          'name': 'Test Tournament',
          'location': 'Test Location',
          'start_date': now.toIso8601String(),
          'end_date': now.add(const Duration(days: 3)).toIso8601String(),
          'competition_level': 'World Tour',
          'tournament_type': 'Main Draw',
          'status': 'scheduled',
          'teams': [
            {
              'id': 'team1',
              'name': 'Team A',
              'players': ['Player 1', 'Player 2']
            }
          ],
          'last_updated': now.toIso8601String(),
          'created_at': now.toIso8601String(),
          'updated_at': now.toIso8601String(),
        };

        final result = Tournament.fromJson(json);

        expect(result.id, 'test-id');
        expect(result.visId, 'vis-123');
        expect(result.name, 'Test Tournament');
        expect(result.status, TournamentStatus.scheduled);
        expect(result.teams.length, 1);
        expect(result.teams.first.name, 'Team A');
      });

      test('handles null teams gracefully', () {
        final json = {
          'id': 'test-id',
          'vis_id': 'vis-123',
          'name': 'Test Tournament',
          'location': 'Test Location',
          'start_date': now.toIso8601String(),
          'end_date': now.add(const Duration(days: 3)).toIso8601String(),
          'competition_level': 'World Tour',
          'tournament_type': 'Main Draw',
          'status': 'scheduled',
          'teams': null,
          'last_updated': now.toIso8601String(),
          'created_at': now.toIso8601String(),
          'updated_at': now.toIso8601String(),
        };

        final result = Tournament.fromJson(json);
        expect(result.teams, isEmpty);
      });

      test('handles missing last_updated gracefully', () {
        final json = {
          'id': 'test-id',
          'vis_id': 'vis-123',
          'name': 'Test Tournament',
          'location': 'Test Location',
          'start_date': now.toIso8601String(),
          'end_date': now.add(const Duration(days: 3)).toIso8601String(),
          'competition_level': 'World Tour',
          'tournament_type': 'Main Draw',
          'status': 'scheduled',
          'teams': [],
          'created_at': now.toIso8601String(),
          'updated_at': now.toIso8601String(),
        };

        final result = Tournament.fromJson(json);
        expect(result.lastUpdated, isA<DateTime>());
      });
    });

    group('toJson', () {
      test('converts tournament to valid JSON', () {
        final json = tournament.toJson();

        expect(json['id'], 'test-id');
        expect(json['vis_id'], 'vis-123');
        expect(json['name'], 'Test Tournament');
        expect(json['location'], 'Test Location');
        expect(json['competition_level'], 'World Tour');
        expect(json['tournament_type'], 'Main Draw');
        expect(json['status'], 'scheduled');
        expect(json['teams'], isA<List>());
        expect((json['teams'] as List).length, 2);
        expect(json['start_date'], isA<String>());
        expect(json['end_date'], isA<String>());
        expect(json['last_updated'], isA<String>());
        expect(json['created_at'], isA<String>());
        expect(json['updated_at'], isA<String>());
      });
    });

    group('equality', () {
      test('returns true for identical tournaments', () {
        final other = Tournament(
          id: 'test-id',
          visId: 'vis-123',
          name: 'Test Tournament',
          location: 'Test Location',
          startDate: now,
          endDate: now.add(const Duration(days: 3)),
          competitionLevel: 'World Tour',
          tournamentType: 'Main Draw',
          status: TournamentStatus.scheduled,
          teams: const [
            Team(id: 'team1', name: 'Team A', players: ['Player 1', 'Player 2']),
            Team(id: 'team2', name: 'Team B', players: ['Player 3', 'Player 4']),
          ],
          lastUpdated: now,
          createdAt: now,
          updatedAt: now,
        );

        expect(tournament == other, isTrue);
        expect(tournament.hashCode, other.hashCode);
      });

      test('returns false for different tournaments', () {
        final other = Tournament(
          id: 'different-id',
          visId: 'vis-123',
          name: 'Test Tournament',
          location: 'Test Location',
          startDate: now,
          endDate: now.add(const Duration(days: 3)),
          competitionLevel: 'World Tour',
          tournamentType: 'Main Draw',
          status: TournamentStatus.scheduled,
          teams: const [],
          lastUpdated: now,
          createdAt: now,
          updatedAt: now,
        );

        expect(tournament == other, isFalse);
      });
    });

    group('toString', () {
      test('returns readable string representation', () {
        final result = tournament.toString();
        expect(result, contains('test-id'));
        expect(result, contains('Test Tournament'));
        expect(result, contains('Test Location'));
        expect(result, contains('scheduled'));
      });
    });
  });

  group('TournamentStatus', () {
    test('fromString returns correct status', () {
      expect(TournamentStatus.fromString('scheduled'), TournamentStatus.scheduled);
      expect(TournamentStatus.fromString('active'), TournamentStatus.active);
      expect(TournamentStatus.fromString('completed'), TournamentStatus.completed);
      expect(TournamentStatus.fromString('cancelled'), TournamentStatus.cancelled);
    });

    test('fromString returns scheduled for unknown status', () {
      expect(TournamentStatus.fromString('unknown'), TournamentStatus.scheduled);
      expect(TournamentStatus.fromString(''), TournamentStatus.scheduled);
    });

    test('value returns correct string', () {
      expect(TournamentStatus.scheduled.value, 'scheduled');
      expect(TournamentStatus.active.value, 'active');
      expect(TournamentStatus.completed.value, 'completed');
      expect(TournamentStatus.cancelled.value, 'cancelled');
    });
  });

  group('Team', () {
    const team = Team(
      id: 'team-1',
      name: 'Test Team',
      players: ['Player 1', 'Player 2'],
    );

    group('constructor', () {
      test('creates team with all properties', () {
        expect(team.id, 'team-1');
        expect(team.name, 'Test Team');
        expect(team.players.length, 2);
        expect(team.players, contains('Player 1'));
        expect(team.players, contains('Player 2'));
      });
    });

    group('fromJson', () {
      test('creates team from valid JSON', () {
        final json = {
          'id': 'team-1',
          'name': 'Test Team',
          'players': ['Player 1', 'Player 2'],
        };

        final result = Team.fromJson(json);

        expect(result.id, 'team-1');
        expect(result.name, 'Test Team');
        expect(result.players.length, 2);
      });

      test('handles null players gracefully', () {
        final json = {
          'id': 'team-1',
          'name': 'Test Team',
          'players': null,
        };

        final result = Team.fromJson(json);
        expect(result.players, isEmpty);
      });
    });

    group('toJson', () {
      test('converts team to valid JSON', () {
        final json = team.toJson();

        expect(json['id'], 'team-1');
        expect(json['name'], 'Test Team');
        expect(json['players'], isA<List<String>>());
        expect((json['players'] as List).length, 2);
      });
    });

    group('equality', () {
      test('returns true for identical teams', () {
        const other = Team(
          id: 'team-1',
          name: 'Test Team',
          players: ['Player 1', 'Player 2'],
        );

        expect(team == other, isTrue);
        expect(team.hashCode, other.hashCode);
      });

      test('returns false for different teams', () {
        const other = Team(
          id: 'team-2',
          name: 'Test Team',
          players: ['Player 1', 'Player 2'],
        );

        expect(team == other, isFalse);
      });
    });

    group('toString', () {
      test('returns readable string representation', () {
        final result = team.toString();
        expect(result, contains('team-1'));
        expect(result, contains('Test Team'));
      });
    });
  });
}