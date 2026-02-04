import { Context, Effect } from "effect";
import type {
  AuthError,
  TokenExpiredError,
  ConfigError,
  FileSystemError,
  SchwabClientError,
  RateLimitError,
  OrderRejectedError,
  SymbolNotFoundError,
} from "../errors.js";
import type {
  Account,
  AccountNumber,
  Transaction,
  TransactionParams,
  Quote,
  Candle,
  PriceHistoryParams,
  MarketHours,
  OptionChain,
  OptionChainParams,
  CompactOptionChain,
  Order,
  OrderSpec,
  OrderQueryParams,
} from "../schemas/index.js";
import type { MarketType, HttpMethod } from "../schemas/primitives.js";

// ============================================================================
// Configuration
// ============================================================================

export interface SchwabConfigShape {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly callbackPort: number;
  readonly callbackUrl: string;
  readonly baseUrl: string;
  readonly requestsPerMinute: number;
  readonly maxRetries: number;
}

export class SchwabConfig extends Context.Tag("SchwabConfig")<
  SchwabConfig,
  SchwabConfigShape
>() {}

// ============================================================================
// Token State
// ============================================================================

export interface TokenStateShape {
  readonly hasAccessToken: boolean;
  readonly accessTokenExpiresAt: Date | null;
  readonly refreshTokenExpiresAt: Date | null;
  readonly needsReauth: boolean;
}

export interface StoredTokensShape {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshTokenExpiresAt: string;
  readonly scope: string;
  readonly tokenType: string;
}

// ============================================================================
// Token Storage Service
// ============================================================================

export interface TokenStorageShape {
  readonly loadTokens: Effect.Effect<StoredTokensShape | null, FileSystemError>;
  readonly saveTokens: (
    tokens: StoredTokensShape
  ) => Effect.Effect<void, FileSystemError>;
  readonly deleteTokens: Effect.Effect<void, FileSystemError>;
  readonly getTokensPath: Effect.Effect<string>;
}

export class TokenStorage extends Context.Tag("TokenStorage")<
  TokenStorage,
  TokenStorageShape
>() {}

// ============================================================================
// Token Manager Service
// ============================================================================

export interface TokenManagerShape {
  readonly getAccessToken: Effect.Effect<
    string,
    AuthError | TokenExpiredError | FileSystemError
  >;
  readonly refreshTokens: Effect.Effect<
    void,
    AuthError | TokenExpiredError | FileSystemError
  >;
  readonly getTokenState: Effect.Effect<TokenStateShape>;
  readonly isRefreshTokenExpiring: Effect.Effect<boolean>;
  readonly logout: Effect.Effect<void, FileSystemError>;
}

export class TokenManager extends Context.Tag("TokenManager")<
  TokenManager,
  TokenManagerShape
>() {}

// ============================================================================
// Rate Limiter Service
// ============================================================================

export interface RateLimitStatusShape {
  readonly requestsRemaining: number;
  readonly windowResetAt: Date;
}

export interface RateLimiterShape {
  readonly acquire: Effect.Effect<void, RateLimitError>;
  readonly getStatus: Effect.Effect<RateLimitStatusShape>;
  readonly reset: Effect.Effect<void>;
}

export class RateLimiter extends Context.Tag("RateLimiter")<
  RateLimiter,
  RateLimiterShape
>() {}

// ============================================================================
// HTTP Client Service
// ============================================================================

export interface RequestConfig {
  readonly method: HttpMethod;
  readonly path: string;
  readonly params?: Record<string, string | number | boolean | undefined>;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
}

export interface HttpClientShape {
  readonly request: <T>(
    config: RequestConfig
  ) => Effect.Effect<T, SchwabClientError>;
  readonly getRateLimitStatus: Effect.Effect<RateLimitStatusShape>;
}

export class HttpClient extends Context.Tag("HttpClient")<
  HttpClient,
  HttpClientShape
>() {}

// ============================================================================
// Account Service
// ============================================================================

