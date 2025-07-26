import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/result.dart';
import '../core/errors/auth_error.dart';
import '../core/logging/logger_service.dart';
import '../data/models/user_profile.dart';
import '../data/models/session.dart' as models;
import 'session_manager.dart';
import 'interfaces/i_authentication_service.dart';

class AuthenticationService implements IAuthenticationService {
  final SupabaseClient _supabase;
  final LoggerService _logger;
  final SessionManager _sessionManager;

  AuthenticationService({
    SupabaseClient? supabaseClient,
    LoggerService? logger,
    SessionManager? sessionManager,
  }) : _supabase = supabaseClient ?? Supabase.instance.client,
       _logger = logger ?? LoggerService(),
       _sessionManager = sessionManager ?? SessionManager();

  /// Sign in with FIVB credentials (MVP: uses email/password via Supabase)
  @override
  Future<Result<UserProfile, AuthError>> signInWithCredentials({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    final correlationId = _logger.generateCorrelationId();

    try {
      _logger.info(
        'Starting authentication with credentials',
        correlationId: correlationId,
        data: {'email': email, 'rememberMe': rememberMe},
        component: 'AUTH_SERVICE',
      );

      // Attempt to sign in with Supabase Auth
      final response = await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user == null) {
        return const Error(AuthError(
          'Authentication failed',
          'No user returned from authentication service',
        ));
      }

      // Create user profile from Supabase user data
      final userProfile = await _createUserProfileFromAuth(response.user!, correlationId);
      
      // Create and store session
      final session = models.Session(
        sessionId: response.session?.accessToken.split('.').first ?? 'session_${DateTime.now().millisecondsSinceEpoch}',
        userId: response.user!.id,
        accessToken: response.session?.accessToken ?? '',
        refreshToken: response.session?.refreshToken ?? '',
        expiresAt: DateTime.fromMillisecondsSinceEpoch(
          (response.session?.expiresAt ?? DateTime.now().millisecondsSinceEpoch ~/ 1000 + 3600) * 1000,
        ),
        rememberMe: rememberMe,
        deviceInfo: await _getDeviceInfo(),
        createdAt: DateTime.now(),
      );

      await _sessionManager.storeSession(session);

      _logger.info(
        'Authentication successful',
        correlationId: correlationId,
        data: {'userId': userProfile.userId},
        component: 'AUTH_SERVICE',
      );

      return Success(userProfile);

    } on AuthException catch (e) {
      _logger.warning(
        'Authentication failed',
        correlationId: correlationId,
        data: {'error': e.message, 'statusCode': e.statusCode},
        component: 'AUTH_SERVICE',
      );

      return Error(AuthError(
        'Authentication failed',
        e.message,
      ));

    } catch (e) {
      _logger.error(
        'Unexpected error during authentication',
        correlationId: correlationId,
        exception: e,
        component: 'AUTH_SERVICE',
      );

      return const Error(AuthError(
        'Authentication error',
        'An unexpected error occurred during sign in',
      ));
    }
  }

  /// Get current authenticated user
  @override
  Future<Result<UserProfile, AuthError>> getCurrentUser() async {
    final correlationId = _logger.generateCorrelationId();

    try {
      final currentUser = _supabase.auth.currentUser;
      
      if (currentUser == null) {
        return const Error(AuthError(
          'Not authenticated',
          'No current user session found',
        ));
      }

      // Check if session is still valid
      final sessionResult = await _sessionManager.getCurrentSession();
      final isSessionValid = sessionResult.fold(
        (session) => session.isValid,
        (error) => false,
      );

      if (!isSessionValid) {
        return const Error(AuthError(
          'Session expired',
          'Current session is no longer valid',
        ));
      }

      final userProfile = await _createUserProfileFromAuth(currentUser, correlationId);

      return Success(userProfile);

    } catch (e) {
      _logger.error(
        'Error getting current user',
        correlationId: correlationId,
        exception: e,
        component: 'AUTH_SERVICE',
      );

      return const Error(AuthError(
        'User retrieval error',
        'Failed to get current user information',
      ));
    }
  }

  /// Refresh authentication token
  @override
  Future<Result<UserProfile, AuthError>> refreshToken() async {
    final correlationId = _logger.generateCorrelationId();

    try {
      _logger.info(
        'Refreshing authentication token',
        correlationId: correlationId,
        component: 'AUTH_SERVICE',
      );

      final response = await _supabase.auth.refreshSession();

      if (response.user == null) {
        await _sessionManager.clearSession();
        return const Error(AuthError(
          'Token refresh failed',
          'Unable to refresh authentication token',
        ));
      }

      // Update stored session with new tokens
      final sessionResult = await _sessionManager.getCurrentSession();
      await sessionResult.fold(
        (oldSession) async {
          final updatedSession = oldSession.copyWith(
            accessToken: response.session?.accessToken ?? oldSession.accessToken,
            refreshToken: response.session?.refreshToken ?? oldSession.refreshToken,
            expiresAt: DateTime.fromMillisecondsSinceEpoch(
              (response.session?.expiresAt ?? DateTime.now().millisecondsSinceEpoch ~/ 1000 + 3600) * 1000,
            ),
          );
          await _sessionManager.storeSession(updatedSession);
        },
        (error) async {
          // If no session exists, create a new one
          final newSession = models.Session(
            sessionId: response.session?.accessToken.split('.').first ?? 'session_${DateTime.now().millisecondsSinceEpoch}',
            userId: response.user!.id,
            accessToken: response.session?.accessToken ?? '',
            refreshToken: response.session?.refreshToken ?? '',
            expiresAt: DateTime.fromMillisecondsSinceEpoch(
              (response.session?.expiresAt ?? DateTime.now().millisecondsSinceEpoch ~/ 1000 + 3600) * 1000,
            ),
            rememberMe: false,
            deviceInfo: await _getDeviceInfo(),
            createdAt: DateTime.now(),
          );
          await _sessionManager.storeSession(newSession);
        },
      );

      final userProfile = await _createUserProfileFromAuth(response.user!, correlationId);

      _logger.info(
        'Token refresh successful',
        correlationId: correlationId,
        data: {'userId': userProfile.userId},
        component: 'AUTH_SERVICE',
      );

      return Success(userProfile);

    } on AuthException catch (e) {
      _logger.warning(
        'Token refresh failed',
        correlationId: correlationId,
        data: {'error': e.message},
        component: 'AUTH_SERVICE',
      );

      await _sessionManager.clearSession();
      return Error(AuthError('Token refresh failed', e.message));

    } catch (e) {
      _logger.error(
        'Unexpected error during token refresh',
        correlationId: correlationId,
        exception: e,
        component: 'AUTH_SERVICE',
      );

      return const Error(AuthError(
        'Token refresh error',
        'An unexpected error occurred during token refresh',
      ));
    }
  }

