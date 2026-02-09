import 'package:flutter_test/flutter_test.dart';
import 'package:beach_ref_flutter/features/match/models/beach_match.dart';

void main() {
  group('Match Status Mapping', () {
    test('VIS numeric status 1 -> scheduled', () {
      expect(mapVisMatchStatus('1'), MatchDisplayStatus.scheduled);
    });

    test('VIS numeric status 2 -> scheduled (ReadyToStart)', () {
      expect(mapVisMatchStatus('2'), MatchDisplayStatus.scheduled);
    });

    test('VIS numeric status 3-8 -> live', () {
      for (var i = 3; i <= 8; i++) {
        expect(mapVisMatchStatus('$i'), MatchDisplayStatus.live);
      }
    });

    test('VIS numeric status 9+ -> finished', () {
      expect(mapVisMatchStatus('9'), MatchDisplayStatus.finished);
      expect(mapVisMatchStatus('10'), MatchDisplayStatus.finished);
      expect(mapVisMatchStatus('12'), MatchDisplayStatus.finished);
    });

    test('String statuses map correctly', () {
      expect(mapVisMatchStatus('running'), MatchDisplayStatus.live);
      expect(mapVisMatchStatus('finished'), MatchDisplayStatus.finished);
      expect(mapVisMatchStatus('scheduled'), MatchDisplayStatus.scheduled);
    });

    test('Null/empty -> scheduled', () {
      expect(mapVisMatchStatus(null), MatchDisplayStatus.scheduled);
      expect(mapVisMatchStatus(''), MatchDisplayStatus.scheduled);
    });
  });
}
