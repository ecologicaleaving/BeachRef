import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/vis_api_client.dart';
import '../../../core/cache/cache_service.dart';
import '../models/tournament.dart';

/// VIS API client provider
final visApiClientProvider = Provider<VisApiClient>((ref) {
  return VisApiClient();
});

/// Current season year
final seasonYearProvider = StateProvider<int>((ref) {
  return DateTime.now().year;
});

/// Gender filter: null = All, 'M' = Men, 'W' = Women
final genderFilterProvider = StateProvider<String?>((ref) => null);

/// Search query
final searchQueryProvider = StateProvider<String>((ref) => '');

/// Selected/default tournament No (persisted in Hive)
final selectedTournamentProvider = StateProvider<String?>((ref) => null);

/// All events from VIS API (cached, fetched once)
/// NOTE: VIS API ignores date filters - returns ALL ~815 events.
/// We fetch once and filter client-side.
/// Cached 6 hours in Hive to avoid re-downloading 108KB on every app open.
final _allEventsProvider = FutureProvider<List<Tournament>>((ref) async {
  final api = ref.watch(visApiClientProvider);
  final cache = CacheService.instance;

  const cacheKey = 'all_events';
  final ttl = CacheService.adaptiveTtl('events'); // 6 hours

  return cache.getOrFetch<List<Tournament>>(
    key: cacheKey,
    ttl: ttl,
    fetcher: () => api.getEventList(),
    // Deserializer for Hive persistence (JSON → List<Tournament>)
    deserializer: (json) => (json as List)
        .map((e) => Tournament.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList(),
  );
});

/// All tournaments (no year filter — UI groups them by season)
final tournamentsProvider = FutureProvider<List<Tournament>>((ref) async {
  final allEvents = await ref.watch(_allEventsProvider.future);
  return allEvents;
});

/// Resolved tournament numbers for a given event
/// Calls GetEvent → Content → BeachTournament entries
/// Cached 7 days - tournament numbers never change
final tournamentNosProvider =
    FutureProvider.family<List<BeachTournamentEntry>, String>(
        (ref, eventNo) async {
  // Keep resolved tournament numbers in memory — they never change.
  ref.keepAlive();

  final api = ref.watch(visApiClientProvider);
  final cache = CacheService.instance;

  final cacheKey = 'tournament_nos:$eventNo';
  final ttl = CacheService.adaptiveTtl('tournament_nos'); // 7 days

  return cache.getOrFetch<List<BeachTournamentEntry>>(
    key: cacheKey,
    ttl: ttl,
    fetcher: () => api.resolveBeachTournamentNos(eventNo),
    deserializer: (json) => (json as List).map((e) {
      final map = Map<String, dynamic>.from(e as Map);
      return BeachTournamentEntry(
        tournamentNo: map['tournamentNo'] as String? ?? '',
        gender: map['gender'] as String? ?? '',
      );
    }).toList(),
  );
});

/// Filtered tournaments (gender + search applied)
final filteredTournamentsProvider =
    Provider<AsyncValue<List<Tournament>>>((ref) {
  final tournamentsAsync = ref.watch(tournamentsProvider);
  final gender = ref.watch(genderFilterProvider);
  final query = ref.watch(searchQueryProvider).toLowerCase().trim();

  return tournamentsAsync.whenData((tournaments) {
    var filtered = tournaments;

    // Gender filter
    if (gender != null) {
      filtered = filtered.where((t) {
        if (gender == 'M') {
          return t.gender == '1' || t.gender.toUpperCase() == 'M';
        }
        if (gender == 'W') {
          return t.gender == '2' || t.gender.toUpperCase() == 'W';
        }
        return true;
      }).toList();
    }

    // Search filter
    if (query.isNotEmpty) {
      filtered = filtered.where((t) {
        return t.name.toLowerCase().contains(query) ||
            t.displayCity.toLowerCase().contains(query);
      }).toList();
    }

    return filtered;
  });
});

/// Tournaments grouped by month, sorted most recent first
final groupedTournamentsProvider =
    Provider<AsyncValue<Map<String, List<Tournament>>>>((ref) {
  return ref.watch(filteredTournamentsProvider).whenData((tournaments) {
    final grouped = <String, List<Tournament>>{};
    for (final t in tournaments) {
      final key = t.monthYearKey;
      grouped.putIfAbsent(key, () => []).add(t);
    }

    // Sort keys: most recent month first
    final sortedKeys = grouped.keys.toList()
      ..sort((a, b) {
        final dtA = _parseMonthYear(a);
        final dtB = _parseMonthYear(b);
        return dtB.compareTo(dtA); // descending
      });

    return Map.fromEntries(
      sortedKeys.map((k) => MapEntry(k, grouped[k]!)),
    );
  });
});

/// Parse "January 2026" -> DateTime for sorting
DateTime _parseMonthYear(String key) {
  const months = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12,
  };
  final parts = key.split(' ');
  if (parts.length != 2) return DateTime(1970);
  final month = months[parts[0]] ?? 1;
  final year = int.tryParse(parts[1]) ?? 1970;
  return DateTime(year, month);
}
