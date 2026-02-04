import { describe, it, expect } from "bun:test";
import { Effect, Layer, Ref } from "effect";
import { RateLimiter, SchwabConfig } from "./index.js";
import { RateLimiterTest } from "./rate-limiter.js";
import { ConfigTest } from "./config.js";
import { testConfig } from "../layers/test.js";

describe("RateLimiter", () => {
  describe("RateLimiterTest (no-op limiter)", () => {
    it("acquires immediately without delay", async () => {
      const program = Effect.gen(function* () {
        const limiter = yield* RateLimiter;
        const start = Date.now();
        yield* limiter.acquire;
        const elapsed = Date.now() - start;
        return elapsed;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RateLimiterTest))
      );

      expect(result).toBeLessThan(50); // Should be nearly instant
    });

    it("allows multiple rapid acquisitions", async () => {
      const program = Effect.gen(function* () {
        const limiter = yield* RateLimiter;
        const start = Date.now();

        // Acquire 10 times rapidly
        for (let i = 0; i < 10; i++) {
          yield* limiter.acquire;
        }

        const elapsed = Date.now() - start;
        return elapsed;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RateLimiterTest))
      );

      expect(result).toBeLessThan(100); // Should be very fast
    });

    it("returns high requests remaining", async () => {
      const program = Effect.gen(function* () {
        const limiter = yield* RateLimiter;
        return yield* limiter.getStatus;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RateLimiterTest))
      );

      expect(result.requestsRemaining).toBe(120);
    });

    it("returns valid window reset time", async () => {
      const program = Effect.gen(function* () {
        const limiter = yield* RateLimiter;
        return yield* limiter.getStatus;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RateLimiterTest))
      );

      expect(result.windowResetAt).toBeInstanceOf(Date);
    });

    it("reset completes without error", async () => {
      const program = Effect.gen(function* () {
        const limiter = yield* RateLimiter;
        yield* limiter.reset;
        return "success";
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RateLimiterTest))
      );

      expect(result).toBe("success");
    });
  });

  describe("rate limiter status", () => {
    it("status contains requestsRemaining", async () => {
      const program = Effect.gen(function* () {
        const limiter = yield* RateLimiter;
        const status = yield* limiter.getStatus;
        return status;
      });

      const status = await Effect.runPromise(
        program.pipe(Effect.provide(RateLimiterTest))
      );

      expect(typeof status.requestsRemaining).toBe("number");
      expect(status.requestsRemaining).toBeGreaterThanOrEqual(0);
    });

    it("status contains windowResetAt", async () => {
      const program = Effect.gen(function* () {
        const limiter = yield* RateLimiter;
        const status = yield* limiter.getStatus;
        return status;
      });

      const status = await Effect.runPromise(
        program.pipe(Effect.provide(RateLimiterTest))
      );

      expect(status.windowResetAt).toBeInstanceOf(Date);
    });
  });

  describe("rate limiter interface", () => {
    it("exposes acquire method", async () => {
      const program = Effect.gen(function* () {
        const limiter = yield* RateLimiter;
        return typeof limiter.acquire !== "undefined";
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RateLimiterTest))
      );

      expect(result).toBe(true);
    });

    it("exposes getStatus method", async () => {
      const program = Effect.gen(function* () {
        const limiter = yield* RateLimiter;
        return typeof limiter.getStatus !== "undefined";
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RateLimiterTest))
      );

      expect(result).toBe(true);
    });

    it("exposes reset method", async () => {
      const program = Effect.gen(function* () {
        const limiter = yield* RateLimiter;
        return typeof limiter.reset !== "undefined";
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RateLimiterTest))
      );

      expect(result).toBe(true);
    });
  });

  describe("concurrent access", () => {
    it("handles concurrent acquires", async () => {
      const program = Effect.gen(function* () {
        const limiter = yield* RateLimiter;

        // Run multiple acquires concurrently
        const results = yield* Effect.all(
          [
            limiter.acquire,
            limiter.acquire,
            limiter.acquire,
            limiter.acquire,
            limiter.acquire,
          ],
          { concurrency: "unbounded" }
        );

        return results.length;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RateLimiterTest))
      );

      expect(result).toBe(5);
    });

    it("handles concurrent status checks", async () => {
      const program = Effect.gen(function* () {
        const limiter = yield* RateLimiter;

        const statuses = yield* Effect.all(
          [
            limiter.getStatus,
            limiter.getStatus,
            limiter.getStatus,
          ],
          { concurrency: "unbounded" }
        );

        return statuses;
      });

      const results = await Effect.runPromise(
        program.pipe(Effect.provide(RateLimiterTest))
      );

      expect(results).toHaveLength(3);
      results.forEach((status) => {
        expect(status.requestsRemaining).toBeDefined();
        expect(status.windowResetAt).toBeDefined();
      });
    });
  });

  describe("integration with config", () => {
    it("test limiter ignores config requests per minute", async () => {
      // Even with a custom config, test limiter should not actually limit
      const customConfig = { ...testConfig, requestsPerMinute: 1 };
      const configLayer = ConfigTest(customConfig);

      const program = Effect.gen(function* () {
        const limiter = yield* RateLimiter;
        const start = Date.now();

        // Should be instant even with requestsPerMinute=1
        for (let i = 0; i < 5; i++) {
          yield* limiter.acquire;
        }

        return Date.now() - start;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(Layer.merge(RateLimiterTest, configLayer)))
      );

      // Test limiter should not delay
      expect(result).toBeLessThan(100);
    });
  });
});
