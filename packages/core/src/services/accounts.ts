import { Effect, Layer, Ref, Schema } from "effect";
import { AccountService, HttpClient } from "./index.js";
import { AccountNotFoundError, ApiError } from "../errors.js";
import { decode } from "../validation.js";
import {
  type Account,
  type AccountNumber,
  type Balances,
  type Position,
  type Transaction,
  type TransactionParams,
  type TransactionType,
  type AccountType,
  type AssetType,
  SchwabAccountNumber,
  SchwabAccount,
  SchwabPosition,
  SchwabBalances,
  SchwabTransaction,
} from "../schemas/index.js";

// Schema for arrays of API responses
const SchwabAccountNumberArray = Schema.Array(SchwabAccountNumber);
const SchwabAccountArray = Schema.Array(SchwabAccount);
const SchwabTransactionArray = Schema.Array(SchwabTransaction);

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TRANSACTION_LOOKBACK_DAYS = 30;
const MAX_TRANSACTION_RANGE_DAYS = 365;
const DEFAULT_TRANSACTION_TYPES: readonly TransactionType[] = [
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
];

// Mappers
const mapAccountType = (type: string): AccountType => {
  switch (type.toUpperCase()) {
    case "MARGIN":
      return "MARGIN";
    case "CASH":
      return "CASH";
    case "IRA":
    default:
      return "IRA";
  }
};

const mapAssetType = (type: string): AssetType => {
  switch (type.toUpperCase()) {
    case "EQUITY":
      return "EQUITY";
    case "OPTION":
      return "OPTION";
    case "MUTUAL_FUND":
      return "MUTUAL_FUND";
    case "CASH_EQUIVALENT":
      return "CASH_EQUIVALENT";
    case "FIXED_INCOME":
      return "FIXED_INCOME";
    case "FUTURE":
      return "FUTURE";
    case "FOREX":
      return "FOREX";
    case "INDEX":
      return "INDEX";
    case "PRODUCT":
      return "PRODUCT";
    case "CURRENCY":
      return "CURRENCY";
    case "COLLECTIVE_INVESTMENT":
      return "COLLECTIVE_INVESTMENT";
    default:
      return "UNKNOWN";
  }
};

const mapPosition = (pos: typeof SchwabPosition.Type): Position => {
  const quantity = pos.longQuantity - pos.shortQuantity;
  const costBasis = pos.averagePrice * Math.abs(quantity);
  const unrealizedPL = pos.marketValue - costBasis;
  const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

  return {
    symbol: pos.instrument.symbol,
    quantity,
    averagePrice: pos.averagePrice,
    marketValue: pos.marketValue,
    unrealizedPL,
    unrealizedPLPercent,
    assetType: mapAssetType(pos.instrument.assetType),
    underlyingSymbol: pos.instrument.underlyingSymbol,
    putCall: pos.instrument.putCall as "PUT" | "CALL" | undefined,
    strikePrice: pos.instrument.strikePrice,
    expirationDate: pos.instrument.optionExpirationDate,
  };
};

const mapBalances = (balances: typeof SchwabBalances.Type): Balances => ({
  cashBalance: balances.cashBalance ?? 0,
  cashAvailableForTrading:
    balances.cashAvailableForTrading ?? balances.availableFunds ?? 0,
  cashAvailableForWithdrawal: balances.cashAvailableForWithdrawal ?? 0,
  liquidationValue: balances.liquidationValue ?? 0,
  longMarketValue: balances.longMarketValue ?? 0,
  shortMarketValue: balances.shortMarketValue ?? 0,
  longOptionMarketValue: balances.longOptionMarketValue ?? 0,
  shortOptionMarketValue: balances.shortOptionMarketValue ?? 0,
  equity: balances.equity ?? 0,
  marginBalance: balances.marginBalance ?? 0,
  maintenanceRequirement: balances.maintenanceRequirement ?? 0,
  buyingPower: balances.buyingPower ?? balances.stockBuyingPower ?? 0,
  dayTradingBuyingPower: balances.dayTradingBuyingPower ?? 0,
});

const mapAccount = (response: typeof SchwabAccount.Type, accountHash: string): Account => {
  const sa = response.securitiesAccount;
  return {
    accountNumber: sa.accountNumber,
    accountHash,
    type: mapAccountType(sa.type),
    positions: (sa.positions ?? []).map(mapPosition),
    balances: mapBalances(sa.currentBalances ?? {}),
  };
};

const mapTransaction = (tx: typeof SchwabTransaction.Type): Transaction => ({
  transactionId: String(tx.activityId),
  type: tx.type as Transaction["type"],
  description: tx.description,
  transactionDate: new Date(tx.time),
  settlementDate: new Date(tx.settlementDate),
  netAmount: tx.netAmount,
  symbol: tx.transactionItem?.instrument?.symbol,
  quantity: tx.transactionItem?.amount,
  price: tx.transactionItem?.price,
});

/**
 * Create the Account service implementation
 */
