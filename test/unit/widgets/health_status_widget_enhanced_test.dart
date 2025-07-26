import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:beachref/presentation/widgets/health_status_widget.dart';
import 'package:beachref/services/vis_integration_service.dart';
import 'package:beachref/core/result.dart';
import '../../infrastructure/enhanced_widget_test.dart';
import '../../infrastructure/test_data_factory.dart';

void main() {
  group('HealthStatusWidget Enhanced Tests', () {
    late EnhancedWidgetTest widgetTest;
    late MockVisIntegrationService mockVisService;

    setUp(() {
      widgetTest = EnhancedWidgetTest();
      mockVisService = MockVisIntegrationService();
    });

    tearDown(() {
      widgetTest.cleanupWidgetTest();
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
      await widgetTest.testHealthStatusWidget(
        tester: tester,
        mockVisService: mockVisService,
        settleDuration: const Duration(milliseconds: 200),
      );

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
      await widgetTest.testHealthStatusWidget(
        tester: tester,
        mockVisService: mockVisService,
      );

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
      await widgetTest.testHealthStatusWidget(
        tester: tester,
        mockVisService: mockVisService,
      );

      // Find and tap the error status to expand details
      await widgetTest.tapButtonSafely('Disconnected');

      // Assert
      expect(find.text('Detailed network error information'), findsOneWidget);
    });

    testWidgets('should disable refresh button during loading', 
        (WidgetTester tester) async {
      // Arrange - Use a completer to control async timing
      final completer = Completer<Result<HealthStatus, VisError>>();
      when(mockVisService.healthCheck()).thenAnswer((_) => completer.future);

      // Act
      await widgetTest.testHealthStatusWidget(
        tester: tester,
        mockVisService: mockVisService,
        settleDuration: const Duration(milliseconds: 50), // Shorter settle time
      );

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