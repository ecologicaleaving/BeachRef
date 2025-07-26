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

❌ **should display error status with red indicator** (failed)
```
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following assertion was thrown running a test:
pumpAndSettle timed out

When the exception was thrown, this was the stack:
#0      WidgetTester.pumpAndSettle.<anonymous closure> (package:flutter_test/src/widget_tester.dart:724:11)
<asynchronous suspension>

Test failed. See exception logs above.
The test description was: should display error status with red indicator
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

❌ **LoginRequested emits [AuthenticationLoading, AuthenticationError] when login fails** (failed)
```
Expected: [Instance of 'AuthenticationLoading', Instance of 'AuthenticationError']
  Actual: [Instance of 'AuthenticationLoading', Instance of 'AuthenticationError']
   Which: at location [1] is <Instance of 'AuthenticationError'> instead of <Instance of 'AuthenticationError'>

WARNING: Please ensure state instances extend Equatable, override == and hashCode, or implement Comparable.
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
Expected: 'No user returned from authentication service'
```

❌ **getCurrentUser should return UserProfile when user is authenticated and session is valid** (failed)
```
Expected: true
  Actual: <false>
```

❌ **getCurrentUser should return AuthError when session is invalid** (failed)
```
Expected: 'Session expired'
  Actual: 'Not authenticated'
```

❌ **refreshToken should return UserProfile on successful token refresh** (failed)
```
[LogLevel.warning] [AUTH_SERVICE] Token refresh failed
  Data: {"error":"Auth session missing!"}
Expected: true
```

❌ **refreshToken should return AuthError when token refresh fails** (failed)
```
[LogLevel.warning] [AUTH_SERVICE] Token refresh failed
  Data: {"error":"Auth session missing!"}
Expected: 'Auth session missing!'
```

❌ **signOut should successfully sign out user** (failed)
```
Expected: true
  Actual: <false>
```

❌ **signOut should clear local session even if remote sign out fails** (failed)
```
Expected: true
  Actual: <false>
```

### SessionManager Tests

❌ **cleanupExpiredSessions should clear expired session** (failed)
```
Expected: <false>
  Actual: <true>
```

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
The following TestFailure was thrown running a test:

When the exception was thrown, this was the stack:
#0      fail (package:matcher/src/expect/expect.dart:149:31)

Test failed. See exception logs above.
```

❌ **should show loading indicator when authentication is loading** (failed)
```
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following TestFailure was thrown running a test:

When the exception was thrown, this was the stack:
#0      fail (package:matcher/src/expect/expect.dart:149:31)

Test failed. See exception logs above.
```

❌ **should have proper semantics for screen readers** (failed)
```
══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════════════════════════════════════
The following TestFailure was thrown running a test:

When the exception was thrown, this was the stack:
#0      fail (package:matcher/src/expect/expect.dart:149:31)

Test failed. See exception logs above.
```

## Main Issues Summary

1. **pumpAndSettle timeout** - Widget tests failing due to animation/loading timeouts
2. **BLoC test equality issues** - State instances don't extend Equatable or override == and hashCode
3. **Empty response errors** - Authentication service receiving empty 400 responses  
4. **Mock/Stub issues** - Expected vs actual value mismatches in service tests
5. **TestFailure exceptions** - Generic test failures in login page widget tests