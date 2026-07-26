/**
 * Bulk season-stats loading for the referee list (issue #65).
 *
 * ## What was wrong
 *
 * `app/all-referees.tsx` used to do this, inline:
 *
 * ```ts
 * const refereesWithStats = await Promise.all(
 *   activeReferees.map(async referee => {
 *     const seasonStats = await RefereeStatsService.getSeasonStats(referee.RefereeId, year);
 *     ...
 *   })
 * );
 * ```
 *
 * Three separate defects composed into a screen that hung forever:
 *
 * 1. **No concurrency limit.** `activeReferees` is every unique referee seen in
 *    up to 10 recent events — hundreds, not dozens. And one `getSeasonStats` is
 *    not one request: it resolves the referee id (>= 1 request) and then runs
 *    two `querySeasonMatchesWithNoReferee` calls in parallel. So ~200 referees
 *    is ~600 VIS requests, all released at once.
 * 2. **No timeout on this path.** The card-expansion path (`loadRefereeStats`)
 *    already raced against a 30 s timeout; the bulk path had none.
 * 3. **`loading` was tied to the whole `Promise.all`.** `Promise.all` settles
 *    only when its *last* member settles. Combine that with (2) and a single
 *    request that never answers pins the spinner up permanently. That is the
 *    literal cause of "resta su Loading": not an exception, not a missing
 *    dependency — an await on a promise that had no reason to ever settle.
 *
 * (3) is why the bug looks like a hang rather than an error, and (1) is why it
 * happens every time rather than occasionally: at 600 concurrent requests the
 * VIS throttles us, and a throttled request is exactly a request that does not
 * answer. The three defects feed each other.
 *
 * ## What this module does instead
 *
 * Bounded fan-out, per-referee timeout, and results delivered *as they arrive*
 * so the caller can render the list before the stats are complete.
 */

import { RefereeStatsService, SeasonStats } from './RefereeStatsService';
import { mapWithConcurrency, withTimeout } from '../utils/concurrency';

/**
 * How many referees are resolved at a time.
 *
 * One referee costs >= 3 VIS requests, so 4 in flight here is ~8-12 requests
 * queued behind `VIS_MAX_CONCURRENT_REQUESTS` (4). Going higher does not make
 * the screen faster — the semaphore in `VisApiClient` is the real bottleneck —
 * it only grows an invisible queue and makes cancellation impossible.
 *
 * Deliberately equal to the client ceiling: the client is the hard net, this is
 * the polite fan-out that keeps the net from ever being needed.
 */
export const REFEREE_STATS_CONCURRENCY = 4;

/**
 * Per-referee budget. Shorter than the 30 s used on card expansion, because
 * here a slow referee costs *the whole list* its ordering, and a missing stat
 * degrades to a `0` rather than to an error the user sees.
 */
export const REFEREE_STATS_TIMEOUT_MS = 15_000;

export interface RefereeStatsTarget {
  RefereeId: string;
}

export interface RefereeSeasonStatsResult {
  refereeId: string;
  /** `null` when the request failed, timed out, or the referee has no data. */
  stats: SeasonStats | null;
  totalMatches: number;
}

export interface LoadRefereeSeasonStatsOptions {
  /** Injected for tests; defaults to the real service. */
  getSeasonStats?: (refereeId: string, season: string) => Promise<SeasonStats | null>;
  concurrency?: number;
  timeoutMs?: number;
  /** Called once per referee, as soon as that referee's stats settle. */
  onResult?: (result: RefereeSeasonStatsResult) => void;
  /** Returns `true` to stop delivering results (screen unmounted). */
  isCancelled?: () => boolean;
}

/**
 * Season stats for every referee in `referees`, at most `concurrency` at a
 * time, each capped at `timeoutMs`.
 *
 * Never rejects and never hangs: a referee whose request fails or times out
 * yields `{ stats: null, totalMatches: 0 }`. The returned promise settles in
 * bounded time by construction, which is what lets the caller keep `loading`
 * honest.
 */
export async function loadRefereeSeasonStats(
  referees: readonly RefereeStatsTarget[],
  season: string,
  options: LoadRefereeSeasonStatsOptions = {}
): Promise<RefereeSeasonStatsResult[]> {
  const {
    getSeasonStats = (id: string, s: string) => RefereeStatsService.getSeasonStats(id, s),
    concurrency = REFEREE_STATS_CONCURRENCY,
    timeoutMs = REFEREE_STATS_TIMEOUT_MS,
    onResult,
    isCancelled,
  } = options;

  return mapWithConcurrency(referees, concurrency, async (referee) => {
    if (isCancelled?.()) {
      return { refereeId: referee.RefereeId, stats: null, totalMatches: 0 };
    }

    let result: RefereeSeasonStatsResult;

    try {
      const stats = await withTimeout(
        Promise.resolve(getSeasonStats(referee.RefereeId, season)),
        timeoutMs,
        `Season stats for referee ${referee.RefereeId}`
      );
      result = {
        refereeId: referee.RefereeId,
        stats: stats ?? null,
        totalMatches: stats?.totalMatches ?? 0,
      };
    } catch (error) {
      // A referee without stats is a `0`, not a broken screen. The failure is
      // logged rather than propagated on purpose: `Promise.all` rejecting on
      // the first failure was part of how this screen used to lose its data.
      console.warn(
        `[RefereeSeasonStatsLoader] stats unavailable for referee ${referee.RefereeId}:`,
        error instanceof Error ? error.message : error
      );
      result = { refereeId: referee.RefereeId, stats: null, totalMatches: 0 };
    }

    if (!isCancelled?.()) {
      onResult?.(result);
    }

    return result;
  });
}
