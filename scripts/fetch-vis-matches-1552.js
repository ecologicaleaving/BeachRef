// Fetch all matches for a VIS tournament (default: 1552)
// Usage: paste into browser console via fetch, or run with Node + node-fetch (adjust accordingly)

(async () => {
  const endpoint = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  const tournamentNo = '1552';

  const fields = [
    'No',
    'Code',
    'NoEvent',
    'TournamentName',
    'TournamentGender',
    'LocalDate',
    'LocalTime',
    'LocalDateTime',
    'Court',
    'RoundCode',
    'Phase',
    'Status',
    'TeamAName',
    'TeamBName',
    'MatchPointsA',
    'MatchPointsB',
    'NoReferee1',
    'NoReferee2',
    'Referee1Name',
    'Referee2Name'
  ].join(' ');

  const xml = `<Requests>
  <Request Type="GetBeachMatchList" Fields="${fields}">
    <Filter NoEvent="${tournamentNo}"/>
  </Request>
</Requests>`;

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/xml',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ Request: xml })
    });

    if (!resp.ok) {
      console.error('HTTP error:', resp.status, resp.statusText);
      return;
    }

    const text = await resp.text();
    const matches = [];
    const re = /<BeachMatch[^>]*\/>/g;
    const attr = name => new RegExp(name + '="([^"]*)"');

    for (const m of text.matchAll(re)) {
      const tag = m[0];
      const get = (name) => (tag.match(attr(name))?.[1] || '');
      matches.push({
        no: get('No'),
        code: get('Code'),
        noEvent: get('NoEvent'),
        tournamentName: get('TournamentName'),
        tournamentGender: get('TournamentGender'),
        localDate: get('LocalDate'),
        localTime: get('LocalTime'),
        localDateTime: get('LocalDateTime'),
        court: get('Court'),
        roundCode: get('RoundCode'),
        phase: get('Phase'),
        status: get('Status'),
        teamAName: get('TeamAName'),
        teamBName: get('TeamBName'),
        matchPointsA: get('MatchPointsA'),
        matchPointsB: get('MatchPointsB'),
        noReferee1: get('NoReferee1'),
        noReferee2: get('NoReferee2'),
        referee1Name: get('Referee1Name'),
        referee2Name: get('Referee2Name'),
      });
    }

    console.log(`[VIS] Tournament ${tournamentNo} matches=${matches.length}`);
    console.log(matches);
    console.log('[VIS] Sample (first 5):', matches.slice(0, 5));
  } catch (e) {
    console.error('Request failed:', e);
  }
})();

