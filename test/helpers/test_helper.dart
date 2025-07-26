import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Helper function to initialize Supabase for testing
Future<void> initializeSupabaseForTesting() async {
  try {
    // Try to access the client to see if it's initialized
    Supabase.instance.client;
    return; // Already initialized
  } catch (e) {
    // Not initialized yet, proceed with initialization
  }
  
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
  try {
    // Dispose if possible
    await Supabase.instance.client.dispose();
  } catch (e) {
    // Ignore disposal errors in tests
  }
}