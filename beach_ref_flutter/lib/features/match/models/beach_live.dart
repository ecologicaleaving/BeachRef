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
  });

  factory BeachLiveResponse.noChanges() => const BeachLiveResponse(
    hasChanges: false,
  );

  /// Score display (e.g., "2-1")
  String get scoreDisplay => '$matchPointsA-$matchPointsB';
}

/// Individual set score within a live match
class BeachLiveSet {
  final int setNumber;
  final int pointsTeamA;
  final int pointsTeamB;
  final String? duration;

  const BeachLiveSet({
    required this.setNumber,
    required this.pointsTeamA,
    required this.pointsTeamB,
    this.duration,
  });

  String get display => '$pointsTeamA-$pointsTeamB';
}
