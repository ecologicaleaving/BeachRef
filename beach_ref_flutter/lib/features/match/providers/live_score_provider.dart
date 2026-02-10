import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/vis_api_client.dart';
import '../../../core/database/live_snapshot_service.dart';
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
  double? lastPollDelay;
  MatchDisplayStatus? lastStatus;

  // App lifecycle observer for background detection
  final observer = _AppLifecycleObserver(
    onPause: () => isPaused = true,
    onResume: () {
      isPaused = false;
      // Immediate poll on resume
      _poll(api, matchNo, version, controller, (v) => version = v,
          () => errorCount, (e) => errorCount = e,
          (d) => lastPollDelay = d, (s) => lastStatus = s);
    },
  );
  WidgetsBinding.instance.addObserver(observer);

  void schedulePoll(Duration interval) {
    pollTimer?.cancel();

    // Auto-stop: if last known status is finished, don't schedule
    if (lastStatus != null && lastStatus!.isFinished) return;

    pollTimer = Timer(interval, () async {
      if (isPaused || controller.isClosed) return;

      await _poll(api, matchNo, version, controller, (v) => version = v,
          () => errorCount, (e) => errorCount = e,
          (d) => lastPollDelay = d, (s) => lastStatus = s);

      if (!controller.isClosed) {
        final nextInterval = _nextPollInterval(
          errorCount,
          lastPollDelay,
          lastStatus,
        );
        schedulePoll(nextInterval);
      }
    });
  }

  // Initial poll
  _poll(api, matchNo, version, controller, (v) => version = v,
      () => errorCount, (e) => errorCount = e,
      (d) => lastPollDelay = d, (s) => lastStatus = s)
      .then((_) {
    if (!controller.isClosed) {
      schedulePoll(_nextPollInterval(0, lastPollDelay, lastStatus));
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
  void Function(double?) setPollDelay,
  void Function(MatchDisplayStatus?) setStatus,
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
      setPollDelay(response.pollDelay);
      setStatus(response.displayStatus);

      if (!controller.isClosed) {
        controller.add(response);
      }

      // Record snapshot to Supabase (fire-and-forget)
      LiveSnapshotService.instance.recordSnapshot(matchNo, response);
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

/// Calculate next poll interval with adaptive logic.
///
/// Priority:
/// 1. Error backoff (exponential)
/// 2. Server pollDelay from response (clamped 1-30s, min 5s during live)
/// 3. Status-based interval via displayStatus.pollingInterval
/// 4. Default: 5 seconds
Duration _nextPollInterval(
  int errorCount,
  double? serverPollDelay,
  MatchDisplayStatus? status,
) {
  // 1. Error backoff: 1s, 2s, 4s, 8s, 16s, max 30s
  if (errorCount > 0) {
    final backoff = Duration(seconds: (1 << errorCount).clamp(1, 30));
    return backoff;
  }

  // 2. Server-suggested interval (respect it, but clamp)
  if (serverPollDelay != null) {
    final clamped = serverPollDelay.clamp(1.0, 30.0);
    // During live play, use at least 5s even if server says more
    if (status != null && status.isLive) {
      return Duration(seconds: clamped.clamp(5.0, 30.0).toInt());
    }
    return Duration(seconds: clamped.toInt());
  }

  // 3. Status-based interval
  if (status != null) {
    final interval = status.pollingInterval;
    if (interval > Duration.zero) return interval;
    // Duration.zero means finished — auto-stop handled in schedulePoll
    return const Duration(seconds: 60);
  }

  // 4. Default
  return const Duration(seconds: 5);
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

/// One-shot GetBeachLive snapshot — fired on every match detail open.
///
/// For finished matches: fetches rich data (timeouts, challenges, set durations)
/// and records it to Supabase for stats. For live matches: provides the initial
/// snapshot before polling takes over.
///
/// Flow: Supabase DB (check existing) → VIS API → record to Supabase.
final matchSnapshotProvider =
    FutureProvider.autoDispose.family<BeachLiveResponse?, int>((ref, matchNo) async {
  final api = ref.watch(visApiClientProvider);

  try {
    final response = await api.getBeachLive(matchNo: matchNo);
    if (response.hasChanges) {
      // Record to Supabase (fire-and-forget, version-deduped)
      LiveSnapshotService.instance.recordSnapshot(matchNo, response);
    }
    return response.hasChanges ? response : null;
  } catch (e) {
    // Non-critical — match detail still works with static data
    if (kDebugMode) {
      debugPrint('[matchSnapshotProvider] GetBeachLive failed for $matchNo: $e');
    }
    return null;
  }
});

/// Provider that checks if a match is currently live (for UI decisions)
final isMatchLiveProvider = Provider.family<bool, String>((ref, status) {
  final displayStatus = mapVisMatchStatus(status);
  return displayStatus.isLive;
});
