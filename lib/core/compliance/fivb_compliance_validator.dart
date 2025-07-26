import 'dart:convert';
import '../errors/vis_error.dart';
import '../result.dart';
import '../logging/logger_service.dart';

/// FIVB Compliance Validator ensures adherence to FIVB VIS API guidelines
/// and competition regulations for data integrity and usage compliance.
class FIVBComplianceValidator {
  static final FIVBComplianceValidator _instance = FIVBComplianceValidator._internal();
  factory FIVBComplianceValidator() => _instance;
  FIVBComplianceValidator._internal();

  final LoggerService _logger = LoggerService();
  final List<ApiCallRecord> _apiCallHistory = [];
  final Duration _rateLimitInterval = const Duration(seconds: 30);
  int _apiCallCount = 0;
  DateTime? _lastApiCall;

  /// Validates API call compliance before execution
  Result<void, VisComplianceError> validateApiCall({
    required String endpoint,
    required String method,
  }) {
    final correlationId = _logger.generateCorrelationId();
    
    try {
      // Check rate limiting compliance
      final rateLimitResult = _validateRateLimit();
      if (rateLimitResult != null) {
        _logger.warning(
          'FIVB rate limit violation prevented',
          correlationId: correlationId,
          component: 'FIVB_COMPLIANCE',
          data: {
            'endpoint': endpoint,
            'method': method,
            'timeSinceLastCall': _lastApiCall != null 
                ? DateTime.now().difference(_lastApiCall!).inSeconds 
                : null,
          },
        );
        return Error(rateLimitResult);
      }

      // Validate endpoint against allowed FIVB endpoints
      final endpointResult = _validateEndpoint(endpoint);
      if (endpointResult != null) {
        return Error(endpointResult);
      }

      // Log compliance validation success
      _logger.info(
        'FIVB API call validated successfully',
        correlationId: correlationId,
        component: 'FIVB_COMPLIANCE',
        data: {
          'endpoint': endpoint,
          'method': method,
          'apiCallCount': _apiCallCount,
        },
      );

      return const Success(null);
    } catch (e) {
      return Error(VisComplianceError(
        'Compliance validation failed',
        'Unexpected error during validation: $e',
      ));
    }
  }

  /// Records API call for compliance tracking
  void recordApiCall({
    required String endpoint,
    required String method,
    required int statusCode,
    required int responseTimeMs,
    String? correlationId,
  }) {
    final now = DateTime.now();
    final record = ApiCallRecord(
      timestamp: now,
      endpoint: endpoint,
      method: method,
      statusCode: statusCode,
      responseTimeMs: responseTimeMs,
      correlationId: correlationId,
    );

    _apiCallHistory.add(record);
    _apiCallCount++;
    _lastApiCall = now;

    // Keep only last 1000 records for memory management
    if (_apiCallHistory.length > 1000) {
      _apiCallHistory.removeAt(0);
    }

    // Log for FIVB audit requirements
    _logger.info(
      'FIVB API call recorded',
      correlationId: correlationId,
      component: 'FIVB_AUDIT',
      data: {
        'endpoint': endpoint,
        'method': method,
        'statusCode': statusCode,
        'responseTimeMs': responseTimeMs,
        'totalApiCalls': _apiCallCount,
      },
    );
  }

  /// Validates tournament data integrity against FIVB schemas
  Result<void, VisComplianceError> validateTournamentData(Map<String, dynamic> data) {
    try {
      // Required FIVB tournament fields
      const requiredFields = [
        'id', 'vis_id', 'name', 'location', 
        'start_date', 'end_date', 'competition_level', 'status'
      ];

      for (final field in requiredFields) {
        if (!data.containsKey(field) || data[field] == null) {
          return Error(VisComplianceError(
            'FIVB data integrity violation',
            'Missing required field: $field',
          ));
        }
      }

      // Validate VIS ID format (must be string and non-empty)
      final visId = data['vis_id'];
      if (visId is! String || visId.isEmpty) {
        return Error(VisComplianceError(
          'FIVB data integrity violation',
          'Invalid VIS ID format: must be non-empty string',
        ));
      }

      // Validate date formats
      try {
        DateTime.parse(data['start_date'] as String);
        DateTime.parse(data['end_date'] as String);
      } catch (e) {
        return Error(VisComplianceError(
          'FIVB data integrity violation',
          'Invalid date format in tournament data: $e',
        ));
      }

      // Validate competition level
      final competitionLevel = data['competition_level'] as String;
      const validLevels = [
        'International', 'National', 'Regional', 'Local', 'Junior', 'Youth'
      ];
      if (!validLevels.contains(competitionLevel)) {
        return Error(VisComplianceError(
          'FIVB data integrity violation',
          'Invalid competition level: $competitionLevel',
        ));
      }

      return const Success(null);
    } catch (e) {
      return Error(VisComplianceError(
        'FIVB data validation failed',
        'Error validating tournament data: $e',
      ));
    }
  }

