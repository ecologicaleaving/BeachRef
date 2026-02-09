// End-to-end test: simulates the exact flow the Flutter app will use
// 1. GetEventList → filter by year → show tournaments
// 2. GetEvent(eventNo) → resolve Tournament Nos
// 3. GetBeachMatchList(tournamentNo) → show matches
import 'dart:io';
import 'dart:convert';

const baseUrl = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

Future<String> postXml(String xml) async {
  final client = HttpClient();
  final request = await client.postUrl(Uri.parse(baseUrl));
  request.headers.set('Content-Type', 'application/x-www-form-urlencoded');
  request.write('Request=${Uri.encodeComponent(xml)}');
  final response = await request.close();
  final body = await response.transform(utf8.decoder).join();
  client.close();
  return body;
}

Future<void> main() async {
  print('=== BeachRef Flutter API Flow Test ===\n');

  // ── STEP 1: GetEventList (no date filters - they're ignored) ──
  print('STEP 1: GetEventList');
  final listXml = '<Request Type="GetEventList" '
      'Fields="No Name City CountryCode StartDate EndDate Status Gender">'
      '<Filter HasBeachTournament="True" />'
      '</Request>';
  final listResp = await postXml(listXml);
  final allEvents = RegExp(r'<Event[^/]*/>', dotAll: true).allMatches(listResp);
  print('  Total events: ${allEvents.length}');

  // Client-side filter: only 2026
  final events2026 = <Map<String, String>>[];
  for (final e in allEvents) {
    final raw = e.group(0)!;
    final start = RegExp(r'StartDate="([^"]*)"').firstMatch(raw)?.group(1) ?? '';
    if (!start.startsWith('2026')) continue;
    events2026.add({
      'no': RegExp(r' No="(\d+)"').firstMatch(raw)?.group(1) ?? '',
      'name': RegExp(r'Name="([^"]*)"').firstMatch(raw)?.group(1) ?? '',
      'city': RegExp(r'City="([^"]*)"').firstMatch(raw)?.group(1) ?? '',
      'countryCode': RegExp(r'CountryCode="([^"]*)"').firstMatch(raw)?.group(1) ?? '',
      'startDate': start,
      'endDate': RegExp(r'EndDate="([^"]*)"').firstMatch(raw)?.group(1) ?? '',
      'status': RegExp(r'Status="([^"]*)"').firstMatch(raw)?.group(1) ?? '',
      'gender': RegExp(r'Gender="([^"]*)"').firstMatch(raw)?.group(1) ?? '',
    });
  }
  print('  2026 events (client-side filtered): ${events2026.length}');
  for (final ev in events2026.take(5)) {
    print('    Event ${ev['no']}: ${ev['name']} (${ev['startDate']} - ${ev['endDate']})');
  }

  // ── STEP 2: Resolve Event No → Tournament Nos ──
  print('\nSTEP 2: Resolve Event Nos → Tournament Nos');
  final firstEvent = events2026.first;
  final eventNo = firstEvent['no']!;
  print('  Resolving Event $eventNo (${firstEvent['name']})...');

  final eventXml = '<Request Type="GetEvent" No="$eventNo" Fields="No Name Content" />';
  final eventResp = await postXml(eventXml);
  final contentMatch = RegExp(r'Content="([^"]*)"').firstMatch(eventResp);

  final tournamentNos = <Map<String, String>>[];
  if (contentMatch != null) {
    final decoded = contentMatch.group(1)!
        .replaceAll('&lt;', '<').replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"').replaceAll('&#xD;', '').replaceAll('&#xA;', '');
    for (final bt in RegExp(r'<BeachTournament[^>]*No="(\d+)"[^>]*Gender="(\d)"').allMatches(decoded)) {
      tournamentNos.add({
        'no': bt.group(1)!,
        'gender': bt.group(2)! == '0' ? 'Men' : 'Women',
      });
    }
  }
  print('  Resolved tournament numbers:');
  for (final tn in tournamentNos) {
    print('    Tournament ${tn['no']} (${tn['gender']})');
  }

  // ── STEP 3: GetBeachMatchList with CORRECT Tournament No ──
  print('\nSTEP 3: GetBeachMatchList with correct Tournament No');
  for (final tn in tournamentNos) {
    final tNo = tn['no']!;
    final matchXml = '<Request Type="GetBeachMatchList" '
        'Fields="No NoInTournament LocalDate LocalTime Status Court '
        'TeamAName TeamBName MatchPointsA MatchPointsB RoundName '
        'Referee1Name Referee1FederationCode">'
        '<Filter NoTournament="$tNo" IncludeResults="True" IncludeReferees="True" />'
        '</Request>';
    final matchResp = await postXml(matchXml);
    final matchCount = RegExp(r'<BeachMatch ').allMatches(matchResp).length;
    print('\n  Tournament $tNo (${tn['gender']}): $matchCount matches');

    // Show first 5 matches
    int shown = 0;
    for (final m in RegExp(r'<BeachMatch[^/]*/>', dotAll: true).allMatches(matchResp)) {
      if (shown >= 5) break;
      final raw = m.group(0)!;
      final noInT = RegExp(r'NoInTournament="(\d+)"').firstMatch(raw)?.group(1) ?? '?';
      final teamA = RegExp(r'TeamAName="([^"]*)"').firstMatch(raw)?.group(1) ?? '?';
      final teamB = RegExp(r'TeamBName="([^"]*)"').firstMatch(raw)?.group(1) ?? '?';
      final date = RegExp(r'LocalDate="([^"]*)"').firstMatch(raw)?.group(1) ?? '?';
      final time = RegExp(r'LocalTime="([^"]*)"').firstMatch(raw)?.group(1) ?? '?';
      final status = RegExp(r'Status="(\d+)"').firstMatch(raw)?.group(1) ?? '?';
      final court = RegExp(r'Court="(\d+)"').firstMatch(raw)?.group(1) ?? '?';
      final ref = RegExp(r'Referee1Name="([^"]*)"').firstMatch(raw)?.group(1) ?? '';
      print('    #$noInT: $teamA vs $teamB | $date $time | C$court | Status=$status${ref.isNotEmpty ? " | Ref: $ref" : ""}');
      shown++;
    }
  }

  // ── STEP 4: Verify match dates match tournament dates ──
  print('\nSTEP 4: Verification');
  print('  Tournament: ${firstEvent['name']}');
  print('  Tournament dates: ${firstEvent['startDate']} - ${firstEvent['endDate']}');
  // Check first match date
  if (tournamentNos.isNotEmpty) {
    final tNo = tournamentNos.first['no']!;
    final matchXml = '<Request Type="GetBeachMatchList" Fields="No LocalDate">'
        '<Filter NoTournament="$tNo" />'
        '</Request>';
    final matchResp = await postXml(matchXml);
    final dates = <String>{};
    for (final m in RegExp(r'LocalDate="([^"]*)"').allMatches(matchResp)) {
      dates.add(m.group(1)!);
    }
    final sortedDates = dates.toList()..sort();
    print('  Match dates found: ${sortedDates.join(', ')}');
    final matchesInRange = sortedDates.every((d) =>
        d.compareTo(firstEvent['startDate']!) >= 0 &&
        d.compareTo(firstEvent['endDate']!) <= 0);
    print('  All matches within tournament date range: ${matchesInRange ? "YES" : "NO - CHECK THIS"}');
  }

  print('\n=== FLOW TEST COMPLETE ===');
}
