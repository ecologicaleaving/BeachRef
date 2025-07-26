import 'package:flutter_test/flutter_test.dart';
import 'package:beachref/core/compliance/fivb_compliance_validator.dart';
import 'package:beachref/core/errors/vis_error.dart';

void main() {
  group('FIVBComplianceValidator Tests', () {
    late FIVBComplianceValidator validator;

    setUp(() {
      validator = FIVBComplianceValidator();
      validator.clearHistory(); // Ensure clean state
    });

    group('validateApiCall', () {
      test('should allow valid API call', () {
        // Act
        final result = validator.validateApiCall(
          endpoint: '/tournaments',
          method: 'GET',
        );

        // Assert
        expect(result.isSuccess, isTrue);
      });

      test('should reject invalid endpoint', () {
        // Act
        final result = validator.validateApiCall(
          endpoint: '/invalid-endpoint',
          method: 'GET',
        );

        // Assert
        expect(result.isError, isTrue);
        expect(result.error, isA<VisComplianceError>());
        expect(result.error.message, contains('endpoint violation'));
      });

      test('should enforce rate limiting between calls', () async {
        // Arrange - First call should succeed
        final result1 = validator.validateApiCall(
          endpoint: '/tournaments',
          method: 'GET',
        );
        
        // Record first call to establish timing
        validator.recordApiCall(
          endpoint: '/tournaments',
          method: 'GET',
          statusCode: 200,
          responseTimeMs: 100,
        );

        // Act - Immediate second call should be rate limited
        final result2 = validator.validateApiCall(
          endpoint: '/tournaments',
          method: 'GET',
        );

        // Assert
        expect(result1.isSuccess, isTrue);
        expect(result2.isError, isTrue);
        expect(result2.error, isA<VisComplianceError>());
        expect(result2.error.message, contains('rate limit violation'));
      });
    });

    group('validateTournamentData', () {
      test('should validate complete tournament data', () {
        // Arrange
        final validTournament = {
          'id': '1',
          'vis_id': 'vis_123',
          'name': 'Beach Championship',
          'location': 'Miami Beach',
          'start_date': '2024-07-25T00:00:00Z',
          'end_date': '2024-07-28T00:00:00Z',
          'competition_level': 'International',
          'status': 'active',
        };

        // Act
        final result = validator.validateTournamentData(validTournament);

        // Assert
        expect(result.isSuccess, isTrue);
      });

      test('should reject tournament data with missing required fields', () {
        // Arrange
        final invalidTournament = {
          'id': '1',
          'name': 'Beach Championship',
          // Missing vis_id, location, dates, etc.
        };

        // Act
        final result = validator.validateTournamentData(invalidTournament);

        // Assert
        expect(result.isError, isTrue);
        expect(result.error, isA<VisComplianceError>());
        expect(result.error.details, contains('Missing required field'));
      });

      test('should reject tournament with invalid VIS ID', () {
        // Arrange
        final invalidTournament = {
          'id': '1',
          'vis_id': '', // Empty VIS ID
          'name': 'Beach Championship',
          'location': 'Miami Beach',
          'start_date': '2024-07-25T00:00:00Z',
          'end_date': '2024-07-28T00:00:00Z',
          'competition_level': 'International',
          'status': 'active',
        };

        // Act
        final result = validator.validateTournamentData(invalidTournament);

        // Assert
        expect(result.isError, isTrue);
        expect(result.error.details, contains('Invalid VIS ID format'));
      });

      test('should reject tournament with invalid date format', () {
        // Arrange
        final invalidTournament = {
          'id': '1',
          'vis_id': 'vis_123',
          'name': 'Beach Championship',
          'location': 'Miami Beach',
          'start_date': 'invalid-date',
          'end_date': '2024-07-28T00:00:00Z',
          'competition_level': 'International',
          'status': 'active',
        };

        // Act
        final result = validator.validateTournamentData(invalidTournament);

        // Assert
        expect(result.isError, isTrue);
        expect(result.error.details, contains('Invalid date format'));
      });

      test('should reject tournament with invalid competition level', () {
        // Arrange
        final invalidTournament = {
          'id': '1',
          'vis_id': 'vis_123',
          'name': 'Beach Championship',
          'location': 'Miami Beach',
          'start_date': '2024-07-25T00:00:00Z',
          'end_date': '2024-07-28T00:00:00Z',
          'competition_level': 'InvalidLevel',
          'status': 'active',
        };

        // Act
        final result = validator.validateTournamentData(invalidTournament);

        // Assert
        expect(result.isError, isTrue);
        expect(result.error.details, contains('Invalid competition level'));
      });
    });

    group('recordApiCall', () {
      test('should record API call correctly', () {
        // Act
        validator.recordApiCall(
          endpoint: '/tournaments',
          method: 'GET',
          statusCode: 200,
          responseTimeMs: 150,
        );

        // Assert
        final stats = validator.getComplianceStats();
        expect(stats['totalApiCalls'], equals(1));
        expect(stats['lastApiCall'], isNotNull);
      });

      test('should track multiple API calls', () {
        // Act
        validator.recordApiCall(
          endpoint: '/tournaments',
          method: 'GET',
          statusCode: 200,
          responseTimeMs: 150,
        );
        validator.recordApiCall(
          endpoint: '/matches',
          method: 'GET',
          statusCode: 200,
          responseTimeMs: 200,
        );

        // Assert
        final stats = validator.getComplianceStats();
        expect(stats['totalApiCalls'], equals(2));
      });
    });

    group('generateUsageReport', () {
      test('should generate basic usage report', () {
        // Arrange
        validator.recordApiCall(
          endpoint: '/tournaments',
          method: 'GET',
          statusCode: 200,
          responseTimeMs: 150,
        );

        // Act
        final report = validator.generateUsageReport();

        // Assert
        expect(report['reportPeriod'], isA<Map<String, dynamic>>());
        expect(report['summary'], isA<Map<String, dynamic>>());
        expect(report['complianceStatus'], isA<Map<String, dynamic>>());
        expect(report['summary']['totalApiCalls'], equals(1));
      });

      test('should generate report for date range', () {
        // Arrange
        final startDate = DateTime.now().subtract(Duration(days: 7));
        final endDate = DateTime.now();

        validator.recordApiCall(
          endpoint: '/tournaments',
          method: 'GET',
          statusCode: 200,
          responseTimeMs: 150,
        );

        // Act
        final report = validator.generateUsageReport(
          startDate: startDate,
          endDate: endDate,
        );

        // Assert
        expect(report['reportPeriod']['startDate'], isNotNull);
        expect(report['reportPeriod']['endDate'], isNotNull);
        expect(report['summary']['totalApiCalls'], equals(1));
      });
    });

    group('getComplianceStats', () {
      test('should return compliance statistics', () {
        // Act
        final stats = validator.getComplianceStats();

        // Assert
        expect(stats, isA<Map<String, dynamic>>());
        expect(stats.containsKey('totalApiCalls'), isTrue);
        expect(stats.containsKey('rateLimitStatus'), isTrue);
        expect(stats.containsKey('currentHistorySize'), isTrue);
      });

      test('should track rate limit status correctly', () {
        // Arrange
        validator.recordApiCall(
          endpoint: '/tournaments',
          method: 'GET',
          statusCode: 200,
          responseTimeMs: 150,
        );

        // Act
        final stats = validator.getComplianceStats();

        // Assert
        expect(stats['rateLimitStatus'], isFalse); // Should be false immediately after call
        expect(stats['totalApiCalls'], equals(1));
      });
    });

    group('clearHistory', () {
      test('should clear all compliance history', () {
        // Arrange
        validator.recordApiCall(
          endpoint: '/tournaments',
          method: 'GET',
          statusCode: 200,
          responseTimeMs: 150,
        );

        // Act
        validator.clearHistory();

        // Assert
        final stats = validator.getComplianceStats();
        expect(stats['totalApiCalls'], equals(0));
        expect(stats['lastApiCall'], isNull);
      });
    });
  });
}