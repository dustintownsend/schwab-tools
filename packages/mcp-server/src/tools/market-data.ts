/**
 * Effect-based market data tools for MCP server.
 * This demonstrates how to use Effect.ts for better error handling in MCP tools.
 */
import {
  Effect,
  QuoteService,
  PriceHistoryService,
  MoverService,
  InstrumentService,
  runSchwab,
  formatError,
  type Quote,
  type Candle,
  type MarketHours,
  type PriceHistoryPeriod,
  type PriceHistoryFrequency,
  type MarketType,
  type InstrumentProjection,
  type QuoteRequestParams,
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
        cusips: {
          type: "array",
          items: { type: "string" },
          description: "CUSIP identifiers",
        },
        ssids: {
          type: "array",
          items: { type: "string" },
          description: "Schwab security identifiers (SSIDs)",
        },
        fields: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "all",
              "quote",
              "fundamental",
              "extended",
              "reference",
              "regular",
            ],
          },
          description: "Optional quote field subsets",
        },
        indicative: {
          type: "boolean",
          description: "Include indicative ETF symbols (e.g., $ABC.IV)",
        },
        realtime: {
          type: "boolean",
          description: "Advisor-token-only realtime bypass flag",
        },
      },
      anyOf: [
        { required: ["symbols"] },
        { required: ["cusips"] },
        { required: ["ssids"] },
      ],
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
          enum: [
            "1d",
            "2d",
            "3d",
            "4d",
            "5d",
            "10d",
            "1mo",
            "2mo",
            "3mo",
            "6mo",
            "1y",
            "2y",
            "3y",
            "5y",
            "10y",
            "15y",
            "20y",
            "ytd",
          ],
          description: "Time period (default: 1mo)",
        },
        frequency: {
          type: "string",
          enum: ["1min", "5min", "10min", "15min", "30min", "1d", "1w", "1mo"],
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
  {
    name: "schwab_get_market_hour",
    description: "Get market hours for a single market",
    inputSchema: {
      type: "object" as const,
      properties: {
        market: {
          type: "string",
          enum: ["EQUITY", "OPTION", "BOND", "FUTURE", "FOREX"],
          description: "Single market to query",
        },
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format (default: today)",
        },
      },
      required: ["market"],
    },
  },
  {
    name: "schwab_get_movers",
    description: "Get top movers for a supported index",
    inputSchema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description:
            "Index symbol (e.g., $DJI, $COMPX, $SPX, NYSE, NASDAQ)",
        },
        sort: {
          type: "string",
          enum: ["VOLUME", "TRADES", "PERCENT_CHANGE_UP", "PERCENT_CHANGE_DOWN"],
          description: "Sort criteria",
        },
        frequency: {
          type: "number",
          enum: [0, 1, 5, 10, 30, 60],
          description: "Mover frequency interval",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "schwab_get_instruments",
    description: "Search instruments by symbol and projection",
    inputSchema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description: "Symbol search input",
        },
        projection: {
          type: "string",
          enum: [
            "symbol-search",
            "symbol-regex",
            "desc-search",
            "desc-regex",
            "search",
            "fundamental",
          ],
          description: "Projection mode",
        },
      },
      required: ["symbol", "projection"],
    },
  },
  {
    name: "schwab_get_instrument_by_cusip",
    description: "Get a single instrument by CUSIP",
    inputSchema: {
      type: "object" as const,
      properties: {
        cusip: {
          type: "string",
          description: "CUSIP identifier",
        },
      },
      required: ["cusip"],
    },
  },
];

// Effect programs for each tool
const getQuotesProgram = (request: QuoteRequestParams) =>
  Effect.gen(function* () {
    const quoteService = yield* QuoteService;
    return yield* quoteService.getQuotesByRequest(request);
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

const getMarketHourProgram = (market: MarketType, date?: Date) =>
  Effect.gen(function* () {
    const priceHistoryService = yield* PriceHistoryService;
    return yield* priceHistoryService.getMarketHour(market, date);
  });

const getMoversProgram = (
  symbol: string,
  params?: {
    sort?: "VOLUME" | "TRADES" | "PERCENT_CHANGE_UP" | "PERCENT_CHANGE_DOWN";
    frequency?: 0 | 1 | 5 | 10 | 30 | 60;
  }
) =>
  Effect.gen(function* () {
    const moverService = yield* MoverService;
    return yield* moverService.getMovers(symbol, params);
  });

const getInstrumentsProgram = (
  symbol: string,
  projection: InstrumentProjection
) =>
  Effect.gen(function* () {
    const instrumentService = yield* InstrumentService;
    return yield* instrumentService.getInstruments(symbol, projection);
  });

const getInstrumentByCusipProgram = (cusip: string) =>
  Effect.gen(function* () {
    const instrumentService = yield* InstrumentService;
    return yield* instrumentService.getInstrumentByCusip(cusip);
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
      const symbols = args.symbols as string[] | undefined;
      const cusips = args.cusips as string[] | undefined;
      const ssids = args.ssids as string[] | undefined;
      const fields = args.fields as
        | ("all" | "quote" | "fundamental" | "extended" | "reference" | "regular")[]
        | undefined;
      const indicative = args.indicative as boolean | undefined;
      const realtime = args.realtime as boolean | undefined;
      return runWithResult(
        getQuotesProgram({
          symbols,
          cusips,
          ssids,
          fields,
          indicative,
          realtime,
        })
      );
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

    case "schwab_get_market_hour": {
      const market = args.market as MarketType;
      const date = args.date ? new Date(args.date as string) : undefined;
      return runWithResult(getMarketHourProgram(market, date));
    }

    case "schwab_get_movers": {
      const symbol = args.symbol as string;
      const sort = args.sort as
        | "VOLUME"
        | "TRADES"
        | "PERCENT_CHANGE_UP"
        | "PERCENT_CHANGE_DOWN"
        | undefined;
      const frequency = args.frequency as 0 | 1 | 5 | 10 | 30 | 60 | undefined;
      return runWithResult(getMoversProgram(symbol, { sort, frequency }));
    }

    case "schwab_get_instruments": {
      const symbol = args.symbol as string;
      const projection = args.projection as InstrumentProjection;
      return runWithResult(getInstrumentsProgram(symbol, projection));
    }

    case "schwab_get_instrument_by_cusip": {
      const cusip = args.cusip as string;
      return runWithResult(getInstrumentByCusipProgram(cusip));
    }

    default:
      return {
        success: false,
        error: `Unknown tool: ${name}`,
        errorType: "UnknownTool",
      };
  }
}
