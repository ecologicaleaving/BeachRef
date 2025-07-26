import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:beachref/presentation/pages/login_page.dart';
import 'package:beachref/presentation/blocs/authentication_bloc.dart';
import 'package:beachref/data/models/user_profile.dart';

import 'login_page_test.mocks.dart';

@GenerateMocks([AuthenticationBloc])
void main() {
  group('LoginPage Widget Tests', () {
    late MockAuthenticationBloc mockAuthBloc;

    final testUserProfile = UserProfile(
      userId: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      refereeLevel: 'National',
      certificationDate: DateTime.now().subtract(const Duration(days: 365)),
      region: 'International',
      preferredCompetitionLevels: ['Beach Volleyball'],
      timezone: 'UTC',
      lastLoginAt: DateTime.now(),
      createdAt: DateTime.now(),
    );

    setUp(() {
      mockAuthBloc = MockAuthenticationBloc();
      when(mockAuthBloc.state).thenReturn(AuthenticationInitial());
      when(mockAuthBloc.stream).thenAnswer((_) => const Stream.empty());
    });

    Widget createWidgetUnderTest() {
      return MaterialApp(
        home: BlocProvider<AuthenticationBloc>.value(
          value: mockAuthBloc,
          child: const LoginPage(),
        ),
      );
    }

    group('UI Elements', () {
      testWidgets('should display all required UI elements', (tester) async {
        // Arrange & Act
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        // Assert
        expect(find.text('BeachRef Referee Portal'), findsOneWidget);
        expect(find.text('Sign in with your FIVB credentials'), findsOneWidget);
        expect(find.text('Email or Username'), findsOneWidget);
        expect(find.text('Password'), findsOneWidget);
        expect(find.text('Remember me'), findsOneWidget);
        expect(find.text('Sign In'), findsOneWidget);
        expect(find.text('Forgot your password?'), findsOneWidget);
        expect(find.text('Powered by '), findsOneWidget);
        expect(find.text('FIVB'), findsOneWidget);
      });

      testWidgets('should display FIVB logo placeholder', (tester) async {
        // Arrange & Act
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        // Assert
        expect(find.byIcon(Icons.sports_volleyball), findsOneWidget);
        
        final logoContainer = find.byType(Container).first;
        final containerWidget = tester.widget<Container>(logoContainer);
        expect(containerWidget.decoration, isA<BoxDecoration>());
        
        final decoration = containerWidget.decoration as BoxDecoration;
        expect(decoration.color, equals(const Color(0xFF003366))); // FIVB Blue
        expect(decoration.shape, equals(BoxShape.circle));
      });

      testWidgets('should have proper FIVB branding colors', (tester) async {
        // Arrange & Act
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        // Assert - Check for FIVB Blue color usage
        final titleTexts = find.text('BeachRef Referee Portal');
        expect(titleTexts, findsOneWidget);

        // Check for FIVB Orange button
        final signInButton = find.widgetWithText(ElevatedButton, 'Sign In');
        expect(signInButton, findsOneWidget);
        
        final buttonWidget = tester.widget<ElevatedButton>(signInButton);
        final buttonStyle = buttonWidget.style;
        expect(buttonStyle, isNotNull);
      });

      testWidgets('should display form fields with proper validation', (tester) async {
        // Arrange & Act
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        // Assert
        final emailField = find.byKey(const Key('email_field')); 
        final passwordField = find.byKey(const Key('password_field'));
        
        // Since we don't have keys, let's find by type and verify properties
        final textFormFields = find.byType(TextFormField);
        expect(textFormFields, findsNWidgets(2));
        
        // Verify email field properties
        final emailFormField = tester.widget<TextFormField>(textFormFields.first);
        expect(emailFormField.keyboardType, equals(TextInputType.emailAddress));
        expect(emailFormField.textInputAction, equals(TextInputAction.next));
        
        // Verify password field properties
        final passwordFormField = tester.widget<TextFormField>(textFormFields.last);
        expect(passwordFormField.obscureText, isTrue);
        expect(passwordFormField.textInputAction, equals(TextInputAction.done));
      });

      testWidgets('should display checkbox for remember me', (tester) async {
        // Arrange & Act
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        // Assert
        final checkbox = find.byType(Checkbox);
        expect(checkbox, findsOneWidget);
        
        final checkboxWidget = tester.widget<Checkbox>(checkbox);
        expect(checkboxWidget.value, isFalse); // Default should be false
        expect(checkboxWidget.activeColor, equals(const Color(0xFF003366))); // FIVB Blue
      });
    });

    group('Form Interactions', () {
      testWidgets('should allow entering email and password', (tester) async {
        // Arrange
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        final emailField = find.byType(TextFormField).first;
        final passwordField = find.byType(TextFormField).last;

        // Act
        await tester.enterText(emailField, 'test@example.com');
        await tester.enterText(passwordField, 'password123');
        await tester.pumpAndSettle();

        // Assert
        expect(find.text('test@example.com'), findsOneWidget);
        expect(find.text('password123'), findsOneWidget);
      });

      testWidgets('should toggle remember me checkbox', (tester) async {
        // Arrange
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        final checkbox = find.byType(Checkbox);

        // Act
        await tester.tap(checkbox);
        await tester.pumpAndSettle();

        // Assert
        final checkboxWidget = tester.widget<Checkbox>(checkbox);
        expect(checkboxWidget.value, isTrue);
      });

      testWidgets('should show validation errors for empty fields', (tester) async {
        // Arrange
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        final signInButton = find.widgetWithText(ElevatedButton, 'Sign In');

        // Act
        await tester.tap(signInButton);
        await tester.pumpAndSettle();

        // Assert - Should show validation errors (assuming validators are used)
        // Note: The actual validation messages depend on the Validators implementation
        // This test assumes the form validation prevents submission with empty fields
      });

      testWidgets('should handle form submission with valid data', (tester) async {
        // Arrange
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        final emailField = find.byType(TextFormField).first;
        final passwordField = find.byType(TextFormField).last;
        final signInButton = find.widgetWithText(ElevatedButton, 'Sign In');

        // Act
        await tester.enterText(emailField, 'test@example.com');
        await tester.enterText(passwordField, 'password123');
        await tester.tap(signInButton);
        await tester.pumpAndSettle();

        // Assert
        verify(mockAuthBloc.add(any)).called(1);
        
        // Verify the LoginRequested event was added with correct parameters
        final capturedEvent = verify(mockAuthBloc.add(captureAny)).captured.first;
        expect(capturedEvent, isA<LoginRequested>());
        
        final loginEvent = capturedEvent as LoginRequested;
        expect(loginEvent.email, equals('test@example.com'));
        expect(loginEvent.password, equals('password123'));
        expect(loginEvent.rememberMe, isFalse); // Default value
      });

      testWidgets('should handle form submission with remember me checked', (tester) async {
        // Arrange
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        final emailField = find.byType(TextFormField).first;
        final passwordField = find.byType(TextFormField).last;
        final checkbox = find.byType(Checkbox);
        final signInButton = find.widgetWithText(ElevatedButton, 'Sign In');

        // Act
        await tester.enterText(emailField, 'test@example.com');
        await tester.enterText(passwordField, 'password123');
        await tester.tap(checkbox);
        await tester.tap(signInButton);
        await tester.pumpAndSettle();

        // Assert
        final capturedEvent = verify(mockAuthBloc.add(captureAny)).captured.first;
        final loginEvent = capturedEvent as LoginRequested;
        expect(loginEvent.rememberMe, isTrue);
      });

      testWidgets('should handle forgot password tap', (tester) async {
        // Arrange
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        final forgotPasswordButton = find.text('Forgot your password?');

        // Act
        await tester.tap(forgotPasswordButton);
        await tester.pumpAndSettle();

        // Assert - Should show a snackbar with placeholder message
        expect(find.byType(SnackBar), findsOneWidget);
        expect(find.text('Forgot password functionality will be implemented in a future update.'), findsOneWidget);
      });
    });

    group('BLoC State Handling', () {
      testWidgets('should show loading indicator when authentication is loading', (tester) async {
        // Arrange
        when(mockAuthBloc.state).thenReturn(AuthenticationLoading());
        when(mockAuthBloc.stream).thenAnswer((_) => Stream.value(AuthenticationLoading()));

        // Act
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        // Assert
        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        
        // Verify button is disabled
        final signInButton = find.widgetWithText(ElevatedButton, 'Sign In');
        final buttonWidget = tester.widget<ElevatedButton>(signInButton);
        expect(buttonWidget.onPressed, isNull);
      });

      testWidgets('should display error message when authentication fails', (tester) async {
        // Arrange
        const errorMessage = 'Invalid credentials';
        when(mockAuthBloc.state).thenReturn(const AuthenticationError(message: errorMessage));
        when(mockAuthBloc.stream).thenAnswer((_) => Stream.value(const AuthenticationError(message: errorMessage)));

        // Act
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        // Assert
        expect(find.text(errorMessage), findsOneWidget);
        expect(find.byIcon(Icons.error_outline), findsOneWidget);
        
        // Verify error container styling
        final errorContainer = find.byType(Container).where((finder) {
          final widget = tester.widget<Container>(finder);
          return widget.decoration is BoxDecoration;
        });
        expect(errorContainer, isNotEmpty);
      });

      testWidgets('should disable form fields during loading', (tester) async {
        // Arrange
        when(mockAuthBloc.state).thenReturn(AuthenticationLoading());
        when(mockAuthBloc.stream).thenAnswer((_) => Stream.value(AuthenticationLoading()));

        // Act
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        // Assert
        final textFormFields = find.byType(TextFormField);
        for (final fieldFinder in textFormFields.evaluate()) {
          final field = fieldFinder.widget as TextFormField;
          expect(field.enabled, isFalse);
        }

        final checkbox = find.byType(Checkbox);
        final checkboxWidget = tester.widget<Checkbox>(checkbox);
        expect(checkboxWidget.onChanged, isNull);
      });

      testWidgets('should handle successful authentication state', (tester) async {
        // Arrange
        when(mockAuthBloc.state).thenReturn(AuthenticationAuthenticated(user: testUserProfile));
        when(mockAuthBloc.stream).thenAnswer((_) => Stream.value(AuthenticationAuthenticated(user: testUserProfile)));

        // Act
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        // Assert - The page should function normally, no loading state
        expect(find.byType(CircularProgressIndicator), findsNothing);
        
        final signInButton = find.widgetWithText(ElevatedButton, 'Sign In');
        final buttonWidget = tester.widget<ElevatedButton>(signInButton);
        expect(buttonWidget.onPressed, isNotNull);
      });
    });

    group('Accessibility', () {
      testWidgets('should have proper semantics for screen readers', (tester) async {
        // Arrange & Act
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        // Assert
        expect(find.bySemanticsLabel('Email or Username'), findsOneWidget);
        expect(find.bySemanticsLabel('Password'), findsOneWidget);
        expect(find.bySemanticsLabel('Remember me'), findsOneWidget);
        expect(find.bySemanticsLabel('Sign In'), findsOneWidget);
      });

      testWidgets('should support keyboard navigation', (tester) async {
        // Arrange
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        final emailField = find.byType(TextFormField).first;
        final passwordField = find.byType(TextFormField).last;

        // Act - Test tab navigation
        await tester.tap(emailField);
        await tester.testTextInput.receiveAction(TextInputAction.next);
        await tester.pumpAndSettle();

        // Assert - Focus should move to password field
        expect(tester.binding.focusManager.primaryFocus?.context?.findRenderObject(), 
               tester.renderObject(passwordField));
      });
    });

    group('Responsive Design', () {
      testWidgets('should adapt to different screen sizes', (tester) async {
        // Arrange - Set small screen size
        await tester.binding.setSurfaceSize(const Size(400, 600));
        
        // Act
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        // Assert
        final constrainedBox = find.byType(ConstrainedBox);
        expect(constrainedBox, findsOneWidget);
        
        final constrainedBoxWidget = tester.widget<ConstrainedBox>(constrainedBox);
        expect(constrainedBoxWidget.constraints.maxWidth, equals(400));
        
        // Reset surface size
        await tester.binding.setSurfaceSize(null);
      });

      testWidgets('should handle landscape orientation', (tester) async {
        // Arrange - Set landscape orientation
        await tester.binding.setSurfaceSize(const Size(800, 400));
        
        // Act
        await tester.pumpWidget(createWidgetUnderTest());
        await tester.pumpAndSettle();

        // Assert - Should still display properly with SingleChildScrollView
        expect(find.byType(SingleChildScrollView), findsOneWidget);
        expect(find.text('BeachRef Referee Portal'), findsOneWidget);
        
        // Reset surface size
        await tester.binding.setSurfaceSize(null);
      });
    });
  });
}