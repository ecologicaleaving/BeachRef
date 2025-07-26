import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:beachref/services/session_manager.dart';
import 'package:beachref/data/models/session.dart';
import 'package:beachref/core/logging/logger_service.dart';
import 'package:beachref/core/result.dart';

import 'session_manager_test.mocks.dart';

@GenerateMocks([FlutterSecureStorage, LoggerService])
void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  group('SessionManager', () {
    late SessionManager sessionManager;
    late MockFlutterSecureStorage mockStorage;
    late MockLoggerService mockLogger;

    setUp(() {
      mockStorage = MockFlutterSecureStorage();
      mockLogger = MockLoggerService();
      
      // Mock all logger methods with any parameters
      when(mockLogger.generateCorrelationId()).thenReturn('test-correlation-id');
      when(mockLogger.info(any, correlationId: anyNamed('correlationId'), 
                          data: anyNamed('data'), component: anyNamed('component')))
          .thenReturn(null);
      when(mockLogger.debug(any, correlationId: anyNamed('correlationId'), 
                           data: anyNamed('data'), component: anyNamed('component')))
          .thenReturn(null);
      when(mockLogger.warning(any, correlationId: anyNamed('correlationId'), 
                             data: anyNamed('data'), component: anyNamed('component')))
          .thenReturn(null);
      when(mockLogger.error(any, correlationId: anyNamed('correlationId'), 
                           exception: anyNamed('exception'), component: anyNamed('component')))
          .thenReturn(null);
      
      sessionManager = SessionManager(
        storage: mockStorage,
        logger: mockLogger,
      );
    });

    group('storeSession', () {
      test('should store session successfully', () async {
        // Arrange
        final session = Session(
          sessionId: 'test-session-id',
          userId: 'test-user-id',
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: DateTime.now().add(const Duration(hours: 1)),
          rememberMe: true,
          deviceInfo: 'Test Device',
          createdAt: DateTime.now(),
        );

        when(mockStorage.write(key: anyNamed('key'), value: anyNamed('value')))
            .thenAnswer((_) async {});

        // Act & Assert
        await expectLater(
          () => sessionManager.storeSession(session),
          returnsNormally,
        );
      });

      test('should throw exception when storage fails', () async {
        // Arrange
        final session = Session(
          sessionId: 'test-session-id',
          userId: 'test-user-id',
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: DateTime.now().add(const Duration(hours: 1)),
          rememberMe: true,
          deviceInfo: 'Test Device',
          createdAt: DateTime.now(),
        );

        when(mockStorage.write(key: anyNamed('key'), value: anyNamed('value')))
            .thenThrow(Exception('Storage error'));

        // Act & Assert
        await expectLater(
          () => sessionManager.storeSession(session),
          throwsException,
        );
      });
    });

    group('getCurrentSession', () {
      test('should return session when valid session exists', () async {
        // Arrange
        final now = DateTime.now();
        final sessionJson = '''
        {
          "session_id": "test-session-id",
          "user_id": "test-user-id", 
          "access_token": "test-access-token",
          "refresh_token": "test-refresh-token",
          "expires_at": "${now.add(const Duration(hours: 1)).toIso8601String()}",
          "remember_me": true,
          "device_info": "Test Device",
          "created_at": "${now.toIso8601String()}"
        }''';

        when(mockStorage.read(key: anyNamed('key')))
            .thenAnswer((_) async => sessionJson);

        // Act
        final result = await sessionManager.getCurrentSession();

        // Assert
        expect(result.isSuccess, isTrue);
        if (result.isSuccess) {
          final session = result.value;
          expect(session.sessionId, equals('test-session-id'));
          expect(session.userId, equals('test-user-id'));
          expect(session.accessToken, equals('test-access-token'));
          expect(session.refreshToken, equals('test-refresh-token'));
          expect(session.rememberMe, isTrue);
          expect(session.deviceInfo, equals('Test Device'));
        }
      });

      test('should return error when no session exists', () async {
        // Arrange
        when(mockStorage.read(key: anyNamed('key')))
            .thenAnswer((_) async => null);

        // Act
        final result = await sessionManager.getCurrentSession();

        // Assert
        expect(result.isError, isTrue);
        if (result.isError) {
          expect(result.error.message, equals('No session found'));
        }
      });

      test('should return error when session is expired', () async {
        // Arrange
        final now = DateTime.now();
        final expiredSessionJson = '''
        {
          "session_id": "test-session-id",
          "user_id": "test-user-id",
          "access_token": "test-access-token", 
          "refresh_token": "test-refresh-token",
          "expires_at": "${now.subtract(const Duration(hours: 1)).toIso8601String()}",
          "remember_me": true,
          "device_info": "Test Device",
          "created_at": "${now.toIso8601String()}"
        }''';

        when(mockStorage.read(key: anyNamed('key')))
            .thenAnswer((_) async => expiredSessionJson);
        when(mockStorage.delete(key: anyNamed('key')))
            .thenAnswer((_) async {});

        // Act
        final result = await sessionManager.getCurrentSession();

        // Assert
        expect(result.isError, isTrue);
        if (result.isError) {
          expect(result.error.message, equals('Session expired or invalid'));
        }
        verify(mockStorage.delete(key: anyNamed('key'))).called(1);
      });

      test('should return error when session has empty tokens', () async {
        // Arrange
        final now = DateTime.now();
        final invalidSessionJson = '''
        {
          "session_id": "test-session-id",
          "user_id": "test-user-id",
          "access_token": "",
          "refresh_token": "",
          "expires_at": "${now.add(const Duration(hours: 1)).toIso8601String()}",
          "remember_me": true,
          "device_info": "Test Device",
          "created_at": "${now.toIso8601String()}"
        }''';

        when(mockStorage.read(key: anyNamed('key')))
            .thenAnswer((_) async => invalidSessionJson);
        when(mockStorage.delete(key: anyNamed('key')))
            .thenAnswer((_) async {});

        // Act
        final result = await sessionManager.getCurrentSession();

        // Assert
        expect(result.isError, isTrue);
        verify(mockStorage.delete(key: anyNamed('key'))).called(1);
      });

      test('should return error when storage throws exception', () async {
        // Arrange
        when(mockStorage.read(key: anyNamed('key')))
            .thenThrow(Exception('Storage error'));

        // Act
        final result = await sessionManager.getCurrentSession();

        // Assert
        expect(result.isError, isTrue);
        if (result.isError) {
          expect(result.error.message, equals('Session retrieval error'));
        }
      });
    });

    group('clearSession', () {
      test('should clear session successfully', () async {
        // Arrange
        when(mockStorage.delete(key: anyNamed('key')))
            .thenAnswer((_) async {});

        // Act & Assert
        await expectLater(
          () => sessionManager.clearSession(),
          returnsNormally,
        );

        verify(mockStorage.delete(key: anyNamed('key'))).called(1);
      });

      test('should throw exception when storage delete fails', () async {
        // Arrange
        when(mockStorage.delete(key: anyNamed('key')))
            .thenThrow(Exception('Storage error'));

        // Act & Assert
        await expectLater(
          () => sessionManager.clearSession(),
          throwsException,
        );
      });
    });

    group('hasSession', () {
      test('should return true when session exists', () async {
        // Arrange
        when(mockStorage.read(key: anyNamed('key')))
            .thenAnswer((_) async => 'some-session-data');

        // Act
        final result = await sessionManager.hasSession();

        // Assert
        expect(result, isTrue);
      });

      test('should return false when no session exists', () async {
        // Arrange
        when(mockStorage.read(key: anyNamed('key')))
            .thenAnswer((_) async => null);

        // Act
        final result = await sessionManager.hasSession();

        // Assert
        expect(result, isFalse);
      });

      test('should return false when storage throws exception', () async {
        // Arrange
        when(mockStorage.read(key: anyNamed('key')))
            .thenThrow(Exception('Storage error'));

        // Act
        final result = await sessionManager.hasSession();

        // Assert
        expect(result, isFalse);
      });
    });

    group('updateSessionTokens', () {
      test('should update tokens when current session exists', () async {
        // Arrange
        final now = DateTime.now();
        final existingSession = Session(
          sessionId: 'test-session-id',
          userId: 'test-user-id',
          accessToken: 'old-access-token',
          refreshToken: 'old-refresh-token',
          expiresAt: now.add(const Duration(minutes: 30)),
          rememberMe: true,
          deviceInfo: 'Test Device',
          createdAt: now,
        );

        final sessionJson = '''
        {
          "session_id": "test-session-id",
          "user_id": "test-user-id",
          "access_token": "old-access-token", 
          "refresh_token": "old-refresh-token",
          "expires_at": "${now.add(const Duration(minutes: 30)).toIso8601String()}",
          "remember_me": true,
          "device_info": "Test Device",
          "created_at": "${now.toIso8601String()}"
        }''';

        when(mockStorage.read(key: anyNamed('key')))
            .thenAnswer((_) async => sessionJson);
        when(mockStorage.write(key: anyNamed('key'), value: anyNamed('value')))
            .thenAnswer((_) async {});

        final newExpiresAt = now.add(const Duration(hours: 2));

        // Act
        final result = await sessionManager.updateSessionTokens(
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresAt: newExpiresAt,
        );

        // Assert
        expect(result.isSuccess, isTrue);
        verify(mockStorage.write(key: anyNamed('key'), value: anyNamed('value')))
            .called(1);
      });

      test('should return error when no current session exists', () async {
        // Arrange
        when(mockStorage.read(key: anyNamed('key')))
            .thenAnswer((_) async => null);

        // Act
        final result = await sessionManager.updateSessionTokens(
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresAt: DateTime.now().add(const Duration(hours: 1)),
        );

        // Assert
        expect(result.isError, isTrue);
      });
    });

    group('cleanupExpiredSessions', () {
      test('should clear expired session', () async {
        // Arrange
        final now = DateTime.now();
        final expiredSessionJson = '''
        {
          "session_id": "test-session-id",
          "user_id": "test-user-id",
          "access_token": "test-access-token",
          "refresh_token": "test-refresh-token", 
          "expires_at": "${now.subtract(const Duration(hours: 1)).toIso8601String()}",
          "remember_me": true,
          "device_info": "Test Device",
          "created_at": "${now.toIso8601String()}"
        }''';

        when(mockStorage.read(key: anyNamed('key')))
            .thenAnswer((_) async => expiredSessionJson);
        when(mockStorage.delete(key: anyNamed('key')))
            .thenAnswer((_) async {});

        // Act
        await sessionManager.cleanupExpiredSessions();

        // Assert
        verify(mockStorage.delete(key: anyNamed('key'))).called(2); // Once in getCurrentSession, once more in cleanup
      });

      test('should do nothing when no session exists', () async {
        // Arrange
        when(mockStorage.read(key: anyNamed('key')))
            .thenAnswer((_) async => null);

        // Act & Assert
        await expectLater(
          () => sessionManager.cleanupExpiredSessions(),
          returnsNormally,
        );
      });

      test('should handle exceptions gracefully', () async {
        // Arrange
        when(mockStorage.read(key: anyNamed('key')))
            .thenThrow(Exception('Storage error'));

        // Act & Assert
        await expectLater(
          () => sessionManager.cleanupExpiredSessions(),
          returnsNormally,
        );
      });
    });
  });
}