/**
 * Test del parser VIS del worker di backfill (issue #90).
 *
 *   cd supabase/functions/backfill-worker && deno task test
 *
 * Prova la parte PURA — parsing, costruzione delle richieste, fan-out — che e'
 * l'unica del worker che si possa provare senza rete. Prelievo, backoff e
 * recupero delle unita' abbandonate stanno in SQL e hanno il loro test:
 * `supabase/tests/sync_backlog.test.sql`.
 */

import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1';
import {
  buildEventListRequest,
  buildMatchListRequest,
  mapWithConcurrency,
  parseElements,
  parseEvents,
  parseMatches,
  seasonFromDate,
} from '../vis.ts';

/**
 * Il VIS restituisce elementi AUTO-CHIUSI. E' il dettaglio su cui il parser di
 * `vis-adapter` non funzionerebbe: cerca `<Match ...>(.*?)</Match>`, che su un
 * elemento auto-chiuso non trova nulla.
 */
const MATCH_XML = `<?xml version="1.0" encoding="utf-8"?>
<Responses>
  <BeachMatchList>
    <BeachMatch No="499650" NoEvent="8242" NoTournament="8242" LocalDate="2025-09-17"
      LocalTime="15:00:00" Court="CC" Status="15" Round="Pool A"
      TeamAName="Mol, A./S&#248;rum, C." TeamBName="Pedrosa/Campos"
      MatchPointsA="1" MatchPointsB="2"
      PointsTeamASet1="19" PointsTeamBSet1="21"
      NoReferee1="155755" NoReferee2="155756"
      Referee1Name="Lowry Suzanne" Referee2Name="Vachutka Milan"
      Referee1FederationCode="USA" Referee2FederationCode="CZE" />
    <BeachMatch No="499651" NoEvent="8242" LocalDate="2025-09-17"
      NoReferee1="155755" Referee1Name="Lowry Suzanne" Referee1FederationCode="USA" />
    <BeachMatch No="499652" NoEvent="8242" NoReferee1="" Referee1Name="" />
  </BeachMatchList>
</Responses>`;

Deno.test('parseMatches legge gli elementi auto-chiusi del VIS', () => {
  const matches = parseMatches(MATCH_XML);
  assertEquals(matches.length, 3);
  assertEquals(matches[0].no, '499650');
  assertEquals(matches[0].court, 'CC');
  assertEquals(matches[0].matchPointsB, 2);
  assertEquals(matches[0].pointsTeamASet1, 19);
});

Deno.test('parseMatches estrae gli identificativi arbitro, che sono il punto della issue', () => {
  const [m] = parseMatches(MATCH_XML);
  assertEquals(m.noReferee1, '155755');
  assertEquals(m.noReferee2, '155756');
  // I nomi si leggono, ma non sono la chiave di join: "Lowry Suzanne" ha il
  // cognome per primo, mentre `referees.referee_id` ha il nome per primo.
  assertEquals(m.referee1Name, 'Lowry Suzanne');
});

Deno.test('la stringa vuota del VIS diventa undefined, non ""', () => {
  const m = parseMatches(MATCH_XML)[2];
  // Il VIS scrive `NoReferee1=""` per "nessun arbitro". Trattarlo come stringa
  // vuota produrrebbe un'assegnazione verso un arbitro inesistente.
  assertEquals(m.noReferee1, undefined);
  assertEquals(m.referee1Name, undefined);
});

Deno.test('le entita XML sono decodificate, comprese le numeriche', () => {
  const [m] = parseMatches(MATCH_XML);
  // `&#248;` -> `ø`. Il VIS le usa per ogni nome nordico, ceco o portoghese
  // del circuito: senza, finivano nel database come `S&#248;rum` e da li' su
  // una schermata.
  assertEquals(m.teamAName, 'Mol, A./Sørum, C.');

  const hex = parseMatches(`<Responses><BeachMatch No="1" TeamAName="S&#xF8;rum &amp; Mol" /></Responses>`);
  assertEquals(hex[0].teamAName, 'Sørum & Mol');

  // `&amp;` si scioglie per ultimo: `&amp;#248;` deve restare il testo
  // letterale `&#248;`, non diventare `ø` — il VIS non aveva mandato quel
  // carattere.
  const literal = parseMatches(`<Responses><BeachMatch No="1" Court="&amp;#248;" /></Responses>`);
  assertEquals(literal[0].court, '&#248;');
});

