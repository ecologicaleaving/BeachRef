import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Notification service for push token registration and permission management
class NotificationService {
  NotificationService._();
  static final instance = NotificationService._();

  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    // Supabase is initialized in main.dart
    // Push notification setup would go here (Firebase Messaging / APNs)
    if (kDebugMode) {
      debugPrint('[NotificationService] Initialized');
    }
  }

  /// Request notification permissions (platform-specific)
  Future<bool> requestPermission() async {
    // On web, permissions are handled differently
    if (kIsWeb) return true;

    // For native platforms, we'd use firebase_messaging here
    // For now, return true as a placeholder
    return true;
  }

  /// Register push token on Supabase
  Future<void> registerToken({
    required String token,
    required String platform,
    required String deviceId,
    required int refereeId,
  }) async {
    try {
      final supabase = Supabase.instance.client;
      await supabase.from('push_notification_tokens').upsert({
        'referee_id': refereeId,
        'token': token,
        'platform': platform,
        'device_id': deviceId,
      }, onConflict: 'referee_id,device_id');

      if (kDebugMode) {
        debugPrint('[NotificationService] Token registered for referee $refereeId');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[NotificationService] Failed to register token: $e');
      }
    }
  }

  /// Get current platform name for token registration
  String get currentPlatform {
    if (kIsWeb) return 'web';
    if (Platform.isIOS) return 'ios';
    if (Platform.isAndroid) return 'android';
    return 'unknown';
  }
}
