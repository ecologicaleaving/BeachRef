import '../../features/match/models/beach_live.dart';

/// Maps a [BeachLiveResponse] to a Supabase row for match_live_snapshots.
class LiveSnapshotMapper {
  const LiveSnapshotMapper._();

  static Map<String, dynamic> toRow(int matchNo, BeachLiveResponse r) {
    return {
      'match_no': matchNo,
      'version': r.version,
      'status': r.rawStatusCode,
      'match_points_a': r.matchPointsA,
      'match_points_b': r.matchPointsB,
      'sets_json': r.sets.map(_setToJson).toList(),
      'no_serving_team': r.noServingTeam,
      'poll_delay': r.pollDelay,
      'team_a_name': r.teamAName,
      'team_b_name': r.teamBName,
      'team_a_federation': r.teamAFederationCode,
      'team_b_federation': r.teamBFederationCode,
      'court': r.court,
      'round_name': r.roundName,
      'tournament_code': r.tournamentCode,
      'result_type': r.resultType,
    };
  }

  static Map<String, dynamic> _setToJson(BeachLiveSet s) => {
    'set_number': s.setNumber,
    'points_a': s.pointsTeamA,
    'points_b': s.pointsTeamB,
    'duration_s': s.durationSeconds,
    'begin_offset_ms': s.beginTimeOffsetMs,
    'timeouts_a': s.nbTimeoutTeamA,
    'timeouts_b': s.nbTimeoutTeamB,
    'challenges_req_a': s.nbChallengeRequestedTeamA,
    'challenges_acc_a': s.nbChallengeAcceptedTeamA,
    'challenges_req_b': s.nbChallengeRequestedTeamB,
    'challenges_ref_b': s.nbChallengeRefusedTeamB,
    'set_points_a': s.nbSetPointsTeamA,
    'set_points_b': s.nbSetPointsTeamB,
    'serving_team': s.noServingTeam,
  };
}
