import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Singleton wrapper for the Supabase client.
///
/// Provides graceful degradation: if Supabase is not initialized
/// (missing credentials), [isAvailable] returns false and the app
/// falls back to Memory -> Hive -> VIS API.
class SupabaseService {
  SupabaseService._();
  static final instance = SupabaseService._();

  bool _initialized = false;

  /// Whether Supabase was successfully initialized.
  bool get isAvailable => _initialized;

  /// The Supabase client. Only call when [isAvailable] is true.
  SupabaseClient get client => Supabase.instance.client;

  /// Initialize Supabase with credentials from --dart-define.
  /// Returns true if initialized successfully, false otherwise.
  Future<bool> init({
    required String url,
    required String anonKey,
  }) async {
    if (url.isEmpty || anonKey.isEmpty) {
      if (kDebugMode) {
        debugPrint('[SupabaseService] Missing credentials — Supabase disabled');
      }
      return false;
    }

    try {
      await Supabase.initialize(url: url, anonKey: anonKey);
      _initialized = true;
      if (kDebugMode) {
        debugPrint('[SupabaseService] Initialized successfully');
      }
      return true;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[SupabaseService] Init failed: $e');
      }
      return false;
    }
  }

  /// Quick health-check: tries a lightweight query.
  Future<bool> testConnection() async {
    if (!isAvailable) return false;
    try {
      await client.from('matches').select('no').limit(1);
      return true;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[SupabaseService] Connection test failed: $e');
      }
      return false;
    }
  }
}
