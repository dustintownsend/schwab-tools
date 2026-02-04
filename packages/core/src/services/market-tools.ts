import { Effect, Layer } from "effect";
import { InstrumentService, HttpClient, MoverService } from "./index.js";
import { decode } from "../validation.js";
import {
  type Instrument,
  type InstrumentProjection,
  type Mover,
  type RawMover,
  InstrumentSearchResponse,
  Instrument as InstrumentSchema,
  MoverResponse,
} from "../schemas/index.js";

const makeMoverService = Effect.gen(function* () {
  const httpClient = yield* HttpClient;

  const normalizeMover = (mover: RawMover): Mover => ({
    change: mover.change ?? mover.percentChange ?? mover.netChange ?? 0,
    description: mover.description ?? mover.symbol ?? "",
    direction: mover.direction === "down" ? "down" : "up",
    last: mover.last ?? 0,
    symbol: mover.symbol ?? "",
    totalVolume: mover.totalVolume ?? 0,
  });

  const getMovers = (
    symbol: string,
    params?: {
      sort?: "VOLUME" | "TRADES" | "PERCENT_CHANGE_UP" | "PERCENT_CHANGE_DOWN";
      frequency?: 0 | 1 | 5 | 10 | 30 | 60;
    }
  ) =>
    Effect.gen(function* () {
      const rawResponse = yield* httpClient.request<unknown>({
        method: "GET",
        path: `/marketdata/v1/movers/${encodeURIComponent(symbol)}`,
        params: {
          sort: params?.sort,
          frequency: params?.frequency,
        },
      });

      const response = yield* decode(
        MoverResponse,
        rawResponse,
        "Movers API response"
      );

      return response.screeners
        .map(normalizeMover)
        .filter((mover) => mover.symbol.length > 0);
    });

  return {
    getMovers,
  };
});

const makeInstrumentService = Effect.gen(function* () {
  const httpClient = yield* HttpClient;

  const getInstruments = (symbol: string, projection: InstrumentProjection) =>
    Effect.gen(function* () {
      const rawResponse = yield* httpClient.request<unknown>({
        method: "GET",
        path: "/marketdata/v1/instruments",
        params: {
          symbol,
          projection,
        },
      });

      const response = yield* decode(
        InstrumentSearchResponse,
        rawResponse,
        "Instruments API response"
      );

      return response.instruments as readonly Instrument[];
    });

  const getInstrumentByCusip = (cusip: string) =>
    Effect.gen(function* () {
      const rawResponse = yield* httpClient.request<unknown>({
        method: "GET",
        path: `/marketdata/v1/instruments/${encodeURIComponent(cusip)}`,
      });

      return yield* decode(
        InstrumentSchema,
        rawResponse,
        "Instrument by CUSIP API response"
      );
    });

  return {
    getInstruments,
    getInstrumentByCusip,
  };
});

export const MoverServiceLive = Layer.effect(MoverService, makeMoverService);
export const InstrumentServiceLive = Layer.effect(
  InstrumentService,
  makeInstrumentService
);
