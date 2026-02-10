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
  bool get isLive => displayStatus.isLive;

  /// Is this match finished?
  bool get isFinished => displayStatus.isFinished;

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

/// Display status enum — granular VIS match statuses for beach volleyball.
enum MatchDisplayStatus {
  scheduled,       // VIS 1
  readyToStart,    // VIS 2
  inSet1,          // VIS 3
  set1Finished,    // VIS 4
  inSet2,          // VIS 5
  set2Finished,    // VIS 6
  inSet3,          // VIS 7
  set3Finished,    // VIS 8
  finished,        // VIS 12
  officialResult,  // VIS 13
  corrected,       // VIS 14
  closed,          // VIS 15
}

/// Convenience getters for grouping granular statuses.
extension MatchDisplayStatusX on MatchDisplayStatus {
  /// True for any in-play or between-set status (inSet1..set3Finished).
  bool get isLive {
    switch (this) {
      case MatchDisplayStatus.inSet1:
      case MatchDisplayStatus.set1Finished:
      case MatchDisplayStatus.inSet2:
      case MatchDisplayStatus.set2Finished:
      case MatchDisplayStatus.inSet3:
      case MatchDisplayStatus.set3Finished:
        return true;
      default:
        return false;
    }
  }

  /// True for any finished/post-match status.
  bool get isFinished {
    switch (this) {
      case MatchDisplayStatus.finished:
      case MatchDisplayStatus.officialResult:
      case MatchDisplayStatus.corrected:
      case MatchDisplayStatus.closed:
        return true;
      default:
        return false;
    }
  }

  /// True for pre-match statuses.
  bool get isScheduled {
    switch (this) {
      case MatchDisplayStatus.scheduled:
      case MatchDisplayStatus.readyToStart:
        return true;
      default:
        return false;
    }
  }

  /// Human-readable label for UI display.
  String get displayLabel {
    switch (this) {
      case MatchDisplayStatus.scheduled:
        return 'SCHEDULED';
      case MatchDisplayStatus.readyToStart:
        return 'READY';
      case MatchDisplayStatus.inSet1:
        return 'IN SET 1';
      case MatchDisplayStatus.set1Finished:
        return 'SET 1 DONE';
      case MatchDisplayStatus.inSet2:
        return 'IN SET 2';
      case MatchDisplayStatus.set2Finished:
        return 'SET 2 DONE';
      case MatchDisplayStatus.inSet3:
        return 'IN SET 3';
      case MatchDisplayStatus.set3Finished:
        return 'SET 3 DONE';
      case MatchDisplayStatus.finished:
        return 'FINISHED';
      case MatchDisplayStatus.officialResult:
        return 'OFFICIAL';
      case MatchDisplayStatus.corrected:
        return 'CORRECTED';
      case MatchDisplayStatus.closed:
        return 'CLOSED';
    }
  }

  /// Recommended polling interval for this status.
  Duration get pollingInterval {
    if (isLive) return const Duration(seconds: 5);
    if (this == MatchDisplayStatus.readyToStart) return const Duration(seconds: 15);
    if (isScheduled) return const Duration(seconds: 60);
    return Duration.zero; // finished — no polling
  }
}

/// Maps VIS API status to display status.
/// VIS codes: 1=Scheduled, 2=ReadyToStart, 3=InSet1, 4=Set1Finished,
/// 5=InSet2, 6=Set2Finished, 7=InSet3, 8=Set3Finished,
/// 12=Finished, 13=OfficialResult, 14=Corrected, 15=Closed
MatchDisplayStatus mapVisMatchStatus(String? visStatus) {
  if (visStatus == null || visStatus.isEmpty) return MatchDisplayStatus.scheduled;

  final numeric = int.tryParse(visStatus);
  if (numeric != null) {
    switch (numeric) {
      case 1:  return MatchDisplayStatus.scheduled;
      case 2:  return MatchDisplayStatus.readyToStart;
      case 3:  return MatchDisplayStatus.inSet1;
      case 4:  return MatchDisplayStatus.set1Finished;
      case 5:  return MatchDisplayStatus.inSet2;
      case 6:  return MatchDisplayStatus.set2Finished;
      case 7:  return MatchDisplayStatus.inSet3;
      case 8:  return MatchDisplayStatus.set3Finished;
      case 12: return MatchDisplayStatus.finished;
      case 13: return MatchDisplayStatus.officialResult;
      case 14: return MatchDisplayStatus.corrected;
      case 15: return MatchDisplayStatus.closed;
      default:
        // 9-11 are indoor-specific; treat as finished for beach
        if (numeric >= 9) return MatchDisplayStatus.finished;
        return MatchDisplayStatus.scheduled;
    }
  }

  final s = visStatus.toLowerCase().trim();
  if (s == 'running' || s == 'live' || s == 'in_progress') {
    return MatchDisplayStatus.inSet1;
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
