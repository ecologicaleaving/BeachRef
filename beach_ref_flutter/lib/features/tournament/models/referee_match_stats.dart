import '../../match/models/beach_match.dart';

/// Statistics for a referee within a tournament, computed from match data
class RefereeMatchStats {
  final int totalMatches;
  final int matchesAsFirst;  // R1
  final int matchesAsSecond; // R2
  final int menMatches;      // M
  final int womenMatches;    // W
  final List<RefereeRecentMatch> recentMatches;

  const RefereeMatchStats({
    required this.totalMatches,
    required this.matchesAsFirst,
    required this.matchesAsSecond,
    required this.menMatches,
    required this.womenMatches,
    required this.recentMatches,
  });

  static const empty = RefereeMatchStats(
    totalMatches: 0,
    matchesAsFirst: 0,
    matchesAsSecond: 0,
    menMatches: 0,
    womenMatches: 0,
    recentMatches: [],
  );

  bool get hasMatches => totalMatches > 0;
}

/// A match associated with a referee, including their role
class RefereeRecentMatch {
  final BeachMatch match;
  final String role; // 'R1' or 'R2'

  const RefereeRecentMatch({required this.match, required this.role});
}
