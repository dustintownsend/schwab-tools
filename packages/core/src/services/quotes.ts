import { Effect, Layer, Schema } from "effect";
import { QuoteService, HttpClient } from "./index.js";
import { SymbolNotFoundError } from "../errors.js";
import { decode } from "../validation.js";
import {
  type Quote,
  SchwabQuote,
  SchwabQuoteData,
  SchwabReference,
} from "../schemas/index.js";

// Schema for the quotes response (record of symbol -> quote)
const SchwabQuoteResponse = Schema.Record({
  key: Schema.String,
  value: SchwabQuote,
});

/**
 * Map a validated Schwab quote to our Quote type
 */
const mapQuote = (
  sq: typeof SchwabQuote.Type
): Quote => {
  const q = sq.quote;
  return {
    symbol: sq.symbol,
    bidPrice: q.bidPrice,
    askPrice: q.askPrice,
    lastPrice: q.lastPrice,
    totalVolume: q.totalVolume,
    netChange: q.netChange,
    netChangePercent: q.netPercentChange,
    mark: q.mark,
    openPrice: q.openPrice,
    highPrice: q.highPrice,
    lowPrice: q.lowPrice,
    closePrice: q.closePrice,
    quoteTime: q.quoteTime ? new Date(q.quoteTime) : new Date(),
    tradeTime: q.tradeTime ? new Date(q.tradeTime) : new Date(),
    exchange: sq.reference.exchange,
    description: sq.reference.description,
  };
};

/**
 * Create the Quote service implementation
 */
const makeQuoteService = Effect.gen(function* () {
  const httpClient = yield* HttpClient;

  const getQuotes = (symbols: readonly string[]) =>
    Effect.gen(function* () {
      if (symbols.length === 0) {
        return [];
      }

      // Schwab API accepts comma-separated symbols
      const symbolList = symbols.map((s) => s.toUpperCase()).join(",");
      const requestedSymbols = symbols.map((s) => s.toUpperCase());

      const rawResponse = yield* httpClient.request<unknown>({
        method: "GET",
        path: "/marketdata/v1/quotes",
        params: {
          symbols: symbolList,
          fields: "quote,reference",
        },
      });

      // Validate response with schema
      const response = yield* decode(
        SchwabQuoteResponse,
        rawResponse,
        "Quote API response"
      );

      // Filter and map valid quotes
      const quotes: Quote[] = [];
      const invalidSymbols: string[] = [];

      for (const symbol of requestedSymbols) {
        const schwabQuote = response[symbol];
        if (schwabQuote) {
          quotes.push(mapQuote(schwabQuote));
        } else {
          invalidSymbols.push(symbol);
        }
      }

      // If ALL symbols are invalid, fail with an error
      if (quotes.length === 0 && invalidSymbols.length > 0) {
        return yield* Effect.fail(
          new SymbolNotFoundError({
            symbol: invalidSymbols.join(", "),
            message: `No valid quotes found for symbol(s): ${invalidSymbols.join(", ")}`,
          })
        );
      }

      return quotes;
    });

  const getQuote = (symbol: string) =>
    Effect.gen(function* () {
      const quotes = yield* getQuotes([symbol]);
      if (quotes.length === 0) {
        return yield* Effect.fail(
          new SymbolNotFoundError({
            symbol,
            message: `Quote not found for symbol: ${symbol}`,
          })
        );
      }
      return quotes[0];
    });

  return {
    getQuotes,
    getQuote,
  };
});

/**
 * Live Quote service layer
 */
export const QuoteServiceLive = Layer.effect(QuoteService, makeQuoteService);
