import { Effect, Layer } from "effect";
import {
  SchwabConfig,
  TokenStorage,
  TokenManager,
  RateLimiter,
  HttpClient,
  AccountService,
  QuoteService,
  PriceHistoryService,
  MoverService,
  InstrumentService,
  OptionChainService,
  UserPreferenceService,
  OrderService,
  type SchwabConfigShape,
  type StoredTokensShape,
  type RequestConfig,
} from "../services/index.js";
import { ConfigTest } from "../services/config.js";
import { TokenStorageTest } from "../services/token-storage.js";
import { RateLimiterTest } from "../services/rate-limiter.js";
import { HttpClientTest } from "../services/http-client.js";
import {
  AccountNotFoundError,
  SymbolNotFoundError,
  OrderNotFoundError,
  OrderRejectedError,
  type SchwabClientError,
} from "../errors.js";
import type {
  Account,
  AccountNumber,
  Transaction,
  Quote,
  Candle,
  MarketHours,
  Mover,
  Instrument,
  InstrumentProjection,
  OptionChain,
  CompactOptionChain,
  Expiration,
  UserPreference,
  Order,
} from "../schemas/index.js";

/**
 * Default test configuration
 */
export const testConfig: SchwabConfigShape = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  callbackPort: 443,
  callbackUrl: "https://127.0.0.1",
  baseUrl: "https://api.schwabapi.com",
  requestsPerMinute: 120,
  maxRetries: 3,
};

/**
 * Default test tokens (valid for 30 minutes)
 */
export const testTokens: StoredTokensShape = {
  accessToken: "test-access-token",
  refreshToken: "test-refresh-token",
  accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  refreshTokenExpiresAt: new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString(),
  scope: "api",
  tokenType: "Bearer",
};

/**
 * Test token manager that returns static tokens
 */
export const TokenManagerTest = (tokens: StoredTokensShape = testTokens) =>
  Layer.succeed(TokenManager, {
    getAccessToken: Effect.succeed(tokens.accessToken),
    refreshTokens: Effect.void,
    getTokenState: Effect.succeed({
      hasAccessToken: true,
      accessTokenExpiresAt: new Date(tokens.accessTokenExpiresAt),
      refreshTokenExpiresAt: new Date(tokens.refreshTokenExpiresAt),
      needsReauth: false,
    }),
    isRefreshTokenExpiring: Effect.succeed(false),
    logout: Effect.void,
  });

/**
 * Mock Account service
 */
export const AccountServiceTest = (mockData: {
  accountNumbers?: readonly AccountNumber[];
  accounts?: readonly Account[];
  transactions?: readonly Transaction[];
}) =>
  Layer.succeed(AccountService, {
    getAccountNumbers: Effect.succeed(mockData.accountNumbers ?? []),
    getAccountHash: (accountNumber: string) => {
      const account = mockData.accountNumbers?.find(
        (a) => a.accountNumber === accountNumber
      );
      if (account) {
        return Effect.succeed(account.hashValue);
      }
      return Effect.fail(
        new AccountNotFoundError({
          accountNumber,
          message: `Account ${accountNumber} not found`,
        })
      );
    },
    getAccount: (accountHash: string) => {
      const account = mockData.accounts?.find(
        (a) => a.accountHash === accountHash
      );
      if (account) {
        return Effect.succeed(account);
      }
      return Effect.fail(
        new AccountNotFoundError({
          accountNumber: accountHash,
          message: "Account not found",
        })
      );
    },
    getAccounts: Effect.succeed(mockData.accounts ?? []),
    getTransactions: () => Effect.succeed(mockData.transactions ?? []),
    getTransaction: (_accountHash: string, transactionId: string) => {
      const tx = mockData.transactions?.find(
        (transaction) => transaction.transactionId === transactionId
      );
      if (tx) {
        return Effect.succeed(tx);
      }
      return Effect.fail(
        new AccountNotFoundError({
          accountNumber: transactionId,
          message: `Transaction ${transactionId} not found`,
        })
      );
    },
  });

/**
 * Mock Quote service
 */
export const QuoteServiceTest = (mockQuotes: readonly Quote[]) =>
  Layer.succeed(QuoteService, {
    getQuotes: (symbols: readonly string[]) =>
      Effect.succeed(
        mockQuotes.filter((q) =>
          symbols.map((s) => s.toUpperCase()).includes(q.symbol.toUpperCase())
        )
      ),
    getQuotesByRequest: (request: {
      symbols?: readonly string[];
      cusips?: readonly string[];
      ssids?: readonly string[];
    }) =>
      Effect.succeed(
        mockQuotes.filter((q) => {
          if (
            (!request.symbols || request.symbols.length === 0) &&
            (!request.cusips || request.cusips.length === 0) &&
            (!request.ssids || request.ssids.length === 0)
          ) {
            return false;
          }
          if (request.symbols && request.symbols.length > 0) {
            return request.symbols
              .map((s) => s.toUpperCase())
              .includes(q.symbol.toUpperCase());
          }
          return true;
        })
      ),
    getQuote: (symbol: string) => {
      const quote = mockQuotes.find(
        (q) => q.symbol.toUpperCase() === symbol.toUpperCase()
      );
      if (quote) {
        return Effect.succeed(quote);
      }
      return Effect.fail(
        new SymbolNotFoundError({
          symbol,
          message: `Quote not found for symbol: ${symbol}`,
        })
      );
    },
  });

