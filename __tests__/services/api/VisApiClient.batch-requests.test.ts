/**
 * @fileoverview VisApiClient batch request tests
 * Tests batch request functionality, partial failures, and fallback strategies
 */

import { VisApiClient } from '../../../services/api/VisApiClient';
import {
  VisApiClientConfig,
  BatchRequest,
  BatchResponse,
  TournamentDetailBatchRequest,
  VisApiEndpoint,
  GetBeachTournamentRequest,
  GetBeachTournamentListRequest,
  GetBeachMatchListRequest,
  GetBeachRoundListRequest,
  DEFAULT_RETRY_CONFIG
} from '../../../types/api-v2';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('VisApiClient - Batch Requests', () => {
  let client: VisApiClient;
  let config: VisApiClientConfig;

  beforeEach(() => {
    config = {
      baseUrl: 'https://test-api.example.com',
      timeoutMs: 5000,
      maxRetries: 2,
      retryDelayMs: 100,
      exponentialBackoff: false,
      enableLogging: false
    };
    
    client = new VisApiClient(config, {
      ...DEFAULT_RETRY_CONFIG,
      exponentialBackoff: false,
      baseDelayMs: 10,
      maxDelayMs: 50
    });

    // `mockReset`, non `mockClear` (issue #94). `mockClear` azzera le chiamate
    // ma NON le implementazioni: un `mockResolvedValue` (senza `Once`)
    // impostato da un test restava in piedi per tutti i test successivi,
    // rispondendo a ogni chiamata che avesse esaurito la propria coda `Once` —
    // ritentativi compresi. Alcuni test erano quindi verdi grazie alla risposta
    // preparata da un altro test.
    mockFetch.mockReset();
  });

  /** Quante volte il client ritenta prima di arrendersi. */
  const TENTATIVI = DEFAULT_RETRY_CONFIG.maxAttempts;

  /** Corpo della richiesta, decodificato, per l'ennesima chiamata a fetch. */
  const corpoChiamata = (indice: number): string => {
    const init = mockFetch.mock.calls[indice]?.[1] as RequestInit | undefined;
    return typeof init?.body === 'string' ? decodeURIComponent(init.body) : '';
  };

  const chiamateBatch = (): number =>
    mockFetch.mock.calls.filter((_call, i) => corpoChiamata(i).includes('BatchRequest')).length;

  /**
   * Chiamate INDIVIDUALI di un certo tipo. Il corpo di un batch contiene i tipi
   * delle proprie sotto-richieste, quindi un conteggio per sola sottostringa
   * conterebbe anche i tentativi del batch.
   */
  const chiamateIndividualiDiTipo = (marcatore: string): number =>
    mockFetch.mock.calls.filter(
      (_call, i) => !corpoChiamata(i).includes('BatchRequest') && corpoChiamata(i).includes(marcatore)
    ).length;

  describe('buildBatchRequestXml', () => {
    it('should build XML for multiple requests', async () => {
      const batchRequest: BatchRequest = {
        requests: [
          {
            type: VisApiEndpoint.GET_BEACH_TOURNAMENT,
            requestId: 'req1',
            request: { tournamentNo: '12345' } as GetBeachTournamentRequest
          },
          {
            type: VisApiEndpoint.GET_BEACH_MATCH_LIST,
            requestId: 'req2',
            request: { tournamentNo: '12345' } as GetBeachMatchListRequest
          }
        ],
        failureStrategy: 'continue_on_partial'
      };

      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `
          <BatchResponse>
            <Response RequestId="req1">
              <Tournament No="12345" Name="Test Tournament" />
            </Response>
            <Response RequestId="req2">
              <Match No="1" Status="Finished" />
            </Response>
          </BatchResponse>
        `
      } as Response);

      const response = await client.executeBatchRequest(batchRequest);

      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        config.baseUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );

      // Verify the XML contains batch structure
      const requestBody = (mockFetch.mock.calls[0][1] as any).body as string;
      const xmlContent = decodeURIComponent(requestBody.replace('Request=', ''));
      expect(xmlContent).toContain('<BatchRequest');
      expect(xmlContent).toContain('RequestId="req1"');
      expect(xmlContent).toContain('RequestId="req2"');
      expect(xmlContent).toContain('</BatchRequest>');
    });

    it('should handle XML escaping in batch requests', async () => {
      const batchRequest: BatchRequest = {
        requests: [
          {
            type: VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST,
            requestId: 'test&id',
            request: { 
              dateFrom: '2025-01-01',
              dateTo: '2025-12-31'
            } as GetBeachTournamentListRequest
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<BatchResponse><Response RequestId="test&amp;id">Success</Response></BatchResponse>'
      } as Response);

      const response = await client.executeBatchRequest(batchRequest);

      expect(response.success).toBe(true);
      
      // Verify XML escaping was applied
      const requestBody = (mockFetch.mock.calls[0][1] as any).body as string;
      const xmlContent = decodeURIComponent(requestBody.replace('Request=', ''));
      expect(xmlContent).toContain('test&amp;id');
      expect(xmlContent).not.toContain('test&id'); // Raw ampersand should be escaped
    });
  });

  describe('executeBatchRequest', () => {
    it('should execute successful batch request', async () => {
      const batchRequest: BatchRequest = {
        requests: [
          {
            type: VisApiEndpoint.GET_BEACH_TOURNAMENT,
            requestId: 'tournament_123',
            request: { tournamentNo: '123' } as GetBeachTournamentRequest
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `
          <BatchResponse>
            <Response RequestId="tournament_123">
              <Tournament No="123" Name="Test Tournament" />
            </Response>
          </BatchResponse>
        `
      } as Response);

      const response = await client.executeBatchRequest(batchRequest);

      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(1);
      expect(response.results[0]).toMatchObject({
        requestId: 'tournament_123',
        type: VisApiEndpoint.GET_BEACH_TOURNAMENT,
        success: true
      });
      expect(response.hasPartialFailures).toBe(false);
    });

    it('should handle partial batch failures', async () => {
      const batchRequest: BatchRequest = {
        requests: [
          {
            type: VisApiEndpoint.GET_BEACH_TOURNAMENT,
            requestId: 'req1',
            request: { tournamentNo: '123' } as GetBeachTournamentRequest
          },
          {
            type: VisApiEndpoint.GET_BEACH_MATCH_LIST,
            requestId: 'req2',
            request: { tournamentNo: '456' } as GetBeachMatchListRequest
          }
        ],
        failureStrategy: 'continue_on_partial'
      };

      // `mockResolvedValue`, non `...Once`: il client RITENTA (fino a 3
      // volte), e dalla seconda chiamata la coda del doppio era vuota,
      // restituendo `undefined`. Il client moriva su `response.ok` e marcava
      // come fallito anche il risultato riuscito. Un server vero, alla
      // stessa richiesta, risponde di nuovo.
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => `
          <BatchResponse>
            <Response RequestId="req1">
              <Tournament No="123" Name="Success" />
            </Response>
            <Response RequestId="req2">
              <Error>Tournament not found</Error>
            </Response>
          </BatchResponse>
        `
      } as Response);

      const response = await client.executeBatchRequest(batchRequest);

      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(2);
      expect(response.results[0].success).toBe(true);
      expect(response.results[1].success).toBe(false);
      expect(response.hasPartialFailures).toBe(true);
    });

    it('should handle complete batch failure', async () => {
      const batchRequest: BatchRequest = {
        requests: [
          {
            type: VisApiEndpoint.GET_BEACH_TOURNAMENT,
            requestId: 'req1',
            request: { tournamentNo: '123' } as GetBeachTournamentRequest
          }
        ]
      };

      // `mockRejectedValue`, non `...Once`: una rete caduta resta caduta anche
      // al ritentativo. Con `Once` il secondo tentativo ereditava la risposta
      // preparata da un altro test e il batch "completamente fallito"
      // finiva per riuscire.
      mockFetch.mockRejectedValue(new Error('Network error'));

      const response = await client.executeBatchRequest(batchRequest);

      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(1);
      expect(response.results[0].success).toBe(false);
      expect(response.hasPartialFailures).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(TENTATIVI);
    });
  });

  describe('getTournamentDetailBatch', () => {
    it('should combine tournament, matches, and rounds requests', async () => {
      const request: TournamentDetailBatchRequest = {
        tournamentNo: '12345',
        includeMatches: true,
        includeRounds: true,
        includeTournamentDetails: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `
          <BatchResponse>
            <Response RequestId="tournament_12345">
              <Tournament No="12345" Name="Test Tournament" />
            </Response>
            <Response RequestId="matches_12345">
              <Match No="1" Status="Finished" />
            </Response>
            <Response RequestId="rounds_12345">
              <Round No="1" Name="Qualification" />
            </Response>
          </BatchResponse>
        `
      } as Response);

      const response = await client.getTournamentDetailBatch(request);

      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(3);
      
      // Verify all expected request types are present
      const requestTypes = response.results.map(r => r.type);
      expect(requestTypes).toContain(VisApiEndpoint.GET_BEACH_TOURNAMENT);
      expect(requestTypes).toContain(VisApiEndpoint.GET_BEACH_MATCH_LIST);
      expect(requestTypes).toContain(VisApiEndpoint.GET_BEACH_ROUND_LIST);
    });

    it('should respect include flags', async () => {
      const request: TournamentDetailBatchRequest = {
        tournamentNo: '12345',
        includeMatches: false,
        includeRounds: true,
        includeTournamentDetails: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `
          <BatchResponse>
            <Response RequestId="tournament_12345">
              <Tournament No="12345" Name="Test Tournament" />
            </Response>
            <Response RequestId="rounds_12345">
              <Round No="1" Name="Qualification" />
            </Response>
          </BatchResponse>
        `
      } as Response);

      const response = await client.getTournamentDetailBatch(request);

      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(2);
      
      // Verify matches are not included
      const requestTypes = response.results.map(r => r.type);
      expect(requestTypes).not.toContain(VisApiEndpoint.GET_BEACH_MATCH_LIST);
      expect(requestTypes).toContain(VisApiEndpoint.GET_BEACH_TOURNAMENT);
      expect(requestTypes).toContain(VisApiEndpoint.GET_BEACH_ROUND_LIST);
    });

    it('should fallback to individual requests on high failure rate', async () => {
      const request: TournamentDetailBatchRequest = {
        tournamentNo: '12345',
        includeMatches: true,
        includeRounds: true
      };

      // Mock batch request with high failure rate (2 out of 3 fail)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => `
            <BatchResponse>
              <Response RequestId="tournament_12345">
                <Tournament No="12345" Name="Success" />
              </Response>
              <Response RequestId="matches_12345">
                <Error>Failed to get matches</Error>
              </Response>
              <Response RequestId="rounds_12345">
                <Error>Failed to get rounds</Error>
              </Response>
            </BatchResponse>
          `
        })
        // Mock individual fallback requests
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '<Tournament No="12345" Name="Fallback Success" />'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '<Match No="1" Status="Running" />'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '<Round No="1" Name="Main Draw" />'
        });

      const response = await client.getTournamentDetailBatch(request);

      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(3);
      
      // Should have made 4 total requests (1 batch + 3 individual fallbacks)
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should fallback to individual requests on complete batch failure', async () => {
      const request: TournamentDetailBatchRequest = {
        tournamentNo: '12345',
        includeMatches: true,
        includeRounds: false
      };

      // La risposta dipende dal TIPO di richiesta, non dalla posizione in una
      // coda (issue #94). Con una coda `Once`, il ritentativo del batch
      // consumava la risposta preparata per la PRIMA richiesta individuale: il
      // batch "fallito" riusciva al secondo colpo e il conteggio finale
      // dipendeva da quante volte il client avesse ritentato.
      mockFetch.mockImplementation(async (_url: any, init: any) => {
        const corpo = typeof init?.body === 'string' ? decodeURIComponent(init.body) : '';

        if (corpo.includes('BatchRequest')) {
          throw new Error('Batch request failed');
        }
        if (corpo.includes('GetBeachTournament')) {
          return {
            ok: true,
            status: 200,
            text: async () => '<Tournament No="12345" Name="Individual Success" />'
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          text: async () => '<Match No="1" Status="Finished" />'
        } as Response;
      });

      const response = await client.getTournamentDetailBatch(request);

      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(2);
      expect(response.results[0].success).toBe(true);
      expect(response.results[1].success).toBe(true);

      // Il batch fallito viene RITENTATO — il test dava per scontata una sola
      // chiamata. Poi una richiesta individuale per elemento, che e' la
      // proprieta' che questo caso deve dimostrare.
      expect(chiamateBatch()).toBe(TENTATIVI);
      expect(chiamateIndividualiDiTipo('GetBeachTournament')).toBe(1);
      expect(chiamateIndividualiDiTipo('GetBeachMatchList')).toBe(1);
    });
  });

  describe('monitoring integration', () => {
    it('should track batch request metrics', async () => {
      const batchRequest: BatchRequest = {
        requests: [
          {
            type: VisApiEndpoint.GET_BEACH_TOURNAMENT,
            requestId: 'req1',
            request: { tournamentNo: '123' } as GetBeachTournamentRequest
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<BatchResponse><Response RequestId="req1">Success</Response></BatchResponse>'
      } as Response);

      await client.executeBatchRequest(batchRequest);

      const monitor = client.getMonitor();
      expect(monitor.requestsByEndpoint[VisApiEndpoint.BATCH_REQUEST]).toBe(1);
      expect(monitor.totalRequests).toBeGreaterThan(0);
    });

    it('should track failed batch requests', async () => {
      const batchRequest: BatchRequest = {
        requests: [
          {
            type: VisApiEndpoint.GET_BEACH_TOURNAMENT,
            requestId: 'req1',
            request: { tournamentNo: '123' } as GetBeachTournamentRequest
          }
        ]
      };

      mockFetch.mockRejectedValueOnce(new Error('Request failed'));

      await client.executeBatchRequest(batchRequest);

      const monitor = client.getMonitor();
      expect(monitor.requestsByEndpoint[VisApiEndpoint.BATCH_REQUEST]).toBe(1);
      expect(monitor.failedRequests).toBeGreaterThan(0);
    });
  });

  describe('XML security', () => {
    it('should escape XML special characters in batch requests', async () => {
      const batchRequest: BatchRequest = {
        requests: [
          {
            type: VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST,
            requestId: 'test<script>&alert',
            request: { 
              dateFrom: '2025-01-01',
              dateTo: '2025-12-31'
            } as GetBeachTournamentListRequest
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<BatchResponse><Response>Success</Response></BatchResponse>'
      } as Response);

      await client.executeBatchRequest(batchRequest);

      const requestBody = (mockFetch.mock.calls[0][1] as any).body as string;
      const xmlContent = decodeURIComponent(requestBody.replace('Request=', ''));
      
      // Verify dangerous characters are escaped
      expect(xmlContent).toContain('test&lt;script&gt;&amp;alert');
      expect(xmlContent).not.toContain('<script>');
      expect(xmlContent).not.toContain('&alert');
    });
  });

  describe('backward compatibility', () => {
    it('should not affect existing individual methods', async () => {
      const tournamentRequest: GetBeachTournamentRequest = {
        tournamentNo: '12345'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<Tournament No="12345" Name="Test" />'
      } as Response);

      const response = await client.getBeachTournament(tournamentRequest);

      expect(response.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Verify it's not a batch request
      const requestBody = (mockFetch.mock.calls[0][1] as any).body as string;
      const xmlContent = decodeURIComponent(requestBody.replace('Request=', ''));
      expect(xmlContent).not.toContain('<BatchRequest>');
      expect(xmlContent).toContain('<Request Type="GetBeachTournament"');
    });
  });

  describe('edge cases', () => {
    it('should handle empty batch requests', async () => {
      const batchRequest: BatchRequest = {
        requests: []
      };

      const response = await client.executeBatchRequest(batchRequest);

      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(0);
      expect(response.hasPartialFailures).toBe(false);
      
      // Should not make any HTTP requests for empty batch
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle malformed batch response XML', async () => {
      const batchRequest: BatchRequest = {
        requests: [
          {
            type: VisApiEndpoint.GET_BEACH_TOURNAMENT,
            requestId: 'req1',
            request: { tournamentNo: '123' } as GetBeachTournamentRequest
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'Invalid XML response'
      } as Response);

      const response = await client.executeBatchRequest(batchRequest);

      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(1);
      expect(response.results[0].success).toBe(false);
      expect(response.hasPartialFailures).toBe(true);
    });
  });
});