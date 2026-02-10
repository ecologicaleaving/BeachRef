import 'package:flutter_test/flutter_test.dart';
import 'package:beach_ref_flutter/features/match/models/beach_match.dart';

void main() {
  group('Match Status Mapping', () {
    test('VIS numeric status 1 -> scheduled', () {
      expect(mapVisMatchStatus('1'), MatchDisplayStatus.scheduled);
    });

    test('VIS numeric status 2 -> readyToStart', () {
      expect(mapVisMatchStatus('2'), MatchDisplayStatus.readyToStart);
    });

    test('VIS numeric status 3-8 -> granular live statuses', () {
      expect(mapVisMatchStatus('3'), MatchDisplayStatus.inSet1);
      expect(mapVisMatchStatus('4'), MatchDisplayStatus.set1Finished);
      expect(mapVisMatchStatus('5'), MatchDisplayStatus.inSet2);
      expect(mapVisMatchStatus('6'), MatchDisplayStatus.set2Finished);
      expect(mapVisMatchStatus('7'), MatchDisplayStatus.inSet3);
      expect(mapVisMatchStatus('8'), MatchDisplayStatus.set3Finished);
    });

    test('VIS numeric status 3-8 all report isLive', () {
      for (var i = 3; i <= 8; i++) {
        expect(mapVisMatchStatus('$i').isLive, true);
      }
    });

    test('VIS numeric status 9+ -> finished variants', () {
      expect(mapVisMatchStatus('9'), MatchDisplayStatus.finished);
      expect(mapVisMatchStatus('10'), MatchDisplayStatus.finished);
      expect(mapVisMatchStatus('12'), MatchDisplayStatus.finished);
      expect(mapVisMatchStatus('13'), MatchDisplayStatus.officialResult);
      expect(mapVisMatchStatus('14'), MatchDisplayStatus.corrected);
      expect(mapVisMatchStatus('15'), MatchDisplayStatus.closed);
    });

    test('All finished variants report isFinished', () {
      expect(MatchDisplayStatus.finished.isFinished, true);
      expect(MatchDisplayStatus.officialResult.isFinished, true);
      expect(MatchDisplayStatus.corrected.isFinished, true);
      expect(MatchDisplayStatus.closed.isFinished, true);
    });

    test('String statuses map correctly', () {
      expect(mapVisMatchStatus('running').isLive, true);
      expect(mapVisMatchStatus('finished'), MatchDisplayStatus.finished);
      expect(mapVisMatchStatus('scheduled'), MatchDisplayStatus.scheduled);
    });

    test('Null/empty -> scheduled', () {
      expect(mapVisMatchStatus(null), MatchDisplayStatus.scheduled);
      expect(mapVisMatchStatus(''), MatchDisplayStatus.scheduled);
    });

    test('Extension isScheduled', () {
      expect(MatchDisplayStatus.scheduled.isScheduled, true);
      expect(MatchDisplayStatus.readyToStart.isScheduled, true);
      expect(MatchDisplayStatus.inSet1.isScheduled, false);
      expect(MatchDisplayStatus.finished.isScheduled, false);
    });

    test('Polling intervals', () {
      expect(MatchDisplayStatus.inSet1.pollingInterval,
          const Duration(seconds: 5));
      expect(MatchDisplayStatus.readyToStart.pollingInterval,
          const Duration(seconds: 15));
      expect(MatchDisplayStatus.scheduled.pollingInterval,
          const Duration(seconds: 60));
      expect(MatchDisplayStatus.finished.pollingInterval, Duration.zero);
      expect(MatchDisplayStatus.officialResult.pollingInterval, Duration.zero);
    });
  });
}
