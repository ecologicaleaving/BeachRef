// Script to verify each VIS API endpoint individually
// Run: dart run scripts/test_api.dart
import 'dart:io';
import 'dart:convert';

const baseUrl = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

Future<String> postXml(String xml) async {
  final client = HttpClient();
  final request = await client.postUrl(Uri.parse(baseUrl));
  request.headers.set('Content-Type', 'application/x-www-form-urlencoded');
  final body = 'Request=${Uri.encodeComponent(xml)}';
  request.write(body);
  final response = await request.close();
  final responseBody = await response.transform(utf8.decoder).join();
  client.close();
  return responseBody;
}

Future<void> test1_getEventList() async {
  print('=' * 60);
  print('TEST 1: GetEventList (tournaments)');
  print('=' * 60);

  final xml = '<Request Type="GetEventList" Fields="No Name City CountryCode StartDate EndDate Status Gender">'
      '<Filter HasBeachTournament="True" />'
      '</Request>';

  print('Request: $xml\n');
  final response = await postXml(xml);

  // Count events
  final eventCount = RegExp(r'<Event ').allMatches(response).length;
  print('Total events returned: $eventCount');

  // Show first 3 events
  final events = RegExp(r'<Event[^/]*/>', dotAll: true).allMatches(response).take(5);
  for (final e in events) {
    print('  ${e.group(0)!.substring(0, (e.group(0)!.length).clamp(0, 200))}...');
  }

  // Check year distribution
  final years = <String, int>{};
  for (final m in RegExp(r'StartDate="(\d{4})').allMatches(response)) {
    final year = m.group(1)!;
    years[year] = (years[year] ?? 0) + 1;
  }
  print('\nEvents by year:');
  final sortedYears = years.keys.toList()..sort();
  for (final y in sortedYears) {
    print('  $y: ${years[y]}');
  }

  // Check 2026 events specifically
  final events2026 = RegExp(r'<Event[^>]*StartDate="2026[^"]*"[^/]*/>').allMatches(response);
  print('\n2026 events: ${events2026.length}');
  for (final e in events2026.take(3)) {
    final noMatch = RegExp(r'No="(\d+)"').firstMatch(e.group(0)!);
    final nameMatch = RegExp(r'Name="([^"]*)"').firstMatch(e.group(0)!);
    final cityMatch = RegExp(r'City="([^"]*)"').firstMatch(e.group(0)!);
    final startMatch = RegExp(r'StartDate="([^"]*)"').firstMatch(e.group(0)!);
    print('  Event No=${noMatch?.group(1)}, Name=${nameMatch?.group(1)}, '
        'City=${cityMatch?.group(1)}, Start=${startMatch?.group(1)}');
  }
}

Future<void> test2_getEvent() async {
  print('\n${'=' * 60}');
  print('TEST 2: GetEvent (resolve Event No -> Tournament No)');
  print('=' * 60);

  // First get a 2026 event No
  final listXml = '<Request Type="GetEventList" Fields="No Name City StartDate">'
      '<Filter HasBeachTournament="True" />'
      '</Request>';
  final listResponse = await postXml(listXml);

  // Find a 2026 event
  final event2026 = RegExp(r'<Event[^>]*No="(\d+)"[^>]*StartDate="2026[^"]*"[^/]*/>').firstMatch(listResponse);
  if (event2026 == null) {
    print('ERROR: No 2026 event found!');
    return;
  }
  final eventNo = event2026.group(1)!;
  final nameMatch = RegExp(r'Name="([^"]*)"').firstMatch(event2026.group(0)!);
  print('Using Event No: $eventNo (${nameMatch?.group(1)})');

  // Call GetEvent to get Content field with BeachTournament entries
  final eventXml = '<Request Type="GetEvent" No="$eventNo" Fields="No Name Content" />';
  print('Request: $eventXml\n');
  final response = await postXml(eventXml);

  // Show raw response (truncated)
  print('Response (first 500 chars): ${response.substring(0, response.length.clamp(0, 500))}');

  // Extract Content field
  final contentMatch = RegExp(r'Content="([^"]*)"').firstMatch(response);
  if (contentMatch != null) {
    final content = contentMatch.group(1)!
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&apos;', "'");
    print('\nDecoded Content: ${content.substring(0, content.length.clamp(0, 500))}');

    // Extract BeachTournament entries
    final btMatches = RegExp(r'<BeachTournament[^>]*No="(\d+)"[^>]*Gender="(\d)"[^>]*/>').allMatches(content);
    print('\nBeachTournament entries found: ${btMatches.length}');
    for (final bt in btMatches) {
      print('  Tournament No: ${bt.group(1)}, Gender: ${bt.group(2)} (${bt.group(2) == "0" ? "Men" : "Women"})');
    }
  } else {
    print('WARNING: No Content field found in response!');
    // Try alternate approach - check for BeachTournament elements directly
    final btDirect = RegExp(r'<BeachTournament[^>]*No="(\d+)"').allMatches(response);
    print('Direct BeachTournament elements: ${btDirect.length}');
    for (final bt in btDirect) {
      print('  Tournament No: ${bt.group(1)}');
    }
  }
}

