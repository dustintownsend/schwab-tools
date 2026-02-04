import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { QuoteService } from "./index.js";
import { QuoteServiceTest } from "../layers/test.js";
import { SymbolNotFoundError } from "../errors.js";
import { mockQuotes } from "../../test/fixtures/quotes.js";

describe("QuoteService", () => {
  const testLayer = QuoteServiceTest(mockQuotes);

  describe("getQuotes", () => {
    it("returns quotes for valid symbols", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuoteService;
        return yield* service.getQuotes(["AAPL", "MSFT"]);
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toHaveLength(2);
      expect(result.map((q) => q.symbol).sort()).toEqual(["AAPL", "MSFT"]);
    });

    it("returns single quote when one symbol requested", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuoteService;
        return yield* service.getQuotes(["TSLA"]);
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("TSLA");
      expect(result[0].lastPrice).toBe(220.10);
    });

    it("returns empty array for empty symbols list", async () => {
      // Note: The mock layer may or may not filter, let's test actual mock behavior
      const program = Effect.gen(function* () {
        const service = yield* QuoteService;
        return yield* service.getQuotes([]);
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
      expect(result).toHaveLength(0);
    });

    it("handles case-insensitive symbol lookup", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuoteService;
        return yield* service.getQuotes(["aapl", "Msft"]);
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toHaveLength(2);
    });

    it("filters out symbols not found in quotes", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuoteService;
        return yield* service.getQuotes(["AAPL", "INVALID"]);
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      // Mock filters to only return quotes that exist
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("AAPL");
    });
  });

  describe("getQuote", () => {
    it("returns quote for valid symbol", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuoteService;
        return yield* service.getQuote("AAPL");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.symbol).toBe("AAPL");
      expect(result.lastPrice).toBe(178.52);
      expect(result.bidPrice).toBe(178.50);
      expect(result.askPrice).toBe(178.55);
    });

    it("fails with SymbolNotFoundError for invalid symbol", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuoteService;
        return yield* service.getQuote("INVALID");
      });

      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayer)));

      expect(exit._tag).toBe("Failure");
      if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
        const error = exit.cause.error as SymbolNotFoundError;
        expect(error._tag).toBe("SymbolNotFoundError");
        expect(error.symbol).toBe("INVALID");
      }
    });

    it("handles case-insensitive lookup", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuoteService;
        return yield* service.getQuote("msft");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.symbol).toBe("MSFT");
    });
  });

  describe("quote data structure", () => {
    it("contains all expected fields", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuoteService;
        return yield* service.getQuote("AAPL");
      });

      const quote = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(quote.symbol).toBeDefined();
      expect(quote.bidPrice).toBeDefined();
      expect(quote.askPrice).toBeDefined();
      expect(quote.lastPrice).toBeDefined();
      expect(quote.totalVolume).toBeDefined();
      expect(quote.netChange).toBeDefined();
      expect(quote.netChangePercent).toBeDefined();
      expect(quote.mark).toBeDefined();
      expect(quote.openPrice).toBeDefined();
      expect(quote.highPrice).toBeDefined();
      expect(quote.lowPrice).toBeDefined();
      expect(quote.closePrice).toBeDefined();
      expect(quote.exchange).toBeDefined();
      expect(quote.description).toBeDefined();
    });

    it("has Date objects for time fields", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuoteService;
        return yield* service.getQuote("AAPL");
      });

      const quote = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(quote.quoteTime).toBeInstanceOf(Date);
      expect(quote.tradeTime).toBeInstanceOf(Date);
    });
  });
});
