/**
 * Auxiliary Persons Synchronous Lookup
 *
 * Provides synchronous access to Auxiliary Persons (Personnel officials like Scorer, Line Judges)
 * by fetching and caching them from GetEvent API.
 *
 * Similar pattern to challengeRefereeSync.ts for Event Referee lookup.
 */

import { XMLParser } from 'fast-xml-parser';
import { cacheMmkvStorage } from '../services/cache/MmkvStorage';
import { AuxiliaryPerson } from '../types/official';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '_text',
  parseAttributeValue: true
});

// HTML entity decoder
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

/**
 * Fetch and cache auxiliary persons list from GetEvent
 */
export async function fetchEventAuxiliaryPersons(eventNo: string): Promise<void> {
  try {
    // Check if already cached
    const cacheKey = `event:${eventNo}:auxiliaryPersons`;
    const cached = await cacheMmkvStorage.getItem(cacheKey);
    if (cached) {
      console.log('[AuxiliaryPersonsSync] Already cached for event', eventNo);
      return; // Already cached
    }

    console.log('[AuxiliaryPersonsSync] Fetching AuxiliaryPersons for event', eventNo);

    const xml = `<Request Type="GetEvent" No="${eventNo}" Fields="AuxiliaryPersons" />`;

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

      if (data.Event?.AuxiliaryPersons) {
        // Decode HTML entities from AuxiliaryPersons field
        const auxiliaryPersonsXml = he.decode(data.Event.AuxiliaryPersons);
        const auxiliaryPersonsData = parser.parse(auxiliaryPersonsXml);

        const persons: AuxiliaryPerson[] = [];

        if (auxiliaryPersonsData.AuxiliaryPersons?.AuxiliaryPerson) {
          const rawPersons = Array.isArray(auxiliaryPersonsData.AuxiliaryPersons.AuxiliaryPerson)
            ? auxiliaryPersonsData.AuxiliaryPersons.AuxiliaryPerson
            : [auxiliaryPersonsData.AuxiliaryPersons.AuxiliaryPerson];

          rawPersons.forEach((person: any) => {
            persons.push({
              No: person.No?.toString() || '',
              FirstName: person.FirstName || '',
              LastName: person.LastName || '',
              NationalityCode: person.NationalityCode || '',
              Gender: person.Gender === 0 ? 'M' : person.Gender === 1 ? 'F' : '',
              Functions: person.Functions || ''
            });
          });
        }

        // Cache with 2-hour TTL (same as cache warming service)
        const cacheEntry = {
          data: persons,
          expiresAt: Date.now() + (120 * 60 * 1000) // 2 hours
        };

        await cacheMmkvStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
        console.log(`[AuxiliaryPersonsSync] Cached ${persons.length} auxiliary persons for event ${eventNo}`);
      } else {
        console.warn('[AuxiliaryPersonsSync] No AuxiliaryPersons field in response');
      }
    } else {
      console.warn('[AuxiliaryPersonsSync] API request failed:', response.status);
    }
  } catch (error) {
    console.error('[AuxiliaryPersonsSync] Error fetching auxiliary persons:', error);
  }
}
