/**
 * Unit tests for VIS API Timezone Enhancement Processor
 * Tests timezone field extraction, validation, and UTC conversion
 */

import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { VISApiTimezoneEnhancer } from '../../functions/vis-adapter/timezone-processor.ts';

Deno.test('VISApiTimezoneEnhancer - Field Extraction', async (t) => {
  const enhancer = new VISApiTimezoneEnhancer();

  await t.step('extracts timezone fields from VIS match XML', () => {
    const matchXml = `
      <Match>
        <BeginDateTimeUtc>2025-01-15T18:00:00Z</BeginDateTimeUtc>
        <EndDateTimeUtc>2025-01-15T20:00:00Z</EndDateTimeUtc>
        <UtcDate>2025-01-15</UtcDate>
        <UtcTime>18:00:00</UtcTime>
        <LocalDate>2025-01-15</LocalDate>
        <LocalTime>15:00:00</LocalTime>
        <LocalTimeOffset>-03:00</LocalTimeOffset>
        <TimeZone>America/Sao_Paulo</TimeZone>
      </Match>
    `;

    const fields = enhancer.extractTimezoneFields(matchXml);

    assertEquals(fields.BeginDateTimeUtc, '2025-01-15T18:00:00Z');
    assertEquals(fields.EndDateTimeUtc, '2025-01-15T20:00:00Z');
    assertEquals(fields.UtcDate, '2025-01-15');
    assertEquals(fields.UtcTime, '18:00:00');
    assertEquals(fields.LocalDate, '2025-01-15');
    assertEquals(fields.LocalTime, '15:00:00');
    assertEquals(fields.LocalTimeOffset, '-03:00');
    assertEquals(fields.TimeZone, 'America/Sao_Paulo');
  });

  await t.step('extracts tournament timezone defaults', () => {
    const tournamentXml = `
      <Tournament>
        <DefaultTimeZone>Europe/Rome</DefaultTimeZone>
        <DefaultLocalTimeOffset>+01:00</DefaultLocalTimeOffset>
        <City>Rome</City>
        <Country>Italy</Country>
      </Tournament>
    `;

    const defaults = enhancer.extractTournamentTimezoneDefaults(tournamentXml);

    assertEquals(defaults.DefaultTimeZone, 'Europe/Rome');
    assertEquals(defaults.DefaultLocalTimeOffset, '+01:00');
    assertEquals(defaults.City, 'Rome');
    assertEquals(defaults.Country, 'Italy');
  });

  await t.step('handles missing timezone fields gracefully', () => {
    const incompleteXml = `
      <Match>
        <LocalDate>2025-01-15</LocalDate>
        <LocalTime>15:00:00</LocalTime>
      </Match>
    `;

    const fields = enhancer.extractTimezoneFields(incompleteXml);

    assertEquals(fields.BeginDateTimeUtc, undefined);
    assertEquals(fields.LocalDate, '2025-01-15');
    assertEquals(fields.LocalTime, '15:00:00');
    assertEquals(fields.LocalTimeOffset, undefined);
  });
});

Deno.test('VISApiTimezoneEnhancer - Data Validation', async (t) => {
  const enhancer = new VISApiTimezoneEnhancer();

  await t.step('validates timezone data quality', () => {
    const validFields = {
      BeginDateTimeUtc: '2025-01-15T18:00:00Z',
      UtcDate: '2025-01-15',
      UtcTime: '18:00:00',
      LocalTimeOffset: '+01:00',
      TimeZone: 'Europe/Rome',
    };

    const result = enhancer.validateTimezoneData(validFields);
    assertEquals(result.isValid, true);
    assertEquals(result.issues.length, 0);
  });

  await t.step('identifies invalid timezone data', () => {
    const invalidFields = {
      BeginDateTimeUtc: 'invalid-date',
      UtcDate: '2025-13-45', // Invalid date
      UtcTime: '25:99:99', // Invalid time
      LocalTimeOffset: 'invalid-offset',
      TimeZone: '',
    };

    const result = enhancer.validateTimezoneData(invalidFields);
    assertEquals(result.isValid, false);
    assertEquals(result.issues.length > 0, true);
  });

  await t.step('validates timezone offset formats', () => {
    const invalidOffsetFields = {
      LocalTimeOffset: 'GMT+3', // Not in +/-HH:MM format
    };

    const result = enhancer.validateTimezoneData(invalidOffsetFields);
    assertEquals(result.isValid, false);
    assertEquals(result.issues.some(issue => issue.includes('LocalTimeOffset')), true);
  });
});

