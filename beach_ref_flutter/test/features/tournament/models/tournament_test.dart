import 'package:flutter_test/flutter_test.dart';
import 'package:beach_ref_flutter/features/tournament/models/tournament.dart';

void main() {
  group('Tournament', () {
    test('genderText maps correctly', () {
      expect(
        const Tournament(
          no: '1', name: 'Test', city: 'City', countryCode: 'US',
          startDate: '2026-01-01', endDate: '2026-01-05',
          status: 'Running', gender: '1',
        ).genderText,
        'M',
      );
      expect(
        const Tournament(
          no: '1', name: 'Test', city: 'City', countryCode: 'US',
          startDate: '2026-01-01', endDate: '2026-01-05',
          status: 'Running', gender: '2',
        ).genderText,
        'W',
      );
    });

    test('dateRange formats correctly', () {
      const t = Tournament(
        no: '1', name: 'Test', city: 'City', countryCode: 'US',
        startDate: '2026-03-15', endDate: '2026-03-20',
        status: '', gender: 'M',
      );
      expect(t.dateRange, 'Mar 15 - Mar 20');
    });

    test('dateRange for single day', () {
      const t = Tournament(
        no: '1', name: 'Test', city: 'City', countryCode: 'US',
        startDate: '2026-06-01', endDate: '2026-06-01',
        status: '', gender: 'W',
      );
      expect(t.dateRange, 'Jun 1');
    });

    test('monthYearKey groups correctly', () {
      const t = Tournament(
        no: '1', name: 'Test', city: 'City', countryCode: 'US',
        startDate: '2026-02-15', endDate: '2026-02-20',
        status: '', gender: '',
      );
      expect(t.monthYearKey, 'February 2026');
    });

    test('toJson and fromJson roundtrip', () {
      const original = Tournament(
        no: '42', name: 'World Championship', city: 'Rome',
        countryCode: 'ITA', startDate: '2026-07-01',
        endDate: '2026-07-10', status: 'Scheduled', gender: '1',
      );

      final json = original.toJson();
      final restored = Tournament.fromJson(json);

      expect(restored.no, '42');
      expect(restored.name, 'World Championship');
      expect(restored.city, 'Rome');
      expect(restored.countryCode, 'ITA');
      expect(restored.gender, '1');
    });
  });
}
