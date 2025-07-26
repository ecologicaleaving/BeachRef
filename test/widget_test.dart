// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:beachref/presentation/blocs/authentication_bloc.dart';
import 'package:beachref/presentation/pages/login_page.dart';
import 'package:beachref/core/service_locator.dart';
import 'helpers/test_helper.dart';
import 'infrastructure/test_service_locator.dart';
import 'mocks/mock_authentication_service.dart';

void main() {
  setUpAll(() async {
    await initializeSupabaseForTesting();
  });

  tearDownAll(() async {
    await disposeSupabaseForTesting();
    await ServiceLocator.reset();
  });

  testWidgets('BeachRef app loads correctly', (WidgetTester tester) async {
    // Setup test dependencies
    final testServiceLocator = TestServiceLocator();
    testServiceLocator.setupDefaultTestServices();
    
    final mockAuthService = MockAuthenticationService();
    mockAuthService.configureFailureScenarios(); // Start unauthenticated
    
    // Create a simplified test app that shows the login page
    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider(
          create: (context) => AuthenticationBloc(
            authService: mockAuthService,
            sessionManager: testServiceLocator.get(),
          ),
          child: const LoginPage(),
        ),
      ),
    );
    
    await tester.pumpAndSettle();

    // Verify that the login page is displayed
    expect(find.text('BeachRef Referee Portal'), findsOneWidget);
    expect(find.text('Sign in with your FIVB credentials'), findsOneWidget);

    // Verify that the volleyball icon is displayed.
    expect(find.byIcon(Icons.sports_volleyball), findsOneWidget);
    
    // Verify login form elements are present
    expect(find.text('Email or Username'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
  });
}
