import 'package:dio/dio.dart';
import 'package:xml/xml.dart';
import '../../features/tournament/models/tournament.dart';
import '../../features/match/models/beach_match.dart';
import '../../features/match/models/beach_live.dart';
import 'dio_client.dart';

/// VIS API client - ported from BeachRef/services/api/VisApiClient.ts
///
/// IMPORTANT: VIS API quirks verified by actual testing:
/// - GetEventList IGNORES date filters (returns ALL ~815 events from 2011+)
///   → Must filter client-side by year from StartDate
/// - GetEventList returns Event Numbers (not Tournament Numbers)
/// - GetBeachMatchList requires Tournament Numbers (not Event Numbers)
/// - To resolve: call GetEvent(eventNo) → Content field contains
///   <BeachTournament No="xxx" Gender="0/1"/> entries
/// - Each Event typically has 2 BeachTournaments (Men=Gender 0, Women=Gender 1)
class VisApiClient {
  final Dio _dio;

  VisApiClient({Dio? dio}) : _dio = dio ?? DioClient.instance;

  // ──────────────────────────────────────────────
  // GetEventList - Tournament/Event list
  // NOTE: Date filters are IGNORED by the API.
  // Client-side filtering by year is mandatory.
  // ──────────────────────────────────────────────

  Future<List<Tournament>> getEventList({
    List<String>? fields,
  }) async {
    final f = fields ?? _eventListSlimFields;
    final xml = '<Request Type="GetEventList" Fields="${_esc(f.join(' '))}">'
        '<Filter HasBeachTournament="True" />'
        '</Request>';

    final responseXml = await _post(xml);
    return _parseEventList(responseXml);
  }

  // ──────────────────────────────────────────────
  // GetEvent - Single event detail (to resolve Tournament Nos)
  // Returns Content field with embedded BeachTournament entries
  // ──────────────────────────────────────────────

  Future<List<BeachTournamentEntry>> resolveBeachTournamentNos(
      String eventNo) async {
    final xml =
        '<Request Type="GetEvent" No="${_esc(eventNo)}" Fields="No Name Content" />';
    final responseXml = await _post(xml);
    return _parseBeachTournamentEntries(responseXml);
  }

  // ──────────────────────────────────────────────
  // GetEventRefereeList - All referees assigned to an event
  // Returns the full roster even for unplayed tournaments
  // ──────────────────────────────────────────────

  Future<List<EventReferee>> getEventRefereeList(String eventNo) async {
    final xml =
        '<Requests>'
        '<Request Type="GetEventRefereeList" '
        'Fields="NoReferee FirstName LastName FederationCode Gender Type">'
        '<Filter NoEvent="${_esc(eventNo)}" />'
        '</Request>'
        '</Requests>';
    final responseXml = await _post(xml);
    return _parseEventRefereeList(responseXml);
  }

  // ──────────────────────────────────────────────
  // GetBeachMatchList - Match list for a tournament
  // IMPORTANT: tournamentNo must be the REAL tournament number
  // (from BeachTournament entry), NOT the Event number!
  // ──────────────────────────────────────────────

  Future<List<BeachMatch>> getBeachMatchList({
    required String tournamentNo,
    List<String>? fields,
  }) async {
    final f = fields ?? _matchListFields;
    final xml = '<Request Type="GetBeachMatchList" Fields="${f.join(' ')}">'
        '<Filter NoTournament="${_esc(tournamentNo)}" '
        'IncludeResults="True" IncludeReferees="True" />'
        '</Request>';

    final responseXml = await _post(xml);
    return _parseMatchList(responseXml);
  }

  // ──────────────────────────────────────────────
  // GetBeachMatch - Single match detail
  // ──────────────────────────────────────────────

  Future<BeachMatch?> getBeachMatch({required String matchNo}) async {
    final xml = '<Request Type="GetBeachMatch" No="${_esc(matchNo)}" '
        'Fields="${_matchDetailFields.join(' ')}" />';
    final responseXml = await _post(xml);
    final matches = _parseMatchList(responseXml);
    return matches.isNotEmpty ? matches.first : null;
  }

  // ──────────────────────────────────────────────
  // GetBeachLive - Live score with version polling
  // ──────────────────────────────────────────────

