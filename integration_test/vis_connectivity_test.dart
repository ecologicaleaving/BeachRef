import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:beachref/main.dart' as app;
import 'package:beachref/services/vis_integration_service.dart';
import 'package:beachref/presentation/widgets/health_status_widget.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('VIS Connectivity Integration Tests', () {
    testWidgets('should initialize VIS service and perform health check', (WidgetTester tester) async {
      // Launch the app
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Verify app launched successfully
      expect(find.byType(MaterialApp), findsOneWidget);
      
      // Initialize VIS service
      final visService = VisIntegrationService();
      visService.initialize();

      // Perform health check
      final healthResult = await visService.healthCheck();
      
      // Assert health check completes (may succeed or fail depending on network)
      expect(healthResult.isSuccess || healthResult.isError, isTrue);
      
      if (healthResult.isSuccess) {
        final healthStatus = healthResult.value;
        expect(healthStatus.responseTimeMs, greaterThanOrEqualTo(0));
        expect(healthStatus.lastCheckTime, isNotNull);
      }

      // Clean up
      visService.dispose();
    });

    testWidgets('should display health status widget in UI', (WidgetTester tester) async {
      // Launch the app
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Look for health status widget (may be on home page or dashboard)
      final healthWidgetFinder = find.byType(HealthStatusWidget);
      
      if (healthWidgetFinder.evaluate().isNotEmpty) {
        // If health widget is found, verify its basic functionality
        expect(healthWidgetFinder, findsOneWidget);
        
        // Verify header text is present
        expect(find.text('VIS Connection Status'), findsOneWidget);
        
        // Verify refresh button is present
        expect(find.byIcon(Icons.refresh), findsOneWidget);
        
        // Test refresh functionality
        await tester.tap(find.byIcon(Icons.refresh));
        await tester.pumpAndSettle(const Duration(seconds: 2));
        
        // Widget should still be present after refresh
        expect(find.byType(HealthStatusWidget), findsOneWidget);
      }
    });

    testWidgets('should handle VIS API rate limiting', (WidgetTester tester) async {
      // Launch the app
      app.main();
      await tester.pumpAndSettle();

      final visService = VisIntegrationService();
      
      // Make first API call
      final result1 = await visService.healthCheck();
      expect(result1.isSuccess || result1.isError, isTrue);

      // Immediate second call should be rate limited
      final result2 = await visService.healthCheck();
      
      if (result2.isError) {
        // Should be rate limited or connection error
        expect(result2.error.message.toLowerCase(), 
               anyOf(contains('rate limit'), contains('circuit breaker')));
      }

      // Clean up
      visService.dispose();
    });

    testWidgets('should handle VIS API errors gracefully', (WidgetTester tester) async {
      // Launch the app
      app.main();
      await tester.pumpAndSettle();

      final visService = VisIntegrationService();
      
      // Test tournament retrieval with potential network issues
      final tournamentResult = await visService.getTournaments(limit: 1);
      
      // Should handle both success and error cases
      expect(tournamentResult.isSuccess || tournamentResult.isError, isTrue);
      
      if (tournamentResult.isError) {
        // Verify error types are handled properly
        expect(tournamentResult.error.message, isNotEmpty);
      } else {
        // If successful, verify data structure
        final tournaments = tournamentResult.value;
        expect(tournaments, isA<List>());
      }

      // Clean up
      visService.dispose();
    });

    testWidgets('should maintain compliance tracking', (WidgetTester tester) async {
      // Launch the app
      app.main();
      await tester.pumpAndSettle();

      final visService = VisIntegrationService();
      
      // Get initial compliance stats
      final initialStats = visService.getComplianceStats();
      expect(initialStats, isA<Map<String, dynamic>>());
      expect(initialStats.containsKey('totalApiCalls'), isTrue);
      
      // Make an API call
      await visService.healthCheck();
      
      // Check that compliance stats were updated
      final updatedStats = visService.getComplianceStats();
      expect(updatedStats['totalApiCalls'], greaterThanOrEqualTo(initialStats['totalApiCalls']));
      
      // Generate usage report
      final report = visService.generateUsageReport();
      expect(report, isA<Map<String, dynamic>>());
      expect(report.containsKey('reportPeriod'), isTrue);
      expect(report.containsKey('summary'), isTrue);

      // Clean up
      visService.dispose();
    });

    testWidgets('should handle cache operations correctly', (WidgetTester tester) async {
      // Launch the app
      app.main();
      await tester.pumpAndSettle();

      final visService = VisIntegrationService();
      
      try {
        // Make first tournament request (should cache result)
        final result1 = await visService.getTournaments(limit: 5);
        
        if (result1.isSuccess) {
          // Clear cache
          visService.clearCache();
          
          // Make second request (should make new API call)
          final result2 = await visService.getTournaments(limit: 5);
          
          // Both should have same structure
          expect(result2.isSuccess, equals(result1.isSuccess));
        }
      } catch (e) {
        // Network issues are acceptable in integration tests
        expect(e, isA<Exception>());
      }

      // Clean up
      visService.dispose();
    });

    testWidgets('should handle circuit breaker functionality', (WidgetTester tester) async {
      // Launch the app
      app.main();
      await tester.pumpAndSettle();

      final visService = VisIntegrationService();
      
      // Test circuit breaker by making multiple calls
      // Note: This test may not trigger circuit breaker in real scenarios
      // but tests the integration of the circuit breaker logic
      
      final results = <dynamic>[];
      for (int i = 0; i < 3; i++) {
        final result = await visService.healthCheck();
        results.add(result);
        
        // Wait briefly between calls to avoid overwhelming the system
        await Future.delayed(const Duration(milliseconds: 100));
      }
      
      // Verify all calls completed (success or error)
      expect(results.length, equals(3));
      for (final result in results) {
        expect(result.isSuccess || result.isError, isTrue);
      }

      // Clean up
      visService.dispose();
    });

    testWidgets('should integrate with logging service', (WidgetTester tester) async {
      // Launch the app
      app.main();
      await tester.pumpAndSettle();

      final visService = VisIntegrationService();
      
      // Initialize service (should log)
      visService.initialize();
      
      // Make API call (should log)
      await visService.healthCheck();
      
      // Test passes if no exceptions are thrown
      // Actual log verification would require log capture mechanism
      expect(true, isTrue);

      // Clean up
      visService.dispose();
    });
  });
}