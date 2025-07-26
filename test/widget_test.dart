// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:beachref/app/app.dart';
import 'helpers/test_helper.dart';

void main() {
  setUpAll(() async {
    await initializeSupabaseForTesting();
  });

  tearDownAll(() async {
    await disposeSupabaseForTesting();
  });

  testWidgets('BeachRef app loads correctly', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const BeachRefApp());
    await tester.pumpAndSettle();

    // Verify that the login page is displayed (default route for unauthenticated users)
    expect(find.text('BeachRef Referee Portal'), findsOneWidget);
    expect(find.text('Sign in with your FIVB credentials'), findsOneWidget);

    // Verify that the volleyball icon is displayed.
    expect(find.byIcon(Icons.sports_volleyball), findsOneWidget);
    
    // Verify login form elements are present
    expect(find.text('Email or Username'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
  });
}
