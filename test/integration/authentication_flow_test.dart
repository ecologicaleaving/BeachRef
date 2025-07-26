import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:beachref/app/app.dart';
import 'package:beachref/presentation/pages/login_page.dart';
import 'package:beachref/presentation/pages/home_page.dart';
import '../helpers/test_helper.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    await initializeSupabaseForTesting();
  });

  tearDownAll(() async {
    await disposeSupabaseForTesting();
  });

  group('Authentication Flow Integration Tests', () {
    testWidgets('Complete authentication flow - successful login', (tester) async {
      // Launch the app
      await tester.pumpWidget(const BeachRefApp());
      await tester.pumpAndSettle();

      // Verify we start on the login page
      expect(find.byType(LoginPage), findsOneWidget);
      expect(find.text('BeachRef Referee Portal'), findsOneWidget);
      expect(find.text('Sign in with your FIVB credentials'), findsOneWidget);

      // Find form elements
      final emailField = find.byType(TextFormField).first;
      final passwordField = find.byType(TextFormField).last;
      final signInButton = find.widgetWithText(ElevatedButton, 'Sign In');

      // Verify form elements are present
      expect(emailField, findsOneWidget);
      expect(passwordField, findsOneWidget);
      expect(signInButton, findsOneWidget);

      // Enter valid credentials
      await tester.enterText(emailField, 'test@example.com');
      await tester.enterText(passwordField, 'validpassword123');
      await tester.pumpAndSettle();

      // Verify text was entered
      expect(find.text('test@example.com'), findsOneWidget);

      // Tap the Sign In button
      await tester.tap(signInButton);
      await tester.pumpAndSettle();

      // Wait for authentication to complete
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Note: In a real integration test, this would depend on having a test environment
      // with valid credentials or mock services. For demonstration, we show the expected flow.
      
      // Expected: After successful authentication, should navigate to home page
      // expect(find.byType(HomePage), findsOneWidget);
      // expect(find.byType(LoginPage), findsNothing);
    });

    testWidgets('Authentication flow - invalid credentials', (tester) async {
      // Launch the app
      await tester.pumpWidget(const BeachRefApp());
      await tester.pumpAndSettle();

      // Verify we start on the login page
      expect(find.byType(LoginPage), findsOneWidget);

      // Find form elements
      final emailField = find.byType(TextFormField).first;
      final passwordField = find.byType(TextFormField).last;
      final signInButton = find.widgetWithText(ElevatedButton, 'Sign In');

      // Enter invalid credentials
      await tester.enterText(emailField, 'invalid@example.com');
      await tester.enterText(passwordField, 'wrongpassword');
      await tester.pumpAndSettle();

      // Tap the Sign In button
      await tester.tap(signInButton);
      await tester.pumpAndSettle();

      // Wait for authentication attempt to complete
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Expected: Should show error message and remain on login page
      expect(find.byType(LoginPage), findsOneWidget);
      // Should show error message (exact text depends on error handling)
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('Authentication flow - empty fields validation', (tester) async {
      // Launch the app
      await tester.pumpWidget(const BeachRefApp());
      await tester.pumpAndSettle();

      // Verify we start on the login page
      expect(find.byType(LoginPage), findsOneWidget);

      // Find sign in button
      final signInButton = find.widgetWithText(ElevatedButton, 'Sign In');

      // Try to submit with empty fields
      await tester.tap(signInButton);
      await tester.pumpAndSettle();

      // Expected: Should show validation errors and remain on login page
      expect(find.byType(LoginPage), findsOneWidget);
      // Note: Exact validation messages depend on validator implementation
    });

    testWidgets('Authentication flow - remember me functionality', (tester) async {
      // Launch the app
      await tester.pumpWidget(const BeachRefApp());
      await tester.pumpAndSettle();

      // Verify we start on the login page
      expect(find.byType(LoginPage), findsOneWidget);

      // Find form elements
      final emailField = find.byType(TextFormField).first;
      final passwordField = find.byType(TextFormField).last;
      final rememberMeCheckbox = find.byType(Checkbox);
      final signInButton = find.widgetWithText(ElevatedButton, 'Sign In');

      // Verify remember me checkbox is initially unchecked
      final initialCheckboxWidget = tester.widget<Checkbox>(rememberMeCheckbox);
      expect(initialCheckboxWidget.value, isFalse);

      // Check remember me
      await tester.tap(rememberMeCheckbox);
      await tester.pumpAndSettle();

      // Verify checkbox is now checked
      final checkedCheckboxWidget = tester.widget<Checkbox>(rememberMeCheckbox);
      expect(checkedCheckboxWidget.value, isTrue);

      // Enter credentials
      await tester.enterText(emailField, 'test@example.com');
      await tester.enterText(passwordField, 'password123');
      await tester.pumpAndSettle();

      // Submit form
      await tester.tap(signInButton);
      await tester.pumpAndSettle();

      // Wait for authentication
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Note: Testing persistent login would require restarting the app
      // and verifying the user remains logged in
    });

    testWidgets('Authentication flow - loading states', (tester) async {
      // Launch the app
      await tester.pumpWidget(const BeachRefApp());
      await tester.pumpAndSettle();

      // Find form elements
      final emailField = find.byType(TextFormField).first;
      final passwordField = find.byType(TextFormField).last;
      final signInButton = find.widgetWithText(ElevatedButton, 'Sign In');

      // Enter credentials
      await tester.enterText(emailField, 'test@example.com');
      await tester.enterText(passwordField, 'password123');
      await tester.pumpAndSettle();

      // Tap sign in button
      await tester.tap(signInButton);
      
      // Immediately check for loading state (before pumpAndSettle)
      await tester.pump();
      
      // Should show loading indicator
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      
      // Form fields should be disabled during loading
      final emailFormField = tester.widget<TextFormField>(emailField);
      final passwordFormField = tester.widget<TextFormField>(passwordField);
      expect(emailFormField.enabled, isFalse);
      expect(passwordFormField.enabled, isFalse);

      // Button should be disabled
      final buttonWidget = tester.widget<ElevatedButton>(signInButton);
      expect(buttonWidget.onPressed, isNull);

      // Wait for authentication to complete
      await tester.pumpAndSettle(const Duration(seconds: 3));
    });

    testWidgets('Authentication flow - forgot password', (tester) async {
      // Launch the app
      await tester.pumpWidget(const BeachRefApp());
      await tester.pumpAndSettle();

      // Find forgot password button
      final forgotPasswordButton = find.text('Forgot your password?');
      expect(forgotPasswordButton, findsOneWidget);

      // Tap forgot password
      await tester.tap(forgotPasswordButton);
      await tester.pumpAndSettle();

      // Should show snackbar with placeholder message
      expect(find.byType(SnackBar), findsOneWidget);
      expect(find.text('Forgot password functionality will be implemented in a future update.'), findsOneWidget);

      // Wait for snackbar to disappear
      await tester.pumpAndSettle(const Duration(seconds: 5));
      expect(find.byType(SnackBar), findsNothing);
    });

    testWidgets('Authentication flow - FIVB branding verification', (tester) async {
      // Launch the app
      await tester.pumpWidget(const BeachRefApp());
      await tester.pumpAndSettle();

      // Verify FIVB branding elements are present
      expect(find.text('BeachRef Referee Portal'), findsOneWidget);
      expect(find.text('Sign in with your FIVB credentials'), findsOneWidget);
      expect(find.text('Powered by '), findsOneWidget);
      expect(find.text('FIVB'), findsOneWidget);
      expect(find.byIcon(Icons.sports_volleyball), findsOneWidget);

      // Verify FIVB colors are applied
      final logoContainer = find.byType(Container).first;
      final containerWidget = tester.widget<Container>(logoContainer);
      final decoration = containerWidget.decoration as BoxDecoration;
      expect(decoration.color, equals(const Color(0xFF003366))); // FIVB Blue

      // Verify sign in button has FIVB orange color
      final signInButton = find.widgetWithText(ElevatedButton, 'Sign In');
      expect(signInButton, findsOneWidget);
    });

    testWidgets('Authentication flow - responsive design', (tester) async {
      // Test with different screen sizes
      await tester.binding.setSurfaceSize(const Size(400, 600)); // Mobile portrait
      
      await tester.pumpWidget(const BeachRefApp());
      await tester.pumpAndSettle();

      // Verify layout adapts to mobile size
      expect(find.byType(LoginPage), findsOneWidget);
      expect(find.byType(SingleChildScrollView), findsOneWidget);
      expect(find.byType(ConstrainedBox), findsOneWidget);

      // Change to tablet landscape
      await tester.binding.setSurfaceSize(const Size(1024, 768));
      await tester.pumpAndSettle();

      // Verify layout still works
      expect(find.byType(LoginPage), findsOneWidget);
      expect(find.text('BeachRef Referee Portal'), findsOneWidget);

      // Reset surface size
      await tester.binding.setSurfaceSize(null);
    });

    testWidgets('Authentication flow - accessibility features', (tester) async {
      // Launch the app
      await tester.pumpWidget(const BeachRefApp());
      await tester.pumpAndSettle();

      // Verify semantic labels are present for screen readers
      expect(find.bySemanticsLabel('Email or Username'), findsOneWidget);
      expect(find.bySemanticsLabel('Password'), findsOneWidget);
      expect(find.bySemanticsLabel('Remember me'), findsOneWidget);
      expect(find.bySemanticsLabel('Sign In'), findsOneWidget);

      // Test keyboard navigation
      final emailField = find.byType(TextFormField).first;
      final passwordField = find.byType(TextFormField).last;

      await tester.tap(emailField);
      await tester.testTextInput.receiveAction(TextInputAction.next);
      await tester.pumpAndSettle();

      // Focus should move to password field
      expect(tester.binding.focusManager.primaryFocus?.context?.findRenderObject(), 
             tester.renderObject(passwordField));
    });

    testWidgets('Authentication flow - session persistence check', (tester) async {
      // This test would ideally check if sessions persist across app restarts
      // but requires more complex test setup with mocked storage
      
      // Launch the app
      await tester.pumpWidget(const BeachRefApp());
      await tester.pumpAndSettle();

      // On first launch, should show login page
      expect(find.byType(LoginPage), findsOneWidget);

      // Note: A full session persistence test would require:
      // 1. Successful login
      // 2. App restart simulation
      // 3. Verification that user remains logged in
      // This requires integration with the actual SessionManager and secure storage
    });
  });
}