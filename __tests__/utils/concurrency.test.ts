/**
 * Issue #65 — bounded concurrency primitives.
 */

import { Semaphore, mapWithConcurrency, withTimeout } from '../../utils/concurrency';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Semaphore', () => {
  it('rejects a non-positive limit', () => {
    expect(() => new Semaphore(0)).toThrow();
    expect(() => new Semaphore(-1)).toThrow();
    expect(() => new Semaphore(1.5)).toThrow();
  });

  it('never lets more than `limit` holders through at once', async () => {
    const semaphore = new Semaphore(2);
    const gates = [deferred<void>(), deferred<void>(), deferred<void>(), deferred<void>()];
    let peak = 0;
    let live = 0;

    const runs = gates.map((gate, i) =>
      semaphore.run(async () => {
        live++;
        peak = Math.max(peak, live);
        await gate.promise;
        live--;
        return i;
      })
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(semaphore.inFlight).toBe(2);
    expect(semaphore.queued).toBe(2);

    gates.forEach(gate => gate.resolve());
    await Promise.all(runs);

    expect(peak).toBe(2);
    expect(semaphore.inFlight).toBe(0);
  });

  it('releases the slot when the body throws', async () => {
    const semaphore = new Semaphore(1);

    await expect(semaphore.run(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(semaphore.inFlight).toBe(0);

    await expect(semaphore.run(async () => 'ok')).resolves.toBe('ok');
  });

  it('ignores a double release, which would otherwise inflate the limit', async () => {
    const semaphore = new Semaphore(1);
    const release = await semaphore.acquire();

    release();
    release();

    expect(semaphore.inFlight).toBe(0);

    const a = await semaphore.acquire();
    expect(semaphore.inFlight).toBe(1);
    a();
  });

  it('hands slots out first-come-first-served', async () => {
    const semaphore = new Semaphore(1);
    const order: number[] = [];
    const gate = deferred<void>();

    const first = semaphore.run(async () => { order.push(0); await gate.promise; });
    const rest = [1, 2, 3].map(i => semaphore.run(async () => { order.push(i); }));

    gate.resolve();
    await Promise.all([first, ...rest]);

    expect(order).toEqual([0, 1, 2, 3]);
  });
});

describe('mapWithConcurrency', () => {
  it('preserves input order regardless of completion order', async () => {
    const delays = [30, 5, 20, 1, 10];

    const result = await mapWithConcurrency(delays, 3, async (delay, index) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return index;
    });

    expect(result).toEqual([0, 1, 2, 3, 4]);
  });

  it('caps in-flight work at the limit', async () => {
    let live = 0;
    let peak = 0;

    await mapWithConcurrency(Array.from({ length: 40 }, (_, i) => i), 4, async () => {
      live++;
      peak = Math.max(peak, live);
      await new Promise(resolve => setTimeout(resolve, 1));
      live--;
    });

    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1); // it does actually parallelise
  });

  it('returns [] for an empty input without constructing a semaphore', async () => {
    await expect(mapWithConcurrency([], 4, async () => 1)).resolves.toEqual([]);
  });
});

describe('withTimeout', () => {
  it('passes the value through when it settles in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('rejects when the promise never settles', async () => {
    jest.useFakeTimers();
    try {
      const never = new Promise(() => { /* deliberately never settles */ });
      const raced = withTimeout(never, 5000, 'Season stats');

      const assertion = expect(raced).rejects.toThrow('Season stats timeout after 5000ms');
      jest.advanceTimersByTime(5000);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });
});
