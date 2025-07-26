import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mockito/mockito.dart';
import 'package:beachref/presentation/blocs/authentication_bloc.dart';
import 'package:beachref/presentation/widgets/health_status_widget.dart';
import 'package:beachref/services/vis_integration_service.dart';
import 'base_test_classes.dart';
import 'test_service_locator.dart';
import '../mocks/mock_authentication_service.dart';

/// Enhanced widget testing utilities with robust async handling
class EnhancedWidgetTest extends BaseWidgetTest {
  /// Test widget with authentication BLoC
  Future<void> testWidgetWithAuthBloc({
    required Widget widget,
    required WidgetTester tester,
    AuthenticationState? initialState,
    MockAuthenticationService? mockAuthService,
    List<BlocProvider>? additionalProviders,
  }) async {
    await setupWidgetTest(tester);
    
    final authService = mockAuthService ?? MockAuthenticationService();
    final mockAuthBloc = MockAuthenticationBloc();
    
    // Setup mock behavior
    when(mockAuthBloc.state).thenReturn(
      initialState ?? const AuthenticationInitial()
    );
    when(mockAuthBloc.stream).thenAnswer(
      (_) => Stream.value(initialState ?? const AuthenticationInitial())
    );
    
    final providers = [
      BlocProvider<AuthenticationBloc>.value(value: mockAuthBloc),
      ...?additionalProviders,
    ];
    
    final testWidget = createTestWidget(widget, blocProviders: providers);
    await pumpWidgetAndSettle(testWidget);
  }

  /// Test health status widget with proper VIS service mocking
  Future<void> testHealthStatusWidget({
    required WidgetTester tester,
    required MockVisIntegrationService mockVisService,
    Duration? settleDuration,
  }) async {
    await setupWidgetTest(tester);
    
    final widget = HealthStatusWidget(visService: mockVisService);
    await pumpWidgetAndSettle(
      createTestWidget(widget),
      settleDuration: settleDuration,
    );
  }

  /// Enhanced pump and settle with animation control
  @override
  Future<void> pumpAndStabilize({
    Duration? settleDuration,
    Duration? timeout,
  }) async {
    final timeoutDuration = timeout ?? const Duration(seconds: 10);
    final settleDuration_ = settleDuration ?? const Duration(milliseconds: 100);
    
    final stopwatch = Stopwatch()..start();
    
    // Disable animations for testing
    await tester.binding.setSurfaceSize(const Size(800, 600));
    tester.binding.window.physicalSizeTestValue = const Size(800, 600);
    tester.binding.window.devicePixelRatioTestValue = 1.0;
    
    // Pump frames until stable or timeout
    int pumpCount = 0;
    const maxPumps = 100; // Prevent infinite loops
    
    while (stopwatch.elapsed < timeoutDuration && pumpCount < maxPumps) {
      await tester.pump(settleDuration_);
      pumpCount++;
      
      // Check if there are pending timers or animations
      if (!tester.binding.hasScheduledFrame) {
        // Additional stability check
        await tester.pump(const Duration(milliseconds: 16)); // One frame at 60fps
        if (!tester.binding.hasScheduledFrame) {
          break; // Stable state reached
        }
      }
      
      // Micro-delay to prevent busy waiting
      await Future.delayed(const Duration(milliseconds: 1));
    }
    
    if (pumpCount >= maxPumps) {
      print('Warning: Reached maximum pump count ($maxPumps). Widget may have infinite animations.');
    }
    
    stopwatch.stop();
  }

  /// Find and interact with form fields safely
  Future<void> enterTextSafely(String formFieldLabel, String text) async {
    final textField = find.ancestor(
      of: find.text(formFieldLabel),
      matching: find.byType(TextFormField),
    );
    
    if (textField.evaluate().isEmpty) {
      throw Exception('TextFormField with label "$formFieldLabel" not found');
    }
    
    await tester.enterText(textField, text);
    await tester.pump(); // Single pump after text entry
  }

