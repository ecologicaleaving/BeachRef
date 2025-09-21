/**
 * Super simple, robust match sorting - following senior engineer's approach
 */

import { BeachMatchCore } from '../types/match-v2';

// Robust time extraction - tries multiple fields in priority order
const toEpochMsSafe = (match: any): number | null => {
  // Priority 1: scheduledEpoch if available
  if (typeof match.scheduledEpoch === 'number') {
    return match.scheduledEpoch;
  }

  // Priority 2: scheduled.epochMs (enhanced field)
  if (match.scheduled?.epochMs && typeof match.scheduled.epochMs === 'number') {
    return match.scheduled.epochMs;
  }

  // Priority 3: BeginDateTimeUtc (VIS API field)
  if (match.BeginDateTimeUtc) {
    const t = Date.parse(match.BeginDateTimeUtc);
    if (Number.isFinite(t)) return t;
  }

  // Priority 4: utcScheduledDateTime
  if (match.utcScheduledDateTime) {
    const t = Date.parse(match.utcScheduledDateTime);
    if (Number.isFinite(t)) return t;
  }

  // Priority 5: scheduledDateTime
  if (match.scheduledDateTime) {
    const t = Date.parse(match.scheduledDateTime);
    if (Number.isFinite(t)) return t;
  }

  // Priority 6: LocalTime + LocalDate + LocalTimeOffset
  if (match.LocalTime && match.LocalDate) {
    try {
      const localDateTime = `${match.LocalDate}T${match.LocalTime}`;
      const t = Date.parse(localDateTime);
      if (Number.isFinite(t)) return t;
    } catch (e) {
      // Ignore
    }
  }

  return null;
};

// Comparator per ordinare i match all'interno di una stessa data
export const compareWithinDay = (a: any, b: any): number => {
  // 1) priorità: tempo (ASC fisso)
  const ta = toEpochMsSafe(a);
  const tb = toEpochMsSafe(b);

  if (ta !== null && tb !== null && ta !== tb) {
    return ta - tb; // Crescente (prima i match più presto)
  }

  // 2) se tempi uguali/assenti: gender secondario (M prima di W)
  const rank = (g?: string) => (g === 'M' ? 0 : g === 'W' ? 1 : 2);
  const genderA = a.tournamentGender || a.gender || 'M';
  const genderB = b.tournamentGender || b.gender || 'M';
  const gr = rank(genderA) - rank(genderB);
  if (gr !== 0) return gr;

  // 3) tie-breaker stabile su id per evitare shuffle visivo
  return (a.id ?? '').localeCompare(b.id ?? '');
};

// Debug function per vedere tutti i campi tempo disponibili
export const debugMatchTime = (match: any): string => {
  const epoch = toEpochMsSafe(match);
  const timeStr = epoch ? new Date(epoch).toLocaleTimeString() : 'NO TIME';

  return `${match.id}: ${timeStr} (epoch: ${epoch})`;
};