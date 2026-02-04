/**
 * Effect-based account tools for MCP server.
 */
import {
  Effect,
  AccountService,
  runSchwab,
  formatError,
  type Account,
  type Position,
  type SchwabClientError,
} from "@schwab-tools/core";

export const accountTools = [
  {
    name: "schwab_get_accounts",
    description:
      "Get all linked Schwab accounts with balances and positions",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "schwab_get_account",
    description:
      "Get details for a specific Schwab account by account hash",
    inputSchema: {
      type: "object" as const,
      properties: {
        accountHash: {
          type: "string",
          description: "The account hash (from schwab_get_accounts)",
        },
      },
      required: ["accountHash"],
    },
  },
  {
    name: "schwab_get_account_numbers",
    description:
      "Get list of account numbers and their hashes",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// Effect programs
const getAccountsProgram = Effect.gen(function* () {
  const accountService = yield* AccountService;
  return yield* accountService.getAccounts;
});

const getAccountProgram = (accountHash: string) =>
  Effect.gen(function* () {
    const accountService = yield* AccountService;
    return yield* accountService.getAccount(accountHash);
  });

const getAccountNumbersProgram = Effect.gen(function* () {
  const accountService = yield* AccountService;
  return yield* accountService.getAccountNumbers;
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

function formatPosition(pos: Position) {
  return {
    symbol: pos.symbol,
    quantity: pos.quantity,
    averagePrice: pos.averagePrice,
    marketValue: pos.marketValue,
    unrealizedPL: pos.unrealizedPL,
    unrealizedPLPercent: pos.unrealizedPLPercent.toFixed(2) + "%",
    assetType: pos.assetType,
    ...(pos.assetType === "OPTION" && {
      underlying: pos.underlyingSymbol,
      putCall: pos.putCall,
      strike: pos.strikePrice,
      expiration: pos.expirationDate,
    }),
  };
}

function formatAccount(account: Account) {
  return {
    accountNumber: account.accountNumber,
    accountHash: account.accountHash,
    type: account.type,
    balances: {
      liquidationValue: account.balances.liquidationValue,
      cashAvailableForTrading: account.balances.cashAvailableForTrading,
      buyingPower: account.balances.buyingPower,
      equity: account.balances.equity,
    },
    positions: account.positions.map(formatPosition),
  };
}

/**
 * Handle account tool calls
 */
export async function handleAccountTool(
  name: string,
  args: Record<string, unknown>
): Promise<Result<unknown>> {
  switch (name) {
    case "schwab_get_accounts": {
      const result = await runWithResult(getAccountsProgram);
      if (!result.success) return result;

      return {
        success: true,
        data: {
          count: result.data.length,
          accounts: result.data.map(formatAccount),
        },
      };
    }

    case "schwab_get_account": {
      const accountHash = args.accountHash as string;
      const result = await runWithResult(getAccountProgram(accountHash));
      if (!result.success) return result;

      return {
        success: true,
        data: {
          accountNumber: result.data.accountNumber,
          accountHash: result.data.accountHash,
          type: result.data.type,
          balances: result.data.balances,
          positions: result.data.positions.map(formatPosition),
        },
      };
    }

    case "schwab_get_account_numbers": {
      const result = await runWithResult(getAccountNumbersProgram);
      if (!result.success) return result;

      return {
        success: true,
        data: {
          accounts: result.data.map((n) => ({
            accountNumber: n.accountNumber,
            hash: n.hashValue,
          })),
        },
      };
    }

    default:
      return {
        success: false,
        error: `Unknown tool: ${name}`,
        errorType: "UnknownTool",
      };
  }
}