const makeAccountService = Effect.gen(function* () {
  const httpClient = yield* HttpClient;

  // Cache for account hashes
  const accountHashCache = yield* Ref.make<Map<string, string>>(new Map());

  const getAccountNumbers = Effect.gen(function* () {
    const rawResponse = yield* httpClient.request<unknown>({
      method: "GET",
      path: "/trader/v1/accounts/accountNumbers",
    });

    // Validate response with schema
    const response = yield* decode(
      SchwabAccountNumberArray,
      rawResponse,
      "Account numbers API response"
    );

    // Update cache
    const cache = new Map<string, string>();
    for (const account of response) {
      cache.set(account.accountNumber, account.hashValue);
    }
    yield* Ref.set(accountHashCache, cache);

    return response.map(
      (a): AccountNumber => ({
        accountNumber: a.accountNumber,
        hashValue: a.hashValue,
      })
    );
  });

  const getAccountHash = (accountNumber: string) =>
    Effect.gen(function* () {
      // Check cache first
      const cache = yield* Ref.get(accountHashCache);
      if (cache.has(accountNumber)) {
        return cache.get(accountNumber)!;
      }

      // Fetch and cache
      yield* getAccountNumbers;

      const updatedCache = yield* Ref.get(accountHashCache);
      const hash = updatedCache.get(accountNumber);
      if (!hash) {
        return yield* Effect.fail(
          new AccountNotFoundError({
            accountNumber,
            message: `Account ${accountNumber} not found`,
          })
        );
      }

      return hash;
    });

  const getAccount = (accountHash: string) =>
    Effect.gen(function* () {
      const encodedAccountHash = encodeURIComponent(accountHash);
      const rawResponse = yield* httpClient.request<unknown>({
        method: "GET",
        path: `/trader/v1/accounts/${encodedAccountHash}`,
        params: {
          fields: "positions",
        },
      });

      // Validate response with schema
      const response = yield* decode(
        SchwabAccount,
        rawResponse,
        "Account API response"
      );

      return mapAccount(response, accountHash);
    });

  const getAccounts = Effect.gen(function* () {
    const accountNumbers = yield* getAccountNumbers;
    const accountHashByNumber = new Map(
      accountNumbers.map((account) => [account.accountNumber, account.hashValue])
    );

    const rawResponse = yield* httpClient.request<unknown>({
      method: "GET",
      path: "/trader/v1/accounts",
      params: {
        fields: "positions",
      },
    });

    // Validate response with schema
    const response = yield* decode(
      SchwabAccountArray,
      rawResponse,
      "Accounts API response"
    );

    return response.map((account) => {
      const hash =
        accountHashByNumber.get(account.securitiesAccount.accountNumber) ?? "";
      return mapAccount(account, hash);
    });
  });

  const getTransactions = (accountHash: string, params?: TransactionParams) =>
    Effect.gen(function* () {
      const encodedAccountHash = encodeURIComponent(accountHash);
      const endDate = params?.endDate ?? new Date();
      const startDateRaw =
        params?.startDate ??
        new Date(endDate.getTime() - DEFAULT_TRANSACTION_LOOKBACK_DAYS * DAY_MS);
      const minStartDate = new Date(
        endDate.getTime() - MAX_TRANSACTION_RANGE_DAYS * DAY_MS
      );
      const startDate =
        startDateRaw.getTime() < minStartDate.getTime()
          ? minStartDate
          : startDateRaw;
      const types =
        params?.types && params.types.length > 0
          ? params.types
          : DEFAULT_TRANSACTION_TYPES;

      const queryParams: Record<string, string | undefined> = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        types: types.join(","),
      };

      if (params?.symbol) {
        queryParams.symbol = params.symbol;
      }

      const rawResponse = yield* httpClient.request<unknown>({
        method: "GET",
        path: `/trader/v1/accounts/${encodedAccountHash}/transactions`,
        params: queryParams,
      });

      // Validate response with schema
      const response = yield* decode(
        SchwabTransactionArray,
        rawResponse,
        "Transactions API response"
      );

      return response.map(mapTransaction);
    });

  const getTransaction = (accountHash: string, transactionId: string) =>
    Effect.gen(function* () {
      const encodedAccountHash = encodeURIComponent(accountHash);
      const encodedTransactionId = encodeURIComponent(transactionId);
      const rawResponse = yield* httpClient.request<unknown>({
        method: "GET",
        path: `/trader/v1/accounts/${encodedAccountHash}/transactions/${encodedTransactionId}`,
      });

      // Endpoint may return either a single object or a singleton array.
      const normalized = Array.isArray(rawResponse) ? rawResponse[0] : rawResponse;
      if (!normalized) {
        return yield* Effect.fail(
          new ApiError({
            statusCode: 404,
            endpoint: `/trader/v1/accounts/${encodedAccountHash}/transactions/${encodedTransactionId}`,
            method: "GET",
            message: `Transaction ${transactionId} not found`,
          })
        );
      }

      const response = yield* decode(
        SchwabTransaction,
        normalized,
        "Transaction API response"
      );

      return mapTransaction(response);
    });

  return {
    getAccountNumbers,
    getAccountHash,
    getAccount,
    getAccounts,
    getTransactions,
    getTransaction,
  };
});

/**
 * Live Account service layer
 */
export const AccountServiceLive = Layer.effect(AccountService, makeAccountService);
