import 'package:flutter/foundation.dart';
import '../../features/match/models/beach_live.dart';
import 'live_snapshot_mapper.dart';
import 'supabase_service.dart';

/// Fire-and-forget Supabase snapshot writer for live scoring data.
///
/// Records every version change to `match_live_snapshots` for post-match
/// statistics analysis. Uses version-based dedup to avoid duplicate writes.
class LiveSnapshotService {
  LiveSnapshotService._();
  static final instance = LiveSnapshotService._();

  /// Tracks the last written version per match to skip duplicates.
  final Map<int, int> _lastWrittenVersion = {};

  /// Record a live snapshot. Fire-and-forget — never throws, never blocks.
  void recordSnapshot(int matchNo, BeachLiveResponse response) {
    if (!SupabaseService.instance.isAvailable) return;
    if (!response.hasChanges) return;

    // Version-based dedup
    final lastVersion = _lastWrittenVersion[matchNo];
    if (lastVersion != null && lastVersion >= response.version) return;
    _lastWrittenVersion[matchNo] = response.version;

    Future.microtask(() async {
      try {
        final row = LiveSnapshotMapper.toRow(matchNo, response);
        await SupabaseService.instance.client
            .from('match_live_snapshots')
            .insert(row);
        if (kDebugMode) {
          debugPrint(
            '[LiveSnapshot] Recorded match $matchNo v${response.version}',
          );
        }
      } catch (e) {
        if (kDebugMode) {
          debugPrint('[LiveSnapshot] Write failed for match $matchNo: $e');
        }
        // Never rethrow — this is best-effort background write
      }
    });
  }
}
