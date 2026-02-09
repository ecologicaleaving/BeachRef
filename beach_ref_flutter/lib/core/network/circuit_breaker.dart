/// Circuit breaker for API calls
/// 5 failures -> OPEN (block) -> 30s -> HALF_OPEN (try 1) -> 2 successes -> CLOSED
enum CircuitState { closed, open, halfOpen }

class CircuitBreaker {
  CircuitBreaker._();
  static final instance = CircuitBreaker._();

  static const _failureThreshold = 5;
  static const _recoveryTimeout = Duration(seconds: 30);
  static const _successThreshold = 2;

  CircuitState _state = CircuitState.closed;
  int _failureCount = 0;
  int _successCount = 0;
  DateTime? _openedAt;

  CircuitState get state => _state;
  bool get isOpen => _state == CircuitState.open;

  /// Check if a request is allowed through the circuit breaker.
  bool allowRequest() {
    switch (_state) {
      case CircuitState.closed:
        return true;

      case CircuitState.open:
        // Check if recovery timeout has elapsed
        if (_openedAt != null &&
            DateTime.now().difference(_openedAt!) > _recoveryTimeout) {
          _state = CircuitState.halfOpen;
          _successCount = 0;
          return true;
        }
        return false;

      case CircuitState.halfOpen:
        return true;
    }
  }

  /// Record a successful request.
  void recordSuccess() {
    switch (_state) {
      case CircuitState.halfOpen:
        _successCount++;
        if (_successCount >= _successThreshold) {
          _state = CircuitState.closed;
          _failureCount = 0;
          _successCount = 0;
          _openedAt = null;
        }
        break;

      case CircuitState.closed:
        _failureCount = 0;
        break;

      case CircuitState.open:
        break;
    }
  }

  /// Record a failed request.
  void recordFailure() {
    switch (_state) {
      case CircuitState.closed:
        _failureCount++;
        if (_failureCount >= _failureThreshold) {
          _state = CircuitState.open;
          _openedAt = DateTime.now();
        }
        break;

      case CircuitState.halfOpen:
        // Any failure in half-open immediately reopens
        _state = CircuitState.open;
        _openedAt = DateTime.now();
        _successCount = 0;
        break;

      case CircuitState.open:
        break;
    }
  }

  void reset() {
    _state = CircuitState.closed;
    _failureCount = 0;
    _successCount = 0;
    _openedAt = null;
  }
}
