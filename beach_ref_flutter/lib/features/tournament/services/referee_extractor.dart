import 'dart:math';
import '../../../core/api/vis_api_client.dart';
import '../../match/models/beach_match.dart';

/// Extracts unique referees from match data as fallback for older tournaments
/// that don't support the GetEventRefereeList API.
///
/// Handles VIS data quality issues:
/// - Format variants: "Carvalho", "CARVALHO, R.", "CARVALHO R."
/// - Typos: "Sumaliv"/"Sumavil", "MYSZKOESKA"/"MYSZKOWSKA"
class RefereeExtractor {
  RefereeExtractor._();

  /// Extract unique referees from match assignments with aggressive dedup.
  ///
  /// Two-pass deduplication:
  /// 1. Exact match on [EventReferee.deduplicationKey] (handles format variants)
  /// 2. Fuzzy merge within same federation (Levenshtein ≤ 2, catches typos)
  static List<EventReferee> fromMatches(List<BeachMatch> matches) {
    // Step 1: Collect all referee appearances with frequency count
    final nameCount = <String, int>{};
    final nameToRef = <String, EventReferee>{};

    for (final m in matches) {
      _collectRef(m.referee1Name, m.referee1FederationCode, '1', nameCount, nameToRef);
      _collectRef(m.referee2Name, m.referee2FederationCode, '1', nameCount, nameToRef);
    }

    // Step 2: Dedup by deduplicationKey (handles format variants like
    // "Carvalho" / "CARVALHO, R." / "CARVALHO R.")
    // Keep the variant with the most appearances (most canonical name).
    final byKey = <String, _RefEntry>{};
    for (final entry in nameToRef.entries) {
      final ref = entry.value;
      final key = ref.deduplicationKey;
      final count = nameCount[entry.key] ?? 0;
      final existing = byKey[key];
      if (existing == null || count > existing.count) {
        byKey[key] = _RefEntry(ref, count);
      }
    }

    // Step 3: Fuzzy merge within same federation (catches typos like
    // "Sumaliv"/"Sumavil", "Murless"/"Murlless", "MYSZKOESKA"/"MYSZKOWSKA")
    final result = <EventReferee>[];
    final merged = <String>{};

    // Group by federation for efficient comparison
    final byFed = <String, List<String>>{};
    for (final key in byKey.keys) {
      final fed = key.split('|').last;
      byFed.putIfAbsent(fed, () => []).add(key);
    }

    for (final fedKeys in byFed.values) {
      // Sort by count desc: most frequent name is the "canonical" one
      fedKeys.sort((a, b) =>
          (byKey[b]?.count ?? 0).compareTo(byKey[a]?.count ?? 0));

      for (final key in fedKeys) {
        if (merged.contains(key)) continue;
        final entry = byKey[key]!;
        merged.add(key);

        // Check remaining keys in same federation for fuzzy matches
        final coreName = key.split('|').first;
        for (final otherKey in fedKeys) {
          if (merged.contains(otherKey)) continue;
          final otherCore = otherKey.split('|').first;
          if (_levenshtein(coreName, otherCore) <= 2) {
            merged.add(otherKey); // absorb the typo variant
          }
        }

        result.add(entry.ref);
      }
    }

    return result;
  }

  static void _collectRef(
    String name,
    String federationCode,
    String type,
    Map<String, int> nameCount,
    Map<String, EventReferee> nameToRef,
  ) {
    if (name.isEmpty) return;
    final key = name.trim().toLowerCase();
    nameCount[key] = (nameCount[key] ?? 0) + 1;
    nameToRef.putIfAbsent(
      key,
      () => EventReferee(
        no: '',
        firstName: '',
        lastName: name.trim(),
        federationCode: federationCode,
        gender: '',
        type: type,
      ),
    );
  }

  /// Levenshtein edit distance between two strings.
  static int _levenshtein(String a, String b) {
    if (a == b) return 0;
    if (a.isEmpty) return b.length;
    if (b.isEmpty) return a.length;

    // Optimization: if length difference > 2, skip (can't be ≤ 2)
    if ((a.length - b.length).abs() > 2) return 3;

    final prev = List<int>.generate(b.length + 1, (i) => i);
    final curr = List<int>.filled(b.length + 1, 0);

    for (var i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (var j = 1; j <= b.length; j++) {
        final cost = a[i - 1] == b[j - 1] ? 0 : 1;
        curr[j] = min(min(curr[j - 1] + 1, prev[j] + 1), prev[j - 1] + cost);
      }
      prev.setAll(0, curr);
    }
    return curr[b.length];
  }
}

class _RefEntry {
  final EventReferee ref;
  final int count;
  const _RefEntry(this.ref, this.count);
}
