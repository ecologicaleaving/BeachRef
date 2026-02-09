import 'package:flutter_test/flutter_test.dart';
import 'package:beach_ref_flutter/features/match/models/beach_match.dart';

void main() {
  group('BeachMatch', () {
    test('timeDisplay formats correctly', () {
      const match = BeachMatch(
        no: '1', noInTournament: '1', localDate: '2026-02-08',
        localTime: '14:30:00', status: '1', court: '1',
        teamAName: 'Team A', teamBName: 'Team B',
        teamAFederationCode: 'USA', teamBFederationCode: 'BRA',
        matchPointsA: null, matchPointsB: null,
        roundName: 'Pool A', round: '1', roundPhase: '',
        referee1Name: 'John', referee2Name: 'Jane',
        referee1FederationCode: 'ITA', referee2FederationCode: 'FRA',
        refereeChallengeName: '',
        pointsTeamASet1: null, pointsTeamBSet1: null,
        pointsTeamASet2: null, pointsTeamBSet2: null,
        pointsTeamASet3: null, pointsTeamBSet3: null,
        durationSet1: '', durationSet2: '', durationSet3: '',
        resultType: '', noEvent: '100',
      );

      expect(match.timeDisplay, '14:30');
      expect(match.courtDisplay, 'Court 1');
      expect(match.displayStatus, MatchDisplayStatus.scheduled);
      expect(match.isLive, isFalse);
      expect(match.isFinished, isFalse);
    });

    test('scoreDisplay with points', () {
      const match = BeachMatch(
        no: '1', noInTournament: '1', localDate: '', localTime: '',
        status: '9', court: '1',
        teamAName: 'Team A', teamBName: 'Team B',
        teamAFederationCode: '', teamBFederationCode: '',
        matchPointsA: 2, matchPointsB: 1,
        roundName: '', round: '', roundPhase: '',
        referee1Name: '', referee2Name: '',
        referee1FederationCode: '', referee2FederationCode: '',
        refereeChallengeName: '',
        pointsTeamASet1: 21, pointsTeamBSet1: 19,
        pointsTeamASet2: 15, pointsTeamBSet2: 21,
        pointsTeamASet3: 15, pointsTeamBSet3: 10,
        durationSet1: '22\'', durationSet2: '25\'', durationSet3: '18\'',
        resultType: 'Normal', noEvent: '',
      );

      expect(match.scoreDisplay, '2-1');
      expect(match.isFinished, isTrue);
      expect(match.setScores.length, 3);
      expect(match.setScores[0].teamA, 21);
      expect(match.setScores[0].teamB, 19);
      expect(match.setScores[2].teamA, 15);
      expect(match.setScores[2].teamB, 10);
    });

    test('empty score display when no points', () {
      const match = BeachMatch(
        no: '1', noInTournament: '', localDate: '', localTime: '',
        status: '1', court: '',
        teamAName: 'TBD', teamBName: 'TBD',
        teamAFederationCode: '', teamBFederationCode: '',
        matchPointsA: null, matchPointsB: null,
        roundName: '', round: '', roundPhase: '',
        referee1Name: '', referee2Name: '',
        referee1FederationCode: '', referee2FederationCode: '',
        refereeChallengeName: '',
        pointsTeamASet1: null, pointsTeamBSet1: null,
        pointsTeamASet2: null, pointsTeamBSet2: null,
        pointsTeamASet3: null, pointsTeamBSet3: null,
        durationSet1: '', durationSet2: '', durationSet3: '',
        resultType: '', noEvent: '',
      );

      expect(match.scoreDisplay, '');
      expect(match.setScores, isEmpty);
    });
  });

  group('canReadyToStartGoLive', () {
    BeachMatch makeMatch({
      required String no,
      required String status,
      required String court,
      required String date,
      required String time,
      String teamA = 'Team A',
      String teamB = 'Team B',
    }) {
      return BeachMatch(
        no: no, noInTournament: '', localDate: date, localTime: time,
        status: status, court: court,
        teamAName: teamA, teamBName: teamB,
        teamAFederationCode: '', teamBFederationCode: '',
        matchPointsA: null, matchPointsB: null,
        roundName: '', round: '', roundPhase: '',
        referee1Name: '', referee2Name: '',
        referee1FederationCode: '', referee2FederationCode: '',
        refereeChallengeName: '',
        pointsTeamASet1: null, pointsTeamBSet1: null,
        pointsTeamASet2: null, pointsTeamBSet2: null,
        pointsTeamASet3: null, pointsTeamBSet3: null,
        durationSet1: '', durationSet2: '', durationSet3: '',
        resultType: '', noEvent: '',
      );
    }

    test('returns false for non-status-2 match', () {
      final match = makeMatch(
        no: '1', status: '1', court: '1',
        date: '2026-02-08', time: '14:00:00',
      );
      expect(canReadyToStartGoLive(match, [match]), isFalse);
    });

    test('returns false for TBD teams', () {
      final match = makeMatch(
        no: '1', status: '2', court: '1',
        date: '2026-02-08', time: '14:00:00',
        teamA: 'TBD', teamB: 'TBD',
      );
      expect(canReadyToStartGoLive(match, [match]), isFalse);
    });

    test('returns true when no previous match on court', () {
      final match = makeMatch(
        no: '1', status: '2', court: '1',
        date: '2026-02-08', time: '14:00:00',
      );
      expect(canReadyToStartGoLive(match, [match]), isTrue);
    });

    test('returns true when previous match on court is finished', () {
      final prev = makeMatch(
        no: '1', status: '9', court: '1',
        date: '2026-02-08', time: '12:00:00',
      );
      final current = makeMatch(
        no: '2', status: '2', court: '1',
        date: '2026-02-08', time: '14:00:00',
      );
      expect(canReadyToStartGoLive(current, [prev, current]), isTrue);
    });

    test('returns false when previous match on court is still running', () {
      final prev = makeMatch(
        no: '1', status: '3', court: '1',
        date: '2026-02-08', time: '12:00:00',
      );
      final current = makeMatch(
        no: '2', status: '2', court: '1',
        date: '2026-02-08', time: '14:00:00',
      );
      expect(canReadyToStartGoLive(current, [prev, current]), isFalse);
    });
  });

  group('Tournament model', () {
    test('toJson and fromJson roundtrip', () {
      const match = BeachMatch(
        no: '42', noInTournament: '7', localDate: '2026-03-15',
        localTime: '10:00:00', status: '5', court: '2',
        teamAName: 'Brazil', teamBName: 'USA',
        teamAFederationCode: 'BRA', teamBFederationCode: 'USA',
        matchPointsA: 1, matchPointsB: 0,
        roundName: 'Semifinal', round: '3', roundPhase: 'Elimination',
        referee1Name: 'Smith', referee2Name: 'Jones',
        referee1FederationCode: 'GBR', referee2FederationCode: 'AUS',
        refereeChallengeName: 'Lee',
        pointsTeamASet1: 21, pointsTeamBSet1: 18,
        pointsTeamASet2: null, pointsTeamBSet2: null,
        pointsTeamASet3: null, pointsTeamBSet3: null,
        durationSet1: '20\'', durationSet2: '', durationSet3: '',
        resultType: '', noEvent: '200',
      );

      final json = match.toJson();
      final restored = BeachMatch.fromJson(json);

      expect(restored.no, '42');
      expect(restored.teamAName, 'Brazil');
      expect(restored.matchPointsA, 1);
      expect(restored.pointsTeamASet1, 21);
      expect(restored.referee1Name, 'Smith');
    });
  });
}