/**
 * Mock Price History service
 */
export const PriceHistoryServiceTest = (mockData: {
  candles?: readonly Candle[];
  marketHours?: readonly MarketHours[];
}) =>
  Layer.succeed(PriceHistoryService, {
    getPriceHistory: () => Effect.succeed(mockData.candles ?? []),
    getMarketHours: () => Effect.succeed(mockData.marketHours ?? []),
    getMarketHour: () => Effect.succeed(mockData.marketHours ?? []),
  });

/**
 * Mock Movers service
 */
export const MoverServiceTest = (mockMovers: readonly Mover[]) =>
  Layer.succeed(MoverService, {
    getMovers: () => Effect.succeed(mockMovers),
  });

/**
 * Mock Instruments service
 */
export const InstrumentServiceTest = (mockInstruments: readonly Instrument[]) =>
  Layer.succeed(InstrumentService, {
    getInstruments: (_symbol: string, _projection: InstrumentProjection) =>
      Effect.succeed(mockInstruments),
    getInstrumentByCusip: (cusip: string) => {
      const instrument = mockInstruments.find((item) => item.cusip === cusip);
      if (instrument) {
        return Effect.succeed(instrument);
      }
      return Effect.fail(
        new SymbolNotFoundError({
          symbol: cusip,
          message: `Instrument ${cusip} not found`,
        })
      );
    },
  });

/**
 * Mock Option Chain service
 */
export const OptionChainServiceTest = (mockData: {
  optionChain?: OptionChain;
  compactChain?: CompactOptionChain;
  expirationChain?: readonly Expiration[];
}) =>
  Layer.succeed(OptionChainService, {
    getOptionChain: (symbol: string) => {
      if (mockData.optionChain) {
        return Effect.succeed(mockData.optionChain);
      }
      return Effect.fail(
        new SymbolNotFoundError({
          symbol,
          message: "Option chain not found",
        })
      );
    },
    getCompactOptionChain: (symbol: string) => {
      if (mockData.compactChain) {
        return Effect.succeed(mockData.compactChain);
      }
      return Effect.fail(
        new SymbolNotFoundError({
          symbol,
          message: "Option chain not found",
        })
      );
    },
    getExpirationChain: (symbol: string) => {
      if (mockData.expirationChain) {
        return Effect.succeed(mockData.expirationChain);
      }
      return Effect.fail(
        new SymbolNotFoundError({
          symbol,
          message: "Option expiration chain not found",
        })
      );
    },
  });

/**
 * Mock User Preference service
 */
export const UserPreferenceServiceTest = (
  preferences: readonly UserPreference[]
) =>
  Layer.succeed(UserPreferenceService, {
    getUserPreference: Effect.succeed(preferences),
  });

/**
 * Mock Order service
 */
export const OrderServiceTest = (mockOrders: readonly Order[]) =>
  Layer.succeed(OrderService, {
    placeOrder: () => Effect.succeed("test-order-id"),
    getOrders: () => Effect.succeed(mockOrders),
    getAllOrders: () => Effect.succeed(mockOrders),
    getOrder: (accountHash: string, orderId: string) => {
      const order = mockOrders.find((o) => o.orderId === orderId);
      if (order) {
        return Effect.succeed(order);
      }
      return Effect.fail(
        new OrderNotFoundError({
          orderId,
          accountHash,
          message: `Order ${orderId} not found`,
        })
      );
    },
    cancelOrder: () => Effect.void,
    replaceOrder: () => Effect.succeed("test-new-order-id"),
    previewOrder: () => {
      if (mockOrders[0]) {
        return Effect.succeed(mockOrders[0]);
      }
      return Effect.fail(
        new OrderRejectedError({
          reason: "No mock order available",
          message: "No mock order available",
        })
      );
    },
  });

/**
 * Create a complete test layer with mock HTTP client
 */
export const SchwabServicesTest = (
  mockHandler: <T>(config: RequestConfig) => Effect.Effect<T, SchwabClientError>,
  options: {
    config?: SchwabConfigShape;
    tokens?: StoredTokensShape;
  } = {}
) => {
  const config = options.config ?? testConfig;
  const tokens = options.tokens ?? testTokens;

  return Layer.mergeAll(
    ConfigTest(config),
    TokenStorageTest(tokens),
    TokenManagerTest(tokens),
    RateLimiterTest,
    HttpClientTest(mockHandler)
  );
};

/**
 * Re-export test utilities
 */
export { ConfigTest, TokenStorageTest, RateLimiterTest, HttpClientTest };
