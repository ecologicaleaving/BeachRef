import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Helper function to initialize Supabase for testing
Future<void> initializeSupabaseForTesting() async {
  await Supabase.initialize(
    url: 'https://test.supabase.co',
    anonKey: 'test-anon-key',
  );
}

/// Helper function to create a test app with proper initialization
Widget createTestApp(Widget child) {
  return MaterialApp(
    home: child,
  );
}

/// Helper function to dispose Supabase after testing
Future<void> disposeSupabaseForTesting() async {
  // Reset Supabase instance for testing
  Supabase.instance.dispose();
}