  Future<BeachLiveResponse> getBeachLive({
    required int matchNo,
    int? version,
  }) async {
    final attrs = <String>[
      'No="${_esc(matchNo.toString())}"',
      if (version != null) 'Version="${_esc(version.toString())}"',
    ];

    final xml = '<Request Type="GetBeachLive" ${attrs.join(' ')} />';
    final responseXml = await _post(xml);
    return _parseBeachLive(responseXml);
  }

  // ──────────────────────────────────────────────
  // HTTP execution
  // ──────────────────────────────────────────────

  Future<String> _post(String xmlRequest) async {
    final body = 'Request=${Uri.encodeComponent(xmlRequest)}';
    final response = await _dio.post('', data: body);
    final text = response.data as String;

    if (_containsVisError(text)) {
      throw VisApiException(_parseVisError(text));
    }

    return text;
  }

  // ──────────────────────────────────────────────
  // XML Parsing - Events
  // ──────────────────────────────────────────────

  List<Tournament> _parseEventList(String xml) {
    final doc = XmlDocument.parse(xml);
    // GetEventList returns <Event .../> elements (not <BeachTournament>)
    final events = doc.findAllElements('Event').toList();
    return events.map(_xmlToTournament).toList();
  }

  Tournament _xmlToTournament(XmlElement el) {
    return Tournament(
      no: _attr(el, 'No'),
      name: _attr(el, 'Name'),
      city: _attr(el, 'City'), // Often empty; displayCity extracts from name
      countryCode: _attr(el, 'CountryCode'),
      startDate: _attr(el, 'StartDate'),
      endDate: _attr(el, 'EndDate'),
      status: _attr(el, 'Status'),
      gender: _attr(el, 'Gender'), // Often empty at event level; resolved later
    );
  }

  // ──────────────────────────────────────────────
  // XML Parsing - BeachTournament entries from GetEvent Content
  // ──────────────────────────────────────────────

  List<BeachTournamentEntry> _parseBeachTournamentEntries(String xml) {
    // GetEvent response: <Event No="..." Content="&lt;Event&gt;...&lt;/Event&gt;" />
    // The Content field contains HTML-encoded XML with BeachTournament entries
    final doc = XmlDocument.parse(xml);
    final eventEl = doc.findAllElements('Event').firstOrNull;
    if (eventEl == null) return [];

    final content = _attr(eventEl, 'Content');
    if (content.isEmpty) return [];

    // Decode HTML entities
    final decoded = content
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&apos;', "'")
        .replaceAll('&#xD;', '')
        .replaceAll('&#xA;', '');

    // Extract BeachTournament entries via regex (safer than XML parsing for fragments)
    final entries = <BeachTournamentEntry>[];
    final regex = RegExp(r'<BeachTournament[^>]*No="(\d+)"[^>]*Gender="(\d)"');
    for (final match in regex.allMatches(decoded)) {
      entries.add(BeachTournamentEntry(
        tournamentNo: match.group(1)!,
        gender: match.group(2)!,
      ));
    }

    return entries;
  }

  // ──────────────────────────────────────────────
  // XML Parsing - EventRefereeList
  // ──────────────────────────────────────────────

  List<EventReferee> _parseEventRefereeList(String xml) {
    final doc = XmlDocument.parse(xml);
    // VIS API returns <EventReferee> elements (not <Referee>)
    final referees = doc.findAllElements('EventReferee').toList();
    // Deduplicate by NoReferee (old tournaments may return duplicates)
    final seen = <String>{};
    return referees
        .map((el) => EventReferee(
              no: _attr(el, 'NoReferee'),
              firstName: _attr(el, 'FirstName'),
              lastName: _attr(el, 'LastName'),
              federationCode: _attr(el, 'FederationCode'),
              gender: _attr(el, 'Gender'),
              type: _attr(el, 'Type').isEmpty ? '1' : _attr(el, 'Type'),
            ))
        .where((r) => r.firstName.isNotEmpty || r.lastName.isNotEmpty)
        .where((r) => r.no.isEmpty || seen.add(r.no))
        .toList();
  }

  // ──────────────────────────────────────────────
  // XML Parsing - Matches
  // ──────────────────────────────────────────────

  List<BeachMatch> _parseMatchList(String xml) {
    final doc = XmlDocument.parse(xml);
    final matches = doc.findAllElements('BeachMatch').toList();
    return matches.map(_xmlToMatch).toList();
  }

