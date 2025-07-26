import 'package:beachref/services/interfaces/i_authentication_service.dart';
import 'package:beachref/data/models/user_profile.dart';
import 'package:beachref/core/result.dart';
import 'package:beachref/core/errors/auth_error.dart';
import '../infrastructure/test_data_factory.dart';

/// Mock implementation of authentication service for testing
/// Provides configurable scenarios and responses
class MockAuthenticationService implements IAuthenticationService {
  final Map<String, dynamic> _scenarios = {};
  final Map<String, dynamic> _responses = {};
  
  UserProfile? _currentUser;
  bool _isAuthenticated = false;

  /// Configure a specific scenario response
  void configureScenario(String scenario, dynamic response) {
    _scenarios[scenario] = response;
  }

  /// Configure response for specific method
  void configureResponse(String method, dynamic response) {
    _responses[method] = response;
  }

  /// Set current user state
  void setCurrentUser(UserProfile? user) {
    _currentUser = user;
    _isAuthenticated = user != null;
  }

  /// Set authentication state
  void setAuthenticationState(bool isAuthenticated) {
    _isAuthenticated = isAuthenticated;
  }

  @override
  Future<Result<UserProfile, AuthError>> signInWithCredentials({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    // Check for configured responses
    if (_responses.containsKey('signInWithCredentials')) {
      final response = _responses['signInWithCredentials'];
      if (response is Result<UserProfile, AuthError>) {
        if (response.isSuccess) {
          _currentUser = response.value;
          _isAuthenticated = true;
        }
        return response;
      }
    }

    // Check for scenarios
    if (email == 'valid@example.com' && password == 'validPassword') {
      final user = TestDataFactory.createUserProfile(email: email);
      _currentUser = user;
      _isAuthenticated = true;
      return Success(user);
    }

    if (email == 'invalid@example.com') {
      return const Error(AuthError(
        'Invalid credentials',
        'The provided email or password is incorrect',
      ));
    }

    if (email == 'network@error.com') {
      return const Error(AuthError(
        'Network error',
        'Unable to connect to authentication service',
      ));
    }

    // Default success for any other valid-looking email
    if (email.contains('@') && password.isNotEmpty) {
      final user = TestDataFactory.createUserProfile(email: email);
      _currentUser = user;
      _isAuthenticated = true;
      return Success(user);
    }

    return const Error(AuthError(
      'Invalid credentials',
      'The provided email or password is incorrect',
    ));
  }

  @override
  Future<Result<UserProfile, AuthError>> getCurrentUser() async {
    if (_responses.containsKey('getCurrentUser')) {
      final response = _responses['getCurrentUser'];
      if (response is Result<UserProfile, AuthError>) {
        return response;
      }
    }

    if (_isAuthenticated && _currentUser != null) {
      return Success(_currentUser!);
    }

    return const Error(AuthError(
      'Not authenticated',
      'User is not currently authenticated',
    ));
  }

  @override
  Future<Result<UserProfile, AuthError>> refreshToken() async {
    if (_responses.containsKey('refreshToken')) {
      final response = _responses['refreshToken'];
      if (response is Result<UserProfile, AuthError>) {
        return response;
      }
    }

    if (_isAuthenticated && _currentUser != null) {
      return Success(_currentUser!);
    }

    return const Error(AuthError(
      'Session expired',
      'Authentication session has expired',
    ));
  }

  @override
  Future<Result<void, AuthError>> signOut() async {
    if (_responses.containsKey('signOut')) {
      final response = _responses['signOut'];
      if (response is Result<void, AuthError>) {
        if (response.isSuccess) {
          _currentUser = null;
          _isAuthenticated = false;
        }
        return response;
      }
    }

    _currentUser = null;
    _isAuthenticated = false;
    return const Success(null);
  }

  @override
  Future<bool> isAuthenticated() async {
    return _isAuthenticated;
  }

  @override
  Future<Result<void, AuthError>> resetPassword({required String email}) async {
    if (_responses.containsKey('resetPassword')) {
      final response = _responses['resetPassword'];
      if (response is Result<void, AuthError>) {
        return response;
      }
    }

    if (email.contains('@')) {
      return const Success(null);
    }

    return const Error(AuthError(
      'Invalid email',
      'The provided email address is not valid',
    ));
  }

  /// Reset all configurations
  void reset() {
    _scenarios.clear();
    _responses.clear();
    _currentUser = null;
    _isAuthenticated = false;
  }

  /// Configure common success scenarios
  void configureSuccessScenarios() {
    final user = TestDataFactory.createUserProfile();
    configureResponse('signInWithCredentials', Success(user));
    configureResponse('getCurrentUser', Success(user));
    configureResponse('refreshToken', Success(user));
    configureResponse('signOut', const Success(null));
    setCurrentUser(user);
  }

  /// Configure common failure scenarios
  void configureFailureScenarios() {
    configureResponse('signInWithCredentials', const Error(AuthError(
      'Invalid credentials',
      'Authentication failed',
    )));
    configureResponse('getCurrentUser', const Error(AuthError(
      'Not authenticated',
      'User session not found',
    )));
    configureResponse('refreshToken', const Error(AuthError(
      'Session expired',
      'Unable to refresh token',
    )));
    configureResponse('signOut', const Error(AuthError(
      'Sign out failed',
      'Unable to sign out user',
    )));
    setAuthenticationState(false);
  }
}