  /// Sign out user
  @override
  Future<Result<void, AuthError>> signOut() async {
    final correlationId = _logger.generateCorrelationId();

    try {
      _logger.info(
        'Starting user sign out',
        correlationId: correlationId,
        component: 'AUTH_SERVICE',
      );

      // Sign out from Supabase
      await _supabase.auth.signOut();
      
      // Clear local session
      await _sessionManager.clearSession();

      _logger.info(
        'User sign out completed',
        correlationId: correlationId,
        component: 'AUTH_SERVICE',
      );

      return const Success(null);

    } catch (e) {
      _logger.error(
        'Error during sign out',
        correlationId: correlationId,
        exception: e,
        component: 'AUTH_SERVICE',
      );

      // Even if remote sign out fails, clear local session
      await _sessionManager.clearSession();
      
      return const Error(AuthError(
        'Sign out error',
        'An error occurred during sign out, but local session was cleared',
      ));
    }
  }

  /// Check if user is currently authenticated
  @override
  Future<bool> isAuthenticated() async {
    try {
      final currentUser = _supabase.auth.currentUser;
      if (currentUser == null) return false;

      final sessionResult = await _sessionManager.getCurrentSession();
      return sessionResult.fold(
        (session) => session.isValid,
        (error) => false,
      );
    } catch (e) {
      return false;
    }
  }

  /// Reset password for email
  @override
  Future<Result<void, AuthError>> resetPassword({required String email}) async {
    final correlationId = _logger.generateCorrelationId();

    try {
      _logger.info(
        'Password reset requested',
        correlationId: correlationId,
        data: {'email': email},
        component: 'AUTH_SERVICE',
      );

      await _supabase.auth.resetPasswordForEmail(email);

      _logger.info(
        'Password reset email sent',
        correlationId: correlationId,
        component: 'AUTH_SERVICE',
      );

      return const Success(null);

    } on AuthException catch (e) {
      _logger.warning(
        'Password reset failed',
        correlationId: correlationId,
        data: {'error': e.message},
        component: 'AUTH_SERVICE',
      );

      return Error(AuthError('Password reset failed', e.message));

    } catch (e) {
      _logger.error(
        'Unexpected error during password reset',
        correlationId: correlationId,
        exception: e,
        component: 'AUTH_SERVICE',
      );

      return const Error(AuthError(
        'Password reset error',
        'An unexpected error occurred during password reset',
      ));
    }
  }

  /// Create UserProfile from Supabase User
  Future<UserProfile> _createUserProfileFromAuth(User user, String correlationId) async {
    // In MVP, create a basic profile from available Supabase user data
    // In production, this would fetch additional referee data from FIVB system
    
    final userMetadata = user.userMetadata ?? {};
    final now = DateTime.now();

    return UserProfile(
      userId: user.id,
      email: user.email ?? '',
      displayName: userMetadata['display_name'] as String? ?? 
                   userMetadata['full_name'] as String? ?? 
                   user.email?.split('@').first ?? 'Referee',
      refereeLevel: userMetadata['referee_level'] as String? ?? 'National',
      certificationDate: userMetadata['certification_date'] != null
          ? DateTime.tryParse(userMetadata['certification_date'] as String) ?? now.subtract(const Duration(days: 365))
          : now.subtract(const Duration(days: 365)),
      region: userMetadata['region'] as String? ?? 'International',
      preferredLocation: userMetadata['preferred_location'] as String?,
      preferredCompetitionLevels: userMetadata['preferred_competition_levels'] != null
          ? List<String>.from(userMetadata['preferred_competition_levels'] as List)
          : ['Beach Volleyball'],
      timezone: userMetadata['timezone'] as String? ?? 'UTC',
      lastLoginAt: now,
      createdAt: DateTime.tryParse(user.createdAt.toString()) ?? now,
    );
  }

  /// Get device information for session tracking
  Future<String> _getDeviceInfo() async {
    if (kIsWeb) {
      return 'Web Browser';
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      return 'iOS Device';
    } else if (defaultTargetPlatform == TargetPlatform.android) {
      return 'Android Device';
    } else {
      return 'Unknown Device';
    }
  }
}