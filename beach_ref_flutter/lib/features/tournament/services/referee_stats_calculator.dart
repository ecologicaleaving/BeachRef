import '../../../core/api/vis_api_client.dart';
import '../../match/models/beach_match.dart';
import '../models/referee_match_stats.dart';

/// Pure computation class: calculates referee match statistics
/// from the already-loaded match list. No API calls, no state.
class RefereeStatsCalculator {
  const RefereeStatsCalculator._();

  /// Compute stats for a single referee against the full match list
  static RefereeMatchStats compute(
    EventReferee referee,
    List<BeachMatch> matches,
  ) {
    int asFirst = 0;
    int asSecond = 0;
    int men = 0;
    int women = 0;
    final matchedMatches = <RefereeRecentMatch>[];

    for (final match in matches) {
      final r1Match = _matchesReferee(
        referee,
        match.referee1Name,
        match.referee1FederationCode,
      );
      final r2Match = _matchesReferee(
        referee,
        match.referee2Name,
        match.referee2FederationCode,
      );

      if (r1Match || r2Match) {
        final role = r1Match ? 'R1' : 'R2';
        if (r1Match) asFirst++;
        if (r2Match) asSecond++;
        if (match.gender == 'M') men++;
        if (match.gender == 'W') women++;
        matchedMatches.add(RefereeRecentMatch(match: match, role: role));
      }
    }

    // Sort by date desc, then time desc, take last 3
    matchedMatches.sort((a, b) {
      final dateCompare = b.match.localDate.compareTo(a.match.localDate);
      if (dateCompare != 0) return dateCompare;
      return b.match.localTime.compareTo(a.match.localTime);
    });
    final recent = matchedMatches.take(3).toList();

    return RefereeMatchStats(
      totalMatches: asFirst + asSecond,
      matchesAsFirst: asFirst,
      matchesAsSecond: asSecond,
      menMatches: men,
      womenMatches: women,
      recentMatches: recent,
    );
  }

  /// Compute stats for all referees at once, returning a map keyed by
  /// a unique referee key (lastName_federationCode lowercase).
  static Map<String, RefereeMatchStats> computeAll(
    List<EventReferee> referees,
    List<BeachMatch> matches,
  ) {
    final result = <String, RefereeMatchStats>{};
    for (final ref in referees) {
      result[refereeKey(ref)] = compute(ref, matches);
    }
    return result;
  }

  /// Stable key for a referee (used to track expanded state and stats map)
  static String refereeKey(EventReferee ref) {
    return '${ref.lastName}_${ref.federationCode}'.toLowerCase();
  }

  /// Check if a referee matches a name from the match data.
  ///
  /// Strategy:
  /// 1. Match by lastName (contained in refereeName) + federationCode
  /// 2. Fallback: both firstName and lastName contained in refereeName
  static bool _matchesReferee(
    EventReferee referee,
    String refereeName,
    String refereeFedCode,
  ) {
    if (refereeName.isEmpty) return false;

    final nameNorm = refereeName.trim().toLowerCase();
    final lastNorm = referee.lastName.trim().toLowerCase();
    final firstNorm = referee.firstName.trim().toLowerCase();
    final fedNorm = referee.federationCode.trim().toLowerCase();
    final matchFedNorm = refereeFedCode.trim().toLowerCase();

    if (lastNorm.isEmpty) return false;

    // Primary: lastName contained in the match referee name + same federation
    if (nameNorm.contains(lastNorm) && fedNorm == matchFedNorm) {
      return true;
    }

    // Fallback: both first and last name contained (handles name-only matching
    // for referees extracted from match data where federation might differ)
    if (firstNorm.isNotEmpty &&
        nameNorm.contains(lastNorm) &&
        nameNorm.contains(firstNorm)) {
      return true;
    }

    return false;
  }
}
