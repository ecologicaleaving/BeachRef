/**
 * @fileoverview Unit tests for new VIS API endpoints
 * Tests GetBeachTournamentList and GetBeachRoundList implementations
 * Part of EPIC-VIS-001: VIS API Guide Compliance
 */

import { VisApiClient } from '../../../services/api/VisApiClient';
import {
  VisApiClientConfig,
  VisApiEndpoint,
  GetBeachTournamentListRequest,
  GetBeachRoundListRequest,
  DEFAULT_FIELD_SELECTIONS,
  DEFAULT_RETRY_CONFIG
} from '../../../types/api-v2';

// Mock fetch globally
global.fetch = jest.fn();

describe('VisApiClient - Beach Endpoints', () => {
  let client: VisApiClient;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  
  const testConfig: VisApiClientConfig = {
    baseUrl: 'https://test.fivb.org/Vis2009/XmlRequest.asmx',
    timeoutMs: 1000,
    maxRetries: 1,
    retryDelayMs: 100,
    exponentialBackoff: false,
    headers: {},
    enableLogging: false
  };

  beforeEach(() => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    
    const testRetryConfig = {
      maxAttempts: 1,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialBackoff: false,
      jitterFactor: 0,
      retryableStatusCodes: []
    };
    
    client = new VisApiClient(testConfig, testRetryConfig);
  });

  describe('getBeachTournamentList', () => {
    const mockTournamentListResponse = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetBeachTournamentListResponse xmlns="http://www.fivb.org/vis/2009/XmlRequest">
      <GetBeachTournamentListResult>
        <Tournaments>
          <Tournament>
            <No>123</No>
            <Name>Test Tournament</Name>
            <CountryCode>USA</CountryCode>
            <City>Miami</City>
            <StartDate>2025-08-21</StartDate>
            <EndDate>2025-08-23</EndDate>
            <Gender>M</Gender>
            <Level>Elite</Level>
            <Status>Running</Status>
          </Tournament>
        </Tournaments>
      </GetBeachTournamentListResult>
    </GetBeachTournamentListResponse>
  </soap:Body>
</soap:Envelope>`;

    it('should make successful request with default fields', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(mockTournamentListResponse),
        status: 200,
        statusText: 'OK'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const request: GetBeachTournamentListRequest = {
        dateFrom: '2025-08-01',
        dateTo: '2025-08-31',
        status: 'Running'
      };

      const result = await client.getBeachTournamentList(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.xmlData).toBe(mockTournamentListResponse);
      }
      
      expect(mockFetch).toHaveBeenCalledWith(
        testConfig.baseUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: expect.stringContaining('GetBeachTournamentList')
        })
      );
    });

    it('should use custom fields when provided', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(mockTournamentListResponse)
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const customFields = ['No', 'Name', 'Status'];
      const request: GetBeachTournamentListRequest = {
        fields: customFields,
        gender: 'W'
      };

      await client.getBeachTournamentList(request);

      const callBody = mockFetch.mock.calls[0][1]?.body as string;
      const decodedBody = decodeURIComponent(callBody.replace('Request=', ''));
      expect(decodedBody).toContain(`Fields="${customFields.join(' ')}"`);
    });

    it('should build correct XML with filters', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(mockTournamentListResponse)
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const request: GetBeachTournamentListRequest = {
        dateFrom: '2025-08-01',
        dateTo: '2025-08-31',
        status: 'Running,Scheduled',
        gender: 'M',
        countryCode: 'USA'
      };

      await client.getBeachTournamentList(request);

      const callBody = mockFetch.mock.calls[0][1]?.body as string;
      const decodedBody = decodeURIComponent(callBody.replace('Request=', ''));
      expect(decodedBody).toContain('DateFrom="2025-08-01"');
      expect(decodedBody).toContain('DateTo="2025-08-31"');
      expect(decodedBody).toContain('Status="Running,Scheduled"');
      expect(decodedBody).toContain('Gender="M"');
      expect(decodedBody).toContain('CountryCode="USA"');
    });

    it('should handle API errors correctly', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const request: GetBeachTournamentListRequest = {};
      const result = await client.getBeachTournamentList(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('HTTP 500');
      }
    });

    it('should update monitoring metrics', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(mockTournamentListResponse)
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const initialMonitor = client.getMonitor();
      const initialCount = initialMonitor.requestsByEndpoint[VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST];

      await client.getBeachTournamentList({});

      const updatedMonitor = client.getMonitor();
      expect(updatedMonitor.requestsByEndpoint[VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST])
        .toBe(initialCount + 1);
      expect(updatedMonitor.totalRequests).toBe(initialMonitor.totalRequests + 1);
      expect(updatedMonitor.successfulRequests).toBe(initialMonitor.successfulRequests + 1);
    });
  });

  describe('getBeachRoundList', () => {
    const mockRoundListResponse = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetBeachRoundListResponse xmlns="http://www.fivb.org/vis/2009/XmlRequest">
      <GetBeachRoundListResult>
        <Rounds>
          <Round>
            <No>1</No>
            <Name>Pool A</Name>
            <Phase>Pool</Phase>
            <Order>1</Order>
          </Round>
          <Round>
            <No>2</No>
            <Name>Pool B</Name>
            <Phase>Pool</Phase>
            <Order>2</Order>
          </Round>
        </Rounds>
      </GetBeachRoundListResult>
    </GetBeachRoundListResponse>
  </soap:Body>
</soap:Envelope>`;

    it('should make successful request with tournament filtering', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(mockRoundListResponse),
        status: 200,
        statusText: 'OK'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const request: GetBeachRoundListRequest = {
        tournamentNo: '123',
        includeTeams: true,
        includeMatches: false
      };

      const result = await client.getBeachRoundList(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.xmlData).toBe(mockRoundListResponse);
      }
    });

    it('should build correct XML with tournament filtering', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(mockRoundListResponse)
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const request: GetBeachRoundListRequest = {
        tournamentNo: '456',
        includeTeams: true,
        includeMatches: false
      };

      await client.getBeachRoundList(request);

      const callBody = mockFetch.mock.calls[0][1]?.body as string;
      const decodedBody = decodeURIComponent(callBody.replace('Request=', ''));
      expect(decodedBody).toContain('NoTournament="456"');
      expect(decodedBody).toContain('IncludeTeams="true"');
      expect(decodedBody).toContain('IncludeMatches="false"');
    });

    it('should use default fields when not specified', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(mockRoundListResponse)
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const request: GetBeachRoundListRequest = {
        tournamentNo: '789'
      };

      await client.getBeachRoundList(request);

      const expectedFields = DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_ROUND_LIST].join(' ');
      const callBody = mockFetch.mock.calls[0][1]?.body as string;
      const decodedBody = decodeURIComponent(callBody.replace('Request=', ''));
      expect(decodedBody).toContain(`Fields="${expectedFields}"`);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const request: GetBeachRoundListRequest = {
        tournamentNo: '123'
      };

      const result = await client.getBeachRoundList(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Network error');
      }
    });

    it('should update monitoring metrics for failures', async () => {
      mockFetch.mockRejectedValue(new Error('Test error'));

      const initialMonitor = client.getMonitor();
      const initialFailures = initialMonitor.failedRequests;

      await client.getBeachRoundList({ tournamentNo: '123' });

      const updatedMonitor = client.getMonitor();
      expect(updatedMonitor.failedRequests).toBe(initialFailures + 1);
      expect(updatedMonitor.errorsByType['UNKNOWN_ERROR']).toBeGreaterThan(0);
    });
  });

  describe('XML Request Building', () => {
    it('should build valid XML for GetBeachTournamentList without filters', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('<Response />')
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await client.getBeachTournamentList({});

      const callBody = mockFetch.mock.calls[0][1]?.body as string;
      const decodedBody = decodeURIComponent(callBody.replace('Request=', ''));
      
      expect(decodedBody).toContain('<Request Type="GetBeachTournamentList"');
      expect(decodedBody).toContain('Fields=');
      expect(decodedBody).toContain('</Request>');
    });

    it('should build valid XML for GetBeachRoundList with all options', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('<Response />')
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const request: GetBeachRoundListRequest = {
        tournamentNo: '999',
        includeTeams: true,
        includeMatches: true,
        fields: ['No', 'Name', 'Phase']
      };

      await client.getBeachRoundList(request);

      const callBody = mockFetch.mock.calls[0][1]?.body as string;
      const decodedBody = decodeURIComponent(callBody.replace('Request=', ''));
      
      expect(decodedBody).toContain('<Request Type="GetBeachRoundList"');
      expect(decodedBody).toContain('Fields="No Name Phase"');
      expect(decodedBody).toContain('<Filter NoTournament="999" IncludeTeams="true" IncludeMatches="true"');
    });

    it('should properly escape XML special characters in request parameters', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('<Response />')
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Test with potentially dangerous XML characters
      const request: GetBeachTournamentListRequest = {
        dateFrom: '2025-08-01',
        dateTo: '2025-08-31',
        status: 'Running & Scheduled',
        countryCode: 'US&CA',
        gender: 'M"W'
      };

      await client.getBeachTournamentList(request);

      const callBody = mockFetch.mock.calls[0][1]?.body as string;
      const decodedBody = decodeURIComponent(callBody.replace('Request=', ''));
      
      // Verify XML escaping is applied
      expect(decodedBody).toContain('Status="Running &amp; Scheduled"');
      expect(decodedBody).toContain('CountryCode="US&amp;CA"');
      expect(decodedBody).toContain('Gender="M&quot;W"');
      expect(decodedBody).not.toContain('Status="Running & Scheduled"'); // Raw ampersand should not exist
      expect(decodedBody).not.toContain('Gender="M"W"'); // Raw quote should not exist
    });
  });

  describe('Backward Compatibility', () => {
    it('should not affect existing getEventList functionality', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('<EventListResponse />')
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getEventList({ maxResults: 10 });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        testConfig.baseUrl,
        expect.objectContaining({
          body: expect.stringContaining('GetEventList')
        })
      );
    });

    it('should not affect existing getBeachMatchList functionality', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('<MatchListResponse />')
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getBeachMatchList({ tournamentNo: '123' });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        testConfig.baseUrl,
        expect.objectContaining({
          body: expect.stringContaining('GetBeachMatchList')
        })
      );
    });
  });
});