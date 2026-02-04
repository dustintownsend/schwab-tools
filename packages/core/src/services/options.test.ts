import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { OptionChainService } from "./index.js";
import { OptionChainServiceTest } from "../layers/test.js";
import { SymbolNotFoundError } from "../errors.js";
import { mockOptionChain, mockCompactOptionChain } from "../../test/fixtures/options.js";

describe("OptionChainService", () => {
  const testLayer = OptionChainServiceTest({
    optionChain: mockOptionChain,
    compactChain: mockCompactOptionChain,
  });

  describe("getOptionChain", () => {
    it("returns option chain for valid symbol", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OptionChainService;
        return yield* service.getOptionChain("AAPL");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.symbol).toBe("AAPL");
      expect(result.underlyingPrice).toBe(178.52);
      expect(result.volatility).toBe(0.32);
    });

    it("returns chain with call expirations", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OptionChainService;
        return yield* service.getOptionChain("AAPL");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.callExpDateMap).toBeDefined();
      const expDates = Object.keys(result.callExpDateMap);
      expect(expDates.length).toBeGreaterThan(0);
    });

    it("returns chain with put expirations", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OptionChainService;
        return yield* service.getOptionChain("AAPL");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.putExpDateMap).toBeDefined();
      const expDates = Object.keys(result.putExpDateMap);
      expect(expDates.length).toBeGreaterThan(0);
    });

    it("returns contracts with correct fields", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OptionChainService;
        return yield* service.getOptionChain("AAPL");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      const expDateKey = Object.keys(result.callExpDateMap)[0];
      const strikeKey = Object.keys(result.callExpDateMap[expDateKey])[0];
      const contract = result.callExpDateMap[expDateKey][strikeKey][0];

      expect(contract.symbol).toBeDefined();
      expect(contract.strikePrice).toBeDefined();
      expect(contract.bid).toBeDefined();
      expect(contract.ask).toBeDefined();
      expect(contract.delta).toBeDefined();
      expect(contract.impliedVolatility).toBeDefined();
      expect(contract.putCall).toBe("CALL");
    });

    it("fails with SymbolNotFoundError when no chain available", async () => {
      const emptyLayer = OptionChainServiceTest({});

      const program = Effect.gen(function* () {
        const service = yield* OptionChainService;
        return yield* service.getOptionChain("INVALID");
      });

      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(emptyLayer)));

      expect(exit._tag).toBe("Failure");
      if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
        const error = exit.cause.error as SymbolNotFoundError;
        expect(error._tag).toBe("SymbolNotFoundError");
        expect(error.symbol).toBe("INVALID");
      }
    });
  });

  describe("getCompactOptionChain", () => {
    it("returns compact option chain for valid symbol", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OptionChainService;
        return yield* service.getCompactOptionChain("AAPL");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.symbol).toBe("AAPL");
      expect(result.underlyingPrice).toBe(178.52);
      expect(result.expirations).toBeDefined();
    });

    it("returns compact chain with expirations array", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OptionChainService;
        return yield* service.getCompactOptionChain("AAPL");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(Array.isArray(result.expirations)).toBe(true);
      expect(result.expirations.length).toBeGreaterThan(0);
    });

    it("returns expirations with calls and puts", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OptionChainService;
        return yield* service.getCompactOptionChain("AAPL");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      const expiration = result.expirations[0];
      expect(expiration.date).toBeDefined();
      expect(expiration.daysToExpiration).toBeDefined();
      expect(Array.isArray(expiration.calls)).toBe(true);
      expect(Array.isArray(expiration.puts)).toBe(true);
    });

    it("returns compact options with simplified fields", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OptionChainService;
        return yield* service.getCompactOptionChain("AAPL");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      const call = result.expirations[0].calls[0];
      expect(call.symbol).toBeDefined();
      expect(call.strike).toBeDefined();
      expect(call.bid).toBeDefined();
      expect(call.ask).toBeDefined();
      expect(call.mid).toBeDefined();
      expect(call.volume).toBeDefined();
      expect(call.openInterest).toBeDefined();
      expect(call.delta).toBeDefined();
      expect(call.iv).toBeDefined();
      expect(typeof call.itm).toBe("boolean");
    });

    it("calculates mid price correctly", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OptionChainService;
        return yield* service.getCompactOptionChain("AAPL");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      const call = result.expirations[0].calls[0];
      const expectedMid = (call.bid + call.ask) / 2;
      expect(call.mid).toBeCloseTo(expectedMid, 10);
    });

    it("fails with SymbolNotFoundError when no chain available", async () => {
      const emptyLayer = OptionChainServiceTest({});

      const program = Effect.gen(function* () {
        const service = yield* OptionChainService;
        return yield* service.getCompactOptionChain("INVALID");
      });

      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(emptyLayer)));

      expect(exit._tag).toBe("Failure");
      if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
        const error = exit.cause.error as SymbolNotFoundError;
        expect(error._tag).toBe("SymbolNotFoundError");
      }
    });
  });

  describe("option chain structure", () => {
    it("organizes contracts by expiration date and strike", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OptionChainService;
        return yield* service.getOptionChain("AAPL");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      // Check structure: expDateMap[dateKey][strikeKey] = contracts[]
      for (const [dateKey, strikes] of Object.entries(result.callExpDateMap)) {
        expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}:\d+$/);
        for (const [strikeKey, contracts] of Object.entries(strikes)) {
          expect(parseFloat(strikeKey)).not.toBeNaN();
          expect(Array.isArray(contracts)).toBe(true);
        }
      }
    });

    it("identifies ITM options correctly", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OptionChainService;
        return yield* service.getOptionChain("AAPL");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      // Underlying is 178.52, so 175 call should be ITM, 180 call OTM
      const expDateKey = Object.keys(result.callExpDateMap)[0];
      const strikes = result.callExpDateMap[expDateKey];

      const strike175Contracts = strikes["175.0"];
      const strike180Contracts = strikes["180.0"];

      if (strike175Contracts && strike175Contracts.length > 0) {
        expect(strike175Contracts[0].inTheMoney).toBe(true);
      }

      if (strike180Contracts && strike180Contracts.length > 0) {
        expect(strike180Contracts[0].inTheMoney).toBe(false);
      }
    });
  });
});
