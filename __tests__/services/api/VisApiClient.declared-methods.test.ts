/**
 * Issue #73, defect 2 — "six methods called on VisApiClient that do not exist".
 *
 * Ten call sites across the app invoked methods the class never declared:
 *
 * | method                          | callers |
 * |---------------------------------|---------|
 * | `fetchMatchesForTournament`     | useRealtimeData, useCourtManagement, useRefereeManagement, RealtimeFallbackService |
 * | `fetchBeachTournamentsThisYear` | useCourtManagement, useRefereeManagement |
 * | `getBeachMatchStatus`           | MatchDetailsService (and required by IVisApiClient) |
 * | `getTournamentTeamList`         | TournamentTeamService → `/tournament-teams` |
 * | `getTournaments`                | TournamentDetailScreen, DataConsistencyValidator |
 * | `getMatches`                    | DataConsistencyValidator |
 *
 * The first four are now real methods; the last two never belonged on the
 * client and their callers were moved to `getEventList` /
 * `fetchMatchesForTournament`. This test pins both halves: the four must exist,
 * the two must stay gone so nobody re-adds a phantom alias instead of fixing a
 * caller.
 *
 * Against `master` the first assertion fails: `typeof client.getBeachMatchStatus`
 * is `'undefined'`.
 */

import { VisApiClient } from '../../../services/api/VisApiClient';

const config = {
  baseURL: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
  timeout: 10000,
} as never;

describe('VisApiClient — methods the codebase calls (issue #73)', () => {
  const client = new VisApiClient(config);

  it.each([
    'fetchMatchesForTournament',
    'fetchBeachTournamentsThisYear',
    'getBeachMatchStatus',
    'getTournamentTeamList',
  ])('implements %s()', method => {
    expect(typeof (client as unknown as Record<string, unknown>)[method]).toBe('function');
  });

  it.each(['getTournaments', 'getMatches'])(
    'deliberately does not declare %s() — callers use the real endpoint',
    method => {
      expect((client as unknown as Record<string, unknown>)[method]).toBeUndefined();
    }
  );

  it('no source file calls getTournaments()/getMatches() on a VisApiClient', () => {
    // Regression guard for the two callers that were corrected rather than
    // served with a new method.
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const root = path.resolve(__dirname, '..', '..', '..');

    const offenders: string[] = [];
    const dirs = ['app', 'components', 'hooks', 'screens', 'services', 'utils', 'lib'];

    const walk = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '__tests__', '__mocks__'].includes(entry.name)) continue;
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        const text = fs.readFileSync(full, 'utf8');
        // `visApi.getTournaments(` / `visApiClient.getMatches(` and friends.
        const re = /\b(?:vis|visApi|visApiClient|apiClient|client)\w*\.(getTournaments|getMatches)\s*\(/g;
        if (re.test(text)) {
          offenders.push(path.relative(root, full).split(path.sep).join('/'));
        }
      }
    };

    dirs.forEach(d => walk(path.join(root, d)));
    expect(offenders).toEqual([]);
  });
});