Deno.test('una partita senza No viene scartata', () => {
  const xml = `<Responses><BeachMatch Court="CC" /><BeachMatch No="1" /></Responses>`;
  const matches = parseMatches(xml);
  // Senza `No` la riga non e' indirizzabile: non si puo' fare upsert ne'
  // ritrovarla.
  assertEquals(matches.length, 1);
  assertEquals(matches[0].no, '1');
});

Deno.test('XML ostile viene rifiutato', () => {
  assertThrows(
    () => parseElements('<!DOCTYPE foo [<!ENTITY x "y">]><Responses/>', 'BeachMatch'),
    Error,
    'DOCTYPE',
  );
});

Deno.test('parseEvents ricava la stagione dalla data quando Season manca', () => {
  const xml = `<Responses>
    <BeachEvent No="8242" Name="World Tour" StartDate="2025-09-15" />
    <BeachEvent No="9001" Name="Altro" StartDate="2026-03-01" Season="2026" />
  </Responses>`;
  const events = parseEvents(xml);
  assertEquals(events.length, 2);
  assertEquals(events[0].season, 2025);
  assertEquals(events[1].season, 2026);
});

Deno.test('seasonFromDate rifiuta cio che non e una data plausibile', () => {
  assertEquals(seasonFromDate(undefined), undefined);
  assertEquals(seasonFromDate('non-una-data'), undefined);
  assertEquals(seasonFromDate('1200-01-01'), undefined);
  assertEquals(seasonFromDate('2026-08-02'), 2026);
});

Deno.test('le richieste chiedono NoReferee1/NoReferee2 e filtrano per evento', () => {
  const req = buildMatchListRequest('8242');
  assertEquals(req.includes('NoEvent="8242"'), true);
  assertEquals(req.includes('NoReferee1'), true);
  assertEquals(req.includes('NoReferee2'), true);
  assertEquals(req.includes('GetBeachMatchList'), true);
});

Deno.test('gli attributi sono escapati', () => {
  const req = buildMatchListRequest('82"42');
  assertEquals(req.includes('82"42'), false);
  assertEquals(req.includes('&quot;'), true);
});

Deno.test('buildEventListRequest include la stagione solo se fornita', () => {
  assertEquals(buildEventListRequest(2026).includes('Season="2026"'), true);
  assertEquals(buildEventListRequest().includes('Season='), false);
});

Deno.test('mapWithConcurrency non supera mai il limite', async () => {
  let inFlight = 0;
  let peak = 0;
  const items = Array.from({ length: 20 }, (_, i) => i);

  const out = await mapWithConcurrency(items, 2, async (n) => {
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    return n * 2;
  });

  // E' la proprieta' che protegge dal throttling del VIS: la issue #65 ha
  // mostrato cosa succede lanciando ~600 richieste insieme.
  assertEquals(peak <= 2, true);
  assertEquals(out.length, 20);
  assertEquals(out[19], 38);
});

Deno.test('mapWithConcurrency conserva l ordine dei risultati', async () => {
  const out = await mapWithConcurrency([3, 1, 2], 3, async (n) => {
    await new Promise((r) => setTimeout(r, n * 10));
    return n;
  });
  // I risultati vanno per indice, non per ordine di completamento.
  assertEquals(out, [3, 1, 2]);
});

Deno.test('un errore in mapWithConcurrency non resta silenzioso', async () => {
  await assertRejects(
    () => mapWithConcurrency([1, 2], 2, async (n) => {
      if (n === 2) throw new Error('boom');
      return n;
    }),
    Error,
    'boom',
  );
});
