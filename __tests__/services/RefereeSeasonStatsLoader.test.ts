/**
 * Issue #65, AC1/AC2/AC7/AC10 — `/all-referees` hung on "Loading" forever.
 *
 * These tests are written against the *behaviour that was missing*, and each
 * one is accompanied by a reproduction of the shape that used to be in
 * `app/all-referees.tsx` — a bare `Promise.all` over `getSeasonStats` — so the
 * failure is demonstrated inside the suite rather than asserted in a PR
 * description.
 */

import {
  loadRefereeSeasonStats,
  REFEREE_STATS_CONCURRENCY,
  REFEREE_STATS_TIMEOUT_MS,
} from '../../services/RefereeSeasonStatsLoader';

const referees = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ RefereeId: String(100000 + i) }));

const seasonStats = (totalMatches: number) =>
  ({
    totalMatches,
    matchesAsFirst: totalMatches,
    matchesAsSecond: 0,
    menMatches: totalMatches,
    womenMatches: 0,
    season: '2026',
    tournaments: 1,
    averageRating: 0,
  }) as any;

describe('loadRefereeSeasonStats — bounded fan-out (AC10)', () => {
  it('keeps at most REFEREE_STATS_CONCURRENCY referees in flight', async () => {
    let live = 0;
    let peak = 0;

    await loadRefereeSeasonStats(referees(200), '2026', {
      getSeasonStats: async () => {
        live++;
        peak = Math.max(peak, live);
        await new Promise(resolve => setTimeout(resolve, 1));
        live--;
        return seasonStats(3);
      },
    });

    expect(peak).toBeLessThanOrEqual(REFEREE_STATS_CONCURRENCY);
  });

  it('the `Promise.all` it replaced puts all 200 on the wire at once', async () => {
    // The old body of `loadActiveSeasonReferees`, verbatim in shape.
    let live = 0;
    let peak = 0;

    const getSeasonStats = async () => {
      live++;
      peak = Math.max(peak, live);
      await new Promise(resolve => setTimeout(resolve, 1));
      live--;
      return seasonStats(3);
    };

    await Promise.all(referees(200).map(r => getSeasonStats()));

    // 200 referees × >= 3 VIS requests each is the ~600-request burst that got
    // us throttled by the FIVB (#67: 112 requests took one unrelated curl from
    // ~100 ms to 125 s, ~25 min to recover).
    expect(peak).toBe(200);
    expect(peak).toBeGreaterThan(REFEREE_STATS_CONCURRENCY);
  });
});

describe('loadRefereeSeasonStats — always settles (AC1/AC2)', () => {
  it('settles even when one referee never answers', async () => {
    jest.useFakeTimers();
    try {
      const settled = jest.fn();

      const promise = loadRefereeSeasonStats(referees(5), '2026', {
        timeoutMs: 1000,
        getSeasonStats: async (refereeId: string) => {
          // Referee #2 is the throttled one: the VIS accepted the connection
          // and never replied. This is the request that used to pin the
          // spinner up permanently.
          if (refereeId === '100002') {
            return new Promise(() => { /* never */ });
          }
          return seasonStats(4);
        },
      }).then(results => {
        settled(results);
        return results;
      });

      await jest.advanceTimersByTimeAsync(2000);
      const results = await promise;

      expect(settled).toHaveBeenCalled();
      expect(results).toHaveLength(5);
      // The dead referee degrades to a zero, not to a broken screen.
      expect(results.find(r => r.refereeId === '100002')).toEqual({
        refereeId: '100002',
        stats: null,
        totalMatches: 0,
      });
      expect(results.filter(r => r.totalMatches === 4)).toHaveLength(4);
    } finally {
      jest.useRealTimers();
    }
  });

  it('the bare Promise.all it replaced never settles in the same scenario', async () => {
    jest.useFakeTimers();
    try {
      const settled = jest.fn();

      const getSeasonStats = async (refereeId: string) => {
        if (refereeId === '100002') return new Promise(() => { /* never */ });
        return seasonStats(4);
      };

      // No timeout, no limit — exactly what the screen used to await before
      // calling setReferees and, in the `finally`, setLoading(false).
      void Promise.all(referees(5).map(r => getSeasonStats(r.RefereeId))).then(settled);

      await jest.advanceTimersByTimeAsync(60_000);

      // One unanswered request out of five, and the whole screen is stuck.
      expect(settled).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not reject when a referee errors — the list survives', async () => {
    const results = await loadRefereeSeasonStats(referees(3), '2026', {
      getSeasonStats: async (refereeId: string) => {
        if (refereeId === '100001') throw new Error('VIS 503');
        return seasonStats(7);
      },
    });

    expect(results.map(r => r.totalMatches)).toEqual([7, 0, 7]);
  });

  it('a bare Promise.all loses every result when one referee errors', async () => {
    const getSeasonStats = async (refereeId: string) => {
      if (refereeId === '100001') throw new Error('VIS 503');
      return seasonStats(7);
    };

    await expect(
      Promise.all(referees(3).map(r => getSeasonStats(r.RefereeId)))
    ).rejects.toThrow('VIS 503');
  });
});

describe('loadRefereeSeasonStats — progressive delivery', () => {
  it('reports each referee as it lands, before the whole pass is done', async () => {
    const seen: string[] = [];

    const promise = loadRefereeSeasonStats(referees(8), '2026', {
      concurrency: 2,
      getSeasonStats: async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return seasonStats(1);
      },
      onResult: ({ refereeId }) => { seen.push(refereeId); },
    });

    // Nothing is delivered synchronously...
    expect(seen).toHaveLength(0);
    await promise;
    // ...but everything is delivered by the end, one call per referee.
    expect(seen).toHaveLength(8);
  });

  it('stops delivering once the caller says it is cancelled', async () => {
    let cancelled = false;
    const seen: string[] = [];

    const promise = loadRefereeSeasonStats(referees(6), '2026', {
      concurrency: 1,
      isCancelled: () => cancelled,
      getSeasonStats: async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return seasonStats(1);
      },
      onResult: ({ refereeId }) => { seen.push(refereeId); },
    });

    await new Promise(resolve => setTimeout(resolve, 5));
    cancelled = true;
    await promise;

    expect(seen.length).toBeLessThan(6);
  });
});

describe('the constants are the ones the screen relies on', () => {
  it('bounds fan-out and per-referee time', () => {
    expect(REFEREE_STATS_CONCURRENCY).toBeGreaterThanOrEqual(1);
    expect(REFEREE_STATS_CONCURRENCY).toBeLessThanOrEqual(6);
    expect(REFEREE_STATS_TIMEOUT_MS).toBeGreaterThan(0);
    expect(REFEREE_STATS_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });
});
