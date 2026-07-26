/**
 * Issue #65, AC10 — a process-wide ceiling on VIS requests in flight.
 *
 * The screen-level fix (`RefereeSeasonStatsLoader`) bounds the one fan-out we
 * know about. This test covers the net underneath it: whatever the caller does,
 * `VisApiClient` must not put more than `VIS_MAX_CONCURRENT_REQUESTS` requests
 * on the wire at once — including across separate client instances, because
 * every service in this codebase constructs its own and the VIS does not care
 * which of our objects a request came from.
 *
 * On master there is no ceiling: `makeHttpRequest` calls `fetch` directly and
 * 40 concurrent calls produce 40 concurrent sockets. The first test below fails
 * with `peak === 40`.
 */

import { VisApiClient, VIS_MAX_CONCURRENT_REQUESTS } from '../../../services/api/VisApiClient';

const EMPTY_EVENT_LIST = '<Responses><Response Type="GetEventList"></Response></Responses>';

/** A `fetch` that records how many calls are simultaneously outstanding. */
function trackingFetch(body = EMPTY_EVENT_LIST) {
  const state = { live: 0, peak: 0, calls: 0 };

  const impl = jest.fn(async () => {
    state.calls++;
    state.live++;
    state.peak = Math.max(state.peak, state.live);

    await new Promise(resolve => setTimeout(resolve, 5));

    state.live--;
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => body,
    } as unknown as Response;
  });

  return { impl, state };
}

function makeClient() {
  return new VisApiClient({
    baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
    timeoutMs: 10000,
    maxRetries: 0,
    retryDelayMs: 1,
    enableLogging: false,
  });
}

describe('VisApiClient concurrency ceiling (issue #65, AC10)', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('never exceeds VIS_MAX_CONCURRENT_REQUESTS for a single client', async () => {
    const { impl, state } = trackingFetch();
    global.fetch = impl as unknown as typeof fetch;

    const client = makeClient();

    await Promise.all(
      Array.from({ length: 40 }, () => client.getEventList({}).catch(() => undefined))
    );

    expect(state.calls).toBe(40);
    expect(state.peak).toBeLessThanOrEqual(VIS_MAX_CONCURRENT_REQUESTS);
    expect(state.peak).toBeGreaterThan(1); // still parallel, just bounded
  });

  it('the ceiling is shared across client instances, not per instance', async () => {
    const { impl, state } = trackingFetch();
    global.fetch = impl as unknown as typeof fetch;

    // Four services, four clients — the shape this codebase actually has.
    const clients = [makeClient(), makeClient(), makeClient(), makeClient()];

    await Promise.all(
      clients.flatMap(client =>
        Array.from({ length: 10 }, () => client.getEventList({}).catch(() => undefined))
      )
    );

    expect(state.calls).toBe(40);
    expect(state.peak).toBeLessThanOrEqual(VIS_MAX_CONCURRENT_REQUESTS);
  });

  it('unbounded fetch — what master does — reaches 40 in flight', async () => {
    const { impl, state } = trackingFetch();
    global.fetch = impl as unknown as typeof fetch;

    await Promise.all(
      Array.from({ length: 40 }, () => (impl as any)())
    );

    expect(state.peak).toBe(40);
    expect(state.peak).toBeGreaterThan(VIS_MAX_CONCURRENT_REQUESTS);
  });

  it('a rejected request gives its slot back', async () => {
    let calls = 0;
    global.fetch = (async () => {
      calls++;
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const client = makeClient();

    await Promise.all(
      Array.from({ length: 12 }, () => client.getEventList({}).catch(() => undefined))
    );

    // If a failure leaked its slot, the 5th call onwards would never run and
    // this would hang or come up short.
    expect(calls).toBeGreaterThanOrEqual(12);
  });
});
