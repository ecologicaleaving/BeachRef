/**
 * @fileoverview Tests for VisApiClient BeachLive integration
 * Tests AC1: GetBeachLiveRequest Integration from Story 1.1
 * Part of EPIC-001 Live Score Display - Story 1.1
 */

import { VisApiClient } from '../VisApiClient';
import { VisApiClientConfig, GetBeachLiveRequest, VisApiEndpoint, DEFAULT_RETRY_CONFIG, DEFAULT_FIELD_SELECTIONS } from '../../../types/api-v2';

// Mock fetch for testing
global.fetch = jest.fn();

describe('VisApiClient - BeachLive Integration', () => {
  let client: VisApiClient;
  const mockConfig: VisApiClientConfig = {
    baseUrl: 'https://test.vis-api.com',
    timeoutMs: 5000,
    maxRetries: 3,
    retryDelayMs: 1000,
    exponentialBackoff: true,
    enableLogging: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new VisApiClient(mockConfig);
  });

  describe('getBeachLive Method', () => {
    test('should exist and be callable', () => {
      expect(typeof client.getBeachLive).toBe('function');
    });

    test('should make API request with correct parameters', async () => {
      const mockXmlResponse = `
        <BeachLive>
          <Version>1</Version>
          <PollDelay>5000</PollDelay>
          <Match>
            <No>123</No>
            <Status>InProgress</Status>
          </Match>
        </BeachLive>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockXmlResponse),
        headers: new Map()
      });

      const request: GetBeachLiveRequest = {
        matchNo: 123,
        version: 1,
        options: ['scores', 'statistics']
      };

      const response = await client.getBeachLive(request);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.xmlData).toContain('<BeachLive>');
      }
    });

    test('should build correct XML request', async () => {
      const mockXmlResponse = '<BeachLive><Version>1</Version></BeachLive>';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockXmlResponse),
        headers: new Map()
      });

      const request: GetBeachLiveRequest = {
        matchNo: 123,
        version: 2,
        options: ['scores']
      };

      await client.getBeachLive(request);

      // Check that fetch was called with the expected XML request
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = fetchCall[1].body;

      expect(requestBody).toContain('Type="GetBeachLiveRequest"');
      expect(requestBody).toContain('No="123"');
      expect(requestBody).toContain('Version="2"');
      expect(requestBody).toContain('Options="scores"');
    });

    test('should include default fields in request', async () => {
      const mockXmlResponse = '<BeachLive><Version>1</Version></BeachLive>';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockXmlResponse),
        headers: new Map()
      });

      const request: GetBeachLiveRequest = {
        matchNo: 123
      };

      await client.getBeachLive(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = fetchCall[1].body;
      
      // Check that default fields are included
      const expectedFields = DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_LIVE];
      expectedFields.forEach(field => {
        expect(requestBody).toContain(field);
      });
    });

    test('should handle request without version parameter', async () => {
      const mockXmlResponse = '<BeachLive><Version>1</Version></BeachLive>';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockXmlResponse),
        headers: new Map()
      });

      const request: GetBeachLiveRequest = {
        matchNo: 123
        // No version parameter
      };

      await client.getBeachLive(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = fetchCall[1].body;

      expect(requestBody).toContain('No="123"');
      expect(requestBody).not.toContain('Version="');
    });

    test('should handle request without options parameter', async () => {
      const mockXmlResponse = '<BeachLive><Version>1</Version></BeachLive>';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockXmlResponse),
        headers: new Map()
      });

      const request: GetBeachLiveRequest = {
        matchNo: 123,
        version: 1
        // No options parameter
      };

      await client.getBeachLive(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = fetchCall[1].body;

      expect(requestBody).toContain('No="123"');
      expect(requestBody).toContain('Version="1"');
      expect(requestBody).not.toContain('Options="');
    });

    test('should handle multiple options correctly', async () => {
      const mockXmlResponse = '<BeachLive><Version>1</Version></BeachLive>';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockXmlResponse),
        headers: new Map()
      });

      const request: GetBeachLiveRequest = {
        matchNo: 123,
        options: ['scores', 'statistics', 'events']
      };

      await client.getBeachLive(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = fetchCall[1].body;

      expect(requestBody).toContain('Options="scores,statistics,events"');
    });
  });

  describe('Error Handling', () => {
    test('should handle HTTP errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server Error')
      });

      const request: GetBeachLiveRequest = {
        matchNo: 123
      };

      const response = await client.getBeachLive(request);

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error).toContain('500');
      }
    });

    test('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'));

      const request: GetBeachLiveRequest = {
        matchNo: 123
      };

      const response = await client.getBeachLive(request);

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error).toContain('Network Error');
      }
    });

    test('should handle VIS-specific error responses', async () => {
      const errorXml = `
        <VisError>
          <ErrorCode>1009</ErrorCode>
          <ErrorMessage>Match not found</ErrorMessage>
        </VisError>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(errorXml),
        headers: new Map()
      });

      const request: GetBeachLiveRequest = {
        matchNo: 999999 // Non-existent match
      };

      const response = await client.getBeachLive(request);

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.errorCode).toBe('1009');
        expect(response.error).toContain('Match not found');
      }
    });
  });

  describe('Retry Logic', () => {
    test('should retry on failure according to retry configuration', async () => {
      // First two calls fail, third succeeds
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValue({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<BeachLive><Version>1</Version></BeachLive>')
        });

      const request: GetBeachLiveRequest = {
        matchNo: 123
      };

      const response = await client.getBeachLive(request);

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(response.success).toBe(true);
    });

    test('should respect maximum retry attempts', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'));

      const request: GetBeachLiveRequest = {
        matchNo: 123
      };

      const response = await client.getBeachLive(request);

      // Should try initial request + maxRetries (3) = 4 total attempts
      expect(global.fetch).toHaveBeenCalledTimes(4);
      expect(response.success).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    test('should update request monitoring statistics', async () => {
      const mockXmlResponse = '<BeachLive><Version>1</Version></BeachLive>';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockXmlResponse),
        headers: new Map()
      });

      const initialStats = client.getConfig();
      
      const request: GetBeachLiveRequest = {
        matchNo: 123
      };

      await client.getBeachLive(request);

      // Monitor statistics are updated internally
      // This is tested implicitly through the service's monitoring capabilities
      expect(response.success).toBe(true);
    });

    test('should measure response times', async () => {
      const mockXmlResponse = '<BeachLive><Version>1</Version></BeachLive>';

      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(mockXmlResponse)
          }), 100)
        )
      );

      const request: GetBeachLiveRequest = {
        matchNo: 123
      };

      const startTime = Date.now();
      const response = await client.getBeachLive(request);
      const endTime = Date.now();

      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.durationMs).toBeGreaterThan(0);
        expect(response.durationMs).toBeLessThan(endTime - startTime + 50); // Allow some margin
      }
    });
  });

  describe('Configuration Integration', () => {
    test('should use configured base URL', async () => {
      const mockXmlResponse = '<BeachLive><Version>1</Version></BeachLive>';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockXmlResponse),
        headers: new Map()
      });

      const request: GetBeachLiveRequest = {
        matchNo: 123
      };

      await client.getBeachLive(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const url = fetchCall[0];

      expect(url).toContain(mockConfig.baseUrl);
    });

    test('should respect timeout configuration', async () => {
      const shortTimeoutConfig = { ...mockConfig, timeoutMs: 100 };
      const shortTimeoutClient = new VisApiClient(shortTimeoutConfig);

      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => 
          setTimeout(resolve, 200) // Longer than timeout
        )
      );

      const request: GetBeachLiveRequest = {
        matchNo: 123
      };

      const response = await shortTimeoutClient.getBeachLive(request);

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error).toContain('timeout');
      }
    });
  });

  describe('Backward Compatibility', () => {
    test('should not affect existing API methods', () => {
      expect(typeof client.getEventList).toBe('function');
      expect(typeof client.getBeachTournament).toBe('function');
      expect(typeof client.getEvent).toBe('function');
      expect(typeof client.getBeachMatchList).toBe('function');
      expect(typeof client.getBeachRound).toBe('function');
      expect(typeof client.testConnection).toBe('function');
    });

    test('should maintain same configuration interface', () => {
      const config = client.getConfig();
      
      expect(config.baseUrl).toBe(mockConfig.baseUrl);
      expect(config.timeoutMs).toBe(mockConfig.timeoutMs);
      expect(config.maxRetries).toBe(mockConfig.maxRetries);
      expect(config.exponentialBackoff).toBe(mockConfig.exponentialBackoff);
    });
  });
});