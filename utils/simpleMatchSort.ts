/**
 * EXACT implementation of senior engineer's solution - NO MORE COMPLEXITY!
 */

// Util: calcola una chiave tempo in ms ovunque possibile
const toEpochMsSafe = (m: any): number | null => {
  if (typeof m.scheduledEpoch === 'number') return m.scheduledEpoch;

  if (m.scheduledUtc) {
    const { y, m: mm, d, hh, mm: min, ss = 0 } = m.scheduledUtc;
    // Date.UTC: mesi 0-based
    const utc = Date.UTC(y, mm - 1, d, hh, min, ss, 0);
    return Number.isFinite(utc) ? utc : null;
  }

  if (m.scheduledIso) {
    const t = Date.parse(m.scheduledIso);
    return Number.isFinite(t) ? t : null;
  }

  // Fallback per scheduledDateTime (nostro campo principale)
  if (m.scheduledDateTime) {
    const t = Date.parse(m.scheduledDateTime);
    return Number.isFinite(t) ? t : null;
  }

  return null;
};

// Comparator per ordinare i match all'interno di *una stessa data*
export const compareWithinDay = (a: any, b: any): number => {
  // 1) priorità: tempo (ASC fisso)
  const ta = toEpochMsSafe(a);
  const tb = toEpochMsSafe(b);
  if (ta !== null && tb !== null && ta !== tb) return ta - tb;

  // 2) se tempi uguali/assenti: gender secondario (M prima di W, poi X)
  const rank = (g?: string) => (g === 'M' ? 0 : g === 'W' ? 1 : 2);
  const gr = rank(a.gender) - rank(b.gender);
  if (gr !== 0) return gr;

  // 3) tie-breaker stabile su id per evitare shuffle visivo
  return (a.id ?? '').localeCompare(b.id ?? '');
};