import 'beach_match.dart';

/// BeachLive response from VIS API GetBeachLive
class BeachLiveResponse {
  final bool hasChanges;
  final int version;
  final int matchPointsA;
  final int matchPointsB;
  final String status;
  final List<BeachLiveSet> sets;
  final String teamAName;
  final String teamBName;
  final String teamAFederationCode;
  final String teamBFederationCode;
  final String court;
  final String roundName;

  // ── New enriched fields (all optional with defaults) ──

  /// Server-suggested poll interval in seconds (VIS default is 20).
  final double? pollDelay;

  /// Raw numeric VIS status code (1-15).
  final int? rawStatusCode;

  /// Match number echo.
  final int? matchNo;

  /// Team A numeric ID from Team element.
  final int? noTeamA;

  /// Team B numeric ID from Team element.
  final int? noTeamB;

  /// Last serving team number (from last Set NoServingTeam).
  final int? noServingTeam;

  /// Tournament code (e.g. "MPAR2024").
  final String tournamentCode;

  /// Tournament name.
  final String tournamentName;

  /// Round code (e.g. "SF", "F1").
  final String roundCode;

  /// Result type from Match element.
  final int? resultType;

  const BeachLiveResponse({
    required this.hasChanges,
    this.version = 0,
    this.matchPointsA = 0,
    this.matchPointsB = 0,
    this.status = '',
    this.sets = const [],
    this.teamAName = '',
    this.teamBName = '',
    this.teamAFederationCode = '',
    this.teamBFederationCode = '',
    this.court = '',
    this.roundName = '',
    this.pollDelay,
    this.rawStatusCode,
    this.matchNo,
    this.noTeamA,
    this.noTeamB,
    this.noServingTeam,
    this.tournamentCode = '',
    this.tournamentName = '',
    this.roundCode = '',
    this.resultType,
  });

  factory BeachLiveResponse.noChanges() => const BeachLiveResponse(
    hasChanges: false,
  );

  /// Score display (e.g., "2-1")
  String get scoreDisplay => '$matchPointsA-$matchPointsB';

  /// Whether team A is currently serving (resolved via team numbers).
  bool get isTeamAServing =>
      noServingTeam != null && noTeamA != null && noServingTeam == noTeamA;

  /// Whether team B is currently serving.
  bool get isTeamBServing =>
      noServingTeam != null && noTeamB != null && noServingTeam == noTeamB;

  /// Granular display status derived from rawStatusCode.
  MatchDisplayStatus get displayStatus =>
      mapVisMatchStatus(rawStatusCode?.toString() ?? status);

  Map<String, dynamic> toJson() => {
    'hasChanges': hasChanges,
    'version': version,
    'matchPointsA': matchPointsA,
    'matchPointsB': matchPointsB,
    'status': status,
    'sets': sets.map((s) => s.toJson()).toList(),
    'teamAName': teamAName,
    'teamBName': teamBName,
    'teamAFederationCode': teamAFederationCode,
    'teamBFederationCode': teamBFederationCode,
    'court': court,
    'roundName': roundName,
    'pollDelay': pollDelay,
    'rawStatusCode': rawStatusCode,
    'matchNo': matchNo,
    'noTeamA': noTeamA,
    'noTeamB': noTeamB,
    'noServingTeam': noServingTeam,
    'tournamentCode': tournamentCode,
    'tournamentName': tournamentName,
    'roundCode': roundCode,
    'resultType': resultType,
  };

  factory BeachLiveResponse.fromJson(Map<String, dynamic> json) =>
      BeachLiveResponse(
        hasChanges: json['hasChanges'] as bool? ?? true,
        version: json['version'] as int? ?? 0,
        matchPointsA: json['matchPointsA'] as int? ?? 0,
        matchPointsB: json['matchPointsB'] as int? ?? 0,
        status: json['status'] as String? ?? '',
        sets: (json['sets'] as List?)
            ?.map((e) =>
                BeachLiveSet.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList() ??
            const [],
        teamAName: json['teamAName'] as String? ?? '',
        teamBName: json['teamBName'] as String? ?? '',
        teamAFederationCode: json['teamAFederationCode'] as String? ?? '',
        teamBFederationCode: json['teamBFederationCode'] as String? ?? '',
        court: json['court'] as String? ?? '',
        roundName: json['roundName'] as String? ?? '',
        pollDelay: (json['pollDelay'] as num?)?.toDouble(),
        rawStatusCode: json['rawStatusCode'] as int?,
        matchNo: json['matchNo'] as int?,
        noTeamA: json['noTeamA'] as int?,
        noTeamB: json['noTeamB'] as int?,
        noServingTeam: json['noServingTeam'] as int?,
        tournamentCode: json['tournamentCode'] as String? ?? '',
        tournamentName: json['tournamentName'] as String? ?? '',
        roundCode: json['roundCode'] as String? ?? '',
        resultType: json['resultType'] as int?,
      );
}

/// Individual set score within a live match
class BeachLiveSet {
  final int setNumber;
  final int pointsTeamA;
  final int pointsTeamB;
  final String? duration;

  // ── Enriched fields from structured <Set> elements ──

  /// Set duration in seconds.
  final int? durationSeconds;

  /// Offset from match start in milliseconds.
  final int? beginTimeOffsetMs;

