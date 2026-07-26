/**
 * AC7 of issue #47: `ApiAuditService` sees **100%** of the VIS traffic.
 *
 * The claim has two halves, and each is frozen by its own test:
 *
 *  1. Nothing reaches the VIS except through {@link VisApiClient}
 *     — `__tests__/no-direct-vis-fetch.test.ts`.
 *  2. Everything that goes through {@link VisApiClient} is captured
 *     — this file.
 *
 * Together they are the property the issue is about. Before #46 and #47, half 1
 * was false 23 times over, so the API-conformance numbers in CLAUDE.md were
 * computed on a sample that excluded exactly the requests nobody was watching.
 *
 * The audit is `__DEV__`-only; jest sets `__DEV__` to true, which is why this
 * can be measured here and not on a production build.
 */

import { VisApiClient } from '../../../services/api/VisApiClient';
import { ApiAuditService } from '../../../services/monitoring/ApiAuditService';
import { VisApiClientConfig } from '../../../types/api-v2';

global.fetch = jest.fn();

describe('ApiAuditService captures every request VisApiClient issues (issue #47, AC7)', () => {
  let client: VisApiClient;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let audit: ApiAuditService;

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

  beforeEach(() => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '<Responses />'
    } as Response);

    audit = ApiAuditService.getInstance();
    audit.clearAudit();

    client = new VisApiClient(testConfig, testRetryConfig);
  });

  it('captures one request per outgoing POST, across every operation this issue touched', async () => {
    // The endpoints the 10 removed fetches used to reach by hand.
    await client.getEventRefereeList({ eventNo: '1053' });
    await client.getEventRefereeList({ eventNo: '1053', firstName: 'Anna', lastName: 'Rossi' });
    await client.getEvent({ eventNo: '1053', fields: ['No', 'Name', 'AuxiliaryPersons'] });
    await client.getBeachMatchList({ eventNo: '1053', NoReferee1: '123456', fields: ['No', 'TournamentGender'] });
    await client.getBeachMatchList({ NoReferee2: '123456', fields: ['No', 'LocalDateTime'] });
    await client.getBeachLive({ matchNo: 544378 });

    const outgoingPosts = mockFetch.mock.calls.length;
    expect(outgoingPosts).toBe(6);

    // The number that matters: no request escapes the audit.
    expect(audit.getAllRequests()).toHaveLength(outgoingPosts);
  });

  it('captures a failed request too — an error is exactly what an audit must see', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => ''
    } as Response);

    await client.getEventRefereeList({ eventNo: '1053' });

    expect(audit.getAllRequests()).toHaveLength(1);
  });

  it('records the endpoint and the payload of what it captured', async () => {
    await client.getEventRefereeList({ eventNo: '1053', fields: ['NoReferee'] });

    const [captured] = audit.getAllRequests();
    expect(captured).toBeDefined();
    expect(captured!.requestXml).toContain('GetEventRefereeList');
    expect(captured!.requestXml).toContain('NoEvent="1053"');
  });
});
