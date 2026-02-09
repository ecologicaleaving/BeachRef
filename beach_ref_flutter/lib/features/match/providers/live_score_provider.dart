import 'dart:async';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/vis_api_client.dart';
import '../../../core/network/circuit_breaker.dart';
import '../../tournament/providers/tournament_providers.dart';
import '../models/beach_live.dart';
import '../models/beach_match.dart';

/// Live score polling provider for a specific match.
/// Emits BeachLiveResponse updates at adaptive intervals.
/// Auto-disposes when no widget is listening.
final liveScoreProvider =
    StreamProvider.autoDispose.family<BeachLiveResponse, int>((ref, matchNo) {
  final api = ref.watch(visApiClientProvider);
  final controller = StreamController<BeachLiveResponse>();

  int version = 0;
  int errorCount = 0;
  bool isPaused = false;
  Timer? pollTimer;

  // App lifecycle observer for background detection
  final observer = _AppLifecycleObserver(
    onPause: () => isPaused = true,
    onResume: () {
      isPaused = false;
      // Immediate poll on resume
      _poll(api, matchNo, version, controller, (v) => version = v,
          () => errorCount, (e) => errorCount = e);
    },
  );
  WidgetsBinding.instance.addObserver(observer);

  void schedulePoll(Duration interval) {
    pollTimer?.cancel();
    pollTimer = Timer(interval, () async {
      if (isPaused || controller.isClosed) return;

      await _poll(api, matchNo, version, controller, (v) => version = v,
          () => errorCount, (e) => errorCount = e);

      if (!controller.isClosed) {
        // Determine next interval based on status
        final nextInterval = _nextPollInterval(errorCount);
        schedulePoll(nextInterval);
      }
    });
  }

  // Initial poll
  _poll(api, matchNo, version, controller, (v) => version = v,
      () => errorCount, (e) => errorCount = e)
      .then((_) {
    if (!controller.isClosed) {
      schedulePoll(_nextPollInterval(0));
    }
  });

  ref.onDispose(() {
    pollTimer?.cancel();
    controller.close();
    WidgetsBinding.instance.removeObserver(observer);
  });

  return controller.stream;
});

/// Execute a single poll
Future<void> _poll(
  VisApiClient api,
  int matchNo,
  int currentVersion,
  StreamController<BeachLiveResponse> controller,
  void Function(int) setVersion,
  int Function() getErrorCount,
  void Function(int) setErrorCount,
) async {
  if (controller.isClosed) return;

  // Circuit breaker check
  if (!CircuitBreaker.instance.allowRequest()) return;

  try {
    final response = await api.getBeachLive(
      matchNo: matchNo,
      version: currentVersion > 0 ? currentVersion : null,
    );

    CircuitBreaker.instance.recordSuccess();
    setErrorCount(0);

    if (response.hasChanges) {
      setVersion(response.version);
      if (!controller.isClosed) {
        controller.add(response);
      }
    }
    // If no changes, we just skip the update (bandwidth saved)
  } catch (e) {
    CircuitBreaker.instance.recordFailure();
    setErrorCount(getErrorCount() + 1);

    if (!controller.isClosed) {
      controller.addError(e);
    }
  }
}

/// Calculate next poll interval with exponential backoff on errors
Duration _nextPollInterval(int errorCount) {
  if (errorCount == 0) return const Duration(seconds: 5);

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
  final backoff = Duration(seconds: (1 << errorCount).clamp(1, 30));
  return backoff;
}

class _AppLifecycleObserver extends WidgetsBindingObserver {
  final VoidCallback onPause;
  final VoidCallback onResume;
  DateTime? _pausedAt;

  _AppLifecycleObserver({required this.onPause, required this.onResume});

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.inactive:
        _pausedAt = DateTime.now();
        // Suspend after 30 seconds in background
        Future.delayed(const Duration(seconds: 30), () {
          if (_pausedAt != null) onPause();
        });
        break;
      case AppLifecycleState.resumed:
        _pausedAt = null;
        onResume();
        break;
      default:
        break;
    }
  }
}

/// Provider that checks if a match is currently live (for UI decisions)
final isMatchLiveProvider = Provider.family<bool, String>((ref, status) {
  final displayStatus = mapVisMatchStatus(status);
  return displayStatus == MatchDisplayStatus.live;
});
