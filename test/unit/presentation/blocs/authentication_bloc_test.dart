import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:beachref/presentation/blocs/authentication_bloc.dart';
import 'package:beachref/services/authentication_service.dart';
import 'package:beachref/services/session_manager.dart';
import 'package:beachref/core/logging/logger_service.dart';
import 'package:beachref/data/models/user_profile.dart';
import 'package:beachref/data/models/session.dart';
import 'package:beachref/core/result.dart';
import 'package:beachref/core/errors/auth_error.dart';

import 'authentication_bloc_test.mocks.dart';

@GenerateMocks([AuthenticationService, SessionManager, LoggerService])
void main() {
  // Provide dummy values for Mockito
  provideDummy<Result<Session, AuthError>>(
    Success(Session(
      sessionId: 'dummy-session-id',
      userId: 'dummy-user-id',
      accessToken: 'dummy-access-token',
      refreshToken: 'dummy-refresh-token',
      expiresAt: DateTime.now().add(const Duration(hours: 1)),
      rememberMe: false,
      deviceInfo: 'Dummy Device',
      createdAt: DateTime.now(),
    )),
  );
  
  provideDummy<Result<UserProfile, AuthError>>(
    Success(UserProfile(
      userId: 'dummy-user-id',
      email: 'dummy@example.com',
      displayName: 'Dummy User',
      refereeLevel: 'National',
      certificationDate: DateTime.now().subtract(const Duration(days: 365)),
      region: 'International',
      preferredCompetitionLevels: ['Beach Volleyball'],
      timezone: 'UTC',
      lastLoginAt: DateTime.now(),
      createdAt: DateTime.now(),
    )),
  );
  
  provideDummy<AuthError>(const AuthError('Dummy error'));
  provideDummy<Session>(Session(
    sessionId: 'dummy-session-id',
    userId: 'dummy-user-id',
    accessToken: 'dummy-access-token',
    refreshToken: 'dummy-refresh-token',
    expiresAt: DateTime.now().add(const Duration(hours: 1)),
    rememberMe: false,
    deviceInfo: 'Dummy Device',
    createdAt: DateTime.now(),
  ));
  
  provideDummy<UserProfile>(UserProfile(
    userId: 'dummy-user-id',
    email: 'dummy@example.com',
    displayName: 'Dummy User',
    refereeLevel: 'National',
    certificationDate: DateTime.now().subtract(const Duration(days: 365)),
    region: 'International',
    preferredCompetitionLevels: ['Beach Volleyball'],
    timezone: 'UTC',
    lastLoginAt: DateTime.now(),
    createdAt: DateTime.now(),
  ));
  group('AuthenticationBloc', () {
    late AuthenticationBloc authBloc;
    late MockAuthenticationService mockAuthService;
    late MockSessionManager mockSessionManager;
    late MockLoggerService mockLogger;

    final testUserProfile = UserProfile(
      userId: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      refereeLevel: 'National',
      certificationDate: DateTime.now().subtract(const Duration(days: 365)),
      region: 'International',
      preferredCompetitionLevels: ['Beach Volleyball'],
      timezone: 'UTC',
      lastLoginAt: DateTime.now(),
      createdAt: DateTime.now(),
    );

    final testSession = Session(
      sessionId: 'test-session-id',
      userId: 'test-user-id',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: DateTime.now().add(const Duration(hours: 1)),
      rememberMe: true,
      deviceInfo: 'Test Device',
      createdAt: DateTime.now(),
    );

    setUp(() {
      mockAuthService = MockAuthenticationService();
      mockSessionManager = MockSessionManager();
      mockLogger = MockLoggerService();

      provideDummy<String>('dummy-correlation-id');
      when(mockLogger.generateCorrelationId()).thenReturn('test-correlation-id');
      
      // Mock clearSession to return Future<void> by default
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

    test('initial state is AuthenticationInitial', () {
      expect(authBloc.state, isA<AuthenticationInitial>());
    });

    group('AppStarted', () {
      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationAuthenticated] when valid session exists',
        build: () {
          when(mockSessionManager.getCurrentSession())
              .thenAnswer((_) async => Success(testSession));
          when(mockAuthService.getCurrentUser())
              .thenAnswer((_) async => Success(testUserProfile));
          return authBloc;
        },
        act: (bloc) => bloc.add(AppStarted()),
        expect: () => [
          AuthenticationAuthenticated(user: testUserProfile),
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
          AuthenticationUnauthenticated(),
        ],
        verify: (_) {
          verify(mockSessionManager.getCurrentSession()).called(1);
          verifyNever(mockAuthService.getCurrentUser());
        },
      );

      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationUnauthenticated] when session is invalid',
        build: () {
          when(mockSessionManager.getCurrentSession())
              .thenAnswer((_) async => Success(testSession));
          when(mockAuthService.getCurrentUser())
              .thenAnswer((_) async => const Error(AuthError('Session expired')));
          when(mockSessionManager.clearSession()).thenAnswer((_) async {});
          return authBloc;
        },
        act: (bloc) => bloc.add(AppStarted()),
        expect: () => [
          AuthenticationUnauthenticated(),
        ],
        verify: (_) {
          verify(mockSessionManager.getCurrentSession()).called(1);
          verify(mockAuthService.getCurrentUser()).called(1);
          verify(mockSessionManager.clearSession()).called(1);
        },
      );

      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationUnauthenticated] when exception occurs',
        build: () {
          when(mockSessionManager.getCurrentSession())
              .thenThrow(Exception('Unexpected error'));
          return authBloc;
        },
        act: (bloc) => bloc.add(AppStarted()),
        expect: () => [
          AuthenticationUnauthenticated(),
        ],
      );
    });

    group('LoginRequested', () {
      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationLoading, AuthenticationAuthenticated] when login succeeds',
        build: () {
          when(mockAuthService.signInWithCredentials(
            email: anyNamed('email'),
            password: anyNamed('password'),
            rememberMe: anyNamed('rememberMe'),
          )).thenAnswer((_) async => Success(testUserProfile));
          return authBloc;
        },
        act: (bloc) => bloc.add(LoginRequested(
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true,
        )),
        expect: () => [
          AuthenticationLoading(),
          AuthenticationAuthenticated(user: testUserProfile),
        ],
        verify: (_) {
          verify(mockAuthService.signInWithCredentials(
            email: 'test@example.com',
            password: 'password123',
            rememberMe: true,
          )).called(1);
        },
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
        act: (bloc) => bloc.add(LoginRequested(
          email: 'invalid@example.com',
          password: 'wrongpassword',
        )),
        expect: () => [
          AuthenticationLoading(),
          const AuthenticationError(
            message: 'Invalid email or password. Please check your credentials and try again.',
            details: 'Invalid credentials',
          ),
        ],
      );

      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationLoading, AuthenticationError] when unexpected error occurs',
        build: () {
          when(mockAuthService.signInWithCredentials(
            email: anyNamed('email'),
            password: anyNamed('password'),
            rememberMe: anyNamed('rememberMe'),
          )).thenThrow(Exception('Network error'));
          return authBloc;
        },
        act: (bloc) => bloc.add(LoginRequested(
          email: 'test@example.com',
          password: 'password123',
        )),
        expect: () => [
          AuthenticationLoading(),
          const AuthenticationError(
            message: 'An unexpected error occurred. Please try again.',
          ),
        ],
      );
    });

    group('LogoutRequested', () {
      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationUnauthenticated] when logout succeeds',
        build: () {
          when(mockAuthService.signOut()).thenAnswer((_) async {});
          return authBloc;
        },
        act: (bloc) => bloc.add(LogoutRequested()),
        expect: () => [
          AuthenticationUnauthenticated(),
        ],
        verify: (_) {
          verify(mockAuthService.signOut()).called(1);
        },
      );

      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationUnauthenticated] even when logout fails',
        build: () {
          when(mockAuthService.signOut()).thenThrow(Exception('Network error'));
          return authBloc;
        },
        act: (bloc) => bloc.add(LogoutRequested()),
        expect: () => [
          AuthenticationUnauthenticated(),
        ],
      );
    });

    group('SessionCheckRequested', () {
      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationAuthenticated] when session is valid and user is not already authenticated',
        build: () {
          when(mockAuthService.getCurrentUser())
              .thenAnswer((_) async => Success(testUserProfile));
          return authBloc;
        },
        act: (bloc) => bloc.add(SessionCheckRequested()),
        expect: () => [
          AuthenticationAuthenticated(user: testUserProfile),
        ],
      );

      blocTest<AuthenticationBloc, AuthenticationState>(
        'does not emit when user is already authenticated',
        build: () {
          when(mockAuthService.getCurrentUser())
              .thenAnswer((_) async => Success(testUserProfile));
          return authBloc;
        },
        seed: () => AuthenticationAuthenticated(user: testUserProfile),
        act: (bloc) => bloc.add(SessionCheckRequested()),
        expect: () => [],
      );

      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationUnauthenticated] when session check fails',
        build: () {
          when(mockAuthService.getCurrentUser())
              .thenAnswer((_) async => const Error(AuthError('Session expired')));
          return authBloc;
        },
        act: (bloc) => bloc.add(SessionCheckRequested()),
        expect: () => [
          AuthenticationUnauthenticated(),
        ],
      );

      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationUnauthenticated] when exception occurs',
        build: () {
          when(mockAuthService.getCurrentUser())
              .thenThrow(Exception('Unexpected error'));
          return authBloc;
        },
        act: (bloc) => bloc.add(SessionCheckRequested()),
        expect: () => [
          AuthenticationUnauthenticated(),
        ],
      );
    });

    group('TokenRefreshRequested', () {
      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationAuthenticated] when token refresh succeeds',
        build: () {
          when(mockAuthService.refreshToken())
              .thenAnswer((_) async => Success(testUserProfile));
          return authBloc;
        },
        act: (bloc) => bloc.add(TokenRefreshRequested()),
        expect: () => [
          AuthenticationAuthenticated(user: testUserProfile),
        ],
      );

      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationUnauthenticated] when token refresh fails',
        build: () {
          when(mockAuthService.refreshToken())
              .thenAnswer((_) async => const Error(AuthError('Token refresh failed')));
          return authBloc;
        },
        act: (bloc) => bloc.add(TokenRefreshRequested()),
        expect: () => [
          AuthenticationUnauthenticated(),
        ],
      );

      blocTest<AuthenticationBloc, AuthenticationState>(
        'emits [AuthenticationUnauthenticated] when exception occurs',
        build: () {
          when(mockAuthService.refreshToken())
              .thenThrow(Exception('Network error'));
          return authBloc;
        },
        act: (bloc) => bloc.add(TokenRefreshRequested()),
        expect: () => [
          AuthenticationUnauthenticated(),
        ],
      );
    });

    group('getUserFriendlyErrorMessage', () {
      test('should return user-friendly message for invalid credentials', () {
        const message = 'Invalid credentials provided';
        final result = authBloc.getUserFriendlyErrorMessage(message);
        expect(result, equals('Invalid email or password. Please check your credentials and try again.'));
      });

      test('should return user-friendly message for network errors', () {
        const message = 'Network connection failed';
        final result = authBloc.getUserFriendlyErrorMessage(message);
        expect(result, equals('Network error. Please check your internet connection and try again.'));
      });

      test('should return user-friendly message for timeout errors', () {
        const message = 'Request timeout occurred';
        final result = authBloc.getUserFriendlyErrorMessage(message);
        expect(result, equals('Request timed out. Please try again.'));
      });

      test('should return user-friendly message for rate limit errors', () {
        const message = 'Too many requests';
        final result = authBloc.getUserFriendlyErrorMessage(message);
        expect(result, equals('Too many login attempts. Please wait a moment and try again.'));
      });

      test('should return user-friendly message for maintenance errors', () {
        const message = 'Service unavailable for maintenance';
        final result = authBloc.getUserFriendlyErrorMessage(message);
        expect(result, equals('Authentication service is temporarily unavailable. Please try again later.'));
      });

      test('should return default message for unknown errors', () {
        const message = 'Some unknown error occurred';
        final result = authBloc.getUserFriendlyErrorMessage(message);
        expect(result, equals('Login failed. Please check your credentials and try again.'));
      });
    });
  });
}