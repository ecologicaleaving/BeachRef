import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:mockito/mockito.dart';
import 'package:beachref/presentation/blocs/authentication_bloc.dart';
import 'package:beachref/services/authentication_service.dart';
import 'package:beachref/services/session_manager.dart';
import 'package:beachref/core/logging/logger_service.dart';
import 'package:beachref/core/result.dart';
import '../../../infrastructure/base_test_classes.dart';
import '../../../infrastructure/test_data_factory.dart';
import '../../../infrastructure/enhanced_bloc_test.dart';

void main() {
  group('AuthenticationBloc Enhanced Tests', () {
    late AuthenticationBloc authBloc;
    late MockAuthenticationService mockAuthService;
    late MockSessionManager mockSessionManager;
    late MockLoggerService mockLogger;

    setUp(() {
      mockAuthService = MockAuthenticationService();
      mockSessionManager = MockSessionManager();
      mockLogger = MockLoggerService();

      // Setup common mock behaviors
      when(mockLogger.generateCorrelationId()).thenReturn('test-correlation-id');
      when(mockSessionManager.clearSession()).thenAnswer((_) async {});

      authBloc = AuthenticationBloc(
        authService: mockAuthService,
        sessionManager: mockSessionManager,
        logger: mockLogger,
      );
    });

    tearDown(() {
      authBloc.close();
    });

    group('AppStarted', () {
      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationAuthenticated] when valid session exists',
        build: () {
          final user = TestDataFactory.createUserProfile();
          final session = TestDataFactory.createSession();
          
          when(mockSessionManager.getCurrentSession())
              .thenAnswer((_) async => Success(session));
          when(mockAuthService.getCurrentUser())
              .thenAnswer((_) async => Success(user));
          
          return authBloc;
        },
        act: (bloc) => bloc.add(AppStarted()),
        expect: () => [
          isA<AuthenticationAuthenticated>(),
        ],
        verify: (_) {
          verify(mockSessionManager.getCurrentSession()).called(1);
          verify(mockAuthService.getCurrentUser()).called(1);
        },
      );

      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationUnauthenticated] when no session exists',
        build: () {
          when(mockSessionManager.getCurrentSession())
              .thenAnswer((_) async => const Error(AuthError('No session found')));
          return authBloc;
        },
        act: (bloc) => bloc.add(AppStarted()),
        expect: () => [
          const AuthenticationUnauthenticated(),
        ],
        verify: (_) {
          verify(mockSessionManager.getCurrentSession()).called(1);
          verifyNever(mockAuthService.getCurrentUser());
        },
      );

      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationUnauthenticated] when session is invalid',
        build: () {
          final session = TestDataFactory.createSession();
          
          when(mockSessionManager.getCurrentSession())
              .thenAnswer((_) async => Success(session));
          when(mockAuthService.getCurrentUser())
              .thenAnswer((_) async => const Error(AuthError('Session expired')));
          
          return authBloc;
        },
        act: (bloc) => bloc.add(AppStarted()),
        expect: () => [
          const AuthenticationUnauthenticated(),
        ],
        verify: (_) {
          verify(mockSessionManager.getCurrentSession()).called(1);
          verify(mockAuthService.getCurrentUser()).called(1);
          verify(mockSessionManager.clearSession()).called(1);
        },
      );
    });

    group('LoginRequested', () {
      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationLoading, AuthenticationAuthenticated] when login succeeds',
        build: () {
          final user = TestDataFactory.createUserProfile();
          when(mockAuthService.signInWithCredentials(
            email: anyNamed('email'),
            password: anyNamed('password'),
            rememberMe: anyNamed('rememberMe'),
          )).thenAnswer((_) async => Success(user));
          
          return authBloc;
        },
        act: (bloc) => bloc.add(const LoginRequested(
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true,
        )),
        expect: () => [
          const AuthenticationLoading(),
          isA<AuthenticationAuthenticated>(),
        ],
      );

      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationLoading, AuthenticationError] when login fails',
        build: () {
          when(mockAuthService.signInWithCredentials(
            email: anyNamed('email'),
            password: anyNamed('password'),
            rememberMe: anyNamed('rememberMe'),
          )).thenAnswer((_) async => const Error(AuthError(
            'Authentication failed',
            'Invalid credentials',
          )));
          
          return authBloc;
        },
        act: (bloc) => bloc.add(const LoginRequested(
          email: 'invalid@example.com',
          password: 'wrongpassword',
        )),
        expect: () => [
          const AuthenticationLoading(),
          const AuthenticationError(
            message: 'Invalid email or password. Please check your credentials and try again.',
            details: 'Invalid credentials',
          ),
        ],
      );
    });
  });
}