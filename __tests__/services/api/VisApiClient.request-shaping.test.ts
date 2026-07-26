/**
 * @fileoverview VisApiClient — the two request knobs added by issue #47.
 *
 * `RefereeStatsService` was the last service still talking to the VIS with a
 * raw `fetch`, and it had a reason: the client could not express the two
 * requests it needed. Rather than force it, the client was extended —
 *
 *  - `GetBeachMatchListRequest.fields` overrides the default field list, which
 *    does not carry `TournamentGender` / `LocalDateTime` / `Code`;
 *  - `GetEventRefereeListRequest.firstName` / `lastName` narrow the roster.
 *
 * These tests pin the emitted XML and, above all, that **omitting** the new
 * fields changes nothing for every existing caller.
 *
 * `fetch` is mocked; no network.
 */

import { VisApiClient } from '../../../services/api/VisApiClient';
import { VisApiClientConfig } from '../../../types/api-v2';

global.fetch = jest.fn();

describe('VisApiClient — request shaping (issue #47)', () => {
  let client: VisApiClient;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  const testConfig: VisApiClientConfig = {
    baseUrl: 'https://test.fivb.org/Vis2009/XmlRequest.asmx',
    timeoutMs: 1000,
    maxRetries: 1,
    retryDelayMs: 0,
    exponentialBackoff: false,
    headers: {},
    enableLogging: false
  };

  const testRetryConfig = {
    maxAttempts: 1,
    baseDelayMs: 0,
    maxDelayMs: 0,
    exponentialBackoff: false,
    jitterFactor: 0,
    retryableStatusCodes: []
  };

  const lastRequestXml = (): string => {
    const body = String(mockFetch.mock.calls[mockFetch.mock.calls.length - 1]![1]!.body);
    return decodeURIComponent(body.replace(/^Request=/, '').replace(/\+/g, ' '));
  };

  beforeEach(() => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '<Responses />'
    } as Response);

    client = new VisApiClient(testConfig, testRetryConfig);
  });

  describe('GetBeachMatchList field override', () => {
    it('emits exactly the fields the caller asked for', async () => {
      await client.getBeachMatchList({
        eventNo: '1053',
        NoReferee1: '123456',
        fields: ['No', 'TournamentGender', 'LocalDateTime']
      });

      const xml = lastRequestXml();
      expect(xml).toContain('Fields="No TournamentGender LocalDateTime"');
      expect(xml).toContain('NoEvent="1053"');
      expect(xml).toContain('NoReferee1="123456"');
      // The default list must not leak in alongside the override.
      expect(xml).not.toContain('Personnel');
    });

    it('falls back to the default field list when none is given', async () => {
      await client.getBeachMatchList({ tournamentNo: '999' });

      const xml = lastRequestXml();
      expect(xml).toContain('Personnel');
      expect(xml).toContain('NoTournament="999"');
    });

    it('ignores an empty field list rather than emitting Fields=""', async () => {
      await client.getBeachMatchList({ tournamentNo: '999', fields: [] });

      expect(lastRequestXml()).toContain('Personnel');
    });
  });

  describe('GetEventRefereeList name filter', () => {
    it('adds FirstName and LastName to the Filter when supplied', async () => {
      await client.getEventRefereeList({
        eventNo: '1053',
        firstName: 'Anna',
        lastName: 'Rossi',
        fields: ['NoReferee', 'FirstName', 'LastName']
      });

      const xml = lastRequestXml();
      expect(xml).toContain('<Requests>');
      expect(xml).toContain('<Filter NoEvent="1053" FirstName="Anna" LastName="Rossi" />');
    });

    it('emits the pre-#47 request byte for byte when no name is supplied', async () => {
      await client.getEventRefereeList({ eventNo: '1053', fields: ['NoReferee'] });

      expect(lastRequestXml()).toBe(
        '<Requests><Request Type="GetEventRefereeList" Fields="NoReferee"><Filter NoEvent="1053" /></Request></Requests>'
      );
    });

    it('escapes a name that would otherwise break the attribute', async () => {
      await client.getEventRefereeList({ eventNo: '1053', lastName: 'O"Neil & Co' });

      const xml = lastRequestXml();
      expect(xml).toContain('LastName="O&quot;Neil &amp; Co"');
    });
  });
});