Deno.test('VISApiTimezoneEnhancer - UTC Conversion Priority Cascade', async (t) => {
  const enhancer = new VISApiTimezoneEnhancer();

  await t.step('priority 1: uses BeginDateTimeUtc when available', () => {
    const fields = {
      BeginDateTimeUtc: '2025-01-15T18:00:00Z',
      EndDateTimeUtc: '2025-01-15T20:00:00Z',
      UtcDate: '2025-01-15',
      UtcTime: '19:00:00', // Different time to verify priority
      LocalDate: '2025-01-15',
      LocalTime: '15:00:00',
    };

    const result = enhancer.convertToUtc(fields);

    assertEquals(result.utcStart, '2025-01-15T18:00:00Z');
    assertEquals(result.utcEnd, '2025-01-15T20:00:00Z');
    assertEquals(result.timezoneSource, 'BeginDateTimeUtc');
    assertEquals(result.isReliable, true);
  });

  await t.step('priority 2: uses UtcDate + UtcTime when BeginDateTimeUtc unavailable', () => {
    const fields = {
      UtcDate: '2025-01-15',
      UtcTime: '18:00:00',
      LocalDate: '2025-01-15',
      LocalTime: '15:00:00', // Different time to verify priority
    };

    const result = enhancer.convertToUtc(fields);

    assertEquals(result.utcStart, '2025-01-15T18:00:00Z');
    assertEquals(result.timezoneSource, 'UtcDateTime');
    assertEquals(result.isReliable, true);
  });

  await t.step('priority 3: uses LocalDate + LocalTime + Offset when UTC unavailable', () => {
    const fields = {
      LocalDate: '2025-01-15',
      LocalTime: '15:00:00',
      LocalTimeOffset: '-03:00',
    };

    const result = enhancer.convertToUtc(fields);

    assertEquals(result.utcStart, '2025-01-15T18:00:00.000Z');
    assertEquals(result.timezoneSource, 'LocalDateTime');
    assertEquals(result.isReliable, false); // Less reliable due to manual conversion
  });

  await t.step('fallback: returns null UTC when insufficient data', () => {
    const fields = {
      TimeZone: 'Europe/Rome',
    };

    const result = enhancer.convertToUtc(fields);

    assertEquals(result.utcStart, null);
    assertEquals(result.timezoneSource, 'fallback');
    assertEquals(result.isReliable, false);
    assertEquals(result.timezone, 'Europe/Rome');
  });
});

Deno.test('VISApiTimezoneEnhancer - Tournament Defaults Integration', async (t) => {
  const enhancer = new VISApiTimezoneEnhancer();

  await t.step('uses tournament defaults when match fields missing', () => {
    const fields = {
      LocalDate: '2025-01-15',
      LocalTime: '15:00:00',
    };

    const tournamentDefaults = {
      DefaultTimeZone: 'Europe/Rome',
      DefaultLocalTimeOffset: '+01:00',
    };

    const result = enhancer.convertToUtc(fields, tournamentDefaults);

    assertEquals(result.timezone, 'Europe/Rome');
    assertEquals(result.offset, '+01:00');
  });

  await t.step('match fields override tournament defaults', () => {
    const fields = {
      LocalDate: '2025-01-15',
      LocalTime: '15:00:00',
      TimeZone: 'America/Sao_Paulo',
      LocalTimeOffset: '-03:00',
    };

    const tournamentDefaults = {
      DefaultTimeZone: 'Europe/Rome',
      DefaultLocalTimeOffset: '+01:00',
    };

    const result = enhancer.convertToUtc(fields, tournamentDefaults);

    assertEquals(result.timezone, 'America/Sao_Paulo'); // Match field takes priority
    assertEquals(result.offset, '-03:00'); // Match field takes priority
  });
});

