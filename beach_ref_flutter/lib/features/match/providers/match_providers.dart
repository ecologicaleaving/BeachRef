import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/vis_api_client.dart';
import '../../../core/cache/cache_service.dart';
import '../../../core/database/data_sync_service.dart';
import '../../tournament/providers/tournament_providers.dart';
import '../models/beach_match.dart';

/// Determine TTL based on actual match statuses after fetch.
///
/// - Has live matches (status 3-8) → 30 seconds (need fresh data)
/// - All finished (status 9+) → 7 days (data won't change)
/// - All scheduled (status 1-2) → 1 hour (nothing happening yet)
/// - Mix of scheduled+finished → 1 hour
Duration _smartMatchListTtl(List<BeachMatch> matches) {
  if (matches.isEmpty) return const Duration(hours: 1);

  bool hasLive = false;
  bool hasScheduled = false;
  bool allFinished = true;

  for (final m in matches) {
    final status = int.tryParse(m.status) ?? 1;
    if (status >= 3 && status <= 8) {
      hasLive = true;
      allFinished = false;
    } else if (status < 3) {
      hasScheduled = true;
      allFinished = false;
    }
  }

  if (hasLive) return const Duration(seconds: 30);
  if (allFinished) return const Duration(days: 7);
  if (hasScheduled) return const Duration(hours: 1);
  return const Duration(hours: 1);
}

/// Match list for a given event (resolves Event No → Tournament Nos first)
///
/// The [eventNo] parameter is the Event Number from GetEventList.
/// This provider:
/// 1. Calls GetEvent(eventNo) to resolve real Tournament Numbers
/// 2. Calls GetBeachMatchList for each Tournament Number (Men + Women)
/// 3. Merges and returns all matches
///
/// TTL is DYNAMIC based on match statuses:
/// - Live tournament: refresh every 30s
/// - Finished tournament: cache 7 days (zero API calls!)
/// - Scheduled tournament: cache 1 hour
final matchListProvider =
    FutureProvider.family<List<BeachMatch>, String>((ref, eventNo) async {
  // Keep resolved data in memory across navigations — avoids
  // re-deserializing 100+ matches from Hive JSON on every visit.
  ref.keepAlive();

  final sw = Stopwatch()..start();
  final api = ref.watch(visApiClientProvider);
  final sync = DataSyncService.instance;
  final cache = CacheService.instance;

  // Step 1: Resolve Event No → Tournament Numbers (cached 7 days)
  final tournamentEntries =
      await ref.watch(tournamentNosProvider(eventNo).future);
  if (kDebugMode) {
    debugPrint('[matchListProvider] tournamentNos resolved in ${sw.elapsedMilliseconds}ms');
  }

  if (tournamentEntries.isEmpty) {
    return [];
  }

  // Step 2: Fetch matches for each tournament number
  //   Flow: Memory/Hive -> Supabase DB (shared) -> VIS API + auto-save
  final allMatches = <BeachMatch>[];
  for (final entry in tournamentEntries) {
    final cacheKey = 'matchlist:${entry.tournamentNo}';
    final defaultTtl = const Duration(hours: 1);

    final entryStart = sw.elapsedMilliseconds;
    final result = await sync.getMatchesWithLazyLoading(
      cacheKey: cacheKey,
      tournamentNo: entry.tournamentNo,
      ttl: defaultTtl,
      apiCallback: () async {
        final fetched = await api.getBeachMatchList(
            tournamentNo: entry.tournamentNo);
        // Re-cache with smart TTL based on actual statuses
        final smartTtl = _smartMatchListTtl(fetched);
        cache.set(cacheKey, fetched, smartTtl);
        return fetched;
      },
    );
    if (kDebugMode) {
      debugPrint('[matchListProvider] matches ${entry.tournamentNo} loaded in ${sw.elapsedMilliseconds - entryStart}ms (${result.data.length} matches)');
    }

    // Tag matches with gender info
    for (final m in result.data) {
      allMatches.add(m.copyWith(
        gender: entry.isMen ? 'M' : 'W',
      ));
    }
  }

  if (kDebugMode) {
    debugPrint('[matchListProvider] TOTAL: ${sw.elapsedMilliseconds}ms, ${allMatches.length} matches');
  }
  return allMatches;
});

