// Measure bandwidth AFTER optimizations
import 'dart:io';
import 'dart:convert';

const baseUrl = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

Future<({String body, int size, int ms})> postXml(String xml) async {
  final sw = Stopwatch()..start();
  final client = HttpClient();
  final request = await client.postUrl(Uri.parse(baseUrl));
  request.headers.set('Content-Type', 'application/x-www-form-urlencoded');
  request.write('Request=${Uri.encodeComponent(xml)}');
  final response = await request.close();
  final body = await response.transform(utf8.decoder).join();
  client.close();
  sw.stop();
  return (body: body, size: body.length, ms: sw.elapsedMilliseconds);
}

String kb(int bytes) => bytes < 1024 ? '$bytes B' : '${(bytes / 1024).toStringAsFixed(1)} KB';

Future<void> main() async {
  print('=== BANDWIDTH AFTER OPTIMIZATION ===\n');

  // 1. GetEventList - MINIMAL fields (no City, no Gender)
  final r1 = await postXml(
    '<Request Type="GetEventList" Fields="No Name CountryCode StartDate EndDate Status">'
    '<Filter HasBeachTournament="True" />'
    '</Request>'
  );
  print('GetEventList (minimal fields): ${kb(r1.size)} in ${r1.ms}ms');

  // 2. GetEvent (tiny, always was)
  final r2 = await postXml(
    '<Request Type="GetEvent" No="1715" Fields="No Name Content" />'
  );
  print('GetEvent (resolve nos):        ${kb(r2.size)} in ${r2.ms}ms');

  // 3. GetBeachMatchList - SLIM fields (15 fields instead of 30)
  final r3 = await postXml(
    '<Request Type="GetBeachMatchList" '
    'Fields="No NoInTournament LocalDate LocalTime Status Court '
    'TeamAName TeamBName TeamAFederationCode TeamBFederationCode '
    'MatchPointsA MatchPointsB RoundName '
    'Referee1Name Referee1FederationCode">'
    '<Filter NoTournament="8940" IncludeResults="True" IncludeReferees="True" />'
    '</Request>'
  );
  print('GetBeachMatchList (slim, Men): ${kb(r3.size)} in ${r3.ms}ms');

  final r4 = await postXml(
    '<Request Type="GetBeachMatchList" '
    'Fields="No NoInTournament LocalDate LocalTime Status Court '
    'TeamAName TeamBName TeamAFederationCode TeamBFederationCode '
    'MatchPointsA MatchPointsB RoundName '
    'Referee1Name Referee1FederationCode">'
    '<Filter NoTournament="8941" IncludeResults="True" IncludeReferees="True" />'
    '</Request>'
  );
  print('GetBeachMatchList (slim, Women): ${kb(r4.size)} in ${r4.ms}ms');

  // 5. GetBeachMatch - single match detail (on-demand)
  final matchNo = RegExp(r'<BeachMatch[^>]* No="(\d+)"').firstMatch(r3.body)?.group(1) ?? '513724';
  final r5 = await postXml(
    '<Request Type="GetBeachMatch" No="$matchNo" '
    'Fields="No NoInTournament LocalDate LocalTime Status Court '
    'TeamAName TeamBName TeamAFederationCode TeamBFederationCode '
    'MatchPointsA MatchPointsB RoundName Round RoundPhase '
    'Referee1Name Referee2Name Referee1FederationCode '
    'Referee2FederationCode RefereeChallengeName '
    'PointsTeamASet1 PointsTeamBSet1 '
    'PointsTeamASet2 PointsTeamBSet2 '
    'PointsTeamASet3 PointsTeamBSet3 '
    'DurationSet1 DurationSet2 DurationSet3 '
    'ResultType NoEvent" />'
  );
  print('GetBeachMatch (full detail):   ${kb(r5.size)} in ${r5.ms}ms');

  // ── COMPARISON ──
  print('\n${'=' * 55}');
  print('SESSION SCENARIOS');
  print('${'=' * 55}');

  final coldStart = r1.size + r2.size + r3.size + r4.size;
  print('\nCold start (app open + tap 1 tournament):');
  print('  4 API calls, ${kb(coldStart)} total');
  print('  Breakdown:');
  print('    GetEventList:       ${kb(r1.size)} (cached 6 hours)');
  print('    GetEvent:           ${kb(r2.size)} (cached 7 days)');
  print('    GetBeachMatchList:  ${kb(r3.size + r4.size)} (cached 5 min)');

  print('\nWarm cache (same tournament, <5 min):');
  print('  0 API calls, 0 B');

  print('\nWarm cache (same tournament, >5 min):');
  print('  2 API calls (match lists only), ${kb(r3.size + r4.size)}');

  print('\nTap match detail (on-demand):');
  print('  1 API call, ${kb(r5.size)} (cached 5 min)');

  print('\n5-min browsing session (3 tournaments):');
  final session = r1.size + (r2.size + r3.size + r4.size) * 3;
  print('  Worst case: 10 calls, ${kb(session)}');
  print('  Typical:    4 calls, ${kb(coldStart)}');

  print('\nDaily usage (5 sessions, same tournament):');
  // 1st session: full cold start. 2-5: only match refreshes
  final daily = coldStart + (r3.size + r4.size) * 4;
  print('  ~${kb(daily)} total, ~12 API calls');

  print('\nVS BEFORE OPTIMIZATION:');
  print('  Before: GetEventList 108 KB (every 10 min!) + match list 48 KB (every 15s!)');
  print('  After:  GetEventList ${kb(r1.size)} (every 6 hours) + match list ${kb(r3.size + r4.size)} (every 5 min)');
  print('  Before: background refetch on EVERY Hive read');
  print('  After:  background refetch ONLY when >80% of TTL elapsed');
}