Future<void> test3_getBeachMatchList(String tournamentNo) async {
  print('\n${'=' * 60}');
  print('TEST 3: GetBeachMatchList (matches for tournament)');
  print('=' * 60);

  final xml = '<Request Type="GetBeachMatchList" '
      'Fields="No NoInTournament LocalDate LocalTime Status Court '
      'TeamAName TeamBName TeamAFederationCode TeamBFederationCode '
      'MatchPointsA MatchPointsB RoundName Referee1Name">'
      '<Filter NoTournament="$tournamentNo" IncludeResults="True" IncludeReferees="True" />'
      '</Request>';

  print('Request with NoTournament="$tournamentNo"');
  final response = await postXml(xml);

  if (response.contains('<BadRequestSyntax') || response.contains('<Error')) {
    print('ERROR: ${response.substring(0, response.length.clamp(0, 300))}');
    return;
  }

  final matchCount = RegExp(r'<BeachMatch ').allMatches(response).length;
  print('Total matches returned: $matchCount');

  // Show first 3 matches
  final matches = RegExp(r'<BeachMatch[^/]*/>', dotAll: true).allMatches(response).take(3);
  for (final m in matches) {
    final raw = m.group(0)!;
    final no = RegExp(r' No="(\d+)"').firstMatch(raw)?.group(1);
    final noInT = RegExp(r'NoInTournament="(\d+)"').firstMatch(raw)?.group(1);
    final teamA = RegExp(r'TeamAName="([^"]*)"').firstMatch(raw)?.group(1);
    final teamB = RegExp(r'TeamBName="([^"]*)"').firstMatch(raw)?.group(1);
    final status = RegExp(r'Status="(\d+)"').firstMatch(raw)?.group(1);
    final date = RegExp(r'LocalDate="([^"]*)"').firstMatch(raw)?.group(1);
    print('  Match #$noInT (No=$no): $teamA vs $teamB, Status=$status, Date=$date');
  }
}

Future<void> test4_wrongTournamentNo() async {
  print('\n${'=' * 60}');
  print('TEST 4: GetBeachMatchList with EVENT No (wrong - should fail or return wrong data)');
  print('=' * 60);

  // Use an Event No instead of Tournament No
  final listXml = '<Request Type="GetEventList" Fields="No Name">'
      '<Filter HasBeachTournament="True" />'
      '</Request>';
  final listResponse = await postXml(listXml);
  final event2026 = RegExp(r'<Event[^>]*No="(\d+)"[^>]*StartDate="2026[^"]*"').firstMatch(listResponse);
  if (event2026 == null) return;
  final eventNo = event2026.group(1)!;
  print('Using Event No $eventNo as Tournament No (WRONG!)');

  final xml = '<Request Type="GetBeachMatchList" '
      'Fields="No NoInTournament TeamAName TeamBName Status">'
      '<Filter NoTournament="$eventNo" />'
      '</Request>';

  final response = await postXml(xml);
  final matchCount = RegExp(r'<BeachMatch ').allMatches(response).length;
  print('Matches returned: $matchCount');

  if (matchCount > 0) {
    print('WARNING: Got matches using Event No - these may be wrong matches!');
    final firstMatch = RegExp(r'<BeachMatch[^/]*/>').firstMatch(response);
    if (firstMatch != null) {
      print('  First match: ${firstMatch.group(0)!.substring(0, firstMatch.group(0)!.length.clamp(0, 200))}');
    }
  } else if (response.contains('<BadRequestSyntax') || response.contains('<Error')) {
    print('RESULT: API returned error (expected - Event No != Tournament No)');
  } else {
    print('RESULT: Empty response (expected - no tournament with that number)');
  }
}

Future<void> main() async {
  print('VIS API Verification Tests');
  print('Time: ${DateTime.now()}\n');

  try {
    await test1_getEventList();
    await test2_getEvent();

    // Test 3 will use the tournament No from test 2
    // But let's also test with a known value
    print('\n--- Testing GetBeachMatchList with a known tournament ---');
    // We'll discover the right number from test 2
    // For now, test with a small known number
    await test3_getBeachMatchList('502');

    await test4_wrongTournamentNo();
  } catch (e, st) {
    print('ERROR: $e');
    print(st);
  }

  print('\n${'=' * 60}');
  print('ALL TESTS COMPLETE');
  print('=' * 60);
}
