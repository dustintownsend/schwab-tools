/**
 * Effect-based market data tools for MCP server.
 * This demonstrates how to use Effect.ts for better error handling in MCP tools.
 */
import {
  Effect,
  QuoteService,
  PriceHistoryService,
  runSchwab,
  formatError,
  type Quote,
  type Candle,
  type MarketHours,
  type PriceHistoryPeriod,
  type PriceHistoryFrequency,
  type MarketType,
  type SchwabClientError,
} from "@schwab-tools/core";

// Tool definitions
export const marketDataTools = [
  {
    name: "schwab_get_quote",
    description:
      "Get current quotes for one or more stock/ETF symbols",
    inputSchema: {
      type: "object" as const,
      properties: {
        symbols: {
          type: "array",
          items: { type: "string" },
          description: "Stock/ETF symbols (e.g., ['AAPL', 'TSLA'])",
        },
      },
      required: ["symbols"],
    },
  },
  {
    name: "schwab_get_price_history",
    description:
      "Get historical price data (candles) for a symbol",
    inputSchema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description: "Stock/ETF symbol",
        },
        period: {
          type: "string",
          enum: ["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y", "10y", "20y"],
          description: "Time period (default: 1mo)",
        },
        frequency: {
          type: "string",
          enum: ["1min", "5min", "15min", "30min", "1d", "1w", "1mo"],
          description: "Candle frequency (default: 1d)",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "schwab_get_market_hours",
    description:
      "Get market hours and session times",
    inputSchema: {
      type: "object" as const,
      properties: {
        markets: {
          type: "array",
          items: {
            type: "string",
            enum: ["EQUITY", "OPTION", "BOND", "FUTURE", "FOREX"],
          },
          description: "Markets to query (default: ['EQUITY'])",
        },
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format (default: today)",
        },
      },
    },
  },
];

// Effect programs for each tool
const getQuotesProgram = (symbols: readonly string[]) =>
  Effect.gen(function* () {
    const quoteService = yield* QuoteService;
    return yield* quoteService.getQuotes(symbols);
  });

const getPriceHistoryProgram = (
  symbol: string,
  period?: PriceHistoryPeriod,
  frequency?: PriceHistoryFrequency
) =>
  Effect.gen(function* () {
    const priceHistoryService = yield* PriceHistoryService;
    return yield* priceHistoryService.getPriceHistory(symbol, {
      period: period ?? "1mo",
      frequency: frequency ?? "1d",
    });
  });

const getMarketHoursProgram = (markets: readonly MarketType[], date?: Date) =>
  Effect.gen(function* () {
    const priceHistoryService = yield* PriceHistoryService;
    return yield* priceHistoryService.getMarketHours(markets, date);
  });

// Result types for structured responses
interface SuccessResult<T> {
  success: true;
  data: T;
}

interface ErrorResult {
  success: false;
  error: string;
  errorType: string;
}

type Result<T> = SuccessResult<T> | ErrorResult;

// Helper to run an Effect and return a structured result
async function runWithResult<T>(
  effect: Effect.Effect<T, SchwabClientError, any>
): Promise<Result<T>> {
  try {
    const data = await runSchwab(effect);
    return { success: true, data };
  } catch (error) {
    // The error is already a SchwabClientError from Effect
    const schwabError = error as SchwabClientError;
    return {
      success: false,
      error: formatError(schwabError),
      errorType: schwabError._tag,
    };
  }
}

/**
 * Handle market data tool calls
 */
export async function handleMarketDataTool(
  name: string,
  args: Record<string, unknown>
): Promise<Result<unknown>> {
  switch (name) {
    case "schwab_get_quote": {
      const symbols = args.symbols as string[];
      return runWithResult(getQuotesProgram(symbols));
    }

    case "schwab_get_price_history": {
      const symbol = args.symbol as string;
      const period = args.period as PriceHistoryPeriod | undefined;
      const frequency = args.frequency as PriceHistoryFrequency | undefined;
      return runWithResult(getPriceHistoryProgram(symbol, period, frequency));
    }

    case "schwab_get_market_hours": {
      const markets = (args.markets as MarketType[] | undefined) ?? ["EQUITY"];
      const date = args.date
        ? new Date(args.date as string)
        : undefined;
      return runWithResult(getMarketHoursProgram(markets, date));
    }

    default:
      return {
        success: false,
        error: `Unknown tool: ${name}`,
        errorType: "UnknownTool",
      };
  }
}
