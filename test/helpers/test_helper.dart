import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Helper function to initialize Supabase for testing
Future<void> initializeSupabaseForTesting() async {
  try {
    // Initialize shared preferences for testing
    SharedPreferences.setMockInitialValues({});
    
    // Try to access the client to see if it's initialized
    Supabase.instance.client;
    return; // Already initialized
  } catch (e) {
    // Not initialized yet, proceed with initialization
  }
  
  // Initialize Supabase with mock values for testing - no real network calls
  await Supabase.initialize(
    url: 'https://mock.supabase.test',
    anonKey: 'mock-test-anon-key-for-testing-only',
    debug: false,
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
  try {
    // Dispose if possible
    await Supabase.instance.client.dispose();
  } catch (e) {
    // Ignore disposal errors in tests
  }
}