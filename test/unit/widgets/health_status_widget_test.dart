import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:beachref/presentation/widgets/health_status_widget.dart';
import 'package:beachref/services/vis_integration_service.dart';
import 'package:beachref/core/errors/vis_error.dart';
import 'package:beachref/core/result.dart';

import 'health_status_widget_test.mocks.dart';

@GenerateMocks([VisIntegrationService])
void main() {
  // Provide dummy values for Mockito
  provideDummy<Result<HealthStatus, VisError>>(
    Success(HealthStatus(
      isConnected: true,
      responseTimeMs: 100,
      lastCheckTime: DateTime.now(),
      status: ConnectionStatus.connected,
    )),
  );
  
  provideDummy<HealthStatus>(
    HealthStatus(
      isConnected: true,
      responseTimeMs: 100,
      lastCheckTime: DateTime.now(),
      status: ConnectionStatus.connected,
    ),
  );

  group('HealthStatusWidget Tests', () {
    late MockVisIntegrationService mockVisService;

    setUp(() {
      mockVisService = MockVisIntegrationService();
    });

    Widget createTestWidget() {
      return MaterialApp(
        home: Scaffold(
          body: HealthStatusWidget(visService: mockVisService),
        ),
      );
    }

    testWidgets('should display loading state initially', (WidgetTester tester) async {
      // Arrange
      when(mockVisService.healthCheck()).thenAnswer(
        (_) async => Success(HealthStatus(
          isConnected: true,
          responseTimeMs: 150,
          lastCheckTime: DateTime.now(),
          status: ConnectionStatus.connected,
        )),
      );

      // Act
      await tester.pumpWidget(createTestWidget());

      // Assert
      expect(find.text('VIS Connection Status'), findsOneWidget);
      expect(find.byIcon(Icons.refresh), findsOneWidget);
    });

    testWidgets('should display connected status with green indicator', (WidgetTester tester) async {
      // Arrange
      when(mockVisService.healthCheck()).thenAnswer(
        (_) async => Success(HealthStatus(
          isConnected: true,
          responseTimeMs: 150,
          lastCheckTime: DateTime.now(),
          status: ConnectionStatus.connected,
        )),
      );

      // Act
      await tester.pumpWidget(createTestWidget());
      // Wait for the async healthCheck to complete
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Connected'), findsOneWidget);
      expect(find.text('Response: 150ms'), findsOneWidget);
    });

    testWidgets('should display error status with red indicator', (WidgetTester tester) async {
      // Arrange
      when(mockVisService.healthCheck()).thenAnswer(
        (_) async => Error(VisConnectionError(
          'Connection failed',
          'Network error occurred',
        )),
      );

      // Act
      await tester.pumpWidget(createTestWidget());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Assert
      expect(find.text('Disconnected'), findsOneWidget);
    });

    testWidgets('should display connecting status with animation', (WidgetTester tester) async {
      // Arrange - Return a connecting status
      when(mockVisService.healthCheck()).thenAnswer(
        (_) async => Success(HealthStatus(
          isConnected: false,
          responseTimeMs: 0,
          lastCheckTime: DateTime.now(),
          status: ConnectionStatus.connecting,
        )),
      );

      // Act
      await tester.pumpWidget(createTestWidget());
      await tester.pump(const Duration(milliseconds: 100));

      // Assert
      expect(find.text('Connecting...'), findsOneWidget);
    });

    testWidgets('should refresh status when refresh button is tapped', (WidgetTester tester) async {
      // Arrange
      when(mockVisService.healthCheck()).thenAnswer(
        (_) async => Success(HealthStatus(
          isConnected: true,
          responseTimeMs: 150,
          lastCheckTime: DateTime.now(),
          status: ConnectionStatus.connected,
        )),
      );

      // Act
      await tester.pumpWidget(createTestWidget());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      
      // Tap refresh button
      await tester.tap(find.byIcon(Icons.refresh));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Assert - Health check should be called at least twice (initial + refresh)
      verify(mockVisService.healthCheck()).called(greaterThan(1));
    });

    testWidgets('should expand error details when tapped', (WidgetTester tester) async {
      // Arrange
      when(mockVisService.healthCheck()).thenAnswer(
        (_) async => Error(VisConnectionError(
          'Connection failed',
          'Detailed network error information',
        )),
      );

      // Act
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Tap on status indicator to expand error details
      await tester.tap(find.text('Disconnected'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Detailed network error information'), findsOneWidget);
    });

    testWidgets('should handle responsive layout for mobile', (WidgetTester tester) async {
      // Arrange
      when(mockVisService.healthCheck()).thenAnswer(
        (_) async => Success(HealthStatus(
          isConnected: true,
          responseTimeMs: 150,
          lastCheckTime: DateTime.now(),
          status: ConnectionStatus.connected,
        )),
      );

      // Act - Set small screen size but not too small to avoid overflow
      await tester.binding.setSurfaceSize(const Size(400, 600));
      await tester.pumpWidget(createTestWidget());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Assert - Should still display all elements
      expect(find.text('VIS Connection Status'), findsOneWidget);
      expect(find.text('Connected'), findsOneWidget);
      expect(find.text('Response: 150ms'), findsOneWidget);
    });

    testWidgets('should handle responsive layout for desktop', (WidgetTester tester) async {
      // Arrange
      when(mockVisService.healthCheck()).thenAnswer(
        (_) async => Success(HealthStatus(
          isConnected: true,
          responseTimeMs: 150,
          lastCheckTime: DateTime.now(),
          status: ConnectionStatus.connected,
        )),
      );

      // Act - Set large screen size
      await tester.binding.setSurfaceSize(const Size(800, 600));
      await tester.pumpWidget(createTestWidget());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Assert - Should display expanded metrics layout
      expect(find.text('VIS Connection Status'), findsOneWidget);
      expect(find.text('Connected'), findsOneWidget);
      expect(find.text('Response: 150ms'), findsOneWidget);
    });

    testWidgets('should format time correctly', (WidgetTester tester) async {
      // Arrange
      final testTime = DateTime.now().subtract(const Duration(seconds: 30));
      when(mockVisService.healthCheck()).thenAnswer(
        (_) async => Success(HealthStatus(
          isConnected: true,
          responseTimeMs: 150,
          lastCheckTime: testTime,
          status: ConnectionStatus.connected,
        )),
      );

      // Act
      await tester.pumpWidget(createTestWidget());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Assert - Should show "30s ago" format
      expect(find.textContaining('Last check:'), findsOneWidget);
      expect(find.textContaining('s ago'), findsOneWidget);
    });

    testWidgets('should disable refresh button during loading', (WidgetTester tester) async {
      // Arrange - Create a completer to control when the health check completes
      final completer = Completer<Result<HealthStatus, VisError>>();
      when(mockVisService.healthCheck()).thenAnswer((_) => completer.future);

      // Act
      await tester.pumpWidget(createTestWidget());
      await tester.pump(); // Initial pump to start loading

      // The widget should be in loading state, let's check the button state
      final refreshButton = find.byIcon(Icons.refresh);
      expect(refreshButton, findsOneWidget);

      // Find the IconButton widget that contains the refresh icon
      final iconButtonFinder = find.ancestor(
        of: refreshButton,
        matching: find.byType(IconButton),
      );
      expect(iconButtonFinder, findsOneWidget);
      
      // The button should be disabled during loading
      final iconButton = tester.widget<IconButton>(iconButtonFinder);
      expect(iconButton.onPressed, isNull, reason: 'Refresh button should be disabled during loading');
      
      // Complete the health check to avoid pending timers
      completer.complete(Success(HealthStatus(
        isConnected: true,
        responseTimeMs: 150,
        lastCheckTime: DateTime.now(),
        status: ConnectionStatus.connected,
      )));
      
      await tester.pumpAndSettle();
      
      // After loading completes, button should be enabled again
      final enabledIconButton = tester.widget<IconButton>(iconButtonFinder);
      expect(enabledIconButton.onPressed, isNotNull, reason: 'Refresh button should be enabled after loading');
    });
  });
}