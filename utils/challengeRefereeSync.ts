/**
 * Challenge Referee Synchronous Lookup
 *
 * Provides synchronous access to Challenge Referee names by maintaining
 * a cached map of event referees from GetEventRefereeList.
 *
 * Similar pattern to matchOfficialsSync.ts for Personnel lookup.
 */

import { XMLParser } from 'fast-xml-parser';

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

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '_text',
  parseAttributeValue: true
});

/**
 * Fetch and cache event referee list from GetEventRefereeList
 */
export async function fetchEventRefereeList(eventNo: string): Promise<void> {
  if (eventRefereeMapsCache[eventNo]) {
    // Already cached
    return;
  }

  try {
    const xml = `<Requests>
  <Request Type="GetEventRefereeList"
           Fields="NoReferee FirstName LastName FederationCode Gender">
    <Filter NoEvent="${eventNo}"/>
  </Request>
</Requests>`;

    const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: "POST",
      headers: {
        "Accept": "application/xml",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ Request: xml })
    });

    if (response.ok) {
      const xmlResponse = await response.text();
      const data = parser.parse(xmlResponse);

      const refereeMap: { [refereeId: string]: ChallengeReferee } = {};

      if (data.Responses?.EventReferees?.EventReferee) {
        const referees = Array.isArray(data.Responses.EventReferees.EventReferee)
          ? data.Responses.EventReferees.EventReferee
          : [data.Responses.EventReferees.EventReferee];

        referees.forEach((ref: any) => {
          if (ref.NoReferee) {
            refereeMap[ref.NoReferee.toString()] = {
              noReferee: ref.NoReferee.toString(),
              firstName: ref.FirstName || '',
              lastName: ref.LastName || '',
              federationCode: ref.FederationCode || '',
              gender: ref.Gender === 0 ? 'M' : ref.Gender === 1 ? 'F' : ''
            };
          }
        });
      }

      eventRefereeMapsCache[eventNo] = refereeMap;
      console.log(`[ChallengeRefereeSync] Cached ${Object.keys(refereeMap).length} referees for event ${eventNo}`);
    }
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