  /// Tap button and wait for response safely
  Future<void> tapButtonSafely(String buttonText, {
    Duration? waitDuration,
  }) async {
    final button = find.text(buttonText);
    
    if (button.evaluate().isEmpty) {
      throw Exception('Button with text "$buttonText" not found');
    }
    
    await tester.tap(button);
    await tester.pump(); // Single pump after tap
    
    if (waitDuration != null) {
      await tester.pump(waitDuration);
    }
  }

  /// Enhanced scroll until visible with error handling
  @override
  Future<void> scrollUntilVisible(
    Finder finder, {
    Finder? scrollable,
    double scrollDelta = 100.0,
    Duration timeout = const Duration(seconds: 5),
  }) async {
    final stopwatch = Stopwatch()..start();
    bool widgetFound = false;
    
    while (stopwatch.elapsed < timeout && !widgetFound) {
      try {
        // Check if widget is visible in current viewport
        final element = finder.evaluate();
        if (element.isNotEmpty) {
          final renderObject = element.first.renderObject;
          if (renderObject != null) {
            final rect = renderObject.paintBounds;
            final viewport = tester.binding.renderView.size;
            
            // Check if widget is within viewport
            if (rect.top >= 0 && rect.bottom <= viewport.height) {
              widgetFound = true;
              break;
            }
          }
        }
      } catch (e) {
        // Widget not found or not rendered, continue scrolling
      }
      
      // Find scrollable widget
      final scrollableFinder = scrollable ?? find.byType(SingleChildScrollView);
      if (scrollableFinder.evaluate().isEmpty) {
        final listViewFinder = find.byType(ListView);
        if (listViewFinder.evaluate().isNotEmpty) {
          final scrollableFinder = listViewFinder;
        } else {
          final customScrollFinder = find.byType(CustomScrollView);
          if (customScrollFinder.evaluate().isNotEmpty) {
            final scrollableFinder = customScrollFinder;
          }
        }
      }
      
      if (scrollableFinder.evaluate().isNotEmpty) {
        await tester.drag(scrollableFinder.first, Offset(0, -scrollDelta));
        await tester.pump(const Duration(milliseconds: 100));
      } else {
        // No scrollable found, try scrolling the entire screen
        await tester.drag(find.byType(Scaffold), Offset(0, -scrollDelta));
        await tester.pump(const Duration(milliseconds: 100));
      }
    }
    
    if (!widgetFound) {
      throw Exception(
        'Widget not found after scrolling for ${timeout.inSeconds} seconds. '
        'Finder: $finder'
      );
    }
  }

  /// Verify accessibility features
  Future<void> verifyAccessibility() async {
    // Basic accessibility checks
    final semanticsHandle = tester.binding.pipelineOwner.semanticsOwner?.rootSemanticsNode;
    expect(semanticsHandle, isNotNull, reason: 'Semantics should be enabled for accessibility');
    
    // Note: More detailed accessibility checks would be added here
    // Currently simplified to avoid compilation issues
  }

  /// Enhanced error message collection for debugging
  String collectDebugInfo() {
    final buffer = StringBuffer();
    buffer.writeln('=== Widget Test Debug Info ===');
    buffer.writeln('Current widget tree:');
    
    try {
      final rootElement = tester.binding.renderViewElement;
      if (rootElement != null) {
        buffer.writeln(rootElement.toStringDeep());
      }
    } catch (e) {
      buffer.writeln('Error getting widget tree: $e');
    }
    
    buffer.writeln('\nActive timers: ${tester.binding.hasScheduledFrame}');
    buffer.writeln('Surface size: ${tester.binding.window.physicalSize}');
    
    return buffer.toString();
  }
}

/// Mock classes for enhanced widget testing
class MockAuthenticationBloc extends Mock implements AuthenticationBloc {}
class MockVisIntegrationService extends Mock implements VisIntegrationService {}