Deno.test('VISApiTimezoneEnhancer - Error Handling', async (t) => {
  const enhancer = new VISApiTimezoneEnhancer();

  await t.step('handles malformed XML gracefully', () => {
    const malformedXml = '<InvalidXML><Broken>';

    const fields = enhancer.extractTimezoneFields(malformedXml);

    // Should return empty fields without throwing
    assertEquals(fields.BeginDateTimeUtc, undefined);
    assertEquals(fields.LocalDate, undefined);
  });

  await t.step('processes match with fallback when conversion fails', () => {
    const problematicXml = `
      <Match>
        <LocalDate>invalid-date</LocalDate>
        <LocalTime>invalid-time</LocalTime>
        <LocalTimeOffset>invalid-offset</LocalTimeOffset>
      </Match>
    `;

    const result = enhancer.processMatchWithFallback(problematicXml);

    assertEquals(result.utcStart, null);
    assertEquals(result.timezoneSource, 'fallback');
    assertEquals(result.isReliable, false);
  });

  await t.step('maintains existing functionality when timezone enhancement fails', () => {
    const xmlWithBasicData = `
      <Match>
        <Code>MATCH123</Code>
        <TournamentCode>TOUR456</TournamentCode>
        <LocalDate>2025-01-15</LocalDate>
        <LocalTime>15:00:00</LocalTime>
      </Match>
    `;

    // Should not throw and should provide fallback result
    const result = enhancer.processMatchWithFallback(xmlWithBasicData);

    assertEquals(result.timezoneSource, 'fallback');
    assertEquals(result.isReliable, false);
  });
});

Deno.test('VISApiTimezoneEnhancer - Real-world Scenarios', async (t) => {
  const enhancer = new VISApiTimezoneEnhancer();

  await t.step('handles Brazil tournament timezone data', () => {
    const brazilMatchXml = `
      <Match>
        <LocalDate>2025-01-15</LocalDate>
        <LocalTime>15:00:00</LocalTime>
        <LocalTimeOffset>-03:00</LocalTimeOffset>
        <TimeZone>BRT</TimeZone>
      </Match>
    `;

    const result = enhancer.processMatchWithFallback(brazilMatchXml);

    assertEquals(result.utcStart, '2025-01-15T18:00:00.000Z');
    assertEquals(result.timezone, 'BRT');
    assertEquals(result.offset, '-03:00');
  });

  await t.step('handles European tournament timezone data', () => {
    const europeMatchXml = `
      <Match>
        <BeginDateTimeUtc>2025-01-15T17:00:00Z</BeginDateTimeUtc>
        <TimeZone>Europe/Rome</TimeZone>
      </Match>
    `;

    const result = enhancer.processMatchWithFallback(europeMatchXml);

    assertEquals(result.utcStart, '2025-01-15T17:00:00Z');
    assertEquals(result.timezone, 'Europe/Rome');
    assertEquals(result.timezoneSource, 'BeginDateTimeUtc');
    assertEquals(result.isReliable, true);
  });

  await t.step('handles Asian tournament with missing timezone fields', () => {
    const asiaMatchXml = `
      <Match>
        <LocalDate>2025-01-15</LocalDate>
        <LocalTime>15:00:00</LocalTime>
      </Match>
    `;

    const asianDefaults = {
      DefaultTimeZone: 'Asia/Tokyo',
      DefaultLocalTimeOffset: '+09:00',
    };

    const result = enhancer.processMatchWithFallback(asiaMatchXml, asianDefaults);

    assertEquals(result.timezone, 'Asia/Tokyo');
    assertEquals(result.offset, '+09:00');
    assertEquals(result.timezoneSource, 'fallback');
  });
});