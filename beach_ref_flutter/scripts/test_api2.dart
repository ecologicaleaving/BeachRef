// Test 2: Verify GetBeachMatchList with correct vs wrong numbers
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
  print('VIS API Verification - Tournament No Resolution\n');

  // ─── Test A: GetBeachMatchList with CORRECT Tournament No (8940 = Men) ───
  print('TEST A: GetBeachMatchList with CORRECT Tournament No=8940 (Men, Mount Maunganui 2026)');
  final xmlA = '<Request Type="GetBeachMatchList" '
      'Fields="No NoInTournament LocalDate LocalTime Status Court TeamAName TeamBName MatchPointsA MatchPointsB RoundName">'
      '<Filter NoTournament="8940" IncludeResults="True" />'
      '</Request>';
  final respA = await postXml(xmlA);
  final countA = RegExp(r'<BeachMatch ').allMatches(respA).length;
  print('  Matches: $countA');
  if (respA.contains('<BadRequest') || respA.contains('<Error')) {
    print('  ERROR: ${respA.substring(0, 300)}');
  }
  // Show first 3
  for (final m in RegExp(r'<BeachMatch[^/]*/>', dotAll: true).allMatches(respA).take(3)) {
    final raw = m.group(0)!;
    final noInT = RegExp(r'NoInTournament="(\d+)"').firstMatch(raw)?.group(1);
    final teamA = RegExp(r'TeamAName="([^"]*)"').firstMatch(raw)?.group(1);
    final teamB = RegExp(r'TeamBName="([^"]*)"').firstMatch(raw)?.group(1);
    final date = RegExp(r'LocalDate="([^"]*)"').firstMatch(raw)?.group(1);
    final status = RegExp(r'Status="(\d+)"').firstMatch(raw)?.group(1);
    print('  #$noInT: $teamA vs $teamB (Date=$date, Status=$status)');
  }

  // ─── Test B: GetBeachMatchList with WRONG Event No (1715) ───
  print('\nTEST B: GetBeachMatchList with WRONG Event No=1715');
  final xmlB = '<Request Type="GetBeachMatchList" '
      'Fields="No NoInTournament TeamAName TeamBName Status">'
      '<Filter NoTournament="1715" />'
      '</Request>';
  final respB = await postXml(xmlB);
  final countB = RegExp(r'<BeachMatch ').allMatches(respB).length;
  print('  Matches: $countB');
  if (countB > 0) {
    final first = RegExp(r'<BeachMatch[^/]*/>').firstMatch(respB);
    if (first != null) {
      print('  WARNING: Got matches for wrong tournament!');
      print('  First: ${first.group(0)!.substring(0, first.group(0)!.length.clamp(0, 200))}');
    }
  } else {
    print('  OK: No matches returned (expected - 1715 is not a Tournament No)');
  }

  // ─── Test C: Verify another 2026 event ───
  print('\nTEST C: Resolve another 2026 event (No=1716, BPT Futures Sanya 2026)');
  final xmlC = '<Request Type="GetEvent" No="1716" Fields="No Name Content" />';
  final respC = await postXml(xmlC);
  final contentMatch = RegExp(r'Content="([^"]*)"').firstMatch(respC);
  if (contentMatch != null) {
    final content = contentMatch.group(1)!
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#xD;&#xA;', '\n');
    print('  Content: $content');
    final btMatches = RegExp(r'<BeachTournament[^>]*No="(\d+)"[^>]*Gender="(\d)"').allMatches(content);
    for (final bt in btMatches) {
      print('  => Tournament No: ${bt.group(1)}, Gender: ${bt.group(2) == "0" ? "Men" : "Women"}');
    }
  }

  // ─── Test D: Check more 2026 events to verify pattern ───
  print('\nTEST D: Check all 2026 events (first 5)');
  final listXml = '<Request Type="GetEventList" Fields="No Name StartDate EndDate Gender CountryCode">'
      '<Filter HasBeachTournament="True" /></Request>';
  final listResp = await postXml(listXml);

  final events2026 = RegExp(r'<Event[^>]*StartDate="2026[^"]*"[^/]*/>', dotAll: true).allMatches(listResp);
  int count = 0;
  for (final e in events2026) {
    if (count >= 5) break;
    final raw = e.group(0)!;
    final no = RegExp(r' No="(\d+)"').firstMatch(raw)?.group(1) ?? '';
    final name = RegExp(r'Name="([^"]*)"').firstMatch(raw)?.group(1) ?? '';
    final start = RegExp(r'StartDate="([^"]*)"').firstMatch(raw)?.group(1) ?? '';
    final gender = RegExp(r'Gender="([^"]*)"').firstMatch(raw)?.group(1) ?? '';

    // Resolve tournament No
    final evtXml = '<Request Type="GetEvent" No="$no" Fields="No Content" />';
    final evtResp = await postXml(evtXml);
    final evtContent = RegExp(r'Content="([^"]*)"').firstMatch(evtResp);
    final tournamentNos = <String>[];
    if (evtContent != null) {
      final decoded = evtContent.group(1)!
          .replaceAll('&lt;', '<').replaceAll('&gt;', '>')
          .replaceAll('&quot;', '"');
      for (final bt in RegExp(r'<BeachTournament[^>]*No="(\d+)"').allMatches(decoded)) {
        tournamentNos.add(bt.group(1)!);
      }
    }

    print('  Event $no: $name (Start=$start, Gender=$gender) => TournamentNos=$tournamentNos');
    count++;
  }

  // ─── Test E: GetBeachMatch (single match detail) ───
  print('\nTEST E: GetBeachMatch (single match, using a match No from Test A)');
  if (countA > 0) {
    final firstMatchNo = RegExp(r'<BeachMatch[^>]* No="(\d+)"').firstMatch(respA)?.group(1);
    if (firstMatchNo != null) {
      final xmlE = '<Request Type="GetBeachMatch" No="$firstMatchNo" '
          'Fields="No NoInTournament LocalDate LocalTime Status Court '
          'TeamAName TeamBName TeamAFederationCode TeamBFederationCode '
          'MatchPointsA MatchPointsB RoundName Referee1Name Referee2Name" />';
      final respE = await postXml(xmlE);
      final matchEl = RegExp(r'<BeachMatch[^/]*/>').firstMatch(respE);
      if (matchEl != null) {
        print('  ${matchEl.group(0)!.substring(0, matchEl.group(0)!.length.clamp(0, 400))}');
      } else {
        print('  Response: ${respE.substring(0, respE.length.clamp(0, 300))}');
      }
    }
  }

  print('\nDone!');
}
