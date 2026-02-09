/// Beach volleyball match model from VIS API
class BeachMatch {
  final String no;
  final String noInTournament;
  final String localDate;
  final String localTime;
  final String status;
  final String court;
  final String teamAName;
  final String teamBName;
  final String teamAFederationCode;
  final String teamBFederationCode;
  final int? matchPointsA;
  final int? matchPointsB;
  final String roundName;
  final String round;
  final String roundPhase;
  final String referee1Name;
  final String referee2Name;
  final String referee1FederationCode;
  final String referee2FederationCode;
  final String refereeChallengeName;
  final int? pointsTeamASet1;
  final int? pointsTeamBSet1;
  final int? pointsTeamASet2;
  final int? pointsTeamBSet2;
  final int? pointsTeamASet3;
  final int? pointsTeamBSet3;
  final String durationSet1;
  final String durationSet2;
  final String durationSet3;
  final String resultType;
  final String noEvent;

  /// Gender tag: 'M' or 'W' (set after fetching from resolved tournament)
  final String gender;

  const BeachMatch({
    required this.no,
    required this.noInTournament,
    required this.localDate,
    required this.localTime,
    required this.status,
    required this.court,
    required this.teamAName,
    required this.teamBName,
    required this.teamAFederationCode,
    required this.teamBFederationCode,
    required this.matchPointsA,
    required this.matchPointsB,
    required this.roundName,
    required this.round,
    required this.roundPhase,
    required this.referee1Name,
    required this.referee2Name,
    required this.referee1FederationCode,
    required this.referee2FederationCode,
    required this.refereeChallengeName,
    required this.pointsTeamASet1,
    required this.pointsTeamBSet1,
    required this.pointsTeamASet2,
    required this.pointsTeamBSet2,
    required this.pointsTeamASet3,
    required this.pointsTeamBSet3,
    required this.durationSet1,
    required this.durationSet2,
    required this.durationSet3,
    required this.resultType,
    required this.noEvent,
    this.gender = '',
  });

  /// Create a copy with optional field overrides
  BeachMatch copyWith({String? gender}) {
    return BeachMatch(
      no: no,
      noInTournament: noInTournament,
      localDate: localDate,
      localTime: localTime,
      status: status,
      court: court,
      teamAName: teamAName,
      teamBName: teamBName,
      teamAFederationCode: teamAFederationCode,
      teamBFederationCode: teamBFederationCode,
      matchPointsA: matchPointsA,
      matchPointsB: matchPointsB,
      roundName: roundName,
      round: round,
      roundPhase: roundPhase,
      referee1Name: referee1Name,
      referee2Name: referee2Name,
      referee1FederationCode: referee1FederationCode,
      referee2FederationCode: referee2FederationCode,
      refereeChallengeName: refereeChallengeName,
      pointsTeamASet1: pointsTeamASet1,
      pointsTeamBSet1: pointsTeamBSet1,
      pointsTeamASet2: pointsTeamASet2,
      pointsTeamBSet2: pointsTeamBSet2,
      pointsTeamASet3: pointsTeamASet3,
      pointsTeamBSet3: pointsTeamBSet3,
      durationSet1: durationSet1,
      durationSet2: durationSet2,
      durationSet3: durationSet3,
      resultType: resultType,
      noEvent: noEvent,
      gender: gender ?? this.gender,
    );
  }

  /// Mapped match status (from VIS numeric codes)
  MatchDisplayStatus get displayStatus => mapVisMatchStatus(status);

  /// Score display string (e.g., "2-1")
  String get scoreDisplay {
    if (matchPointsA == null || matchPointsB == null) return '';
    return '$matchPointsA-$matchPointsB';
  }

  /// Set scores as list of (a, b) pairs
  List<SetScore> get setScores {
    final sets = <SetScore>[];
    if (pointsTeamASet1 != null || pointsTeamBSet1 != null) {
      sets.add(SetScore(1, pointsTeamASet1 ?? 0, pointsTeamBSet1 ?? 0, durationSet1));
    }
    if (pointsTeamASet2 != null || pointsTeamBSet2 != null) {
      sets.add(SetScore(2, pointsTeamASet2 ?? 0, pointsTeamBSet2 ?? 0, durationSet2));
    }
    if (pointsTeamASet3 != null || pointsTeamBSet3 != null) {
      sets.add(SetScore(3, pointsTeamASet3 ?? 0, pointsTeamBSet3 ?? 0, durationSet3));
    }
    return sets;
  }

  /// Time display (e.g., "14:30")
  String get timeDisplay {
    if (localTime.isEmpty) return '';
    // VIS time format: "14:30:00" -> "14:30"
    final parts = localTime.split(':');
    if (parts.length >= 2) return '${parts[0]}:${parts[1]}';
    return localTime;
  }

  /// Court display (e.g., "Court 1")
  String get courtDisplay {
    if (court.isEmpty) return '';
    return 'Court $court';
  }

  /// Is this match live/running?
  bool get isLive => displayStatus == MatchDisplayStatus.live;

  /// Is this match finished?
  bool get isFinished => displayStatus == MatchDisplayStatus.finished;

