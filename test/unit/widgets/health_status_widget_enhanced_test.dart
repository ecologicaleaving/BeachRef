import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:beachref/presentation/widgets/health_status_widget.dart';
import 'package:beachref/services/vis_integration_service.dart';
import 'package:beachref/core/result.dart';
import 'package:beachref/core/errors/vis_error.dart';
import 'package:beachref/services/vis_integration_service.dart' show HealthStatus;
// import '../../infrastructure/enhanced_widget_test.dart'; // Temporarily disabled due to mock conflicts
import '../../infrastructure/test_data_factory.dart';

// Mock generation
import 'package:mockito/annotations.dart';

@GenerateMocks([
  VisIntegrationService,
])
import 'health_status_widget_enhanced_test.mocks.dart' as generated_mocks;

void main() {
  group('HealthStatusWidget Enhanced Tests', () {
    late generated_mocks.MockVisIntegrationService mockVisService;

    // Setup dummy values for Mockito
    setUpAll(() {
      // Create dummy values for Result types
      provideDummy<Result<HealthStatus, VisError>>(
        Success(TestDataFactory.createHealthStatus())
      );
    });

    setUp(() {
      mockVisService = generated_mocks.MockVisIntegrationService();
    });

    testWidgets('should display loading state initially and then connected status', 
        (WidgetTester tester) async {
      // Arrange
      final healthStatus = TestDataFactory.createHealthStatus(
        isConnected: true,
        responseTimeMs: 150,
        status: ConnectionStatus.connected,
      );
      
      when(mockVisService.healthCheck()).thenAnswer(
        (_) async => Success(healthStatus),
      );

      // Act
      await tester.pumpWidget(
        MaterialApp(
          home: HealthStatusWidget(visService: mockVisService),
        ),
      );
      await tester.pump(const Duration(milliseconds: 200));

      // Assert
      expect(find.text('VIS Connection Status'), findsOneWidget);
      expect(find.text('Connected'), findsOneWidget);
      expect(find.text('Response: 150ms'), findsOneWidget);
    });

    testWidgets('should display error status with red indicator', 
        (WidgetTester tester) async {
      // Arrange
      when(mockVisService.healthCheck()).thenAnswer(
        (_) async => const Error(VisConnectionError(
          'Connection failed',
          'Network error occurred',
        )),
      );

      // Act
      await tester.pumpWidget(
        MaterialApp(
          home: HealthStatusWidget(visService: mockVisService),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));

      // Assert
      expect(find.text('Disconnected'), findsOneWidget);
    });

    testWidgets('should expand error details when tapped', 
        (WidgetTester tester) async {
      // Arrange
      when(mockVisService.healthCheck()).thenAnswer(
        (_) async => const Error(VisConnectionError(
          'Connection failed',
          'Detailed network error information',
        )),
      );

      // Act
      await tester.pumpWidget(
        MaterialApp(
          home: HealthStatusWidget(visService: mockVisService),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));

      // Find and tap the error status to expand details
      await tester.tap(find.text('Disconnected'));
      await tester.pump(const Duration(milliseconds: 200));

      // Assert
      expect(find.text('Detailed network error information'), findsOneWidget);
    });

    testWidgets('should disable refresh button during loading', 
        (WidgetTester tester) async {
      // Arrange - Use a completer to control async timing
      final completer = Completer<Result<HealthStatus, VisError>>();
      when(mockVisService.healthCheck()).thenAnswer((_) => completer.future);

      // Act
      await tester.pumpWidget(
        MaterialApp(
          home: HealthStatusWidget(visService: mockVisService),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50)); // Shorter settle time

      // Check button state while loading
      final refreshButton = find.byIcon(Icons.refresh);
      expect(refreshButton, findsOneWidget);

      final iconButtonFinder = find.ancestor(
        of: refreshButton,
        matching: find.byType(IconButton),
      );
      
      final iconButton = tester.widget<IconButton>(iconButtonFinder);
      expect(iconButton.onPressed, isNull, 
          reason: 'Refresh button should be disabled during loading');

      // Complete the future to avoid pending operations
      completer.complete(Success(TestDataFactory.createHealthStatus()));
      await tester.pump();
    });
  });
}