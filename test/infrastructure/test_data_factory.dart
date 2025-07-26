import 'package:beachref/data/models/user_profile.dart';
import 'package:beachref/data/models/session.dart';
import 'package:beachref/data/models/tournament.dart';
import 'package:beachref/core/errors/auth_error.dart';
import 'package:beachref/core/errors/vis_error.dart';
import 'package:beachref/core/result.dart';
import 'package:beachref/services/vis_integration_service.dart';

/// Centralized factory for creating consistent test data
/// Provides realistic, varied test scenarios for comprehensive testing
class TestDataFactory {
  // Counter for unique IDs
  static int _counter = 0;
  
  /// Generate unique ID for test data
  static String get uniqueId => 'test-${++_counter}-${DateTime.now().millisecondsSinceEpoch}';

  /// Create a standard test user profile
  static UserProfile createUserProfile({
    String? userId,
    String? email,
    String? displayName,
    String? refereeLevel,
    DateTime? certificationDate,
    String? region,
    List<String>? competitionLevels,
    String? timezone,
    DateTime? lastLoginAt,
    DateTime? createdAt,
  }) {
    return UserProfile(
      userId: userId ?? uniqueId,
      email: email ?? 'test-user-$_counter@example.com',
      displayName: displayName ?? 'Test User $_counter',
      refereeLevel: refereeLevel ?? 'National',
      certificationDate: certificationDate ?? DateTime.now().subtract(const Duration(days: 365)),
      region: region ?? 'International',
      preferredCompetitionLevels: competitionLevels ?? ['Beach Volleyball'],
      timezone: timezone ?? 'UTC',
      lastLoginAt: lastLoginAt ?? DateTime.now().subtract(const Duration(hours: 1)),
      createdAt: createdAt ?? DateTime.now().subtract(const Duration(days: 30)),
    );
  }

  /// Create a test session
  static Session createSession({
    String? sessionId,
    String? userId,
    String? accessToken,
    String? refreshToken,
    DateTime? expiresAt,
    bool? rememberMe,
    String? deviceInfo,
    DateTime? createdAt,
  }) {
    return Session(
      sessionId: sessionId ?? uniqueId,
      userId: userId ?? uniqueId,
      accessToken: accessToken ?? 'access-token-$_counter',
      refreshToken: refreshToken ?? 'refresh-token-$_counter',
      expiresAt: expiresAt ?? DateTime.now().add(const Duration(hours: 1)),
      rememberMe: rememberMe ?? false,
      deviceInfo: deviceInfo ?? 'Test Device $_counter',
      createdAt: createdAt ?? DateTime.now(),
    );
  }

  /// Create an expired session for testing
  static Session createExpiredSession() {
    return createSession(
      expiresAt: DateTime.now().subtract(const Duration(hours: 1)),
    );
  }

  /// Create a test tournament
  static Tournament createTournament({
    String? id,
    String? visId,
    String? name,
    String? location,
    DateTime? startDate,
    DateTime? endDate,
    String? competitionLevel,
    String? tournamentType,
    TournamentStatus? status,
  }) {
    return Tournament(
      id: id ?? uniqueId,
      visId: visId ?? 'vis-$uniqueId',
      name: name ?? 'Test Tournament $_counter',
      location: location ?? 'Test Location $_counter',
      startDate: startDate ?? DateTime.now().add(const Duration(days: 7)),
      endDate: endDate ?? DateTime.now().add(const Duration(days: 14)),
      competitionLevel: competitionLevel ?? 'National',
      tournamentType: tournamentType ?? 'Beach Volleyball',
      status: status ?? TournamentStatus.scheduled,
      teams: const [],
      lastUpdated: DateTime.now(),
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }

  /// Create a health status for VIS service testing
  static HealthStatus createHealthStatus({
    bool? isConnected,
    int? responseTimeMs,
    DateTime? lastCheckTime,
    ConnectionStatus? status,
    String? errorMessage,
  }) {
    return HealthStatus(
      isConnected: isConnected ?? true,
      responseTimeMs: responseTimeMs ?? 150,
      lastCheckTime: lastCheckTime ?? DateTime.now(),
      status: status ?? ConnectionStatus.connected,
      errorMessage: errorMessage,
    );
  }

  /// Reset counter for test isolation
  static void reset() {
    _counter = 0;
  }
}

/// Various authentication errors for testing
class AuthErrors {
    static const AuthError invalidCredentials = AuthError(
      'Invalid credentials',
      'The provided email or password is incorrect',
    );
    
