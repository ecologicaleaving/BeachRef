// Measure exact bandwidth of each API call
import 'dart:io';
import 'dart:convert';

const baseUrl = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

Future<({String body, int requestSize, int responseSize, int ms})> postXml(String xml) async {
  final sw = Stopwatch()..start();
  final client = HttpClient();
  final request = await client.postUrl(Uri.parse(baseUrl));
  request.headers.set('Content-Type', 'application/x-www-form-urlencoded');
  final encoded = 'Request=${Uri.encodeComponent(xml)}';
  request.write(encoded);
  final response = await request.close();
  final body = await response.transform(utf8.decoder).join();
  client.close();
  sw.stop();
  return (body: body, requestSize: encoded.length, responseSize: body.length, ms: sw.elapsedMilliseconds);
}

Future<void> main() async {
  print('=== API BANDWIDTH ANALYSIS ===\n');

  int totalRequests = 0;
  int totalRequestBytes = 0;
  int totalResponseBytes = 0;

  // ── 1. GetEventList (happens ONCE on app start) ──
  print('1. GetEventList (all events, fetched once)');
  final r1 = await postXml(
    '<Request Type="GetEventList" Fields="No Name City CountryCode StartDate EndDate Status Gender">'
    '<Filter HasBeachTournament="True" />'
    '</Request>'
  );
  totalRequests++;
  totalRequestBytes += r1.requestSize;
  totalResponseBytes += r1.responseSize;
  print('   Request:  ${_kb(r1.requestSize)}');
  print('   Response: ${_kb(r1.responseSize)}');
  print('   Time:     ${r1.ms}ms');
  print('   Events:   ${RegExp(r'<Event ').allMatches(r1.body).length}');

  // ── 2. GetEvent (happens once per tournament tap, cached 24h) ──
  print('\n2. GetEvent (resolve tournament numbers, cached 24h)');
  final r2 = await postXml(
    '<Request Type="GetEvent" No="1715" Fields="No Name Content" />'
  );
  totalRequests++;
  totalRequestBytes += r2.requestSize;
  totalResponseBytes += r2.responseSize;
  print('   Request:  ${_kb(r2.requestSize)}');
  print('   Response: ${_kb(r2.responseSize)}');
  print('   Time:     ${r2.ms}ms');

  // ── 3. GetBeachMatchList (happens per gender variant) ──
  print('\n3. GetBeachMatchList - Men (Tournament 8940)');
  final r3a = await postXml(
    '<Request Type="GetBeachMatchList" '
    'Fields="No NoInTournament LocalDate LocalTime Status Court '
    'TeamAName TeamBName TeamAFederationCode TeamBFederationCode '
    'MatchPointsA MatchPointsB RoundName Round RoundPhase '
    'Referee1Name Referee2Name Referee1FederationCode '
    'Referee2FederationCode RefereeChallengeName '
    'PointsTeamASet1 PointsTeamBSet1 '
    'PointsTeamASet2 PointsTeamBSet2 '
    'PointsTeamASet3 PointsTeamBSet3 '
    'DurationSet1 DurationSet2 DurationSet3 '
    'ResultType NoEvent">'
    '<Filter NoTournament="8940" IncludeResults="True" IncludeReferees="True" />'
    '</Request>'
  );
  totalRequests++;
  totalRequestBytes += r3a.requestSize;
  totalResponseBytes += r3a.responseSize;
  print('   Request:  ${_kb(r3a.requestSize)}');
  print('   Response: ${_kb(r3a.responseSize)}');
  print('   Time:     ${r3a.ms}ms');
  print('   Matches:  ${RegExp(r'<BeachMatch ').allMatches(r3a.body).length}');

  print('\n4. GetBeachMatchList - Women (Tournament 8941)');
  final r3b = await postXml(
    '<Request Type="GetBeachMatchList" '
    'Fields="No NoInTournament LocalDate LocalTime Status Court '
    'TeamAName TeamBName TeamAFederationCode TeamBFederationCode '
    'MatchPointsA MatchPointsB RoundName Round RoundPhase '
    'Referee1Name Referee2Name Referee1FederationCode '
    'Referee2FederationCode RefereeChallengeName '
    'PointsTeamASet1 PointsTeamBSet1 '
    'PointsTeamASet2 PointsTeamBSet2 '
    'PointsTeamASet3 PointsTeamBSet3 '
    'DurationSet1 DurationSet2 DurationSet3 '
    'ResultType NoEvent">'
    '<Filter NoTournament="8941" IncludeResults="True" IncludeReferees="True" />'
    '</Request>'
  );
  totalRequests++;
  totalRequestBytes += r3b.requestSize;
  totalResponseBytes += r3b.responseSize;
  print('   Request:  ${_kb(r3b.requestSize)}');
  print('   Response: ${_kb(r3b.responseSize)}');
  print('   Time:     ${r3b.ms}ms');
  print('   Matches:  ${RegExp(r'<BeachMatch ').allMatches(r3b.body).length}');

  // ── 5. GetBeachMatchList with FEWER fields (slim mode) ──
  print('\n5. GetBeachMatchList - SLIM fields (for comparison)');
  final r5 = await postXml(
    '<Request Type="GetBeachMatchList" '
    'Fields="No NoInTournament LocalDate LocalTime Status Court '
    'TeamAName TeamBName MatchPointsA MatchPointsB RoundName">'
    '<Filter NoTournament="8940" IncludeResults="True" />'
    '</Request>'
  );
  print('   Request:  ${_kb(r5.requestSize)}');
  print('   Response: ${_kb(r5.responseSize)} (${((1 - r5.responseSize / r3a.responseSize) * 100).toStringAsFixed(0)}% smaller than full)');
  print('   Time:     ${r5.ms}ms');

  // ── 6. GetEventList with FEWER fields ──
  print('\n6. GetEventList - MINIMAL fields (for comparison)');
  final r6 = await postXml(
    '<Request Type="GetEventList" Fields="No Name StartDate EndDate Status">'
    '<Filter HasBeachTournament="True" />'
    '</Request>'
  );
  print('   Request:  ${_kb(r6.requestSize)}');
  print('   Response: ${_kb(r6.responseSize)} (${((1 - r6.responseSize / r1.responseSize) * 100).toStringAsFixed(0)}% smaller than full)');
  print('   Time:     ${r6.ms}ms');

  // ── SUMMARY ──
  print('\n${'=' * 50}');
  print('SUMMARY - Typical session (open app, tap 1 tournament)');
  print('${'=' * 50}');
  print('Total API calls:      $totalRequests');
  print('Total request data:   ${_kb(totalRequestBytes)}');
  print('Total response data:  ${_kb(totalResponseBytes)}');
  print('Total bandwidth:      ${_kb(totalRequestBytes + totalResponseBytes)}');

  print('\nPER-SESSION PROJECTIONS (with caching):');
  print('  First visit (cold cache):');
  print('    GetEventList:       1 call (cached 10 min)');
  print('    GetEvent:           1 call per tournament (cached 24h)');
  print('    GetBeachMatchList:  2 calls per tournament (M+W, cached 15s)');
  print('    Total for 1 tournament: 4 calls, ~${_kb(r1.responseSize + r2.responseSize + r3a.responseSize + r3b.responseSize)}');

  print('\n  Return visit (warm cache, same tournament):');
  print('    GetEventList:       0 calls (from cache)');
  print('    GetEvent:           0 calls (from cache)');
  print('    GetBeachMatchList:  0 calls if <15s, 2 if stale');
  print('    Total: 0-2 calls');

  print('\n  5-minute session browsing 3 tournaments:');
  final session5min = r1.responseSize + (r2.responseSize + r3a.responseSize + r3b.responseSize) * 3;
  print('    Worst case: ${1 + 3 + 6} calls, ~${_kb(session5min)}');
  print('    With cache: ~4-6 calls, ~${_kb(r1.responseSize + r2.responseSize + r3a.responseSize + r3b.responseSize)}');
}

String _kb(int bytes) {
  if (bytes < 1024) return '${bytes} B';
  return '${(bytes / 1024).toStringAsFixed(1)} KB';
}
