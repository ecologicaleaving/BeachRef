import '../../features/match/models/beach_match.dart';

/// Bidirectional mapping between Flutter models and Supabase rows.
///
/// The `matches` table schema is defined in migration 013.
/// Fields not present in the DB (teamAFederationCode, round, roundPhase, etc.)
/// are set to empty strings when reading from Supabase; they get populated
/// on the next VIS API fetch via upsert.
class DatabaseMapper {
  const DatabaseMapper._();

  // ──────────────────────────────────────────────
  // BeachMatch <-> Supabase `matches` row
  // ──────────────────────────────────────────────

  /// Convert a [BeachMatch] to a Supabase row for upsert.
  ///
  /// [tournamentNo] is required because it's stored as a separate column
  /// in the DB but isn't always carried on the BeachMatch model.
  static Map<String, dynamic> matchToRow(
    BeachMatch match,
    String tournamentNo,
  ) {
    return {
      'no': match.no,
      'tournament_no': tournamentNo,
      'no_in_tournament': match.noInTournament,
      'team_a_name': match.teamAName,
      'team_b_name': match.teamBName,
      'local_date': _nullIfEmpty(match.localDate),
      'local_time': _nullIfEmpty(match.localTime),
      'court': _nullIfEmpty(match.court),
      'status': _nullIfEmpty(match.status),
      'round': _nullIfEmpty(match.roundName),
      'match_points_a': match.matchPointsA,
      'match_points_b': match.matchPointsB,
      'points_team_a_set1': match.pointsTeamASet1,
      'points_team_b_set1': match.pointsTeamBSet1,
      'points_team_a_set2': match.pointsTeamASet2,
      'points_team_b_set2': match.pointsTeamBSet2,
      'points_team_a_set3': match.pointsTeamASet3,
      'points_team_b_set3': match.pointsTeamBSet3,
      'duration_set1': _nullIfEmpty(match.durationSet1),
      'duration_set2': _nullIfEmpty(match.durationSet2),
      'duration_set3': _nullIfEmpty(match.durationSet3),
      'referee1_name': _nullIfEmpty(match.referee1Name),
      'referee2_name': _nullIfEmpty(match.referee2Name),
      'referee1_federation_code': _nullIfEmpty(match.referee1FederationCode),
      'referee2_federation_code': _nullIfEmpty(match.referee2FederationCode),
      'last_synced': DateTime.now().toUtc().toIso8601String(),
    };
  }

  /// Convert a Supabase row to a [BeachMatch].
  ///
  /// Fields not stored in the DB are set to empty strings.
  static BeachMatch rowToMatch(Map<String, dynamic> row) {
    return BeachMatch(
      no: _str(row['no']),
      noInTournament: _str(row['no_in_tournament']),
      localDate: _str(row['local_date']),
      localTime: _str(row['local_time']),
      status: _str(row['status']),
      court: _str(row['court']),
      teamAName: _str(row['team_a_name']),
      teamBName: _str(row['team_b_name']),
      teamAFederationCode: '',
      teamBFederationCode: '',
      matchPointsA: _intOrNull(row['match_points_a']),
      matchPointsB: _intOrNull(row['match_points_b']),
      roundName: _str(row['round']),
      round: '',
      roundPhase: '',
      referee1Name: _str(row['referee1_name']),
      referee2Name: _str(row['referee2_name']),
      referee1FederationCode: _str(row['referee1_federation_code']),
      referee2FederationCode: _str(row['referee2_federation_code']),
      refereeChallengeName: '',
      pointsTeamASet1: _intOrNull(row['points_team_a_set1']),
      pointsTeamBSet1: _intOrNull(row['points_team_b_set1']),
      pointsTeamASet2: _intOrNull(row['points_team_a_set2']),
      pointsTeamBSet2: _intOrNull(row['points_team_b_set2']),
      pointsTeamASet3: _intOrNull(row['points_team_a_set3']),
      pointsTeamBSet3: _intOrNull(row['points_team_b_set3']),
      durationSet1: _str(row['duration_set1']),
      durationSet2: _str(row['duration_set2']),
      durationSet3: _str(row['duration_set3']),
      resultType: '',
      noEvent: '',
    );
  }

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────

  static String _str(dynamic value) => value?.toString() ?? '';

  static int? _intOrNull(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    return int.tryParse(value.toString());
  }

  /// Returns null for empty strings (DB columns prefer NULL over '').
  static String? _nullIfEmpty(String value) {
    return value.isEmpty ? null : value;
  }
}
