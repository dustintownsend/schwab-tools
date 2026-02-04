import { Layer } from "effect";
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
} from "../services/index.js";
import { ConfigLive, type ConfigOptions } from "../services/config.js";
import { TokenStorageLive } from "../services/token-storage.js";
import { TokenManagerLive } from "../services/token-manager.js";
import { RateLimiterLive } from "../services/rate-limiter.js";
import { HttpClientLive } from "../services/http-client.js";
import { AccountServiceLive } from "../services/accounts.js";
import { QuoteServiceLive } from "../services/quotes.js";
import { PriceHistoryServiceLive } from "../services/price-history.js";
import { MoverServiceLive, InstrumentServiceLive } from "../services/market-tools.js";
import { OptionChainServiceLive } from "../services/options.js";
import { UserPreferenceServiceLive } from "../services/user-preferences.js";
import { OrderServiceLive } from "../services/orders.js";
import type { ConfigError, FileSystemError, SchwabClientError } from "../errors.js";

/**
 * Union of all possible errors from Schwab services
 */
export type AllErrors = SchwabClientError | ConfigError | FileSystemError;

/**
 * All Schwab services combined into a single layer type
 */
export type SchwabServices =
  | SchwabConfig
  | TokenStorage
  | TokenManager
  | RateLimiter
  | HttpClient
  | AccountService
  | QuoteService
  | PriceHistoryService
  | MoverService
  | InstrumentService
  | OptionChainService
  | UserPreferenceService
  | OrderService;

/**
 * Domain services layer (depends on HTTP client)
 */
const DomainServicesLive = Layer.mergeAll(
  AccountServiceLive,
  QuoteServiceLive,
  PriceHistoryServiceLive,
  MoverServiceLive,
  InstrumentServiceLive,
  OptionChainServiceLive,
  UserPreferenceServiceLive,
  OrderServiceLive
);

/**
 * Complete live layer with all services
 *
 * Usage:
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const quotes = yield* QuoteService;
 *   return yield* quotes.getQuotes(["AAPL", "TSLA"]);
 * });
 *
 * Effect.runPromise(
 *   program.pipe(Effect.provide(SchwabServicesLive()))
 * );
 * ```
 */
export const SchwabServicesLive = (
  options: ConfigOptions = {}
): Layer.Layer<SchwabServices, ConfigError | FileSystemError> => {
  // Config and storage are independent
  const configLayer = ConfigLive(options);
  const storageLayer = TokenStorageLive;

  // Token manager depends on config and storage
  const tokenManagerLayer = TokenManagerLive.pipe(
    Layer.provide(configLayer),
    Layer.provide(storageLayer)
  );

  // Rate limiter depends on config
  const rateLimiterLayer = RateLimiterLive.pipe(Layer.provide(configLayer));

  // HTTP client depends on config, token manager, and rate limiter
  const httpClientLayer = HttpClientLive.pipe(
    Layer.provide(configLayer),
    Layer.provide(tokenManagerLayer),
    Layer.provide(rateLimiterLayer)
  );

  // Domain services depend on HTTP client
  const domainServicesLayer = DomainServicesLive.pipe(
    Layer.provide(httpClientLayer)
  );

  // Merge all layers
  return Layer.mergeAll(
    configLayer,
    storageLayer,
    tokenManagerLayer,
    rateLimiterLayer,
    httpClientLayer,
    domainServicesLayer
  ) as Layer.Layer<SchwabServices, ConfigError | FileSystemError>;
};

/**
 * Convenience layer that only provides domain services
 * (assumes infrastructure is already provided)
 */
export const DomainServicesLayer = DomainServicesLive;

/**
 * Re-export individual layers for custom composition
 */
export {
  ConfigLive,
  TokenStorageLive,
  TokenManagerLive,
  RateLimiterLive,
  HttpClientLive,
  AccountServiceLive,
  QuoteServiceLive,
  PriceHistoryServiceLive,
  MoverServiceLive,
  InstrumentServiceLive,
  OptionChainServiceLive,
  UserPreferenceServiceLive,
  OrderServiceLive,
};