    static const AuthError sessionExpired = AuthError(
      'Session expired',
      'Your session has expired. Please sign in again.',
    );
    
    static const AuthError networkError = AuthError(
      'Network error',
      'Unable to connect to authentication service',
    );
    
    static const AuthError unknownError = AuthError(
      'Unknown error',
      'An unexpected error occurred during authentication',
    );
}

/// Create various VIS errors for testing
class VisErrors {
  static const VisConnectionError connectionError = VisConnectionError(
    'Connection failed',
    'Unable to connect to VIS service',
  );
  
  static const VisRateLimitError rateLimitError = VisRateLimitError(
    'Rate limit exceeded',
    'Too many requests. Please wait before trying again.',
  );
  
  static const VisAuthenticationError authError = VisAuthenticationError(
    'Authentication failed',
    'Invalid API credentials for VIS service',
  );
  
  static const VisMaintenanceError maintenanceError = VisMaintenanceError(
    'Service unavailable',
    'VIS service is temporarily unavailable for maintenance',
  );

}

/// Create successful results for testing
class SuccessResults {
  static Result<UserProfile, AuthError> userProfile([UserProfile? user]) {
    return Success(user ?? TestDataFactory.createUserProfile());
  }
  
  static Result<Session, AuthError> session([Session? session]) {
    return Success(session ?? TestDataFactory.createSession());
  }
  
  static Result<List<Tournament>, VisError> tournaments([List<Tournament>? tournaments]) {
    return Success(tournaments ?? [TestDataFactory.createTournament(), TestDataFactory.createTournament()]);
  }
  
  static Result<HealthStatus, VisError> healthStatus([HealthStatus? health]) {
    return Success(health ?? TestDataFactory.createHealthStatus());
  }

}

/// Create error results for testing
class ErrorResults {
  static Result<UserProfile, AuthError> authError([AuthError? error]) {
    return Error(error ?? AuthErrors.invalidCredentials);
  }
  
  static Result<Session, AuthError> sessionError([AuthError? error]) {
    return Error(error ?? AuthErrors.sessionExpired);
  }
  
  static Result<List<Tournament>, VisError> visError([VisError? error]) {
    return Error(error ?? VisErrors.connectionError);
  }
  
  static Result<HealthStatus, VisError> healthError([VisError? error]) {
    return Error(error ?? VisErrors.connectionError);
  }

}

/// Create test scenarios for comprehensive testing
class Scenarios {
  /// Successful authentication flow
  static Map<String, dynamic> successfulLogin() {
    final user = TestDataFactory.createUserProfile();
    final session = TestDataFactory.createSession(userId: user.userId);
    
    return {
      'user': user,
      'session': session,
      'userResult': SuccessResults.userProfile(user),
      'sessionResult': SuccessResults.session(session),
    };
  }
  
  /// Failed authentication scenarios
  static Map<String, dynamic> failedLogin() {
    return {
      'invalidCredentials': ErrorResults.authError(AuthErrors.invalidCredentials),
      'networkError': ErrorResults.authError(AuthErrors.networkError),
      'unknownError': ErrorResults.authError(AuthErrors.unknownError),
    };
  }
  
  /// Session management scenarios
  static Map<String, dynamic> sessionManagement() {
    return {
      'validSession': TestDataFactory.createSession(),
      'expiredSession': TestDataFactory.createExpiredSession(),
      'sessionResult': SuccessResults.session(),
      'expiredResult': ErrorResults.sessionError(AuthErrors.sessionExpired),
    };
  }
  
  /// VIS service scenarios
  static Map<String, dynamic> visService() {
    return {
      'healthyService': SuccessResults.healthStatus(),
      'connectionError': ErrorResults.healthError(VisErrors.connectionError),
      'rateLimitError': ErrorResults.healthError(VisErrors.rateLimitError),
      'maintenanceError': ErrorResults.healthError(VisErrors.maintenanceError),
      'tournaments': SuccessResults.tournaments(),
    };
  }
}