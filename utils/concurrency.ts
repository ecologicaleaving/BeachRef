/**
 * Bounded concurrency primitives (issue #65).
 *
 * The VIS is a shared federation service and it throttles. Measured while
 * working issue #67: one `/all-referees` load fired **112 requests** with no
 * limit on how many were in flight, and a single unrelated `curl` to the VIS
 * went from ~100 ms to **125 s**, taking ~25 minutes to recover. The problem is
 * not the total — it is the burst.
 *
 * `Promise.all(items.map(fetchSomething))` is the shape that produces it, and
 * it reads as harmless. These two helpers are the replacement.
 */

/**
 * Counting semaphore.
 *
 * `acquire()` resolves once a slot is free and returns the matching release
 * function. Callers must release in a `finally` — a leaked slot is a permanent
 * reduction of the limit, and with a small limit that is a deadlock.
 */
export class Semaphore {
  private available: number;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly limit: number) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error(`Semaphore limit must be a positive integer, got ${limit}`);
    }
    this.available = limit;
  }

  /** Slots currently held. Exposed for tests and for the audit counters. */
  get inFlight(): number {
    return this.limit - this.available;
  }

  /** Callers parked waiting for a slot. */
  get queued(): number {
    return this.waiting.length;
  }

  async acquire(): Promise<() => void> {
    if (this.available > 0) {
      this.available--;
      return this.makeRelease();
    }

    await new Promise<void>(resolve => this.waiting.push(resolve));
    // The slot was handed over directly by `release()`, which did not give it
    // back to `available` — so nothing to decrement here.
    return this.makeRelease();
  }

  private makeRelease(): () => void {
    let released = false;
    return () => {
      // Idempotent: a double release would inflate the limit.
      if (released) return;
      released = true;

      const next = this.waiting.shift();
      if (next) {
        // Hand the slot straight to the next waiter, FIFO. Going through
        // `available` instead would let a fresh `acquire()` barge in.
        next();
      } else {
        this.available++;
      }
    };
  }

  /** Run `fn` holding a slot. */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

/**
 * `Promise.all(items.map(fn))` with at most `limit` calls to `fn` in flight.
 *
 * Results keep input order. Unlike `Promise.all` this does **not** reject on
 * the first failure — `fn` is expected to handle its own errors, because on
 * this codepath one referee's failed stats must not blank the whole list.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];

  const semaphore = new Semaphore(Math.min(limit, items.length));
  const results = new Array<R>(items.length);

  await Promise.all(
    items.map((item, index) =>
      semaphore.run(async () => {
        results[index] = await fn(item, index);
      })
    )
  );

  return results;
}

/**
 * Reject with `Request timeout` if `promise` has not settled within `ms`.
 *
 * The pattern already existed in `app/all-referees.tsx` (`loadRefereeStats`,
 * 30 s) but only on the card-expansion path. The bulk path had none, which is
 * the second half of why the screen hung forever: `Promise.all` settles only
 * when its **last** member settles, so one request that never answers held the
 * `loading` flag up indefinitely.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Request'): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}
