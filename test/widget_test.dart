// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:beachref/app/app.dart';

void main() {
  testWidgets('BeachRef app loads correctly', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const BeachRefApp());

    // Verify that our app title is displayed.
    expect(find.text('BeachRef'), findsOneWidget);
    expect(find.text('Welcome to BeachRef'), findsOneWidget);
    expect(find.text('Beach Volleyball Referee Assistant'), findsOneWidget);

    // Verify that the volleyball icon is displayed.
    expect(find.byIcon(Icons.sports_volleyball), findsOneWidget);
  });
}