  BeachMatch _xmlToMatch(XmlElement el) {
    return BeachMatch(
      no: _attr(el, 'No'),
      noInTournament: _attr(el, 'NoInTournament'),
      localDate: _attr(el, 'LocalDate'),
      localTime: _attr(el, 'LocalTime'),
      status: _attr(el, 'Status'),
      court: _attr(el, 'Court'),
      teamAName: _attr(el, 'TeamAName'),
      teamBName: _attr(el, 'TeamBName'),
      teamAFederationCode: _attr(el, 'TeamAFederationCode'),
      teamBFederationCode: _attr(el, 'TeamBFederationCode'),
      matchPointsA: _intAttr(el, 'MatchPointsA'),
      matchPointsB: _intAttr(el, 'MatchPointsB'),
      roundName: _attr(el, 'RoundName'),
      round: _attr(el, 'Round'),
      roundPhase: _attr(el, 'RoundPhase'),
      referee1Name: _attr(el, 'Referee1Name'),
      referee2Name: _attr(el, 'Referee2Name'),
      referee1FederationCode: _attr(el, 'Referee1FederationCode'),
      referee2FederationCode: _attr(el, 'Referee2FederationCode'),
      refereeChallengeName: _attr(el, 'RefereeChallengeName'),
      pointsTeamASet1: _intAttr(el, 'PointsTeamASet1'),
      pointsTeamBSet1: _intAttr(el, 'PointsTeamBSet1'),
      pointsTeamASet2: _intAttr(el, 'PointsTeamASet2'),
      pointsTeamBSet2: _intAttr(el, 'PointsTeamBSet2'),
      pointsTeamASet3: _intAttr(el, 'PointsTeamASet3'),
      pointsTeamBSet3: _intAttr(el, 'PointsTeamBSet3'),
      durationSet1: _attr(el, 'DurationSet1'),
      durationSet2: _attr(el, 'DurationSet2'),
      durationSet3: _attr(el, 'DurationSet3'),
      resultType: _attr(el, 'ResultType'),
      noEvent: _attr(el, 'NoEvent'),
    );
  }

  // ──────────────────────────────────────────────
  // XML Parsing - BeachLive
  // ──────────────────────────────────────────────

  BeachLiveResponse _parseBeachLive(String xml) {
    final doc = XmlDocument.parse(xml);

    // Check for NoChanges
    final noChanges = doc.findAllElements('NoChanges');
    if (noChanges.isNotEmpty) {
      final text = noChanges.first.innerText.trim().toLowerCase();
      if (text == 'true' || text == '1') {
        return BeachLiveResponse.noChanges();
      }
    }

    final root = doc.rootElement;
    final matchEl = root.findElements('BeachMatch').firstOrNull ?? root;

    // Parse sets
    final sets = <BeachLiveSet>[];
    for (var i = 1; i <= 3; i++) {
      final ptA = _intAttr(matchEl, 'PointsTeamASet$i');
      final ptB = _intAttr(matchEl, 'PointsTeamBSet$i');
      if (ptA != null || ptB != null) {
        sets.add(BeachLiveSet(
          setNumber: i,
          pointsTeamA: ptA ?? 0,
          pointsTeamB: ptB ?? 0,
          duration: _attr(matchEl, 'DurationSet$i'),
        ));
      }
    }

    return BeachLiveResponse(
      hasChanges: true,
      version: _intAttr(root, 'Version') ?? 0,
      matchPointsA: _intAttr(matchEl, 'MatchPointsA') ?? 0,
      matchPointsB: _intAttr(matchEl, 'MatchPointsB') ?? 0,
      status: _attr(matchEl, 'Status'),
      sets: sets,
      teamAName: _attr(matchEl, 'TeamAName'),
      teamBName: _attr(matchEl, 'TeamBName'),
      teamAFederationCode: _attr(matchEl, 'TeamAFederationCode'),
      teamBFederationCode: _attr(matchEl, 'TeamBFederationCode'),
      court: _attr(matchEl, 'Court'),
      roundName: _attr(matchEl, 'RoundName'),
    );
  }

  // ──────────────────────────────────────────────
  // Error handling
  // ──────────────────────────────────────────────

  bool _containsVisError(String text) {
    return text.contains('<BadRequestSyntax') ||
        text.contains('<AccessDenied') ||
        text.contains('<InternalError') ||
        text.contains('<ServiceUnavailable') ||
        text.contains('<RateLimitExceeded') ||
        text.contains('<Error');
  }

