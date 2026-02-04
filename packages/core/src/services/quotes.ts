import { Effect, Layer } from "effect";
import { QuoteService, HttpClient } from "./index.js";
import { SymbolNotFoundError } from "../errors.js";
import { decode } from "../validation.js";
import {
  type Quote,
  type QuoteRequestParams,
  SchwabQuote,
} from "../schemas/index.js";

/**
 * Map a validated Schwab quote to our Quote type
 */
const mapQuote = (
  sq: typeof SchwabQuote.Type
): Quote => {
  const q = sq.quote;
  return {
    symbol: sq.symbol,
    bidPrice: q.bidPrice ?? 0,
    askPrice: q.askPrice ?? 0,
    lastPrice: q.lastPrice ?? 0,
    totalVolume: q.totalVolume ?? 0,
    netChange: q.netChange ?? 0,
    netChangePercent: q.netPercentChange ?? 0,
    mark: q.mark ?? q.lastPrice ?? 0,
    openPrice: q.openPrice ?? 0,
    highPrice: q.highPrice ?? 0,
    lowPrice: q.lowPrice ?? 0,
    closePrice: q.closePrice ?? 0,
    quoteTime: q.quoteTime ? new Date(q.quoteTime) : new Date(),
    tradeTime: q.tradeTime ? new Date(q.tradeTime) : new Date(),
    exchange: sq.reference.exchange ?? "",
    description: sq.reference.description ?? sq.symbol,
  };
};

const maybeDecodeQuote = (entry: unknown, context: string) =>
  decode(SchwabQuote, entry, context).pipe(
    Effect.match({
      onFailure: () => null,
      onSuccess: (quote) => quote,
    })
  );

const buildQuoteQueryParams = (
  request: QuoteRequestParams
): Record<string, string | boolean | undefined> => {
  const fields =
    request.fields && request.fields.length > 0
      ? request.fields.includes("all")
        ? undefined
        : request.fields.join(",")
      : undefined;

  return {
    symbols:
      request.symbols && request.symbols.length > 0
        ? request.symbols.map((s) => s.toUpperCase()).join(",")
        : undefined,
    cusips:
      request.cusips && request.cusips.length > 0
        ? request.cusips.join(",")
        : undefined,
    ssids:
      request.ssids && request.ssids.length > 0 ? request.ssids.join(",") : undefined,
    fields,
    indicative: request.indicative,
    realtime: request.realtime,
  };
};

/**
 * Create the Quote service implementation
 */
const makeQuoteService = Effect.gen(function* () {
  const httpClient = yield* HttpClient;

  const getQuotesByRequest = (request: QuoteRequestParams) =>
    Effect.gen(function* () {
      const hasSymbols = !!request.symbols?.length;
      const hasCusips = !!request.cusips?.length;
      const hasSsids = !!request.ssids?.length;
      if (!hasSymbols && !hasCusips && !hasSsids) {
        return [];
      }

      const response = yield* httpClient.request<Record<string, unknown>>({
        method: "GET",
        path: "/marketdata/v1/quotes",
        params: buildQuoteQueryParams(request),
      });

      const requestedSymbols =
        request.symbols?.map((symbol) => symbol.toUpperCase()) ?? [];

      if (requestedSymbols.length > 0) {
        const quotes: Quote[] = [];
        const invalidSymbols: string[] = [];

        for (const symbol of requestedSymbols) {
          const entry =
            response[symbol] ??
            response[Object.keys(response).find((key) => key.toUpperCase() === symbol) ?? ""];
          if (!entry) {
            invalidSymbols.push(symbol);
            continue;
          }

          const parsed = yield* maybeDecodeQuote(
            entry,
            `Quote API response for ${symbol}`
          );

          if (parsed) {
            quotes.push(mapQuote(parsed));
            continue;
          }

          invalidSymbols.push(symbol);
        }

        if (quotes.length === 0 && invalidSymbols.length > 0) {
          return yield* Effect.fail(
            new SymbolNotFoundError({
              symbol: invalidSymbols.join(", "),
              message: `No valid quotes found for symbol(s): ${invalidSymbols.join(", ")}`,
            })
          );
        }

        return quotes;
      }

      const quotes: Quote[] = [];
      for (const [key, entry] of Object.entries(response)) {
        const parsed = yield* maybeDecodeQuote(
          entry,
          `Quote API response for ${key}`
        );
        if (parsed) {
          quotes.push(mapQuote(parsed));
        }
      }
      return quotes;
    });

  const getQuotes = (
    symbols: readonly string[],
    options?: Omit<QuoteRequestParams, "symbols" | "cusips" | "ssids">
  ) =>
    getQuotesByRequest({
      symbols,
      ...options,
    });

  const getQuote = (
    symbol: string,
    options?: Omit<QuoteRequestParams, "symbols" | "cusips" | "ssids">
  ) =>
    Effect.gen(function* () {
      const symbolUpper = symbol.toUpperCase();
      const response = yield* httpClient.request<Record<string, unknown>>({
        method: "GET",
        path: `/marketdata/v1/${encodeURIComponent(symbolUpper)}/quotes`,
        params: {
          fields:
            options?.fields && options.fields.length > 0
              ? options.fields.includes("all")
                ? undefined
                : options.fields.join(",")
              : undefined,
          indicative: options?.indicative,
          realtime: options?.realtime,
        },
      });

      const entry =
        response[symbolUpper] ??
        response[Object.keys(response).find((key) => key.toUpperCase() === symbolUpper) ?? ""];
      if (!entry) {
        return yield* Effect.fail(
          new SymbolNotFoundError({
            symbol,
            message: `Quote not found for symbol: ${symbol}`,
          })
        );
      }

      const parsed = yield* maybeDecodeQuote(
        entry,
        `Quote API response for ${symbolUpper}`
      );
      if (!parsed) {
        return yield* Effect.fail(
          new SymbolNotFoundError({
            symbol,
            message: `Quote not found for symbol: ${symbol}`,
          })
        );
      }

      return mapQuote(parsed);
    });

  return {
    getQuotes,
    getQuotesByRequest,
    getQuote,
  };
});

/**
 * Live Quote service layer
 */
export const QuoteServiceLive = Layer.effect(QuoteService, makeQuoteService);
