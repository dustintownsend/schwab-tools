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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const debugSchema = (label: string, value: unknown): void => {
  if (process.env.SCHWAB_DEBUG_SCHEMA !== "1") {
    return;
  }
  const record = asRecord(value);
  const keys = record ? Object.keys(record).slice(0, 20) : [];
  const preview =
    typeof value === "string"
      ? value.slice(0, 400)
      : JSON.stringify(value, null, 2)?.slice(0, 1200) ?? String(value);
  console.error(
    `[schwab-debug] ${label} keys=${JSON.stringify(keys)}\n${preview}`
  );
};

const NON_SYMBOL_KEYS = new Set([
  "instrument",
  "instruments",
  "instrumentinfo",
  "bondinstrumentinfo",
  "fundamental",
  "description",
  "exchange",
  "assettype",
  "cusip",
  "symbol",
  "type",
  "id",
  "status",
  "message",
  "error",
  "errors",
]);

const symbolHintFromKey = (key: string): string | undefined => {
  const normalized = key.trim();
  if (!normalized || NON_SYMBOL_KEYS.has(normalized.toLowerCase())) {
    return undefined;
  }
  // Avoid using numeric-only keys (commonly CUSIPs/IDs) as symbols.
  if (/^\d+$/.test(normalized)) {
    return undefined;
  }
  return normalized;
};

const normalizeInstrumentRecord = (
  value: Record<string, unknown>,
  symbolHint?: string
): Instrument | null => {
  const nested =
    asRecord(value.instrument) ??
    asRecord(value.instrumentInfo) ??
    asRecord(value.bondInstrumentInfo) ??
    value;

  const symbol = asString(nested.symbol) ?? asString(value.symbol) ?? symbolHint;
  if (!symbol) {
    return null;
  }

  return {
    symbol,
    cusip: asString(nested.cusip) ?? asString(value.cusip),
    description: asString(nested.description) ?? asString(value.description),
    exchange: asString(nested.exchange) ?? asString(value.exchange),
    assetType: asString(nested.assetType) ?? asString(value.assetType),
  };
};

const extractInstrumentsFromUnknown = (raw: unknown): readonly Instrument[] => {
  const instruments: Instrument[] = [];
  const seen = new Set<string>();

  const pushInstrument = (instrument: Instrument) => {
    const key = `${instrument.symbol}|${instrument.cusip ?? ""}|${instrument.exchange ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      instruments.push(instrument);
    }
  };

  const walk = (value: unknown, symbolHint?: string) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item, symbolHint);
      }
      return;
    }

    const record = asRecord(value);
    if (!record) {
      return;
    }

    const direct = normalizeInstrumentRecord(record, symbolHint);
    if (direct) {
      pushInstrument(direct);
    }

    if (Array.isArray(record.instruments)) {
      for (const item of record.instruments) {
        walk(item, symbolHint);
      }
    }

    for (const [key, nestedValue] of Object.entries(record)) {
      if (typeof nestedValue === "object" && nestedValue !== null) {
        walk(nestedValue, symbolHintFromKey(key) ?? symbolHint);
      }
    }
  };

  walk(raw);
  return instruments;
};

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

      const decodedEnvelope = yield* decode(
        InstrumentSearchResponse,
        rawResponse,
        "Instruments API response"
      ).pipe(
        Effect.match({
          onFailure: () => {
            debugSchema("instruments_decode_failed", rawResponse);
            return null;
          },
          onSuccess: (value) => value,
        })
      );
      if (decodedEnvelope) {
        return decodedEnvelope.instruments as readonly Instrument[];
      }

      const extracted = extractInstrumentsFromUnknown(rawResponse);
      if (extracted.length > 0) {
        return extracted;
      }

      // Schwab sometimes returns `{}` for valid queries with no matches.
      const rawRecord = asRecord(rawResponse);
      if (rawRecord && Object.keys(rawRecord).length === 0) {
        return [];
      }

      // Re-run strict decode to preserve detailed error surface.
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

      const decodedSingle = yield* decode(
        InstrumentSchema,
        rawResponse,
        "Instrument by CUSIP API response"
      ).pipe(
        Effect.match({
          onFailure: () => null,
          onSuccess: (value) => value,
        })
      );
      if (decodedSingle) {
        return decodedSingle;
      }

      const extracted = extractInstrumentsFromUnknown(rawResponse);
      const matched =
        extracted.find((instrument) => instrument.cusip === cusip) ??
        extracted[0];
      if (matched) {
        return matched;
      }

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
