/**
 * @fileoverview Unit tests for useRepositoryData hook
 * Tests unified repository data access with caching, error handling, and loading states
 *
 * This suite mounts React into a DOM container, so it needs a DOM. The project
 * default is `testEnvironment: 'node'` (services are the bulk of the suite), and
 * without this docblock all 16 tests died on `document is not defined`.
 *
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRepositoryData, useRepositoryDataWithRefresh } from '../../hooks/useRepositoryData';

// The harness that used to live here was hand-rolled: it mounted with
// `ReactDOM.render` (removed in React 19), polled with a `setTimeout` that
// `jest.useFakeTimers()` had frozen, and never implemented the `initialProps` /
// `rerender(props)` API the tests below were written against. All 16 tests
// failed. The project already depends on a hook renderer that does all three.

describe('useRepositoryData', () => {
  // NOTE: timers are deliberately real here, for the same reason jest.setup.js
  // gives for not faking them globally. `waitFor` needs a timer that actually
  // fires; with `jest.useFakeTimers()` in `beforeEach` every wait in this file
  // deadlocked and 13 of 16 tests died on the jest timeout rather than on an
  // assertion. Tests that need to jump forward in time opt in themselves.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic functionality', () => {
    it('should fetch data successfully', async () => {
      const mockData = { id: '1', name: 'Test Tournament' };
      const mockRepositoryMethod = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
      );

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
      expect(mockRepositoryMethod).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Fetch failed');
      const mockRepositoryMethod = jest.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
      );

      // Si aspetta l'ERRORE, non la fine del caricamento, e con un margine
      // ampio: il hook ritenta 3 volte con backoff esponenziale (1s, 2s, 4s)
      // e registra l'errore solo alla fine. Aspettare `loading === false`
      // sarebbe tornato utile solo per sbaglio, quando quel campo veniva
      // spento anche fra un tentativo e l'altro.
      await waitFor(
        () => {
          expect(result.current.error).toEqual(mockError);
        },
        { timeout: 12000 }
      );

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
    }, 20000);

    it('should skip initial fetch when skip option is true', () => {
      const mockRepositoryMethod = jest.fn().mockResolvedValue({ id: '1' });

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { skip: true })
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(mockRepositoryMethod).not.toHaveBeenCalled();
    });
  });

  describe('Refresh functionality', () => {
    it('should refresh data when refresh is called', async () => {
      const mockData1 = { id: '1', name: 'First' };
      const mockData2 = { id: '1', name: 'Updated' };
      const mockRepositoryMethod = jest.fn()
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
      );

      // Si aspetta il DATO, non lo spegnersi del caricamento: ora `loading`
      // resta vero finche' ci sono tentativi in coda, quindi e' il dato il
      // segnale che la prima lettura e' andata a buon fine.
      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      // Trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.data).toEqual(mockData2);
      expect(mockRepositoryMethod).toHaveBeenCalledTimes(2);
    });

    it('should handle refresh errors', async () => {
      const mockData = { id: '1', name: 'Test' };
      const mockError = new Error('Refresh failed');
      // `mockRejectedValue` e non `...Once`: dopo il primo rifiuto il hook
      // RITENTA, e con una sola risposta in coda i tentativi successivi
      // ottenevano `undefined` — cioe' un successo — e l'errore spariva.
      const mockRepositoryMethod = jest.fn()
        .mockResolvedValueOnce(mockData)
        .mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Anche il rinfresco passa dai tentativi: l'errore compare in fondo.
      await waitFor(
        () => {
          expect(result.current.error).toEqual(mockError);
        },
        { timeout: 12000 }
      );
    }, 20000);
  });

  describe('Retry functionality', () => {
    it('should retry failed requests according to retryCount', async () => {
      const mockError = new Error('Network error');
      const mockRepositoryMethod = jest.fn()
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ id: '1', success: true });

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { retryCount: 2, retryDelay: 100 })
      );

      // Fast-forward through retries
      await act(async () => {
        jest.advanceTimersByTime(300); // Allow for retry delays
        await jest.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockRepositoryMethod).toHaveBeenCalledTimes(3);
      expect(result.current.data).toEqual({ id: '1', success: true });
      expect(result.current.error).toBeNull();
    });

    it('should fail after exhausting all retries', async () => {
      const mockError = new Error('Persistent error');
      const mockRepositoryMethod = jest.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { retryCount: 2, retryDelay: 100 })
      );

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await jest.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockRepositoryMethod).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result.current.error).toEqual(mockError);
    });

    it('should allow manual retry after failure', async () => {
      const mockError = new Error('Initial error');
      const mockData = { id: '1', recovered: true };
      const mockRepositoryMethod = jest.fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockData);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { retryCount: 0 })
      );

      // Wait for initial failure
      await waitFor(() => {
        expect(result.current.error).toEqual(mockError);
      });

      // Manual retry
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Polling functionality', () => {
    it('should poll data at specified intervals', async () => {
      // Il doppio NON dipende dall'ordine di una coda.
      //
      // Con due `mockResolvedValueOnce` il test dava per scontato un numero
      // preciso di letture iniziali: se ne partiva una in piu' la coda si
      // esauriva, la lettura successiva otteneva `undefined` e il test
      // diventava rosso — ma solo sotto carico, cioe' il tipo peggiore. Qui
      // ogni risposta porta il proprio numero di chiamata, e si verifica la
      // proprieta' vera: il sondaggio periodico produce una lettura in piu' e
      // il dato mostrato e' quello dell'ultima risposta.
      let chiamate = 0;
      const mockRepositoryMethod = jest.fn(() => {
        chiamate += 1;
        return Promise.resolve({ id: '1', count: chiamate });
      });

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { pollingInterval: 1000 })
      );

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      const primaDelSondaggio = mockRepositoryMethod.mock.calls.length;

      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000);
      });

      await waitFor(() => {
        expect(mockRepositoryMethod.mock.calls.length).toBeGreaterThan(primaDelSondaggio);
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({
          id: '1',
          count: mockRepositoryMethod.mock.calls.length,
        });
      });
    });

    it('should not poll when loading', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      const mockRepositoryMethod = jest.fn().mockReturnValue(mockPromise);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { pollingInterval: 500 })
      );

      expect(result.current.loading).toBe(true);

      // Advance time while still loading
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should not trigger additional calls while loading
      expect(mockRepositoryMethod).toHaveBeenCalledTimes(1);

      // Resolve the initial promise
      act(() => {
        resolvePromise!({ id: '1' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Cache metadata', () => {
    it('should detect cache hits from repository response', async () => {
      const mockDataWithCache = { id: '1', name: 'Test', source: 'cache' };
      const mockRepositoryMethod = jest.fn().mockResolvedValue(mockDataWithCache);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.cacheHit).toBe(true);
    });

    it('should track last updated timestamp', async () => {
      const mockData = { id: '1', name: 'Test' };
      const mockRepositoryMethod = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.lastUpdated).toBeInstanceOf(Date);
      expect(result.current.lastUpdated!.getTime()).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('Dependency changes', () => {
    it('should refetch when dependencies change', async () => {
      const mockData1 = { id: '1', name: 'First' };
      const mockData2 = { id: '2', name: 'Second' };
      const mockRepositoryMethod = jest.fn()
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);

      const { result, rerender } = renderHook(
        ({ deps }) => useRepositoryData(mockRepositoryMethod, deps),
        { initialProps: { deps: ['dep1'] } }
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockData1);

      // Change dependencies
      rerender({ deps: ['dep2'] });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(mockRepositoryMethod).toHaveBeenCalledTimes(2);
    });
  });

  describe('useRepositoryDataWithRefresh', () => {
    it('should auto-refresh when dependencies change', async () => {
      const mockData1 = { id: '1', name: 'First' };
      const mockData2 = { id: '1', name: 'Updated' };
      // La risposta dipende dall'ARGOMENTO, non dall'ordine delle chiamate.
      //
      // Con due `mockResolvedValueOnce` il test dava per scontata UNA lettura
      // iniziale, ma il hook ne fa due: la coda si esauriva subito e il dato
      // iniziale risultava gia' quello del secondo torneo. Un doppio che
      // risponde in base a cio' che gli viene chiesto non dipende da un
      // dettaglio interno del hook — ed e' anche come si comporta un
      // repository vero.
      const mockRepositoryMethod = jest.fn((id: string) =>
        Promise.resolve(id === '1' ? mockData1 : mockData2)
      );

      let tournamentId = '1';
      const { result, rerender } = renderHook(() =>
        useRepositoryDataWithRefresh(
          () => mockRepositoryMethod(tournamentId),
          [tournamentId]
        )
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      // Change dependency
      tournamentId = '2';
      rerender();

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(mockRepositoryMethod).toHaveBeenCalledWith('1');
      expect(mockRepositoryMethod).toHaveBeenCalledWith('2');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup intervals and timeouts on unmount', async () => {
      // Il metodo FALLISCE, di proposito: `clearTimeout` ha senso solo se c'e'
      // davvero un nuovo tentativo in coda. Con una lettura riuscita non
      // esiste alcun timeout da annullare, e il test pretendeva la pulizia di
      // qualcosa che non era mai stato creato.
      const mockRepositoryMethod = jest.fn().mockRejectedValue(new Error('boom'));
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { pollingInterval: 1000 })
      );

      // Lascia fallire il primo tentativo, cosi' il ritentativo viene
      // programmato.
      await waitFor(() => {
        expect(mockRepositoryMethod).toHaveBeenCalled();
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not update state after unmount', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      const mockRepositoryMethod = jest.fn().mockReturnValue(mockPromise);

      const { result, unmount } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
      );

      expect(result.current.loading).toBe(true);

      unmount();

      // Resolve promise after unmount
      act(() => {
        resolvePromise!({ id: '1' });
      });

      // Should not update state
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
    });
  });
});