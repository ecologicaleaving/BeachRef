class Tournament {
  final String id;
  final String visId;
  final String name;
  final String location;
  final DateTime startDate;
  final DateTime endDate;
  final String competitionLevel;
  final String tournamentType;
  final TournamentStatus status;
  final List<Team> teams;
  final DateTime lastUpdated;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Tournament({
    required this.id,
    required this.visId,
    required this.name,
    required this.location,
    required this.startDate,
    required this.endDate,
    required this.competitionLevel,
    required this.tournamentType,
    required this.status,
    required this.teams,
    required this.lastUpdated,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Tournament.fromJson(Map<String, dynamic> json) {
    return Tournament(
      id: json['id'] as String,
      visId: json['vis_id'] as String,
      name: json['name'] as String,
      location: json['location'] as String,
      startDate: DateTime.parse(json['start_date'] as String),
      endDate: DateTime.parse(json['end_date'] as String),
      competitionLevel: json['competition_level'] as String,
      tournamentType: json['tournament_type'] as String,
      status: TournamentStatus.fromString(json['status'] as String),
      teams: (json['teams'] as List<dynamic>?)
              ?.map((team) => Team.fromJson(team as Map<String, dynamic>))
              .toList() ??
          [],
      lastUpdated: json['last_updated'] != null
          ? DateTime.parse(json['last_updated'] as String)
          : DateTime.now(),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'vis_id': visId,
      'name': name,
      'location': location,
      'start_date': startDate.toIso8601String(),
      'end_date': endDate.toIso8601String(),
      'competition_level': competitionLevel,
      'tournament_type': tournamentType,
      'status': status.value,
      'teams': teams.map((team) => team.toJson()).toList(),
      'last_updated': lastUpdated.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  Tournament copyWith({
    String? id,
    String? visId,
    String? name,
    String? location,
    DateTime? startDate,
    DateTime? endDate,
    String? competitionLevel,
    String? tournamentType,
    TournamentStatus? status,
    List<Team>? teams,
    DateTime? lastUpdated,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Tournament(
      id: id ?? this.id,
      visId: visId ?? this.visId,
      name: name ?? this.name,
      location: location ?? this.location,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      competitionLevel: competitionLevel ?? this.competitionLevel,
      tournamentType: tournamentType ?? this.tournamentType,
      status: status ?? this.status,
      teams: teams ?? this.teams,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Tournament &&
        other.id == id &&
        other.visId == visId &&
        other.name == name &&
        other.location == location &&
        other.startDate == startDate &&
        other.endDate == endDate &&
        other.competitionLevel == competitionLevel &&
        other.tournamentType == tournamentType &&
        other.status == status &&
        other.teams.length == teams.length;
  }

  @override
  int get hashCode {
    return Object.hash(
      id,
      visId,
      name,
      location,
      startDate,
      endDate,
      competitionLevel,
      tournamentType,
      status,
      teams.length,
    );
  }

  @override
  String toString() {
    return 'Tournament(id: $id, visId: $visId, name: $name, location: $location, status: $status)';
  }
}

enum TournamentStatus {
  scheduled('scheduled'),
  active('active'),
  completed('completed'),
  cancelled('cancelled');

  const TournamentStatus(this.value);
  final String value;

  static TournamentStatus fromString(String value) {
    return TournamentStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => TournamentStatus.scheduled,
    );
  }
}

class Team {
  final String id;
  final String name;
  final List<String> players;

  const Team({
    required this.id,
    required this.name,
    required this.players,
  });

  factory Team.fromJson(Map<String, dynamic> json) {
    return Team(
      id: json['id'] as String,
      name: json['name'] as String,
      players: (json['players'] as List<dynamic>?)
              ?.map((player) => player as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'players': players,
    };
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Team &&
        other.id == id &&
        other.name == name &&
        _listEquals(other.players, players);
  }

  bool _listEquals<T>(List<T> a, List<T> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(id, name, players.length);

  @override
  String toString() => 'Team(id: $id, name: $name)';
}