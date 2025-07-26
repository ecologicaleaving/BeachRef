import 'package:beachref/data/models/user_profile.dart';
import 'package:beachref/core/result.dart';
import 'package:beachref/core/errors/auth_error.dart';

/// Abstract interface for authentication service
/// Enables proper dependency injection and testing
abstract class IAuthenticationService {
  /// Sign in with email and password
  Future<Result<UserProfile, AuthError>> signInWithCredentials({
    required String email,
    required String password,
    bool rememberMe = false,
  });

  /// Get current authenticated user
  Future<Result<UserProfile, AuthError>> getCurrentUser();

  /// Refresh authentication token
  Future<Result<UserProfile, AuthError>> refreshToken();

  /// Sign out current user
  Future<Result<void, AuthError>> signOut();

  /// Check if user is currently authenticated
  Future<bool> isAuthenticated();

  /// Reset password for email
  Future<Result<void, AuthError>> resetPassword({required String email});
}