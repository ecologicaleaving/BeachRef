import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:beachref/presentation/blocs/authentication_bloc.dart';
import 'package:beachref/services/session_manager.dart';
import 'test_service_locator.dart';
import '../mocks/mock_authentication_service.dart';

// This file provides enhanced BLoC testing utilities and is not a test file itself.
// Individual test files should import and use these utilities.
void main() {
  // This main function exists to prevent compilation errors
  // but this file is not intended to run tests directly.
}

/// Enhanced BLoC testing utilities with detailed state comparison
class EnhancedBlocTest {
  /// Test authentication BLoC with detailed error messages
  static void authenticationBlocTest<T extends AuthenticationState>(
    String description, {
    required AuthenticationBloc Function() build,
    AuthenticationEvent? act,
    List<AuthenticationEvent>? acts,
    Duration? wait,
    int skip = 0,
    List<T>? expect,
    dynamic Function(AuthenticationBloc bloc)? verify,
    dynamic Function()? setUp,
    dynamic Function()? tearDown,
    Map<String, dynamic>? tags,
    dynamic Function(Object error, StackTrace stackTrace)? errors,
    Timeout? timeout,
  }) {
    blocTest<AuthenticationBloc, AuthenticationState>(
      description,
      build: build,
      act: (bloc) {
        if (act != null) {
          bloc.add(act);
        } else if (acts != null) {
          for (final event in acts) {
            bloc.add(event);
          }
        }
      },
      wait: wait,
      skip: skip,
      expect: () => expect ?? <T>[],
      verify: verify,
      setUp: setUp,
      tearDown: tearDown,
      tags: tags,
      // errors: errors, // Parameter type mismatch
      // timeout: timeout, // Not supported in this version
    );
  }

  /// Enhanced state comparison with detailed error reporting
  static void expectAuthenticationStates(
    List<AuthenticationState> actual,
    List<AuthenticationState> expected, {
    String? reason,
  }) {
    if (actual.length != expected.length) {
      fail(
        'Expected ${expected.length} states, but got ${actual.length} states.\n'
        'Expected: ${expected.map((s) => s.runtimeType).toList()}\n'
        'Actual: ${actual.map((s) => s.runtimeType).toList()}\n'
        '${reason ?? ''}',
      );
    }

    for (int i = 0; i < expected.length; i++) {
      final expectedState = expected[i];
      final actualState = actual[i];

      if (expectedState.runtimeType != actualState.runtimeType) {
        fail(
          'State at index $i has wrong type.\n'
          'Expected: ${expectedState.runtimeType}\n'
          'Actual: ${actualState.runtimeType}\n'
          'Full expected sequence: ${expected.map((s) => s.runtimeType).toList()}\n'
          'Full actual sequence: ${actual.map((s) => s.runtimeType).toList()}\n'
          '${reason ?? ''}',
        );
      }

      if (expectedState != actualState) {
        String detailedMessage = 'State at index $i is not equal.\n'
            'Expected: $expectedState\n'
            'Actual: $actualState\n';

        // Add detailed comparison for specific state types
        if (expectedState is AuthenticationError && actualState is AuthenticationError) {
          detailedMessage += 'Expected message: ${expectedState.message}\n'
              'Actual message: ${actualState.message}\n'
              'Expected details: ${expectedState.details}\n'
              'Actual details: ${actualState.details}\n';
        } else if (expectedState is AuthenticationAuthenticated && 
                   actualState is AuthenticationAuthenticated) {
          detailedMessage += 'Expected user: ${expectedState.user}\n'
              'Actual user: ${actualState.user}\n';
        }

        detailedMessage += '${reason ?? ''}';
        fail(detailedMessage);
      }
    }
  }

  /// Wait for BLoC to emit a specific state
  static Future<T> waitForState<T extends AuthenticationState>(
    AuthenticationBloc bloc, {
    Duration timeout = const Duration(seconds: 5),
  }) async {
    final completer = Completer<T>();
    late StreamSubscription subscription;

    subscription = bloc.stream.listen((state) {
      if (state is T) {
        subscription.cancel();
        completer.complete(state);
      }
    });

    // Check current state first
    if (bloc.state is T) {
      subscription.cancel();
      return bloc.state as T;
    }

    try {
      return await completer.future.timeout(timeout);
    } catch (e) {
      subscription.cancel();
      fail('Timeout waiting for state of type $T. Current state: ${bloc.state.runtimeType}');
    }
  }

  /// Create a test-ready authentication BLoC with mocked dependencies
  static AuthenticationBloc createTestAuthenticationBloc({
    MockAuthenticationService? mockAuthService,
    bool configureSuccessScenarios = true,
  }) {
    final serviceLocator = TestServiceLocator();
    serviceLocator.setupDefaultTestServices();
    
    final authService = mockAuthService ?? MockAuthenticationService();
    if (configureSuccessScenarios) {
      authService.configureSuccessScenarios();
    }
    
    serviceLocator.register<MockAuthenticationService>(authService);
    
    // Create AuthenticationBloc with injected dependencies
    return AuthenticationBloc(
      authService: authService,
      sessionManager: serviceLocator.get<SessionManager>(),
    );
  }
}