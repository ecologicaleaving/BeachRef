import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../data/models/session.dart';
import '../core/result.dart';
import '../core/errors/auth_error.dart';
import '../core/logging/logger_service.dart';

class SessionManager {
  static final SessionManager _instance = SessionManager._internal();
  factory SessionManager([FlutterSecureStorage? storage, LoggerService? logger]) => 
    _instance.._storage = storage ?? _defaultStorage
           .._logger = logger ?? LoggerService();
  SessionManager._internal();

  static const _sessionKey = 'beach_ref_session';
  static const _defaultStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  late FlutterSecureStorage _storage;
  late LoggerService _logger;

  /// Store session securely
  Future<void> storeSession(Session session) async {
    final correlationId = _logger.generateCorrelationId();

    try {
      _logger.info(
        'Storing session',
        correlationId: correlationId,
        data: session.toSanitizedJson(),
        component: 'SESSION_MANAGER',
      );

      final sessionJson = json.encode(session.toJson());
      await _storage.write(key: _sessionKey, value: sessionJson);

      _logger.info(
        'Session stored successfully',
        correlationId: correlationId,
        component: 'SESSION_MANAGER',
      );

    } catch (e) {
      _logger.error(
        'Failed to store session',
        correlationId: correlationId,
        exception: e,
        component: 'SESSION_MANAGER',
      );
      rethrow;
    }
  }

  /// Get current session
  Future<Result<Session, AuthError>> getCurrentSession() async {
    final correlationId = _logger.generateCorrelationId();

    try {
      _logger.debug(
        'Retrieving current session',
        correlationId: correlationId,
        component: 'SESSION_MANAGER',
      );

      final sessionData = await _storage.read(key: _sessionKey);
      
      if (sessionData == null) {
        _logger.debug(
          'No session found in storage',
          correlationId: correlationId,
          component: 'SESSION_MANAGER',
        );
        return const Error(AuthError('No session found'));
      }

      final sessionJson = json.decode(sessionData) as Map<String, dynamic>;
      final session = Session.fromJson(sessionJson);

      _logger.debug(
        'Session retrieved',
        correlationId: correlationId,
        data: session.toSanitizedJson(),
        component: 'SESSION_MANAGER',
      );

      // Check if session is still valid
      if (!session.isValid) {
        _logger.warning(
          'Session is invalid or expired',
          correlationId: correlationId,
          data: {
            'isExpired': session.isExpired,
            'hasTokens': session.accessToken.isNotEmpty && session.refreshToken.isNotEmpty,
          },
          component: 'SESSION_MANAGER',
        );
        
        // Clear invalid session
        await clearSession();
        return const Error(AuthError('Session expired or invalid'));
      }

      return Success(session);

    } catch (e) {
      _logger.error(
        'Failed to retrieve session',
        correlationId: correlationId,
        exception: e,
        component: 'SESSION_MANAGER',
      );
      
      return const Error(AuthError('Session retrieval error'));
    }
  }

  /// Clear stored session
  Future<void> clearSession() async {
    final correlationId = _logger.generateCorrelationId();

    try {
      _logger.info(
        'Clearing session',
        correlationId: correlationId,
        component: 'SESSION_MANAGER',
      );

      await _storage.delete(key: _sessionKey);

      _logger.info(
        'Session cleared successfully',
        correlationId: correlationId,
        component: 'SESSION_MANAGER',
      );

    } catch (e) {
      _logger.error(
        'Failed to clear session',
        correlationId: correlationId,
        exception: e,
        component: 'SESSION_MANAGER',
      );
      rethrow;
    }
  }

  /// Check if a session exists (without loading it)
  Future<bool> hasSession() async {
    try {
      final sessionData = await _storage.read(key: _sessionKey);
      return sessionData != null;
    } catch (e) {
      _logger.error(
        'Error checking session existence',
        exception: e,
        component: 'SESSION_MANAGER',
      );
      return false;
    }
  }

  /// Update session tokens (used during token refresh)
  Future<Result<Session, AuthError>> updateSessionTokens({
    required String accessToken,
    required String refreshToken,
    required DateTime expiresAt,
  }) async {
    final correlationId = _logger.generateCorrelationId();

    try {
      final currentSessionResult = await getCurrentSession();
      
      return await currentSessionResult.fold(
        (currentSession) async {
          final updatedSession = currentSession.copyWith(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAt: expiresAt,
          );

          await storeSession(updatedSession);
          
          _logger.info(
            'Session tokens updated successfully',
            correlationId: correlationId,
            data: updatedSession.toSanitizedJson(),
            component: 'SESSION_MANAGER',
          );

          return Success(updatedSession);
        },
        (error) async {
          _logger.warning(
            'Cannot update tokens - no current session',
            correlationId: correlationId,
            component: 'SESSION_MANAGER',
          );
          return Error(error);
        },
      );

    } catch (e) {
      _logger.error(
        'Failed to update session tokens',
        correlationId: correlationId,
        exception: e,
        component: 'SESSION_MANAGER',
      );
      
      return const Error(AuthError('Session token update failed'));
    }
  }

  /// Clean up expired sessions (can be called periodically)
  Future<void> cleanupExpiredSessions() async {
    final correlationId = _logger.generateCorrelationId();

    try {
      final sessionResult = await getCurrentSession();
      
      await sessionResult.fold(
        (session) async {
          if (session.isExpired) {
            _logger.info(
              'Cleaning up expired session',
              correlationId: correlationId,
              component: 'SESSION_MANAGER',
            );
            await clearSession();
          }
        },
        (error) async {
          // No session to clean up
          _logger.debug(
            'No session to clean up',
            correlationId: correlationId,
            component: 'SESSION_MANAGER',
          );
        },
      );

    } catch (e) {
      _logger.error(
        'Error during session cleanup',
        correlationId: correlationId,
        exception: e,
        component: 'SESSION_MANAGER',
      );
    }
  }
}