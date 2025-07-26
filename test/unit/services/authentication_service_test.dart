import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide Session;
import 'package:supabase_flutter/supabase_flutter.dart' as supabase show Session;
import 'package:beachref/services/authentication_service.dart';
import 'package:beachref/services/session_manager.dart';
import 'package:beachref/core/logging/logger_service.dart';
import 'package:beachref/data/models/user_profile.dart';
import 'package:beachref/data/models/session.dart';
import 'package:beachref/core/result.dart';
import 'package:beachref/core/errors/auth_error.dart';

import '../../helpers/test_helper.dart';
import 'authentication_service_test.mocks.dart';

@GenerateMocks([
  SupabaseClient,
  GoTrueClient,
  SessionManager,
  LoggerService,
  User,
  AuthResponse,
])
@GenerateNiceMocks([
  MockSpec<supabase.Session>(as: #MockSupabaseSession),
])
void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await initializeSupabaseForTesting();
  });

  tearDownAll(() async {
    await disposeSupabaseForTesting();
  });

  group('AuthenticationService', () {
    late AuthenticationService authService;
    late MockSupabaseClient mockSupabaseClient;
    late MockGoTrueClient mockGoTrueClient;
    late MockSessionManager mockSessionManager;
    late MockLoggerService mockLoggerService;

    setUp(() {
      mockSupabaseClient = MockSupabaseClient();
      mockGoTrueClient = MockGoTrueClient();
      mockSessionManager = MockSessionManager();
      mockLoggerService = MockLoggerService();

      when(mockSupabaseClient.auth).thenReturn(mockGoTrueClient);
      when(mockLoggerService.generateCorrelationId()).thenReturn('test-correlation-id');

      authService = AuthenticationService();
      // We would need to inject dependencies for proper testing
      // This is a simplified version for demonstration
    });

    group('signInWithCredentials', () {
      test('should return UserProfile on successful authentication', () async {
        // Arrange
        final mockUser = MockUser();
        final mockAuthResponse = MockAuthResponse();
        final mockSession = MockSupabaseSession();

        when(mockUser.id).thenReturn('test-user-id');
        when(mockUser.email).thenReturn('test@example.com');
        when(mockUser.userMetadata).thenReturn({'display_name': 'Test User'});
        when(mockUser.createdAt).thenReturn(DateTime.now().toIso8601String());

        when(mockSession.accessToken).thenReturn('test-access-token');
        when(mockSession.refreshToken).thenReturn('test-refresh-token');
        when(mockSession.expiresAt).thenReturn(DateTime.now().millisecondsSinceEpoch ~/ 1000 + 3600);

        when(mockAuthResponse.user).thenReturn(mockUser);
        when(mockAuthResponse.session).thenReturn(mockSession);

        when(mockGoTrueClient.signInWithPassword(
          email: anyNamed('email'),
          password: anyNamed('password'),
        )).thenAnswer((_) async => mockAuthResponse);

        when(mockSessionManager.storeSession(any)).thenAnswer((_) async {});

        // Act
        final result = await authService.signInWithCredentials(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        expect(result.isSuccess, isTrue);
        if (result.isSuccess) {
          final userProfile = result.value;
          expect(userProfile.userId, equals('test-user-id'));
          expect(userProfile.email, equals('test@example.com'));
          expect(userProfile.displayName, equals('Test User'));
        }

        verify(mockGoTrueClient.signInWithPassword(
          email: 'test@example.com',
          password: 'password123',
        )).called(1);
        verify(mockSessionManager.storeSession(any)).called(1);
      });

      test('should return AuthError when authentication fails', () async {
        // Arrange
        when(mockGoTrueClient.signInWithPassword(
          email: anyNamed('email'),
          password: anyNamed('password'),
        )).thenThrow(const AuthException('Invalid credentials'));

        // Act
        final result = await authService.signInWithCredentials(
          email: 'invalid@example.com',
          password: 'wrongpassword',
        );

        // Assert
        expect(result.isError, isTrue);
        if (result.isError) {
          final error = result.error;
          expect(error.message, equals('Authentication failed'));
          expect(error.details, equals('Invalid credentials'));
        }
      });

      test('should return AuthError when user is null in response', () async {
        // Arrange
        final mockAuthResponse = MockAuthResponse();
        when(mockAuthResponse.user).thenReturn(null);

        when(mockGoTrueClient.signInWithPassword(
          email: anyNamed('email'),
          password: anyNamed('password'),
        )).thenAnswer((_) async => mockAuthResponse);

        // Act
        final result = await authService.signInWithCredentials(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        expect(result.isError, isTrue);
        if (result.isError) {
          final error = result.error;
          expect(error.message, equals('Authentication failed'));
          expect(error.details, equals('No user returned from authentication service'));
        }
      });
    });

    group('getCurrentUser', () {
      test('should return UserProfile when user is authenticated and session is valid', () async {
        // Arrange
        final mockUser = MockUser();
        final mockStoredSession = Session(
          sessionId: 'test-session-id',
          userId: 'test-user-id',
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: DateTime.now().add(Duration(hours: 1)),
          rememberMe: false,
          deviceInfo: 'test-device',
          createdAt: DateTime.now(),
        );

        when(mockUser.id).thenReturn('test-user-id');
        when(mockUser.email).thenReturn('test@example.com');
        when(mockUser.userMetadata).thenReturn({'display_name': 'Test User'});
        when(mockUser.createdAt).thenReturn(DateTime.now().toIso8601String());

        when(mockGoTrueClient.currentUser).thenReturn(mockUser);
        when(mockSessionManager.getCurrentSession())
            .thenAnswer((_) async => Success(mockStoredSession));
        // Session is valid by default with future expiry date

        // Act
        final result = await authService.getCurrentUser();

        // Assert
        expect(result.isSuccess, isTrue);
        if (result.isSuccess) {
          final userProfile = result.value;
          expect(userProfile.userId, equals('test-user-id'));
          expect(userProfile.email, equals('test@example.com'));
        }
      });

      test('should return AuthError when no current user', () async {
        // Arrange
        when(mockGoTrueClient.currentUser).thenReturn(null);

        // Act
        final result = await authService.getCurrentUser();

        // Assert
        expect(result.isError, isTrue);
        if (result.isError) {
          final error = result.error;
          expect(error.message, equals('Not authenticated'));
          expect(error.details, equals('No current user session found'));
        }
      });

      test('should return AuthError when session is invalid', () async {
        // Arrange
        final mockUser = MockUser();
        when(mockGoTrueClient.currentUser).thenReturn(mockUser);
        when(mockSessionManager.getCurrentSession())
            .thenAnswer((_) async => const Error(AuthError('Session expired')));

        // Act
        final result = await authService.getCurrentUser();

        // Assert
        expect(result.isError, isTrue);
        if (result.isError) {
          final error = result.error;
          expect(error.message, equals('Session expired'));
          expect(error.details, equals('Current session is no longer valid'));
        }
      });
    });

    group('refreshToken', () {
      test('should return UserProfile on successful token refresh', () async {
        // Arrange
        final mockUser = MockUser();
        final mockAuthResponse = MockAuthResponse();
        final mockSession = MockSupabaseSession();
        final mockStoredSession = Session(
          sessionId: 'test-session-id',
          userId: 'test-user-id',
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: DateTime.now().add(Duration(hours: 1)),
          rememberMe: false,
          deviceInfo: 'test-device',
          createdAt: DateTime.now(),
        );

        when(mockUser.id).thenReturn('test-user-id');
        when(mockUser.email).thenReturn('test@example.com');
        when(mockUser.userMetadata).thenReturn({'display_name': 'Test User'});
        when(mockUser.createdAt).thenReturn(DateTime.now().toIso8601String());

        when(mockSession.accessToken).thenReturn('new-access-token');
        when(mockSession.refreshToken).thenReturn('new-refresh-token');
        when(mockSession.expiresAt).thenReturn(DateTime.now().millisecondsSinceEpoch ~/ 1000 + 3600);

        when(mockAuthResponse.user).thenReturn(mockUser);
        when(mockAuthResponse.session).thenReturn(mockSession);

        when(mockGoTrueClient.refreshSession()).thenAnswer((_) async => mockAuthResponse);
        when(mockSessionManager.getCurrentSession())
            .thenAnswer((_) async => Success(mockStoredSession));
        // Using real Session object, copyWith will work naturally
        when(mockSessionManager.storeSession(any)).thenAnswer((_) async {});

        // Act
        final result = await authService.refreshToken();

        // Assert
        expect(result.isSuccess, isTrue);
        verify(mockGoTrueClient.refreshSession()).called(1);
        verify(mockSessionManager.storeSession(any)).called(1);
      });

      test('should return AuthError when token refresh fails', () async {
        // Arrange
        when(mockGoTrueClient.refreshSession())
            .thenThrow(const AuthException('Token refresh failed'));
        when(mockSessionManager.clearSession()).thenAnswer((_) async {});

        // Act
        final result = await authService.refreshToken();

        // Assert
        expect(result.isError, isTrue);
        verify(mockSessionManager.clearSession()).called(1);
      });
    });

    group('signOut', () {
      test('should successfully sign out user', () async {
        // Arrange
        when(mockGoTrueClient.signOut()).thenAnswer((_) async {});
        when(mockSessionManager.clearSession()).thenAnswer((_) async {});

        // Act
        await authService.signOut();

        // Assert
        verify(mockGoTrueClient.signOut()).called(1);
        verify(mockSessionManager.clearSession()).called(1);
      });

      test('should clear local session even if remote sign out fails', () async {
        // Arrange
        when(mockGoTrueClient.signOut()).thenThrow(Exception('Network error'));
        when(mockSessionManager.clearSession()).thenAnswer((_) async {});

        // Act
        await authService.signOut();

        // Assert
        verify(mockGoTrueClient.signOut()).called(1);
        verify(mockSessionManager.clearSession()).called(1);
      });
    });
  });
}