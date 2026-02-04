import { Effect, Layer, Ref, Queue, Deferred } from "effect";
import { RateLimiter, SchwabConfig, type RateLimitStatusShape } from "./index.js";
import { RateLimitError } from "../errors.js";

const WINDOW_MS = 60 * 1000; // 1 minute

interface RateLimiterState {
  readonly requestTimestamps: readonly number[];
  readonly processing: boolean;
}

/**
 * Create a rate limiter effect that uses a sliding window
 */
const makeRateLimiter = Effect.gen(function* () {
  const config = yield* SchwabConfig;
  const { requestsPerMinute } = config;

  // State: request timestamps within the window
  const stateRef = yield* Ref.make<RateLimiterState>({
    requestTimestamps: [],
    processing: false,
  });

  // Queue of pending requests
  const queue = yield* Queue.unbounded<Deferred.Deferred<void, RateLimitError>>();

  const cleanupOldTimestamps = (
    timestamps: readonly number[]
  ): readonly number[] => {
    const cutoff = Date.now() - WINDOW_MS;
    return timestamps.filter((ts) => ts > cutoff);
  };

  const getWaitTime = (timestamps: readonly number[]): number => {
    const cleaned = cleanupOldTimestamps(timestamps);
    if (cleaned.length < requestsPerMinute) {
      return 0;
    }
    // Wait until the oldest request falls out of the window
    const oldestTimestamp = cleaned[0];
    const waitUntil = oldestTimestamp + WINDOW_MS;
    return Math.max(0, waitUntil - Date.now());
  };

  const processQueue = Effect.gen(function* () {
    const state = yield* Ref.get(stateRef);
    if (state.processing) {
      return;
    }

    yield* Ref.update(stateRef, (s) => ({ ...s, processing: true }));

    // Process queue items
    let item = yield* Queue.poll(queue);
    while (item._tag === "Some") {
      const deferred = item.value;

      const currentState = yield* Ref.get(stateRef);
      const waitTime = getWaitTime(currentState.requestTimestamps);

      if (waitTime > 0) {
        yield* Effect.sleep(waitTime);
      }

      // Record this request
      yield* Ref.update(stateRef, (s) => ({
        ...s,
        requestTimestamps: [...cleanupOldTimestamps(s.requestTimestamps), Date.now()],
      }));

      // Complete the deferred
      yield* Deferred.succeed(deferred, undefined);

      item = yield* Queue.poll(queue);
    }

    yield* Ref.update(stateRef, (s) => ({ ...s, processing: false }));
  });

  const acquire = Effect.gen(function* () {
    const deferred = yield* Deferred.make<void, RateLimitError>();
    yield* Queue.offer(queue, deferred);
    yield* Effect.fork(processQueue);
    yield* Deferred.await(deferred);
  });

  const getStatus = Effect.gen(function* () {
    const state = yield* Ref.get(stateRef);
    const cleaned = cleanupOldTimestamps(state.requestTimestamps);
    const requestsRemaining = Math.max(0, requestsPerMinute - cleaned.length);
    const windowResetAt =
      cleaned.length > 0
        ? new Date(cleaned[0] + WINDOW_MS)
        : new Date();

    return {
      requestsRemaining,
      windowResetAt,
    } satisfies RateLimitStatusShape;
  });

  const reset = Ref.set(stateRef, {
    requestTimestamps: [],
    processing: false,
  });

  return {
    acquire,
    getStatus,
    reset,
  };
});

/**
 * Live rate limiter layer
 */
export const RateLimiterLive = Layer.effect(RateLimiter, makeRateLimiter);

/**
 * Test rate limiter that doesn't limit (for testing)
 */
export const RateLimiterTest = Layer.succeed(RateLimiter, {
  acquire: Effect.void,
  getStatus: Effect.succeed({
    requestsRemaining: 120,
    windowResetAt: new Date(),
  }),
  reset: Effect.void,
});
