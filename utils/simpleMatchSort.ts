/**
 * EXACT implementation of senior engineer's solution - NO MORE COMPLEXITY!
 */

// Util: calcola una chiave tempo in ms ovunque possibile
const toEpochMsSafe = (m: any): number | null => {

  // PRIORITY 1: Use the timezone-safe epochMs from VisResponseParser!
  if (m.scheduled?.epochMs && typeof m.scheduled.epochMs === 'number') {
    return m.scheduled.epochMs;
  }

  // PRIORITY 2: Fallback to scheduledDateTime parsing
  if (m.scheduledDateTime) {
    const t = Date.parse(m.scheduledDateTime);
    if (Number.isFinite(t)) {
      return t;
    } else {
    }
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