export interface AccountServiceShape {
  readonly getAccountNumbers: Effect.Effect<
    readonly AccountNumber[],
    SchwabClientError
  >;
  readonly getAccountHash: (
    accountNumber: string
  ) => Effect.Effect<string, SchwabClientError>;
  readonly getAccount: (
    accountHash: string
  ) => Effect.Effect<Account, SchwabClientError>;
  readonly getAccounts: Effect.Effect<readonly Account[], SchwabClientError>;
  readonly getTransactions: (
    accountHash: string,
    params?: TransactionParams
  ) => Effect.Effect<readonly Transaction[], SchwabClientError>;
}

export class AccountService extends Context.Tag("AccountService")<
  AccountService,
  AccountServiceShape
>() {}

// ============================================================================
// Quote Service
// ============================================================================

export interface QuoteServiceShape {
  readonly getQuotes: (
    symbols: readonly string[]
  ) => Effect.Effect<readonly Quote[], SchwabClientError>;
  readonly getQuote: (
    symbol: string
  ) => Effect.Effect<Quote, SchwabClientError | SymbolNotFoundError>;
}

export class QuoteService extends Context.Tag("QuoteService")<
  QuoteService,
  QuoteServiceShape
>() {}

// ============================================================================
// Price History Service
// ============================================================================

export interface PriceHistoryServiceShape {
  readonly getPriceHistory: (
    symbol: string,
    params?: PriceHistoryParams
  ) => Effect.Effect<readonly Candle[], SchwabClientError>;
  readonly getMarketHours: (
    markets: readonly MarketType[],
    date?: Date
  ) => Effect.Effect<readonly MarketHours[], SchwabClientError>;
}

export class PriceHistoryService extends Context.Tag("PriceHistoryService")<
  PriceHistoryService,
  PriceHistoryServiceShape
>() {}

// ============================================================================
// Option Chain Service
// ============================================================================

export interface OptionChainServiceShape {
  readonly getOptionChain: (
    symbol: string,
    params?: OptionChainParams
  ) => Effect.Effect<OptionChain, SchwabClientError>;
  readonly getCompactOptionChain: (
    symbol: string,
    params?: OptionChainParams & { expirationDays?: number }
  ) => Effect.Effect<CompactOptionChain, SchwabClientError>;
}

export class OptionChainService extends Context.Tag("OptionChainService")<
  OptionChainService,
  OptionChainServiceShape
>() {}

// ============================================================================
// Order Service
// ============================================================================

export interface OrderServiceShape {
  readonly placeOrder: (
    accountHash: string,
    order: OrderSpec
  ) => Effect.Effect<string, SchwabClientError | OrderRejectedError>;
  readonly getOrders: (
    accountHash: string,
    params?: OrderQueryParams
  ) => Effect.Effect<readonly Order[], SchwabClientError>;
  readonly getAllOrders: (
    params?: OrderQueryParams
  ) => Effect.Effect<readonly Order[], SchwabClientError>;
  readonly getOrder: (
    accountHash: string,
    orderId: string
  ) => Effect.Effect<Order, SchwabClientError>;
  readonly cancelOrder: (
    accountHash: string,
    orderId: string
  ) => Effect.Effect<void, SchwabClientError>;
  readonly replaceOrder: (
    accountHash: string,
    orderId: string,
    newOrder: OrderSpec
  ) => Effect.Effect<string, SchwabClientError | OrderRejectedError>;
  readonly previewOrder: (
    accountHash: string,
    order: OrderSpec
  ) => Effect.Effect<Order, SchwabClientError>;
}

export class OrderService extends Context.Tag("OrderService")<
  OrderService,
  OrderServiceShape
>() {}

// ============================================================================
// Re-export all service types
// ============================================================================

export type {
  SchwabConfigShape as SchwabConfigType,
  TokenStateShape as TokenState,
  StoredTokensShape as StoredTokens,
  RateLimitStatusShape as RateLimitStatus,
  RequestConfig as RequestConfigType,
};
