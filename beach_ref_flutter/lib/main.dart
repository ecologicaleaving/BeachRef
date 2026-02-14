import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'app.dart';
import 'core/api/api_logger_interceptor.dart';
import 'core/api/dio_client.dart';
import 'core/cache/cache_service.dart';
import 'core/database/supabase_service.dart';
import 'core/network/network_monitor.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Initialize Hive with encryption
  await Hive.initFlutter();
  final cipher = await _getHiveCipher();
  await Hive.openBox('app_settings', encryptionCipher: cipher);

  // 2. Initialize cache service (encrypted)
  await CacheService.instance.init(cipher: cipher);

  // 3. Initialize network monitor
  await NetworkMonitor.instance.init();

  // 4. Add API logger in debug mode
  if (kDebugMode) {
    DioClient.addInterceptor(ApiLoggerInterceptor());
  }

  // 5. Initialize Supabase (credentials via --dart-define)
  //    flutter run --dart-define=SUPABASE_URL=https://xxx.supabase.co --dart-define=SUPABASE_ANON_KEY=eyJ...
  //    If empty, SupabaseService.isAvailable = false → fallback to Memory + Hive + VIS API
  await SupabaseService.instance.init(
    url: const String.fromEnvironment('SUPABASE_URL'),
    anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY'),
  );

  runApp(
    const ProviderScope(
      child: BeachRefApp(),
    ),
  );
}

/// Get or create a 256-bit encryption key for Hive, stored in platform secure storage.
Future<HiveAesCipher> _getHiveCipher() async {
  const storage = FlutterSecureStorage();
  const keyName = 'hive_encryption_key';

  var encodedKey = await storage.read(key: keyName);
  if (encodedKey == null) {
    final key = Hive.generateSecureKey();
    encodedKey = base64UrlEncode(key);
    await storage.write(key: keyName, value: encodedKey);
  }
  final key = base64Url.decode(encodedKey);
  return HiveAesCipher(key);
}
