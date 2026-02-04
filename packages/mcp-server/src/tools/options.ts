/**
 * Effect-based option tools for MCP server.
 */
import {
  Effect,
  OptionChainService,
  runSchwab,
  formatError,
  buildOptionSymbol,
  parseOptionSymbol,
  formatOptionSymbol,
  type CompactOption,
  type ContractType,
  type StrikeRange,
  type SchwabClientError,
} from "@schwab-tools/core";

export const optionTools = [
  {
    name: "schwab_get_option_chain",
    description:
      "Get option chain for a symbol",
    inputSchema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description: 'Underlying stock/ETF symbol (e.g., "AAPL", "SPY")',
        },
        contractType: {
          type: "string",
          enum: ["CALL", "PUT", "ALL"],
          description: "Filter by contract type (default: ALL)",
        },
        strikeCount: {
          type: "number",
          description:
            "Number of strikes above/below ATM to include (default: 10)",
        },
        expirationDays: {
          type: "number",
          description: "Only show expirations within N days (default: no limit)",
        },
        strikeRange: {
          type: "string",
          enum: ["ITM", "NTM", "OTM", "ALL"],
          description: "Filter by strike range relative to underlying price",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "schwab_build_option_symbol",
    description:
      "Build an OCC option symbol from components",
    inputSchema: {
      type: "object" as const,
      properties: {
        underlying: {
          type: "string",
          description: 'Underlying symbol (e.g., "TSLA", "AAPL")',
        },
        expiration: {
          type: "string",
          description: "Expiration date in YYYY-MM-DD format",
        },
        putCall: {
          type: "string",
          enum: ["P", "C"],
          description: "P for put, C for call",
        },
        strike: {
          type: "number",
          description: "Strike price",
        },
      },
      required: ["underlying", "expiration", "putCall", "strike"],
    },
  },
  {
    name: "schwab_parse_option_symbol",
    description:
      "Parse an OCC option symbol into its components",
    inputSchema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description: 'OCC option symbol (e.g., "TSLA  240119P00200000")',
        },
      },
      required: ["symbol"],
    },
  },
];

// Effect programs
const getOptionChainProgram = (
  symbol: string,
  params: {
    contractType?: ContractType;
    strikeCount?: number;
    expirationDays?: number;
    strikeRange?: StrikeRange;
  }
) =>
  Effect.gen(function* () {
    const optionService = yield* OptionChainService;
    return yield* optionService.getCompactOptionChain(symbol, params);
  });

// Result types
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
    const schwabError = error as SchwabClientError;
    return {
      success: false,
      error: formatError(schwabError),
      errorType: schwabError._tag,
    };
  }
}

function formatCompactOption(opt: CompactOption) {
  return {
    symbol: opt.symbol,
    strike: opt.strike,
    bid: opt.bid,
    ask: opt.ask,
    mid: Math.round(((opt.bid + opt.ask) / 2) * 100) / 100,
    spread: Math.round((opt.ask - opt.bid) * 100) / 100,
    spreadPct:
      opt.bid + opt.ask > 0
        ? Math.round(
            ((opt.ask - opt.bid) / ((opt.bid + opt.ask) / 2)) * 10000
          ) /
            100 +
          "%"
        : "N/A",
    volume: opt.volume,
    openInterest: opt.openInterest,
    itm: opt.itm,
    delta: opt.delta !== undefined ? Math.round(opt.delta * 100) / 100 : null,
    iv: opt.iv !== undefined ? Math.round(opt.iv * 100) + "%" : null,
  };
}

/**
 * Handle option tool calls
 */
export async function handleOptionTool(
  name: string,
  args: Record<string, unknown>
): Promise<Result<unknown>> {
  switch (name) {
    case "schwab_get_option_chain": {
      const symbol = args.symbol as string;
      const contractType = args.contractType as ContractType | undefined;
      const strikeCount = args.strikeCount as number | undefined;
      const expirationDays = args.expirationDays as number | undefined;
      const strikeRange = args.strikeRange as StrikeRange | undefined;

      const result = await runWithResult(
        getOptionChainProgram(symbol, {
          contractType,
          strikeCount: strikeCount ?? 10,
          expirationDays,
          strikeRange,
        })
      );

      if (!result.success) return result;

      const chain = result.data;
      return {
        success: true,
        data: {
          symbol: chain.symbol,
          underlyingPrice: chain.underlyingPrice,
          expirationCount: chain.expirations.length,
          expirations: chain.expirations.map((exp) => ({
            date: exp.date,
            daysToExpiration: exp.daysToExpiration,
            calls:
              contractType === "PUT"
                ? []
                : exp.calls.map(formatCompactOption),
            puts:
              contractType === "CALL"
                ? []
                : exp.puts.map(formatCompactOption),
          })),
        },
      };
    }

    case "schwab_build_option_symbol": {
      try {
        const underlying = args.underlying as string;
        const expirationStr = args.expiration as string;
        const putCall = args.putCall as "P" | "C";
        const strike = args.strike as number;

        const expiration = new Date(expirationStr);
        const symbol = buildOptionSymbol({
          underlying,
          expiration,
          putCall,
          strike,
        });

        return {
          success: true,
          data: {
            symbol,
            formatted: formatOptionSymbol(symbol),
            components: {
              underlying,
              expiration: expirationStr,
              putCall: putCall === "C" ? "Call" : "Put",
              strike,
            },
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          errorType: "ValidationError",
        };
      }
    }

    case "schwab_parse_option_symbol": {
      try {
        const symbol = args.symbol as string;
        const parsed = parseOptionSymbol(symbol);

        return {
          success: true,
          data: {
            symbol,
            formatted: formatOptionSymbol(symbol),
            components: {
              underlying: parsed.underlying,
              expiration: parsed.expiration.toISOString().split("T")[0],
              putCall: parsed.putCall === "C" ? "Call" : "Put",
              strike: parsed.strike,
            },
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          errorType: "ValidationError",
        };
      }
    }

    default:
      return {
        success: false,
        error: `Unknown tool: ${name}`,
        errorType: "UnknownTool",
      };
  }
}
