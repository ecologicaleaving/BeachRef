import 'package:flutter_test/flutter_test.dart';
import 'package:beachref/app/app.dart';

void main() {
  group('Main Function Tests', () {
    test('BeachRefApp should be instantiable', () {
      expect(() => const BeachRefApp(), returnsNormally);
    });
  });
}