  /// Timeouts called by each team (0 if absent in XML).
  final int nbTimeoutTeamA;
  final int nbTimeoutTeamB;

  /// Challenges requested by each team.
  final int nbChallengeRequestedTeamA;
  final int nbChallengeRequestedTeamB;

  /// Challenges accepted.
  final int nbChallengeAcceptedTeamA;
  final int nbChallengeAcceptedTeamB;

  /// Challenges refused.
  final int nbChallengeRefusedTeamA;
  final int nbChallengeRefusedTeamB;

  /// Set point count.
  final int nbSetPointsTeamA;
  final int nbSetPointsTeamB;

  /// Last serving team this set (team number, not "A"/"B").
  final int? noServingTeam;

  /// Court position: team at left/right side.
  final int? noTeamAtLeft;
  final int? noTeamAtRight;

  const BeachLiveSet({
    required this.setNumber,
    required this.pointsTeamA,
    required this.pointsTeamB,
    this.duration,
    this.durationSeconds,
    this.beginTimeOffsetMs,
    this.nbTimeoutTeamA = 0,
    this.nbTimeoutTeamB = 0,
    this.nbChallengeRequestedTeamA = 0,
    this.nbChallengeRequestedTeamB = 0,
    this.nbChallengeAcceptedTeamA = 0,
    this.nbChallengeAcceptedTeamB = 0,
    this.nbChallengeRefusedTeamA = 0,
    this.nbChallengeRefusedTeamB = 0,
    this.nbSetPointsTeamA = 0,
    this.nbSetPointsTeamB = 0,
    this.noServingTeam,
    this.noTeamAtLeft,
    this.noTeamAtRight,
  });

  String get display => '$pointsTeamA-$pointsTeamB';

  /// Formatted duration (e.g. "16:37").
  String get durationDisplay {
    if (durationSeconds != null && durationSeconds! > 0) {
      final mins = durationSeconds! ~/ 60;
      final secs = durationSeconds! % 60;
      return '$mins:${secs.toString().padLeft(2, '0')}';
    }
    return duration ?? '';
  }

  /// Whether either team has set points in this set.
  bool get hasSetPoints => nbSetPointsTeamA > 0 || nbSetPointsTeamB > 0;

  Map<String, dynamic> toJson() => {
    'setNumber': setNumber,
    'pointsTeamA': pointsTeamA,
    'pointsTeamB': pointsTeamB,
    'duration': duration,
    'durationSeconds': durationSeconds,
    'beginTimeOffsetMs': beginTimeOffsetMs,
    'nbTimeoutTeamA': nbTimeoutTeamA,
    'nbTimeoutTeamB': nbTimeoutTeamB,
    'nbChallengeRequestedTeamA': nbChallengeRequestedTeamA,
    'nbChallengeRequestedTeamB': nbChallengeRequestedTeamB,
    'nbChallengeAcceptedTeamA': nbChallengeAcceptedTeamA,
    'nbChallengeAcceptedTeamB': nbChallengeAcceptedTeamB,
    'nbChallengeRefusedTeamA': nbChallengeRefusedTeamA,
    'nbChallengeRefusedTeamB': nbChallengeRefusedTeamB,
    'nbSetPointsTeamA': nbSetPointsTeamA,
    'nbSetPointsTeamB': nbSetPointsTeamB,
    'noServingTeam': noServingTeam,
    'noTeamAtLeft': noTeamAtLeft,
    'noTeamAtRight': noTeamAtRight,
  };

  factory BeachLiveSet.fromJson(Map<String, dynamic> json) => BeachLiveSet(
    setNumber: json['setNumber'] as int? ?? 0,
    pointsTeamA: json['pointsTeamA'] as int? ?? 0,
    pointsTeamB: json['pointsTeamB'] as int? ?? 0,
    duration: json['duration'] as String?,
    durationSeconds: json['durationSeconds'] as int?,
    beginTimeOffsetMs: json['beginTimeOffsetMs'] as int?,
    nbTimeoutTeamA: json['nbTimeoutTeamA'] as int? ?? 0,
    nbTimeoutTeamB: json['nbTimeoutTeamB'] as int? ?? 0,
    nbChallengeRequestedTeamA: json['nbChallengeRequestedTeamA'] as int? ?? 0,
    nbChallengeRequestedTeamB: json['nbChallengeRequestedTeamB'] as int? ?? 0,
    nbChallengeAcceptedTeamA: json['nbChallengeAcceptedTeamA'] as int? ?? 0,
    nbChallengeAcceptedTeamB: json['nbChallengeAcceptedTeamB'] as int? ?? 0,
    nbChallengeRefusedTeamA: json['nbChallengeRefusedTeamA'] as int? ?? 0,
    nbChallengeRefusedTeamB: json['nbChallengeRefusedTeamB'] as int? ?? 0,
    nbSetPointsTeamA: json['nbSetPointsTeamA'] as int? ?? 0,
    nbSetPointsTeamB: json['nbSetPointsTeamB'] as int? ?? 0,
    noServingTeam: json['noServingTeam'] as int?,
    noTeamAtLeft: json['noTeamAtLeft'] as int?,
    noTeamAtRight: json['noTeamAtRight'] as int?,
  );
}
