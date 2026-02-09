import 'package:flutter/foundation.dart';
import '../../features/match/models/beach_match.dart';
import '../cache/cache_service.dart';
import 'database_service.dart';
import 'supabase_service.dart';

/// Where the data came from.
enum DataSource { cache, database, api }

/// Result of a sync fetch, carrying the data and its origin.
class SyncResult<T> {
  final T data;
  final DataSource source;
  const SyncResult(this.data, this.source);
}

/// Orchestrates the 4-level data flow:
///   Memory Cache -> Hive (local) -> Supabase DB (shared) -> VIS API
///
/// After a VIS API fetch the data is written back to Supabase in the
/// background so subsequent requests (from any user) hit the shared DB.
class DataSyncService {
  DataSyncService._();
  static final instance = DataSyncService._();

  final _cache = CacheService.instance;
  final _db = DatabaseService.instance;
  final _supabase = SupabaseService.instance;

  /// Fetch matches with lazy-loading through all 4 levels.
  ///
  /// 1. Memory/Hive cache (CacheService) — instant, per-device
  /// 2. Supabase DB — shared across all users
  /// 3. VIS API (via [apiCallback]) — source of truth
  ///
  /// [cacheKey]       key used for Memory+Hive layers
  /// [tournamentNo]   used for Supabase queries and saving
  /// [ttl]            cache lifetime for Memory+Hive
  /// [apiCallback]    function that fetches fresh data from VIS API
  Future<SyncResult<List<BeachMatch>>> getMatchesWithLazyLoading({
    required String cacheKey,
    required String tournamentNo,
    required Duration ttl,
    required Future<List<BeachMatch>> Function() apiCallback,
  }) async {
    // ── Level 1+2: Memory + Hive (CacheService handles both) ──
    final cached = _cache.getCached<List<BeachMatch>>(
      cacheKey,
      deserializer: (json) => (json as List)
          .map((e) =>
              BeachMatch.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
    );
    if (cached != null && cached.isNotEmpty) {
      if (kDebugMode) {
        debugPrint('[DataSync] cache HIT ($cacheKey) — ${cached.length} matches');
      }
      return SyncResult(cached, DataSource.cache);
    }

    // ── Level 3: Supabase DB (shared cache) ──
    if (_supabase.isAvailable) {
      try {
        final dbMatches =
            await _db.getMatchesByTournament(tournamentNo);
        if (dbMatches.isNotEmpty) {
          // Populate local cache so next access is instant
          _cache.set(cacheKey, dbMatches, ttl);
          if (kDebugMode) {
            debugPrint(
              '[DataSync] Supabase HIT ($cacheKey) — ${dbMatches.length} matches',
            );
          }
          return SyncResult(dbMatches, DataSource.database);
        }
      } catch (e) {
        if (kDebugMode) {
          debugPrint('[DataSync] Supabase read error: $e');
        }
        // Fall through to VIS API
      }
    }

    // ── Level 4: VIS API (source of truth) ──
    if (kDebugMode) {
      debugPrint('[DataSync] VIS API call ($cacheKey)');
    }
    final freshMatches = await apiCallback();

    // Populate Memory + Hive
    _cache.set(cacheKey, freshMatches, ttl);

    // Save to Supabase in background (fire-and-forget)
    if (_supabase.isAvailable && freshMatches.isNotEmpty) {
      _saveToSupabaseInBackground(freshMatches, tournamentNo);
    }

    return SyncResult(freshMatches, DataSource.api);
  }

  /// Fire-and-forget save to Supabase so it never blocks the UI.
  void _saveToSupabaseInBackground(
    List<BeachMatch> matches,
    String tournamentNo,
  ) {
    Future.microtask(() async {
      final ok = await _db.saveMatches(matches, tournamentNo);
      if (kDebugMode) {
        debugPrint(
          '[DataSync] Background save to Supabase: ${ok ? 'OK' : 'FAILED'} '
          '(${matches.length} matches, tournament $tournamentNo)',
        );
      }
    });
  }
}
