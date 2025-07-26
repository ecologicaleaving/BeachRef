import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mockito/mockito.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:beachref/presentation/blocs/authentication_bloc.dart';
import 'test_service_locator.dart';
import 'test_data_factory.dart';

/// Base class for all widget tests providing standardized setup
abstract class BaseWidgetTest {
  late WidgetTester tester;
  late TestServiceLocator serviceLocator;

  /// Setup method to be called in setUp() of each test
  Future<void> setupWidgetTest(WidgetTester widgetTester) async {
    tester = widgetTester;
    serviceLocator = TestServiceLocator();
    
    // Initialize test environment
    await _initializeTestEnvironment();
    
    // Setup default services
    serviceLocator.setupDefaultTestServices();
  }

  /// Initialize test environment with proper mocking
  Future<void> _initializeTestEnvironment() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    
    // Mock platform services
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
  }

  /// Create a widget with proper test environment setup
  Widget createTestWidget(Widget child, {
    List<RepositoryProvider>? providers,
    List<BlocProvider>? blocProviders,
  }) {
    return MaterialApp(
      home: MultiRepositoryProvider(
        providers: providers ?? [],
        child: MultiBlocProvider(
          providers: blocProviders ?? [],
          child: child,
        ),
      ),
    );
  }

  /// Pump widget and wait for stable state with timeout protection
  Future<void> pumpWidgetAndSettle(Widget widget, {
    Duration? settleDuration,
    Duration? timeout,
  }) async {
    await tester.pumpWidget(widget);
    
    // Use custom settling that avoids infinite animation loops
    await pumpAndStabilize(
      settleDuration: settleDuration ?? const Duration(milliseconds: 100),
      timeout: timeout ?? const Duration(seconds: 10),
    );
  }

  /// Intelligent pump strategy that handles async operations properly
  Future<void> pumpAndStabilize({
    Duration? settleDuration,
    Duration? timeout,
  }) async {
    final timeoutDuration = timeout ?? const Duration(seconds: 10);
    final settleDuration_ = settleDuration ?? const Duration(milliseconds: 100);
    
    final stopwatch = Stopwatch()..start();
    
    // Pump frames until stable or timeout
    while (stopwatch.elapsed < timeoutDuration) {
      await tester.pump(settleDuration_);
      
      // Check if there are pending timers or animations
      if (!tester.binding.hasScheduledFrame) {
        // Wait a bit more to ensure stability
        await tester.pump(const Duration(milliseconds: 50));
        if (!tester.binding.hasScheduledFrame) {
          break; // Stable state reached
        }
      }
    }
    
    stopwatch.stop();
  }

  /// Scroll until a widget is visible (fixes off-screen widget issues)
  Future<void> scrollUntilVisible(
    Finder finder, {
    Finder? scrollable,
    double scrollDelta = 100.0,
    Duration timeout = const Duration(seconds: 5),
  }) async {
    final stopwatch = Stopwatch()..start();
    
    while (stopwatch.elapsed < timeout) {
      try {
        if (finder.evaluate().isNotEmpty) {
          // Widget found and visible
          return;
        }
      } catch (e) {
        // Widget not found, continue scrolling
      }
      
      // Scroll down to find the widget
      final scrollableFinder = scrollable ?? find.byType(SingleChildScrollView);
      if (scrollableFinder.evaluate().isNotEmpty) {
        await tester.drag(scrollableFinder, Offset(0, -scrollDelta));
        await tester.pump();
      } else {
        // No scrollable found, wait and try again
        await tester.pump(const Duration(milliseconds: 100));
      }
    }
    
    throw Exception('Widget not found after scrolling for ${timeout.inSeconds} seconds');
  }

  /// Cleanup method to be called in tearDown()
  void cleanupWidgetTest() {
    serviceLocator.reset();
  }
}

/// Base class for BLoC tests with enhanced state testing capabilities
abstract class BaseBlocTest<B extends BlocBase<S>, S> {
  late B bloc;
  late TestServiceLocator serviceLocator;
  late List<S> emittedStates;

  /// Setup method for BLoC tests
  void setupBlocTest() {
    serviceLocator = TestServiceLocator();
    serviceLocator.setupDefaultTestServices();
    emittedStates = [];
  }

  /// Create BLoC instance - to be implemented by subclasses
  B createBloc();

  /// Enhanced state expectation with detailed failure messages
  void expectStates(
    List<S> expectedStates, {
    String? reason,
    bool exactOrder = true,
  }) {
    if (exactOrder) {
      expect(
        emittedStates,
        equals(expectedStates),
        reason: reason ?? 'BLoC states do not match expected sequence',
      );
    } else {
      expect(
        emittedStates.length,
        equals(expectedStates.length),
        reason: 'Expected ${expectedStates.length} states, got ${emittedStates.length}',
      );
      
      for (int i = 0; i < expectedStates.length; i++) {
        expect(
          emittedStates[i],
          equals(expectedStates[i]),
          reason: 'State at index $i does not match. Expected: ${expectedStates[i]}, Actual: ${emittedStates[i]}',
        );
      }
    }
  }

  /// Wait for specific state with timeout
  Future<S> waitForState<T extends S>({Duration? timeout}) async {
    final timeoutDuration = timeout ?? const Duration(seconds: 5);
    final completer = Completer<S>();
    late StreamSubscription<S> subscription;
    
    subscription = bloc.stream.listen((state) {
      if (state is T) {
        subscription.cancel();
        completer.complete(state);
      }
    });
    
    return completer.future.timeout(timeoutDuration);
  }

  /// Cleanup method
  void cleanupBlocTest() {
    bloc.close();
    serviceLocator.reset();
    emittedStates.clear();
  }
}

/// Base class for service tests with mocking utilities
abstract class BaseServiceTest {
  late TestServiceLocator serviceLocator;

  /// Setup method for service tests  
  void setupServiceTest() {
    serviceLocator = TestServiceLocator();
    serviceLocator.setupDefaultTestServices();
  }

  /// Get a mock service with type safety
  T getMock<T>() => serviceLocator.get<T>();

  /// Setup common mock behaviors
  void setupMockBehaviors() {
    // Override in subclasses for specific mock setups
  }

  /// Verify mock interactions with enhanced error messages
  void verifyMockInteractions() {
    // Override in subclasses for specific verifications
  }

  /// Cleanup method
  void cleanupServiceTest() {
    serviceLocator.reset();
  }
}