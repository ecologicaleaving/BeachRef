/**
 * Referee match filtering utilities for VIS BeachMatch objects.
 * Filters by NoReferee1 (first referee) and NoReferee2 (second referee).
 *
 * This provides a reliable VIS-side fallback when database analytics are unavailable
 * or when working directly with GetBeachMatchList/GetBeachLive responses.
 */

export interface BeachMatchLike {
  // Canonical VIS attributes (may be absent depending on endpoint)
  NoReferee1?: string | null;
  NoReferee2?: string | null;
  Referee1Name?: string | null;
  Referee2Name?: string | null;

  // Possible camelCase variants from prior transforms
  noReferee1?: string | null;
  noReferee2?: string | null;
  referee1Name?: string | null;
  referee2Name?: string | null;
}

export interface RefereeMatchFilterResult<T extends BeachMatchLike = BeachMatchLike> {
  all: T[];
  firstReferee: T[];  // matches where NoReferee1 == target
  secondReferee: T[]; // matches where NoReferee2 == target
}

/**
 * Normalize possible field variants and compare to the target VIS NoReferee.
 */
function isFirstRefereeOf(match: BeachMatchLike, visNoReferee: string): boolean {
  const no1 = match.NoReferee1 ?? match.noReferee1 ?? '';
  return !!visNoReferee && !!no1 && String(no1).trim() === String(visNoReferee).trim();
}

function isSecondRefereeOf(match: BeachMatchLike, visNoReferee: string): boolean {
  const no2 = match.NoReferee2 ?? match.noReferee2 ?? '';
  return !!visNoReferee && !!no2 && String(no2).trim() === String(visNoReferee).trim();
}

/**
 * Filter matches for a given VIS NoReferee across both roles.
 */
export function filterMatchesByNoReferee<T extends BeachMatchLike = BeachMatchLike>(
  matches: T[] | null | undefined,
  visNoReferee: string | null | undefined
): RefereeMatchFilterResult<T> {
  const safeMatches = Array.isArray(matches) ? matches : [];
  const target = (visNoReferee ?? '').trim();

  if (!target) {
    return { all: [], firstReferee: [], secondReferee: [] };
  }

  const firstReferee: T[] = [];
  const secondReferee: T[] = [];

  for (const m of safeMatches) {
    if (isFirstRefereeOf(m, target)) firstReferee.push(m);
    if (isSecondRefereeOf(m, target)) secondReferee.push(m);
  }

  return {
    all: [...firstReferee, ...secondReferee],
    firstReferee,
    secondReferee,
  };
}

/**
 * Compute quick inline stats (counts) for a given VIS NoReferee from a match list.
 */
export function computeInlineStatsFromMatches<T extends BeachMatchLike = BeachMatchLike>(
  matches: T[] | null | undefined,
  visNoReferee: string | null | undefined
): { total: number; first: number; second: number } {
  const res = filterMatchesByNoReferee(matches, visNoReferee);
  return {
    total: res.all.length,
    first: res.firstReferee.length,
    second: res.secondReferee.length,
  };
}

