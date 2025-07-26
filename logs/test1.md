# Test Errors Summary

## Compilation Errors

### VisConnectionError and VisError Type Issues
```
test/unit/widgets/health_status_widget_enhanced_test.dart:55:34: Error: Method not found: 'VisConnectionError'.
         (_) async => const Error(VisConnectionError(
                                  ^^^^^^^^^^^^^^^^^^

test/unit/widgets/health_status_widget_enhanced_test.dart:75:34: Error: Method not found: 'VisConnectionError'.
         (_) async => const Error(VisConnectionError(
                                  ^^^^^^^^^^^^^^^^^^

test/unit/widgets/health_status_widget_enhanced_test.dart:97:56: Error: 'VisError' isn't a type.
       final completer = Completer<Result<HealthStatus, VisError>>();
                                                        ^^^^^^^^
```

### Mock Classes Missing
```
test/unit/presentation/blocs/authentication_bloc_enhanced_test.dart:16:10: Error: 'MockAuthenticationService' isn't a type.
     late MockAuthenticationService mockAuthService;
          ^^^^^^^^^^^^^^^^^^^^^^^^^

test/unit/presentation/blocs/authentication_bloc_enhanced_test.dart:17:10: Error: 'MockSessionManager' isn't a type.
     late MockSessionManager mockSessionManager;
          ^^^^^^^^^^^^^^^^^^

test/unit/presentation/blocs/authentication_bloc_enhanced_test.dart:18:10: Error: 'MockLoggerService' isn't a type.
     late MockLoggerService mockLogger;
          ^^^^^^^^^^^^^^^^^

test/unit/presentation/blocs/authentication_bloc_enhanced_test.dart:21:25: Error: Method not found: 'MockAuthenticationService'.
       mockAuthService = MockAuthenticationService();
                         ^^^^^^^^^^^^^^^^^^^^^^^^^

test/unit/presentation/blocs/authentication_bloc_enhanced_test.dart:22:28: Error: Method not found: 'MockSessionManager'.
       mockSessionManager = MockSessionManager();
                            ^^^^^^^^^^^^^^^^^^

test/unit/presentation/blocs/authentication_bloc_enhanced_test.dart:23:20: Error: Method not found: 'MockLoggerService'.
       mockLogger = MockLoggerService();
                    ^^^^^^^^^^^^^^^^^
```

### AuthError Type Issues
```
test/unit/presentation/blocs/authentication_bloc_enhanced_test.dart:68:52: Error: Method not found: 'AuthError'.
               .thenAnswer((_) async => const Error(AuthError('No session found')));
                                                    ^^^^^^^^^

test/unit/presentation/blocs/authentication_bloc_enhanced_test.dart:89:52: Error: Method not found: 'AuthError'.
               .thenAnswer((_) async => const Error(AuthError('Session expired')));
                                                    ^^^^^^^^^

test/unit/presentation/blocs/authentication_bloc_enhanced_test.dart:136:50: Error: Method not found: 'AuthError'.
           )).thenAnswer((_) async => const Error(AuthError(
                                                  ^^^^^^^^^
```

## Failed Test Loading
```
❌ loading /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_enhanced_test.dart (failed)
Failed to load "/home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_enhanced_test.dart": Compilation failed for testPath=/home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_enhanced_test.dart

❌ loading /home/runner/work/BeachRef/BeachRef/test/widget_test.dart (failed)
Error: the Dart compiler exited unexpectedly.

❌ loading /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_enhanced_test.dart (failed)
Failed to load "/home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_enhanced_test.dart": Compilation failed for testPath=/home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_enhanced_test.dart
```

## Widget Test Failures

### HealthStatusWidget Test Timeouts
```
❌ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should display connected status with green indicator (failed)
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following assertion was thrown running a test:
pumpAndSettle timed out
Test failed. See exception logs above.

❌ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should display error status with red indicator (failed)
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following assertion was thrown running a test:
pumpAndSettle timed out
Test failed. See exception logs above.

❌ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should expand error details when tapped (failed)
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following assertion was thrown running a test:
pumpAndSettle timed out
Test failed. See exception logs above.

❌ /home/runner/work/BeachRef/BeachRef/test/unit/widgets/health_status_widget_test.dart: HealthStatusWidget Tests should disable refresh button during loading (failed)
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following assertion was thrown running a test:
pumpAndSettle timed out
Test failed. See exception logs above.
```

## Authentication Tests

### Error Message Mismatch
```
❌ /home/runner/work/BeachRef/BeachRef/test/unit/presentation/blocs/authentication_bloc_test.dart: AuthenticationBloc LoginRequested emits [AuthenticationLoading, AuthenticationError] when login fails (failed)
Expected: AuthenticationError(Invalid email or password. Please check your credentials and try again., Invalid credentials)
Actual: AuthenticationError(Login failed. Please check your credentials and try again., Invalid credentials)
Which: at location [1] is AuthenticationError:<AuthenticationError(Login failed. Please check your credentials and try again., Invalid credentials)> instead of AuthenticationError:<AuthenticationError(Invalid email or password. Please check your credentials and try again., Invalid credentials)>
```

## Authentication Service Test Failures
```
❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService signInWithCredentials should return UserProfile on successful authentication (failed)
[LogLevel.warning] [AUTH_SERVICE] Authentication failed
  Data: {"error":"Received an empty response with status code 400","statusCode":"400"}

❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService signInWithCredentials should return AuthError when authentication fails (failed)
[LogLevel.warning] [AUTH_SERVICE] Authentication failed
  Data: {"error":"Received an empty response with status code 400","statusCode":"400"}

❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService signInWithCredentials should return AuthError when user is null in response (failed)
[LogLevel.warning] [AUTH_SERVICE] Authentication failed
  Data: {"error":"Received an empty response with status code 400","statusCode":"400"}

❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService getCurrentUser should return UserProfile when user is authenticated and session is valid (failed)

❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService getCurrentUser should return AuthError when session is invalid (failed)

❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService refreshToken should return UserProfile on successful token refresh (failed)
[LogLevel.warning] [AUTH_SERVICE] Token refresh failed
  Data: {"error":"Auth session missing!"}

❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService refreshToken should return AuthError when token refresh fails (failed)
[LogLevel.warning] [AUTH_SERVICE] Token refresh failed
  Data: {"error":"Auth session missing!"}

❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService signOut should successfully sign out user (failed)

❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/authentication_service_test.dart: AuthenticationService signOut should clear local session even if remote sign out fails (failed)
```

## Session Manager Test Failure
```
❌ /home/runner/work/BeachRef/BeachRef/test/unit/services/session_manager_test.dart: SessionManager cleanupExpiredSessions should clear expired session (failed)
```

## Login Page Widget Test Failures
```
❌ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests Form Interactions should handle form submission with valid data (failed)
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following TestFailure was thrown running a test:
Test failed. See exception logs above.

❌ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests Form Interactions should handle forgot password tap (failed)
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following _TypeError was thrown running a test:
Test failed. See exception logs above.

❌ /home/runner/work/BeachRef/BeachRef/test/widget/presentation/pages/login_page_test.dart: LoginPage Widget Tests BLoC State Handling should show loading indicator when authentication is loading (failed)
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following StateError was thrown running a test:
Test failed. See exception logs above.
```