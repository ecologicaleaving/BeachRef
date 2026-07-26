/**
 * Issue #73, defect 1 — `/referee-settings`.
 *
 * The screen's entire data layer calls a `VisApiService` that issues #46/#47
 * removed; the identifiers are free variables and every call site is wrapped in
 * a `try { … } catch { }`, so the `ReferenceError` never surfaced. Verified in
 * the browser on production: the route opens, "Court Monitor" reports no
 * matches, "Referee Monitor" does nothing, console clean.
 *
 * Reviving it is a rewrite (see the header comment on
 * `screens/RefereeSettingsScreen.tsx`), and the screen duplicates
 * `/tournament-ref`, `/all-referees` and `/ref-mode`. It was therefore removed
 * from navigation rather than left broken — the option `#73 AC1` names
 * explicitly.
 *
 * This test fails on `master`, where `app/referee-settings.tsx` exists and both
 * entry points still point at it.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

describe('/referee-settings is unrouted (issue #73)', () => {
  it('has no route file, so the URL does not resolve to a screen', () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, 'app', 'referee-settings.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(PROJECT_ROOT, 'app', 'referee-settings.ts'))).toBe(false);
  });

  it('is not reachable from the side menu or the referee dashboard', () => {
    const navigationSources = [
      path.join(PROJECT_ROOT, 'components', 'navigation', 'SideMenu.tsx'),
      path.join(PROJECT_ROOT, 'components', 'navigation', 'BottomTabNavigation.tsx'),
      path.join(PROJECT_ROOT, 'screens', 'RefereeDashboardScreen.tsx'),
    ];

    const offenders: string[] = [];

    for (const file of navigationSources) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!line.includes('referee-settings')) return;
        // Explanatory comments are allowed; navigation targets are not.
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        offenders.push(`${path.basename(file)}:${i + 1}: ${line.trim()}`);
      });
    }

    expect(offenders).toEqual([]);
  });

  it('the screen file is kept, and says why it is unrouted', () => {
    // Deleting a feature is a product call; the code stays with its rationale
    // so the decision is reviewable rather than silently lost in git history.
    const screen = path.join(PROJECT_ROOT, 'screens', 'RefereeSettingsScreen.tsx');
    expect(fs.existsSync(screen)).toBe(true);
    expect(fs.readFileSync(screen, 'utf8')).toContain('UNROUTED');
  });
});
