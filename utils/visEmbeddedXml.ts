/**
 * @fileoverview XML-inside-XML helpers for the VIS API.
 *
 * A few VIS attributes carry a whole XML document escaped inside an attribute
 * value — `Event/@AuxiliaryPersons` and `BeachMatch/@Personnel` are the two the
 * app cares about (issue #40). They must be entity-decoded and re-parsed before
 * they can be read.
 *
 * The decoding is isolated here (instead of being copy-pasted into each caller)
 * so that entity handling is fixed in one place and covered by tests.
 */

import { XMLParser } from 'fast-xml-parser';

/** Named XML/HTML entities that VIS actually emits. */
const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  amp: '&'
};

/**
 * Decode XML entities in a single pass.
 *
 * A single pass matters: chained `.replace()` calls decode `&amp;lt;` into `<`,
 * which is wrong — it must become the literal text `&lt;`. Numeric references
 * are supported too, because VIS embeds line breaks as `&#xD;&#xA;`.
 *
 * Unknown entities are left untouched rather than dropped.
 */
export function decodeXmlEntities(input: string | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }

  return String(input).replace(
    /&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match: string, entity: string): string => {
      if (entity.charAt(0) === '#') {
        const isHex = entity.charAt(1) === 'x' || entity.charAt(1) === 'X';
        const codePoint = isHex
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);

        if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
          return match;
        }

        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return match;
        }
      }

      const decoded = NAMED_ENTITIES[entity.toLowerCase()];
      return decoded === undefined ? match : decoded;
    }
  );
}

/** Parser configured the way every VIS payload in this codebase is read. */
const embeddedParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '_text',
  // Keep values as strings: ids such as "04" must not become numbers.
  parseAttributeValue: false,
  trimValues: true
});

/**
 * Decode and parse an escaped XML document stored in a VIS attribute.
 *
 * @param escapedXml Raw attribute value (entity-escaped XML), may be empty
 * @returns The parsed object, or `null` when the value is empty or unparsable
 */
export function parseEmbeddedXml<T = Record<string, unknown>>(
  escapedXml: string | null | undefined
): T | null {
  const decoded = decodeXmlEntities(escapedXml).trim();
  if (decoded.length === 0) {
    return null;
  }

  try {
    const parsed = embeddedParser.parse(decoded) as T;
    return parsed ?? null;
  } catch {
    // Malformed embedded payloads must never bubble up to the UI.
    return null;
  }
}

/**
 * Normalise fast-xml-parser output: a repeated element is an array, a single
 * occurrence is a bare object, an absent one is `undefined`.
 */
export function toArray<T>(value: T | readonly T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? [...value] : [value as T];
}
