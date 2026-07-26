/**
 * Challenge Referee Synchronous Lookup
 *
 * Provides synchronous access to Challenge Referee names by maintaining
 * a cached map of event referees from GetEventRefereeList.
 *
 * Similar pattern to matchOfficialsSync.ts for Personnel lookup.
 *
 * Issue #47: the roster no longer arrives through a raw `fetch` with its own
 * `XMLParser`. {@link RefereeDirectoryService.getEventReferees} issues the same
 * `GetEventRefereeList` through {@link VisApiClient} — so it is retried,
 * monitored, cached per event and, above all, **seen by `ApiAuditService`** —
 * and this module keeps only what it exists for: a *synchronous* id → name map
 * that `MatchCard` can read inside a render, where awaiting is not an option.
 */

import { RefereeDirectoryService } from '../services/RefereeDirectoryService';

interface ChallengeReferee {
  noReferee: string;
  firstName: string;
  lastName: string;
  federationCode: string;
  gender: string;
}

interface ChallengeRefereeMap {
  [eventNo: string]: {
    [refereeId: string]: ChallengeReferee;
  };
}

// Global cache for event referee maps
const eventRefereeMapsCache: ChallengeRefereeMap = {};

/**
 * Fetch and cache event referee list from GetEventRefereeList
 */
export async function fetchEventRefereeList(eventNo: string): Promise<void> {
  if (eventRefereeMapsCache[eventNo]) {
    // Already cached
    return;
  }

  try {
    const { referees, error } = await RefereeDirectoryService.getEventReferees(eventNo);

    if (error) {
      console.warn(`[ChallengeRefereeSync] ${error}`);
      // Same contract as before: an empty map, so the next render does not
      // re-request an event the VIS has nothing to say about.
      eventRefereeMapsCache[eventNo] = {};
      return;
    }

    const refereeMap: { [refereeId: string]: ChallengeReferee } = {};

    for (const referee of referees) {
      if (!referee.RefereeId) {
        continue;
      }

      refereeMap[referee.RefereeId] = {
        noReferee: referee.RefereeId,
        firstName: referee.firstName,
        lastName: referee.lastName,
        federationCode: referee.federationCode,
        // VIS gender code arrives as a string here ('0' male, '1' female);
        // the previous parser saw it as a number because it had
        // parseAttributeValue on. Same two outcomes, same fallback.
        gender: referee.gender === '0' ? 'M' : referee.gender === '1' ? 'F' : ''
      };
    }

    eventRefereeMapsCache[eventNo] = refereeMap;
    console.log(`[ChallengeRefereeSync] Cached ${Object.keys(refereeMap).length} referees for event ${eventNo}`);
  } catch (error) {
    console.error('[ChallengeRefereeSync] Error fetching event referee list:', error);
    // Create empty cache to avoid repeated failed requests
    eventRefereeMapsCache[eventNo] = {};
  }
}

/**
 * Get Challenge Referee details synchronously from cached event referee map
 *
 * @param match Match object with EventNo and NoRefereeChallenge
 * @returns Challenge Referee details or null if not found
 */
export function getChallengeRefereeSync(match: any): {
  name: string;
  federationCode: string;
} | null {
  if (!match) return null;

  // Get EventNo from match
  // Note: VIS API returns NoEvent (not EventNo) - check both for compatibility
  const eventNo = match.NoEvent || match.EventNo || match.eventNo;
  if (!eventNo) {
    console.warn('[ChallengeRefereeSync] No EventNo/NoEvent found in match');
    return null;
  }

  // Get Challenge Referee ID
  const challengeRefereeId = match.NoRefereeChallenge?.toString();
  if (!challengeRefereeId) {
    return null; // No Challenge Referee assigned
  }

  // Look up in cached map
  const eventRefereeMap = eventRefereeMapsCache[eventNo];
  if (!eventRefereeMap) {
    console.warn(`[ChallengeRefereeSync] Event referee map not cached for event ${eventNo}`);
    return null;
  }

  const referee = eventRefereeMap[challengeRefereeId];
  if (!referee) {
    console.warn(`[ChallengeRefereeSync] Challenge Referee ID ${challengeRefereeId} not found in event ${eventNo} referee map`);
    return null;
  }

  return {
    name: `${referee.firstName} ${referee.lastName}`.trim(),
    federationCode: referee.federationCode
  };
}

/**
 * Check if event referee map is cached
 */
export function isEventRefereeMapCached(eventNo: string): boolean {
  return !!eventRefereeMapsCache[eventNo];
}

/**
 * Clear cache for specific event
 */
export function clearEventRefereeCache(eventNo: string): void {
  delete eventRefereeMapsCache[eventNo];
}

/**
 * Clear all caches
 */
export function clearAllRefereeCache(): void {
  Object.keys(eventRefereeMapsCache).forEach(key => {
    delete eventRefereeMapsCache[key];
  });
}
