import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'app.dart';
import 'core/api/api_logger_interceptor.dart';
import 'core/api/dio_client.dart';
import 'core/cache/cache_service.dart';
import 'core/database/supabase_service.dart';
import 'core/network/network_monitor.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Initialize Hive
  await Hive.initFlutter();
  await Hive.openBox('app_settings');

  // 2. Initialize cache service
  await CacheService.instance.init();

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
