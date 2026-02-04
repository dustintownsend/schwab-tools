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
  QuoteRequestParams,
  Candle,
  PriceHistoryParams,
  MarketHours,
  Mover,
  Instrument,
  InstrumentProjection,
  OptionChain,
  OptionChainParams,
  CompactOptionChain,
  Expiration,
  UserPreference,
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
  readonly schwabClientAppId?: string;
  readonly schwabClientChannel?: string;
  readonly schwabClientFunctionId?: string;
  readonly schwabResourceVersion?: string;
  readonly schwabThirdPartyId?: string;
  readonly schwabPilotRollout?: string;
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
  readonly params?: Record<
    string,
    string | number | boolean | readonly (string | number | boolean)[] | undefined
  >;
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
  readonly getTransaction: (
    accountHash: string,
    transactionId: string
  ) => Effect.Effect<Transaction, SchwabClientError>;
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
    symbols: readonly string[],
    options?: Omit<QuoteRequestParams, "symbols" | "cusips" | "ssids">
  ) => Effect.Effect<readonly Quote[], SchwabClientError>;
  readonly getQuotesByRequest: (
    request: QuoteRequestParams
  ) => Effect.Effect<readonly Quote[], SchwabClientError | SymbolNotFoundError>;
  readonly getQuote: (
    symbol: string,
    options?: Omit<QuoteRequestParams, "symbols" | "cusips" | "ssids">
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
  readonly getMarketHour: (
    market: MarketType,
    date?: Date
  ) => Effect.Effect<readonly MarketHours[], SchwabClientError>;
}

export class PriceHistoryService extends Context.Tag("PriceHistoryService")<
  PriceHistoryService,
  PriceHistoryServiceShape
>() {}

// ============================================================================
// Movers Service
// ============================================================================

export interface MoverServiceShape {
  readonly getMovers: (
    symbol: string,
    params?: {
      sort?: "VOLUME" | "TRADES" | "PERCENT_CHANGE_UP" | "PERCENT_CHANGE_DOWN";
      frequency?: 0 | 1 | 5 | 10 | 30 | 60;
    }
  ) => Effect.Effect<readonly Mover[], SchwabClientError>;
}

export class MoverService extends Context.Tag("MoverService")<
  MoverService,
  MoverServiceShape
>() {}

// ============================================================================
// Instruments Service
// ============================================================================

export interface InstrumentServiceShape {
  readonly getInstruments: (
    symbol: string,
    projection: InstrumentProjection
  ) => Effect.Effect<readonly Instrument[], SchwabClientError>;
  readonly getInstrumentByCusip: (
    cusip: string
  ) => Effect.Effect<Instrument, SchwabClientError>;
}

export class InstrumentService extends Context.Tag("InstrumentService")<
  InstrumentService,
  InstrumentServiceShape
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
  readonly getExpirationChain: (
    symbol: string
  ) => Effect.Effect<readonly Expiration[], SchwabClientError>;
}

export class OptionChainService extends Context.Tag("OptionChainService")<
  OptionChainService,
  OptionChainServiceShape
>() {}

// ============================================================================
// User Preference Service
// ============================================================================

export interface UserPreferenceServiceShape {
  readonly getUserPreference: Effect.Effect<
    readonly UserPreference[],
    SchwabClientError
  >;
}

export class UserPreferenceService extends Context.Tag("UserPreferenceService")<
  UserPreferenceService,
  UserPreferenceServiceShape
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
