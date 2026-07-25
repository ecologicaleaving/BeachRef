/**
 * @fileoverview VisApiClient — the referee-directory endpoints added by issue #46.
 *
 * These four endpoints used to be spelled out as raw `fetch` calls inside
 * `app/` screens. What matters here is that the client now produces the *same*
 * requests the screens produced by hand — in particular the `<Requests>`
 * envelope, which these endpoints require: sent bare they answer
 * `<NotInNewFormat id="1008" />` (issue #40).
 *
 * `fetch` is mocked; no network.
 */

import { VisApiClient } from '../../../services/api/VisApiClient';
import { VisApiClientConfig } from '../../../types/api-v2';

global.fetch = jest.fn();

describe('VisApiClient — referee directory endpoints (issue #46)', () => {
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

  /** The decoded `Request=` form parameter of the last call. */
  const lastRequestXml = (): string => {
    const body = String(mockFetch.mock.calls[mockFetch.mock.calls.length - 1]![1]!.body);
    return decodeURIComponent(body.replace(/^Request=/, ''));
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

  it('posts GetRefereeList inside a <Requests> envelope, filtered by sport', async () => {
    const response = await client.getRefereeList({ sport: 'BV', fields: ['NoReferee', 'FirstName'] });

    expect(response.success).toBe(true);
    const xml = lastRequestXml();
    expect(xml).toBe(
      '<Requests><Request Type="GetRefereeList" Fields="NoReferee FirstName"><Filter Sport="BV" /></Request></Requests>'
    );
  });

  it('omits the filter when no sport is given, and falls back to the default fields', async () => {
    await client.getRefereeList();

    const xml = lastRequestXml();
    expect(xml).toContain('<Requests><Request Type="GetRefereeList"');
    expect(xml).not.toContain('<Filter');
    expect(xml).toContain('NoReferee FirstName LastName');
  });

  it('posts GetReferee with the VISId the screens used', async () => {
    await client.getReferee({ refereeNo: '123456' });

    expect(lastRequestXml()).toBe(
      '<Requests><Request Type="GetReferee" No="123456" VISId="VIS" /></Requests>'
    );
  });

  it('posts GetImageList with the portrait DataType/ImageType pair', async () => {
    await client.getImageList({ dataType: '61', dataNo: '123456', imageType: '15' });

    expect(lastRequestXml()).toBe(
      '<Requests><Request Type="GetImageList" Fields="No">' +
      '<Filter DataType="61" DataNo="123456" ImageType="15" />' +
      '</Request></Requests>'
    );
  });

  it('posts GetRefereeIdCard for the requested discipline', async () => {
    await client.getRefereeIdCard({ refereeNo: '123456', volleyType: 'Beach' });

    expect(lastRequestXml()).toBe(
      '<Requests><Request Type="GetRefereeIdCard" No="123456" VolleyType="Beach" /></Requests>'
    );
  });

  it('goes through the POST form-encoded transport, like every other endpoint', async () => {
    await client.getRefereeList({ sport: 'BV' });

    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe(testConfig.baseUrl);
    expect(init!.method).toBe('POST');
    expect((init!.headers as Record<string, string>)['Content-Type'])
      .toBe('application/x-www-form-urlencoded');
    expect(String(init!.body)).toMatch(/^Request=/);
  });

  it('escapes attribute values instead of letting them break the XML', async () => {
    await client.getReferee({ refereeNo: '12"34&56' });

    const xml = lastRequestXml();
    expect(xml).not.toContain('No="12"34');
    expect(xml).toContain('&quot;');
    expect(xml).toContain('&amp;');
  });

  it('returns an error response rather than throwing when the transport fails', async () => {
    mockFetch.mockRejectedValue(new Error('socket hang up'));

    const response = await client.getRefereeList({ sport: 'BV' });

    expect(response.success).toBe(false);
  });
});
