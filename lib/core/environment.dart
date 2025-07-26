import 'package:flutter/foundation.dart';

class Environment {
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: kDebugMode ? 'http://localhost:54321' : '',
  );
  
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );
  
  static const String googleClientId = String.fromEnvironment(
    'GOOGLE_CLIENT_ID',
    defaultValue: '',
  );
  
  static const String visApiBaseUrl = String.fromEnvironment(
    'VIS_API_BASE_URL',
    defaultValue: 'https://www.vis.sport/api',
  );
  
  static const String visApiKey = String.fromEnvironment(
    'VIS_API_KEY',
    defaultValue: '',
  );
  
  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: kDebugMode ? 'development' : 'production',
  );
  
  static bool get isDevelopment => environment == 'development';
  static bool get isProduction => environment == 'production';
  static bool get isStaging => environment == 'staging';
}