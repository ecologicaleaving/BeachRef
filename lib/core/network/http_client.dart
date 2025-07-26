import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../environment.dart';

class AppHttpClient {
  static final AppHttpClient _instance = AppHttpClient._internal();
  factory AppHttpClient() => _instance;
  AppHttpClient._internal();

  late final SupabaseClient _client;
  
  void initialize() {
    _client = SupabaseClient(
      Environment.supabaseUrl,
      Environment.supabaseAnonKey,
      httpClient: null, // Use default HTTP client
    );
  }
  
  SupabaseClient get client => _client;
  
  Map<String, String> get defaultHeaders => {
    'Content-Type': 'application/json',
    'User-Agent': 'BeachRef/${Environment.isDevelopment ? 'dev' : 'prod'}',
  };
  
  void debugLog(String message) {
    if (kDebugMode) {
      debugPrint('[HTTP Client] $message');
    }
  }
}