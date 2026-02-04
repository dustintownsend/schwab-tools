/**
 * Effect-based account tools for MCP server.
 */
import {
  Effect,
  AccountService,
  UserPreferenceService,
  runSchwab,
  formatError,
  type Account,
  type Position,
  type TransactionType,
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
  {
    name: "schwab_get_user_preference",
    description: "Get user preference information for the logged-in user",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "schwab_get_transactions",
    description: "Get account transactions for a date range",
    inputSchema: {
      type: "object" as const,
      properties: {
        accountHash: {
          type: "string",
          description: "Account hash",
        },
        startDate: {
          type: "string",
          description: "Start date/time in ISO-8601 format",
        },
        endDate: {
          type: "string",
          description: "End date/time in ISO-8601 format",
        },
        symbol: {
          type: "string",
          description: "Optional symbol filter",
        },
        types: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "TRADE",
              "RECEIVE_AND_DELIVER",
              "DIVIDEND_OR_INTEREST",
              "ACH_RECEIPT",
              "ACH_DISBURSEMENT",
              "CASH_RECEIPT",
              "CASH_DISBURSEMENT",
              "ELECTRONIC_FUND",
              "WIRE_IN",
              "WIRE_OUT",
              "JOURNAL",
              "MEMORANDUM",
              "MARGIN_CALL",
              "MONEY_MARKET",
              "SMA_ADJUSTMENT",
            ],
          },
          description: "Optional transaction type filters",
        },
      },
      required: ["accountHash"],
    },
  },
  {
    name: "schwab_get_transaction",
    description: "Get a specific transaction by ID",
    inputSchema: {
      type: "object" as const,
      properties: {
        accountHash: {
          type: "string",
          description: "Account hash",
        },
        transactionId: {
          type: "string",
          description: "Transaction ID",
        },
      },
      required: ["accountHash", "transactionId"],
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

const getUserPreferenceProgram = Effect.gen(function* () {
  const service = yield* UserPreferenceService;
  return yield* service.getUserPreference;
});

const getTransactionsProgram = (
  accountHash: string,
  params?: {
    startDate?: Date;
    endDate?: Date;
    symbol?: string;
    types?: TransactionType[];
  }
) =>
  Effect.gen(function* () {
    const service = yield* AccountService;
    return yield* service.getTransactions(accountHash, params);
  });

const getTransactionProgram = (accountHash: string, transactionId: string) =>
  Effect.gen(function* () {
    const service = yield* AccountService;
    return yield* service.getTransaction(accountHash, transactionId);
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

function formatTransaction(tx: {
  transactionId: string;
  type: string;
  description: string;
  transactionDate: Date;
  settlementDate: Date;
  netAmount: number;
  symbol?: string;
  quantity?: number;
  price?: number;
}) {
  return {
    transactionId: tx.transactionId,
    type: tx.type,
    description: tx.description,
    transactionDate: tx.transactionDate.toISOString(),
    settlementDate: tx.settlementDate.toISOString(),
    netAmount: tx.netAmount,
    symbol: tx.symbol,
    quantity: tx.quantity,
    price: tx.price,
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

    case "schwab_get_user_preference": {
      const result = await runWithResult(getUserPreferenceProgram);
      if (!result.success) return result;

      return {
        success: true,
        data: {
          preferences: result.data,
        },
      };
    }

    case "schwab_get_transactions": {
      const accountHash = args.accountHash as string;
      const startDate = args.startDate
        ? new Date(args.startDate as string)
        : undefined;
      const endDate = args.endDate ? new Date(args.endDate as string) : undefined;
      const symbol = args.symbol as string | undefined;
      const types = args.types as TransactionType[] | undefined;

      const result = await runWithResult(
        getTransactionsProgram(accountHash, { startDate, endDate, symbol, types })
      );
      if (!result.success) return result;

      return {
        success: true,
        data: {
          count: result.data.length,
          transactions: result.data.map(formatTransaction),
        },
      };
    }

    case "schwab_get_transaction": {
      const accountHash = args.accountHash as string;
      const transactionId = args.transactionId as string;

      const result = await runWithResult(
        getTransactionProgram(accountHash, transactionId)
      );
      if (!result.success) return result;

      return {
        success: true,
        data: formatTransaction(result.data),
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
