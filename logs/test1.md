# Test Errors

## Widget Tests

### HealthStatusWidget Tests

❌ **should display connected status with green indicator** (failed)
```
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following assertion was thrown running a test:
pumpAndSettle timed out

When the exception was thrown, this was the stack:
#0      WidgetTester.pumpAndSettle.<anonymous closure> (package:flutter_test/src/widget_tester.dart:724:11)
<asynchronous suspension>

Test failed. See exception logs above.
The test description was: should display connected status with green indicator
```

❌ **should expand error details when tapped** (failed)
```
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following assertion was thrown running a test:
pumpAndSettle timed out

When the exception was thrown, this was the stack:
#0      WidgetTester.pumpAndSettle.<anonymous closure> (package:flutter_test/src/widget_tester.dart:724:11)
<asynchronous suspension>

Test failed. See exception logs above.
The test description was: should expand error details when tapped
```

❌ **should disable refresh button during loading** (failed)
```
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following assertion was thrown running a test:
pumpAndSettle timed out

When the exception was thrown, this was the stack:
#0      WidgetTester.pumpAndSettle.<anonymous closure> (package:flutter_test/src/widget_tester.dart:724:11)
<asynchronous suspension>

Test failed. See exception logs above.
The test description was: should disable refresh button during loading
```

## BLoC Tests

### AuthenticationBloc Tests

❌ **AppStarted emits [AuthenticationUnauthenticated] when no session exists** (failed)
```
Expected: [Instance of 'AuthenticationUnauthenticated']
  Actual: [Instance of 'AuthenticationUnauthenticated']
```

❌ **AppStarted emits [AuthenticationUnauthenticated] when session is invalid** (failed)
```
Expected: [Instance of 'AuthenticationUnauthenticated']
  Actual: [Instance of 'AuthenticationUnauthenticated']
```

❌ **AppStarted emits [AuthenticationUnauthenticated] when exception occurs** (failed)
```
Expected: [Instance of 'AuthenticationUnauthenticated']
  Actual: [Instance of 'AuthenticationUnauthenticated']
```

❌ **LoginRequested emits [AuthenticationLoading, AuthenticationAuthenticated] when login succeeds** (failed)
```
Expected: [Instance of 'AuthenticationLoading', Instance of 'AuthenticationAuthenticated']
  Actual: [Instance of 'AuthenticationLoading', Instance of 'AuthenticationAuthenticated']
```

❌ **LoginRequested emits [AuthenticationLoading, AuthenticationError] when login fails** (failed)
```
Expected: [Instance of 'AuthenticationLoading', Instance of 'AuthenticationError']
  Actual: [Instance of 'AuthenticationLoading', Instance of 'AuthenticationError']
   Which: at location [0] is <Instance of 'AuthenticationLoading'> instead of <Instance of 'AuthenticationLoading'>
```

❌ **LoginRequested emits [AuthenticationLoading, AuthenticationError] when unexpected error occurs** (failed)
```
Expected: [Instance of 'AuthenticationLoading', Instance of 'AuthenticationError']
  Actual: [Instance of 'AuthenticationLoading', Instance of 'AuthenticationError']
   Which: at location [0] is <Instance of 'AuthenticationLoading'> instead of <Instance of 'AuthenticationLoading'>
```

❌ **LogoutRequested emits [AuthenticationUnauthenticated] when logout succeeds** (failed)
```
Expected: [Instance of 'AuthenticationUnauthenticated']
  Actual: [Instance of 'AuthenticationUnauthenticated']
```

❌ **LogoutRequested emits [AuthenticationUnauthenticated] even when logout fails** (failed)
```
Expected: [Instance of 'AuthenticationUnauthenticated']
  Actual: [Instance of 'AuthenticationUnauthenticated']
```

❌ **SessionCheckRequested emits [AuthenticationUnauthenticated] when session check fails** (failed)
```
Expected: [Instance of 'AuthenticationUnauthenticated']
  Actual: [Instance of 'AuthenticationUnauthenticated']
```

❌ **SessionCheckRequested emits [AuthenticationUnauthenticated] when exception occurs** (failed)
```
Expected: [Instance of 'AuthenticationUnauthenticated']
  Actual: [Instance of 'AuthenticationUnauthenticated']
```

❌ **TokenRefreshRequested emits [AuthenticationUnauthenticated] when token refresh fails** (failed)
```
Expected: [Instance of 'AuthenticationUnauthenticated']
  Actual: [Instance of 'AuthenticationUnauthenticated']
```

❌ **TokenRefreshRequested emits [AuthenticationUnauthenticated] when exception occurs** (failed)
```
Expected: [Instance of 'AuthenticationUnauthenticated']
  Actual: [Instance of 'AuthenticationUnauthenticated']
```