  Map<String, dynamic> toJson() => {
    'no': no,
    'noInTournament': noInTournament,
    'localDate': localDate,
    'localTime': localTime,
    'status': status,
    'court': court,
    'teamAName': teamAName,
    'teamBName': teamBName,
    'teamAFederationCode': teamAFederationCode,
    'teamBFederationCode': teamBFederationCode,
    'matchPointsA': matchPointsA,
    'matchPointsB': matchPointsB,
    'roundName': roundName,
    'round': round,
    'roundPhase': roundPhase,
    'referee1Name': referee1Name,
    'referee2Name': referee2Name,
    'referee1FederationCode': referee1FederationCode,
    'referee2FederationCode': referee2FederationCode,
    'refereeChallengeName': refereeChallengeName,
    'pointsTeamASet1': pointsTeamASet1,
    'pointsTeamBSet1': pointsTeamBSet1,
    'pointsTeamASet2': pointsTeamASet2,
    'pointsTeamBSet2': pointsTeamBSet2,
    'pointsTeamASet3': pointsTeamASet3,
    'pointsTeamBSet3': pointsTeamBSet3,
    'durationSet1': durationSet1,
    'durationSet2': durationSet2,
    'durationSet3': durationSet3,
    'resultType': resultType,
    'noEvent': noEvent,
    'gender': gender,
  };

  factory BeachMatch.fromJson(Map<String, dynamic> json) => BeachMatch(
    no: json['no'] as String? ?? '',
    noInTournament: json['noInTournament'] as String? ?? '',
    localDate: json['localDate'] as String? ?? '',
    localTime: json['localTime'] as String? ?? '',
    status: json['status'] as String? ?? '',
    court: json['court'] as String? ?? '',
    teamAName: json['teamAName'] as String? ?? '',
    teamBName: json['teamBName'] as String? ?? '',
    teamAFederationCode: json['teamAFederationCode'] as String? ?? '',
    teamBFederationCode: json['teamBFederationCode'] as String? ?? '',
    matchPointsA: json['matchPointsA'] as int?,
    matchPointsB: json['matchPointsB'] as int?,
    roundName: json['roundName'] as String? ?? '',
    round: json['round'] as String? ?? '',
    roundPhase: json['roundPhase'] as String? ?? '',
    referee1Name: json['referee1Name'] as String? ?? '',
    referee2Name: json['referee2Name'] as String? ?? '',
    referee1FederationCode: json['referee1FederationCode'] as String? ?? '',
    referee2FederationCode: json['referee2FederationCode'] as String? ?? '',
    refereeChallengeName: json['refereeChallengeName'] as String? ?? '',
    pointsTeamASet1: json['pointsTeamASet1'] as int?,
    pointsTeamBSet1: json['pointsTeamBSet1'] as int?,
    pointsTeamASet2: json['pointsTeamASet2'] as int?,
    pointsTeamBSet2: json['pointsTeamBSet2'] as int?,
    pointsTeamASet3: json['pointsTeamASet3'] as int?,
    pointsTeamBSet3: json['pointsTeamBSet3'] as int?,
    durationSet1: json['durationSet1'] as String? ?? '',
    durationSet2: json['durationSet2'] as String? ?? '',
    durationSet3: json['durationSet3'] as String? ?? '',
    resultType: json['resultType'] as String? ?? '',
    noEvent: json['noEvent'] as String? ?? '',
    gender: json['gender'] as String? ?? '',
  );
}

/// Set score tuple
class SetScore {
  final int setNumber;
  final int teamA;
  final int teamB;
  final String duration;
  const SetScore(this.setNumber, this.teamA, this.teamB, this.duration);
}

/// Display status enum
enum MatchDisplayStatus { live, scheduled, finished }

/// Maps VIS API status to display status.
/// VIS codes: 1=Scheduled, 2=ReadyToStart, 3-8=Running/LIVE, 9+=Finished
MatchDisplayStatus mapVisMatchStatus(String? visStatus) {
  if (visStatus == null || visStatus.isEmpty) return MatchDisplayStatus.scheduled;

  final numeric = int.tryParse(visStatus);
  if (numeric != null) {
    if (numeric >= 3 && numeric <= 8) return MatchDisplayStatus.live;
    if (numeric >= 9) return MatchDisplayStatus.finished;
    return MatchDisplayStatus.scheduled;
  }

  final s = visStatus.toLowerCase().trim();
  if (s == 'running' || s == 'live' || s == 'in_progress') {
    return MatchDisplayStatus.live;
  }
  if (s == 'finished' || s == 'completed' || s == 'final') {
    return MatchDisplayStatus.finished;
  }
  return MatchDisplayStatus.scheduled;
}

/// Check if a "ReadyToStart" match (status 2) can be considered live
/// based on court sequencing (previous match on same court is finished).
bool canReadyToStartGoLive(BeachMatch match, List<BeachMatch> allMatches) {
  final rawStatus = int.tryParse(match.status);
  if (rawStatus != 2) return false;
  if (match.teamAName == 'TBD' || match.teamBName == 'TBD') return false;

  final sameCourtMatches = allMatches
      .where((m) => m.court == match.court && m.no != match.no)
      .toList();

  // Sort by date+time descending to find previous match
  sameCourtMatches.sort((a, b) {
    final aKey = '${a.localDate} ${a.localTime}';
    final bKey = '${b.localDate} ${b.localTime}';
    return bKey.compareTo(aKey);
  });

  // Find matches before this one
  final matchKey = '${match.localDate} ${match.localTime}';
  final previous = sameCourtMatches
      .where((m) => '${m.localDate} ${m.localTime}'.compareTo(matchKey) < 0)
      .toList();

  if (previous.isEmpty) return true;

  // Check if the most recent previous match is finished
  final prevStatus = int.tryParse(previous.first.status);
  if (prevStatus != null) return prevStatus >= 9;
  return previous.first.isFinished;
}
