/**
 * Synchronous Match Officials Utilities
 *
 * Provides synchronous access to cached official data for match cards.
 * Uses MMKV cache only - no API calls.
 *
 * @see specs/006-match-officials-display
 */

import { cacheMmkvStorage } from '../services/cache/MmkvStorage';
import { AuxiliaryPerson, PersonnelData } from '../types/official';
import { XMLParser } from 'fast-xml-parser';

// HTML entity decoder (same as used in VisResponseParser)
const he = {
  decode: (text: string): string => {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }
};

interface CompactOfficial {
  role: 'SC' | 'ASC' | 'LJ1' | 'LJ2' | 'LJ3' | 'LJ4';
  name: string;
  federationCode: string;
}

/**
 * Parse Personnel field (HTML-encoded XML) to get official IDs
 */
function parsePersonnelField(personnelXml: string | undefined): PersonnelData | null {
  if (!personnelXml) return null;

  try {
    // Decode HTML entities
    const decodedXml = he.decode(personnelXml);

    // Parse XML
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
    const parsed = parser.parse(decodedXml);

    if (!parsed.Personnel) return null;

    const personnel = parsed.Personnel;
    return {
      Scorer: personnel.Scorer ? parseInt(personnel.Scorer, 10) : undefined,
      AssistantScorer: personnel.AssistantScorer ? parseInt(personnel.AssistantScorer, 10) : undefined,
      LineJudge1: personnel.LineJudge1 ? parseInt(personnel.LineJudge1, 10) : undefined,
      LineJudge2: personnel.LineJudge2 ? parseInt(personnel.LineJudge2, 10) : undefined,
      LineJudge3: personnel.LineJudge3 ? parseInt(personnel.LineJudge3, 10) : undefined,
      LineJudge4: personnel.LineJudge4 ? parseInt(personnel.LineJudge4, 10) : undefined,
    };
  } catch (error) {
    console.warn('[matchOfficialsSync] Failed to parse Personnel field:', error);
    return null;
  }
}

/**
 * Get supporting officials from cache (synchronous, no API calls)
 *
 * @param match Match object with Personnel and EventNo fields
 * @returns Array of compact officials, or empty array if data not cached
 */
export function getSupportingOfficialsSync(match: any): CompactOfficial[] {
  try {
    // Note: VIS API returns NoEvent (not EventNo) - check both for compatibility
    const eventNo = match.NoEvent || match.EventNo || match.eventNo;
    const personnel = match.Personnel || match.personnel;

    if (!eventNo || !personnel) {
      // Debug log to see what's missing
      if (__DEV__) {
        console.log('[matchOfficialsSync] Missing data:', {
          hasEventNo: !!eventNo,
          hasPersonnel: !!personnel,
          personnelSample: personnel ? personnel.substring(0, 100) : 'none'
        });
      }
      return [];
    }

    // Try to get AuxiliaryPersons from cache (synchronous)
    const cacheKey = `event:${eventNo}:auxiliaryPersons`;
    // Access underlying MMKV storage for synchronous getString() during render
    const cachedData = cacheMmkvStorage.getRawStorage().getString(cacheKey);

    if (!cachedData) {
      if (__DEV__) {
        console.log(`[matchOfficialsSync] No cached AuxiliaryPersons for event ${eventNo}`);
      }
      return []; // Data not in cache yet
    }

    // Parse cache entry (format: { data: [...], expiresAt: number })
    const cacheEntry = JSON.parse(cachedData);

    // Check expiration
    if (cacheEntry.expiresAt && Date.now() > cacheEntry.expiresAt) {
      if (__DEV__) {
        console.log(`[matchOfficialsSync] Cached AuxiliaryPersons expired for event ${eventNo}`);
      }
      return [];
    }

    const auxiliaryPersons: AuxiliaryPerson[] = cacheEntry.data || [];

    if (__DEV__) {
      console.log(`[matchOfficialsSync] Found ${auxiliaryPersons.length} auxiliary persons for event ${eventNo}`);
    }

    // Parse Personnel field
    const personnelData = parsePersonnelField(personnel);
    if (!personnelData) {
      if (__DEV__) {
        console.log('[matchOfficialsSync] Failed to parse Personnel field');
      }
      return [];
    }

    if (__DEV__) {
      console.log('[matchOfficialsSync] Parsed Personnel:', personnelData);
    }

    const officials: CompactOfficial[] = [];

    // Map Scorer
    if (personnelData.Scorer) {
      const person = auxiliaryPersons.find(p => p.No === personnelData.Scorer.toString());
      if (person) {
        officials.push({
          role: 'SC',
          name: `${person.LastName}, ${person.FirstName.charAt(0)}.`,
          federationCode: person.NationalityCode
        });
      }
    }

    // Map Assistant Scorer
    if (personnelData.AssistantScorer) {
      const person = auxiliaryPersons.find(p => p.No === personnelData.AssistantScorer.toString());
      if (person) {
        officials.push({
          role: 'ASC',
          name: `${person.LastName}, ${person.FirstName.charAt(0)}.`,
          federationCode: person.NationalityCode
        });
      }
    }

    // Map Line Judges
    const lineJudgeIds = [
      { id: personnelData.LineJudge1, role: 'LJ1' as const },
      { id: personnelData.LineJudge2, role: 'LJ2' as const },
      { id: personnelData.LineJudge3, role: 'LJ3' as const },
      { id: personnelData.LineJudge4, role: 'LJ4' as const },
    ];

    for (const lj of lineJudgeIds) {
      if (lj.id) {
        const person = auxiliaryPersons.find(p => p.No === lj.id.toString());
        if (person) {
          officials.push({
            role: lj.role,
            name: `${person.LastName}, ${person.FirstName.charAt(0)}.`,
            federationCode: person.NationalityCode
          });
        }
      }
    }

    return officials;
  } catch (error) {
    console.warn('[matchOfficialsSync] Error getting supporting officials:', error);
    return [];
  }
}
