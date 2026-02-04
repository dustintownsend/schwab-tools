import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { InstrumentService, type RequestConfig } from "./index.js";
import { HttpClientTest } from "./http-client.js";
import { InstrumentServiceLive } from "./market-tools.js";
import { ApiError, type SchwabClientError } from "../errors.js";

const makeLayer = (
  handler: <T>(config: RequestConfig) => Effect.Effect<T, SchwabClientError>
) => InstrumentServiceLive.pipe(Layer.provide(HttpClientTest(handler)));

describe("InstrumentServiceLive", () => {
  it("parses envelope instruments response", async () => {
    const layer = makeLayer((config) => {
      if (config.path === "/marketdata/v1/instruments") {
        return Effect.succeed({
          instruments: [
            {
              cusip: "037833100",
              symbol: "AAPL",
              description: "Apple Inc",
              exchange: "NASDAQ",
              assetType: "EQUITY",
            },
          ],
        } as any);
      }

      return Effect.fail(
        new ApiError({
          statusCode: 404,
          endpoint: config.path,
          method: config.method,
          message: "Not found",
        })
      );
    });

    const program = Effect.gen(function* () {
      const service = yield* InstrumentService;
      return yield* service.getInstruments("AAPL", "search");
    });

    const result: any = await Effect.runPromise(
      program.pipe(Effect.provide(layer as any)) as any
    );
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("AAPL");
  });

  it("parses map-style instruments response", async () => {
    const layer = makeLayer((config) => {
      if (config.path === "/marketdata/v1/instruments") {
        return Effect.succeed({
          AAPL: {
            cusip: "037833100",
            symbol: "AAPL",
            description: "Apple Inc",
            exchange: "NASDAQ",
            assetType: "EQUITY",
          },
          MSFT: {
            cusip: "594918104",
            symbol: "MSFT",
            description: "Microsoft Corp",
            exchange: "NASDAQ",
            assetType: "EQUITY",
          },
        } as any);
      }

      return Effect.fail(
        new ApiError({
          statusCode: 404,
          endpoint: config.path,
          method: config.method,
          message: "Not found",
        })
      );
    });

    const program = Effect.gen(function* () {
      const service = yield* InstrumentService;
      return yield* service.getInstruments("AAPL", "search");
    });

    const result: any = await Effect.runPromise(
      program.pipe(Effect.provide(layer as any)) as any
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.some((item: any) => item.symbol === "AAPL")).toBe(true);
    expect(result.some((item: any) => item.symbol === "MSFT")).toBe(true);
  });

  it("parses array values in map-style response", async () => {
    const layer = makeLayer((config) => {
      if (config.path === "/marketdata/v1/instruments") {
        return Effect.succeed({
          AAPL: [
            {
              cusip: "037833100",
              symbol: "AAPL",
              description: "Apple Inc",
              exchange: "NASDAQ",
              assetType: "EQUITY",
            },
          ],
        } as any);
      }

      return Effect.fail(
        new ApiError({
          statusCode: 404,
          endpoint: config.path,
          method: config.method,
          message: "Not found",
        })
      );
    });

    const program = Effect.gen(function* () {
      const service = yield* InstrumentService;
      return yield* service.getInstruments("AAPL", "search");
    });

    const result: any = await Effect.runPromise(
      program.pipe(Effect.provide(layer as any)) as any
    );
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("AAPL");
  });

  it("parses nested instrumentInfo by CUSIP", async () => {
    const layer = makeLayer((config) => {
      if (config.path === "/marketdata/v1/instruments/037833100") {
        return Effect.succeed({
          instrumentInfo: {
            cusip: "037833100",
            symbol: "AAPL",
            description: "Apple Inc",
            exchange: "NASDAQ",
            assetType: "EQUITY",
          },
        } as any);
      }

      return Effect.fail(
        new ApiError({
          statusCode: 404,
          endpoint: config.path,
          method: config.method,
          message: "Not found",
        })
      );
    });

    const program = Effect.gen(function* () {
      const service = yield* InstrumentService;
      return yield* service.getInstrumentByCusip("037833100");
    });

    const result: any = await Effect.runPromise(
      program.pipe(Effect.provide(layer as any)) as any
    );
    expect(result.symbol).toBe("AAPL");
    expect(result.cusip).toBe("037833100");
  });

  it("uses map key as symbol when payload omits symbol field", async () => {
    const layer = makeLayer((config) => {
      if (config.path === "/marketdata/v1/instruments") {
        return Effect.succeed({
          NASDAQ: [
            {
              description: "NASDAQ Composite",
              exchange: "INDEX",
              assetType: "INDEX",
            },
          ],
        } as any);
      }

      return Effect.fail(
        new ApiError({
          statusCode: 404,
          endpoint: config.path,
          method: config.method,
          message: "Not found",
        })
      );
    });

    const program = Effect.gen(function* () {
      const service = yield* InstrumentService;
      return yield* service.getInstruments("NASDAQ", "search");
    });

    const result: any = await Effect.runPromise(
      program.pipe(Effect.provide(layer as any)) as any
    );
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("NASDAQ");
    expect(result[0].description).toBe("NASDAQ Composite");
  });

  it("returns empty array for empty object instrument response", async () => {
    const layer = makeLayer((config) => {
      if (config.path === "/marketdata/v1/instruments") {
        return Effect.succeed({} as any);
      }

      return Effect.fail(
        new ApiError({
          statusCode: 404,
          endpoint: config.path,
          method: config.method,
          message: "Not found",
        })
      );
    });

    const program = Effect.gen(function* () {
      const service = yield* InstrumentService;
      return yield* service.getInstruments("NASDAQ", "search");
    });

    const result: any = await Effect.runPromise(
      program.pipe(Effect.provide(layer as any)) as any
    );
    expect(result).toEqual([]);
  });
});