  String _parseVisError(String text) {
    if (text.contains('<BadRequestSyntax')) return 'Invalid XML request syntax';
    if (text.contains('<AccessDenied')) return 'Access denied';
    if (text.contains('<InternalError')) return 'VIS API internal error';
    if (text.contains('<ServiceUnavailable')) return 'VIS API unavailable';
    if (text.contains('<RateLimitExceeded')) return 'Rate limit exceeded';

    final match = RegExp(r'<Error[^>]*>([^<]*)</Error>').firstMatch(text);
    return match?.group(1) ?? 'Unknown VIS API error';
  }

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────

  String _attr(XmlElement el, String name) {
    return el.getAttribute(name) ?? '';
  }

  int? _intAttr(XmlElement el, String name) {
    final val = el.getAttribute(name);
    if (val == null || val.isEmpty) return null;
    return int.tryParse(val);
  }

  String _esc(String value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
  }

  // ──────────────────────────────────────────────
  // Field lists (slim mode for list views)
  // ──────────────────────────────────────────────

  /// Minimal fields for event list (~94 KB vs 108 KB)
  /// City is rarely populated by VIS API; we extract it from Name instead.
  static const _eventListSlimFields = [
    'No', 'Name', 'CountryCode',
    'StartDate', 'EndDate', 'Status',
  ];

  /// Fields for match LIST view — includes referees + set scores so that:
  /// 1. Officials are visible in the match list (like the webapp)
  /// 2. Supabase shared cache stores complete data for other users
  static const _matchListFields = [
    'No', 'NoInTournament', 'LocalDate', 'LocalTime', 'Status', 'Court',
    'TeamAName', 'TeamBName', 'TeamAFederationCode', 'TeamBFederationCode',
    'MatchPointsA', 'MatchPointsB', 'RoundName',
    'Referee1Name', 'Referee2Name',
    'Referee1FederationCode', 'Referee2FederationCode',
    'PointsTeamASet1', 'PointsTeamBSet1',
    'PointsTeamASet2', 'PointsTeamBSet2',
    'PointsTeamASet3', 'PointsTeamBSet3',
    'DurationSet1', 'DurationSet2', 'DurationSet3',
  ];

  /// Full fields for single match DETAIL view (on-demand only)
  static const _matchDetailFields = [
    'No', 'NoInTournament', 'LocalDate', 'LocalTime', 'Status', 'Court',
    'TeamAName', 'TeamBName', 'TeamAFederationCode', 'TeamBFederationCode',
    'MatchPointsA', 'MatchPointsB', 'RoundName', 'Round', 'RoundPhase',
    'Referee1Name', 'Referee2Name', 'Referee1FederationCode',
    'Referee2FederationCode', 'RefereeChallengeName',
    'PointsTeamASet1', 'PointsTeamBSet1',
    'PointsTeamASet2', 'PointsTeamBSet2',
    'PointsTeamASet3', 'PointsTeamBSet3',
    'DurationSet1', 'DurationSet2', 'DurationSet3',
    'ResultType', 'NoEvent',
  ];
}

class EventReferee {
  final String no;
  final String firstName;
  final String lastName;
  final String federationCode;
  final String gender;

  /// VIS Type: "1" = Referee, "4" = Challenge Referee
  final String type;

  const EventReferee({
    required this.no,
    required this.firstName,
    required this.lastName,
    required this.federationCode,
    required this.gender,
    required this.type,
  });

  String get fullName {
    if (lastName.isNotEmpty && firstName.isNotEmpty) {
      return '$lastName, ${firstName[0]}.';
    }
    return '$lastName $firstName'.trim();
  }

  bool get isChallengeReferee => type == '4';
  bool get isMale => gender == '0';

  Map<String, dynamic> toJson() => {
    'no': no,
    'firstName': firstName,
    'lastName': lastName,
    'federationCode': federationCode,
    'gender': gender,
    'type': type,
  };

  factory EventReferee.fromJson(Map<String, dynamic> json) => EventReferee(
    no: json['no']?.toString() ?? '',
    firstName: json['firstName']?.toString() ?? '',
    lastName: json['lastName']?.toString() ?? '',
    federationCode: json['federationCode']?.toString() ?? '',
    gender: json['gender']?.toString() ?? '',
    type: json['type']?.toString() ?? '1',
  );
}

class VisApiException implements Exception {
  final String message;
  const VisApiException(this.message);

  @override
  String toString() => 'VisApiException: $message';
}
