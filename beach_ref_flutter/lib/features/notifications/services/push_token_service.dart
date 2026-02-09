import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Manages push token registration and updates on Supabase
class PushTokenService {
  PushTokenService._();
  static final instance = PushTokenService._();

  /// Register or update a push token for a referee
  Future<void> registerToken({
    required int refereeId,
    required String token,
    required String platform,
    required String deviceId,
  }) async {
    try {
      final supabase = Supabase.instance.client;

      await supabase.from('push_notification_tokens').upsert(
        {
          'referee_id': refereeId,
          'token': token,
          'platform': platform,
          'device_id': deviceId,
          'last_used_at': DateTime.now().toIso8601String(),
        },
        onConflict: 'referee_id,device_id',
      );
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[PushTokenService] Registration failed: $e');
      }
    }
  }

  /// Remove push token for a device
  Future<void> removeToken({
    required int refereeId,
    required String deviceId,
  }) async {
    try {
      final supabase = Supabase.instance.client;
      await supabase.from('push_notification_tokens').delete().match({
        'referee_id': refereeId,
        'device_id': deviceId,
      });
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[PushTokenService] Token removal failed: $e');
      }
    }
  }
}