  /// Generates usage report for FIVB requirements
  Map<String, dynamic> generateUsageReport({
    DateTime? startDate,
    DateTime? endDate,
  }) {
    final start = startDate ?? DateTime.now().subtract(const Duration(days: 30));
    final end = endDate ?? DateTime.now();

    final relevantCalls = _apiCallHistory
        .where((call) => call.timestamp.isAfter(start) && call.timestamp.isBefore(end))
        .toList();

    final groupedByEndpoint = <String, List<ApiCallRecord>>{};
    for (final call in relevantCalls) {
      groupedByEndpoint.putIfAbsent(call.endpoint, () => []).add(call);
    }

    final endpointStats = <String, Map<String, dynamic>>{};
    for (final entry in groupedByEndpoint.entries) {
      final calls = entry.value;
      endpointStats[entry.key] = {
        'totalCalls': calls.length,
        'avgResponseTime': calls.map((c) => c.responseTimeMs).reduce((a, b) => a + b) / calls.length,
        'successRate': calls.where((c) => c.statusCode >= 200 && c.statusCode < 300).length / calls.length,
        'errorCalls': calls.where((c) => c.statusCode >= 400).length,
      };
    }

    return {
      'reportPeriod': {
        'startDate': start.toIso8601String(),
        'endDate': end.toIso8601String(),
      },
      'summary': {
        'totalApiCalls': relevantCalls.length,
        'uniqueEndpoints': groupedByEndpoint.keys.length,
        'avgResponseTime': relevantCalls.isNotEmpty 
            ? relevantCalls.map((c) => c.responseTimeMs).reduce((a, b) => a + b) / relevantCalls.length
            : 0,
      },
      'endpointStats': endpointStats,
      'complianceStatus': {
        'rateLimitViolations': 0, // Would track violations if any occurred
        'dataIntegrityFailures': 0, // Would track validation failures
        'lastComplianceCheck': DateTime.now().toIso8601String(),
      },
    };
  }

  /// Validates rate limiting compliance
  VisComplianceError? _validateRateLimit() {
    if (_lastApiCall != null) {
      final timeSinceLastCall = DateTime.now().difference(_lastApiCall!);
      if (timeSinceLastCall < _rateLimitInterval) {
        final waitTime = _rateLimitInterval - timeSinceLastCall;
        return VisComplianceError(
          'FIVB rate limit violation',
          'Must wait ${waitTime.inSeconds}s before next API call (FIVB requirement: 30s minimum)',
        );
      }
    }
    return null;
  }

  /// Validates endpoint against FIVB allowed endpoints
  VisComplianceError? _validateEndpoint(String endpoint) {
    const allowedEndpoints = [
      '/tournaments',
      '/matches',
      '/referees',
      '/teams',
      '/players',
      '/statistics',
    ];

    final normalizedEndpoint = endpoint.split('?').first; // Remove query params
    if (!allowedEndpoints.any((allowed) => normalizedEndpoint.startsWith(allowed))) {
      return VisComplianceError(
        'FIVB endpoint violation',
        'Endpoint not allowed by FIVB VIS API: $endpoint',
      );
    }

    return null;
  }

  /// Clears compliance history (for testing purposes)
  void clearHistory() {
    _apiCallHistory.clear();
    _apiCallCount = 0;
    _lastApiCall = null;
  }

  /// Gets current compliance statistics
  Map<String, dynamic> getComplianceStats() {
    return {
      'totalApiCalls': _apiCallCount,
      'lastApiCall': _lastApiCall?.toIso8601String(),
      'currentHistorySize': _apiCallHistory.length,
      'rateLimitStatus': _lastApiCall != null 
          ? DateTime.now().difference(_lastApiCall!).inSeconds >= 30
          : true,
    };
  }
}

/// Record of API call for compliance tracking
class ApiCallRecord {
  final DateTime timestamp;
  final String endpoint;
  final String method;
  final int statusCode;
  final int responseTimeMs;
  final String? correlationId;

  const ApiCallRecord({
    required this.timestamp,
    required this.endpoint,
    required this.method,
    required this.statusCode,
    required this.responseTimeMs,
    this.correlationId,
  });

  Map<String, dynamic> toJson() {
    return {
      'timestamp': timestamp.toIso8601String(),
      'endpoint': endpoint,
      'method': method,
      'statusCode': statusCode,
      'responseTimeMs': responseTimeMs,
      if (correlationId != null) 'correlationId': correlationId,
    };
  }
}