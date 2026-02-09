/// Tournament model from VIS API GetEventList
/// Note: VIS API returns Events, each containing 1-2 BeachTournaments (Men/Women)
/// - [no] = Event Number (from GetEventList)
/// - [tournamentNoMen] / [tournamentNoWomen] = real Tournament Numbers
///   (resolved via GetEvent → Content → BeachTournament entries)
class Tournament {
  /// Event Number from GetEventList (NOT the tournament number for matches!)
  final String no;
  final String name;
  final String city;
  final String countryCode;
  final String startDate;
  final String endDate;
  final String status;
  final String gender;

  /// Resolved real tournament number for Men (Gender=0)
  /// Set after calling GetEvent to resolve Content field
  final String? tournamentNoMen;

  /// Resolved real tournament number for Women (Gender=1)
  /// Set after calling GetEvent to resolve Content field
  final String? tournamentNoWomen;

  const Tournament({
    required this.no,
    required this.name,
    required this.city,
    required this.countryCode,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.gender,
    this.tournamentNoMen,
    this.tournamentNoWomen,
  });

  /// Create a copy with resolved tournament numbers
  Tournament withTournamentNos({
    String? tournamentNoMen,
    String? tournamentNoWomen,
  }) {
    return Tournament(
      no: no,
      name: name,
      city: city,
      countryCode: countryCode,
      startDate: startDate,
      endDate: endDate,
      status: status,
      gender: gender,
      tournamentNoMen: tournamentNoMen ?? this.tournamentNoMen,
      tournamentNoWomen: tournamentNoWomen ?? this.tournamentNoWomen,
    );
  }

  /// Whether tournament numbers have been resolved
  bool get hasResolvedNos =>
      tournamentNoMen != null || tournamentNoWomen != null;

  /// Get all resolved tournament numbers
  List<String> get allTournamentNos => [
        if (tournamentNoMen != null) tournamentNoMen!,
        if (tournamentNoWomen != null) tournamentNoWomen!,
      ];

  /// Gender display text
  String get genderText {
    if (tournamentNoMen != null && tournamentNoWomen != null) return 'MX';
    if (tournamentNoMen != null) return 'M';
    if (tournamentNoWomen != null) return 'W';
    switch (gender) {
      case '1':
      case 'M':
        return 'M';
      case '2':
      case 'W':
        return 'W';
      default:
        return gender.isEmpty ? 'MX' : gender;
    }
  }

  /// Date range display
  String get dateRange {
    final start = _formatDate(startDate);
    final end = _formatDate(endDate);
    if (start == end) return start;
    return '$start - $end';
  }

  /// Parse "2026-01-15" to "Jan 15"
  String _formatDate(String isoDate) {
    if (isoDate.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoDate);
      const months = [
        '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      return '${months[dt.month]} ${dt.day}';
    } catch (_) {
      return isoDate;
    }
  }

  /// Extract city from event name if not available from API
  /// e.g., "BPT Futures Mount Maunganui 2026" → "Mount Maunganui"
  String get displayCity {
    if (city.isNotEmpty && city != 'null') return city;
    return _extractCityFromName(name);
  }

  static String _extractCityFromName(String name) {
    // Remove common prefixes and year suffix
    var cleaned = name
        .replaceAll(RegExp(r'\b\d{4}\b'), '') // remove year
        .replaceAll(RegExp(r'^BPT\s+'), '')
        .replaceAll(RegExp(r'^(Elite|Challenge|Futures|World Tour|Grand Slam)\s+'), '')
        .replaceAll(RegExp(r'\s+(Men|Women|Mixed)\s*$'), '')
        .trim();
    return cleaned.isNotEmpty ? cleaned : name;
  }

  /// Month-year grouping key (e.g., "January 2026")
  String get monthYearKey {
    if (startDate.isEmpty) return 'Unknown';
    try {
      final dt = DateTime.parse(startDate);
      const months = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      return '${months[dt.month]} ${dt.year}';
    } catch (_) {
      return 'Unknown';
    }
  }

  /// Year from start date
  int? get year {
    if (startDate.isEmpty) return null;
    try {
      return DateTime.parse(startDate).year;
    } catch (_) {
      return null;
    }
  }

  Map<String, dynamic> toJson() => {
        'no': no,
        'name': name,
        'city': city,
        'countryCode': countryCode,
        'startDate': startDate,
        'endDate': endDate,
        'status': status,
        'gender': gender,
        'tournamentNoMen': tournamentNoMen,
        'tournamentNoWomen': tournamentNoWomen,
      };

  factory Tournament.fromJson(Map<String, dynamic> json) => Tournament(
        no: json['no'] as String? ?? '',
        name: json['name'] as String? ?? '',
        city: json['city'] as String? ?? '',
        countryCode: json['countryCode'] as String? ?? '',
        startDate: json['startDate'] as String? ?? '',
        endDate: json['endDate'] as String? ?? '',
        status: json['status'] as String? ?? '',
        gender: json['gender'] as String? ?? '',
        tournamentNoMen: json['tournamentNoMen'] as String?,
        tournamentNoWomen: json['tournamentNoWomen'] as String?,
      );
}

/// Result from resolving Event No → BeachTournament entries
class BeachTournamentEntry {
  final String tournamentNo;

  /// 0 = Men, 1 = Women
  final String gender;

  const BeachTournamentEntry({
    required this.tournamentNo,
    required this.gender,
  });

  bool get isMen => gender == '0';
  bool get isWomen => gender == '1';

  Map<String, dynamic> toJson() => {
        'tournamentNo': tournamentNo,
        'gender': gender,
      };
}
