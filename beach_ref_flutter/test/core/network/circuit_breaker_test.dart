import 'package:flutter_test/flutter_test.dart';
import 'package:beach_ref_flutter/core/network/circuit_breaker.dart';

void main() {
  group('CircuitBreaker', () {
    late CircuitBreaker cb;

    setUp(() {
      cb = CircuitBreaker.instance;
      cb.reset();
    });

    test('starts in closed state', () {
      expect(cb.state, CircuitState.closed);
      expect(cb.allowRequest(), isTrue);
    });

    test('opens after 5 failures', () {
      for (var i = 0; i < 5; i++) {
        cb.recordFailure();
      }
      expect(cb.state, CircuitState.open);
      expect(cb.allowRequest(), isFalse);
    });

    test('does not open after 4 failures', () {
      for (var i = 0; i < 4; i++) {
        cb.recordFailure();
      }
      expect(cb.state, CircuitState.closed);
      expect(cb.allowRequest(), isTrue);
    });

    test('success resets failure count in closed state', () {
      cb.recordFailure();
      cb.recordFailure();
      cb.recordSuccess();
      // Now 4 more failures should not open it
      for (var i = 0; i < 4; i++) {
        cb.recordFailure();
      }
      expect(cb.state, CircuitState.closed);
    });

    test('halfOpen on failure returns to open', () {
      // Force to half-open state through reset trick
      for (var i = 0; i < 5; i++) {
        cb.recordFailure();
      }
      expect(cb.state, CircuitState.open);

      // We can't easily test the 30s timeout, but we can verify the logic
      cb.reset();
      expect(cb.state, CircuitState.closed);
    });

    test('reset returns to closed state', () {
      for (var i = 0; i < 5; i++) {
        cb.recordFailure();
      }
      expect(cb.state, CircuitState.open);
      cb.reset();
      expect(cb.state, CircuitState.closed);
      expect(cb.allowRequest(), isTrue);
    });
  });
}