/// Single match detail (full fields, on-demand)
final matchDetailProvider =
    FutureProvider.family<BeachMatch?, String>((ref, matchNo) async {
  final api = ref.watch(visApiClientProvider);
  final cache = CacheService.instance;

  final cacheKey = 'match:$matchNo';
  final ttl = CacheService.adaptiveTtl('match'); // 5 min

  return cache.getOrFetch<BeachMatch?>(
    key: cacheKey,
    ttl: ttl,
    fetcher: () => api.getBeachMatch(matchNo: matchNo),
    deserializer: (json) {
      if (json == null || json is! Map) return null;
      return BeachMatch.fromJson(Map<String, dynamic>.from(json));
    },
  );
});

/// Match list grouped by status: Live -> Scheduled -> Completed
final groupedMatchesProvider = Provider.family<
    AsyncValue<Map<String, List<BeachMatch>>>, String>((ref, eventNo) {
  return ref.watch(matchListProvider(eventNo)).whenData((matches) {
    final live = <BeachMatch>[];
    final scheduled = <BeachMatch>[];
    final completed = <BeachMatch>[];

    for (final m in matches) {
      // Check court sequencing for ReadyToStart
      final effectiveStatus = (int.tryParse(m.status) == 2 &&
              canReadyToStartGoLive(m, matches))
          ? MatchDisplayStatus.inSet1
          : m.displayStatus;

      if (effectiveStatus.isLive) {
        live.add(m);
      } else if (effectiveStatus.isFinished) {
        completed.add(m);
      } else {
        scheduled.add(m);
      }
    }

    // Sort: live by court, scheduled by time, completed by time desc
    live.sort((a, b) => a.court.compareTo(b.court));
    scheduled.sort((a, b) {
      final cmp = a.localDate.compareTo(b.localDate);
      return cmp != 0 ? cmp : a.localTime.compareTo(b.localTime);
    });
    completed.sort((a, b) {
      final cmp = b.localDate.compareTo(a.localDate);
      return cmp != 0 ? cmp : b.localTime.compareTo(a.localTime);
    });

    return <String, List<BeachMatch>>{
      if (live.isNotEmpty) 'Live': live,
      if (scheduled.isNotEmpty) 'Scheduled': scheduled,
      if (completed.isNotEmpty) 'Completed': completed,
    };
  });
});

/// Event referee list from GetEventRefereeList API
/// Returns ALL referees assigned to the event (even before matches are scheduled)
/// Cached 6 hours - referee assignments rarely change
final eventRefereeListProvider =
    FutureProvider.family<List<EventReferee>, String>((ref, eventNo) async {
  // Keep referee list in memory — avoids re-deserialization on tab switch.
  ref.keepAlive();

  final api = ref.watch(visApiClientProvider);
  final cache = CacheService.instance;

  final cacheKey = 'event_referees:$eventNo';
  const ttl = Duration(hours: 6);

  final raw = await cache.getOrFetch<List<EventReferee>>(
    key: cacheKey,
    ttl: ttl,
    fetcher: () => api.getEventRefereeList(eventNo),
    deserializer: (json) {
      if (json is! List) return <EventReferee>[];
      return json
          .whereType<Map>()
          .map((e) => EventReferee.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    },
  );

  // Deduplicate cached data (old cache entries may contain duplicates)
  final seen = <String>{};
  final sorted = List<EventReferee>.of(raw)
    ..sort((a, b) => b.firstName.length.compareTo(a.firstName.length));
  return sorted.where((r) => seen.add(r.deduplicationKey)).toList();
});