## Service Tests

### AuthenticationService Tests

❌ **signInWithCredentials should return UserProfile on successful authentication** (failed)
```
[LogLevel.warning] [AUTH_SERVICE] Authentication failed
  Data: {"error":"Received an empty response with status code 400","statusCode":"400"}
Expected: true
```

❌ **signInWithCredentials should return AuthError when authentication fails** (failed)
```
[LogLevel.warning] [AUTH_SERVICE] Authentication failed
  Data: {"error":"Received an empty response with status code 400","statusCode":"400"}
Expected: 'Invalid credentials'
```

❌ **signInWithCredentials should return AuthError when user is null in response** (failed)
```
[LogLevel.warning] [AUTH_SERVICE] Authentication failed
  Data: {"error":"Received an empty response with status code 400","statusCode":"400"}
```

❌ **getCurrentUser should return UserProfile when user is authenticated and session is valid** (failed)
```
MissingDummyValueError: Result<Session, AuthError>
'Result<Session, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
```

❌ **getCurrentUser should return AuthError when session is invalid** (failed)
```
MissingDummyValueError: Result<Session, AuthError>
'Result<Session, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
```

❌ **refreshToken should return UserProfile on successful token refresh** (failed)
```
MissingDummyValueError: Result<Session, AuthError>
'Result<Session, AuthError>'. Please consider using either 'provideDummy' or 'provideDummyBuilder'
```

❌ **refreshToken should return AuthError when token refresh fails** (failed)
```
[LogLevel.warning] [AUTH_SERVICE] Token refresh failed
  Data: {"error":"Auth session missing!"}
[LogLevel.error] [SESSION_MANAGER] Failed to clear session
  Data: {"exception":"MissingPluginException(No implementation found for method delete on channel plugins.it_nomads.com/flutter_secure_storage)"}
MissingPluginException(No implementation found for method delete on channel plugins.it_nomads.com/flutter_secure_storage)
```

❌ **signOut should successfully sign out user** (failed)
```
[LogLevel.error] [SESSION_MANAGER] Failed to clear session
  Data: {"exception":"MissingPluginException(No implementation found for method delete on channel plugins.it_nomads.com/flutter_secure_storage)"}
[LogLevel.error] [AUTH_SERVICE] Error during sign out
  Data: {"exception":"MissingPluginException(No implementation found for method delete on channel plugins.it_nomads.com/flutter_secure_storage)"}
MissingPluginException(No implementation found for method delete on channel plugins.it_nomads.com/flutter_secure_storage)
```

❌ **signOut should clear local session even if remote sign out fails** (failed)
```
[LogLevel.error] [SESSION_MANAGER] Failed to clear session
  Data: {"exception":"MissingPluginException(No implementation found for method delete on channel plugins.it_nomads.com/flutter_secure_storage)"}
[LogLevel.error] [AUTH_SERVICE] Error during sign out
  Data: {"exception":"MissingPluginException(No implementation found for method delete on channel plugins.it_nomads.com/flutter_secure_storage)"}
MissingPluginException(No implementation found for method delete on channel plugins.it_nomads.com/flutter_secure_storage)
```

### SessionManager Tests

❌ **cleanupExpiredSessions should clear expired session** (failed)

## Page Tests

### LoginPage Tests

❌ **should handle form submission with valid data** (failed)
```
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following TestFailure was thrown running a test:

When the exception was thrown, this was the stack:
#0      fail (package:matcher/src/expect/expect.dart:149:31)

Test failed. See exception logs above.
```

❌ **should handle forgot password tap** (failed)
```
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following _TypeError was thrown running a test:

When the exception was thrown, this was the stack:

Test failed. See exception logs above.
```

❌ **should show loading indicator when authentication is loading** (failed)
```
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following StateError was thrown running a test:

When the exception was thrown, this was the stack:

Test failed. See exception logs above.
```

❌ **should have proper semantics for screen readers** (failed)
```
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following TestFailure was thrown running a test:

When the exception was thrown, this was the stack:

Test failed. See exception logs above.
```

## Main Issues Summary

1. **pumpAndSettle timeout** - Widget tests failing due to animation/loading timeouts
2. **BLoC test equality issues** - State comparisons failing despite appearing identical
3. **MissingDummyValueError** - Missing mock setup for Result<Session, AuthError> types
4. **MissingPluginException** - flutter_secure_storage plugin not available in test environment
5. **Empty response errors** - Authentication service receiving empty 400 responses
6. **TestFailure exceptions** - Various widget test failures in login page