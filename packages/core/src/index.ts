// Re-export Effect
export { Effect, Exit, Layer, Context, Data, Ref, Schedule, Schema } from "effect";

// Errors
export * from "./errors.js";

// Schemas (types)
export * from "./schemas/index.js";

// Services (Effect service tags and shapes)
export {
  SchwabConfig,
  type SchwabConfigShape,
  TokenStorage,
  type TokenStorageShape,
  type StoredTokensShape,
  TokenManager,
  type TokenManagerShape,
  type TokenStateShape,
  RateLimiter,
  type RateLimiterShape,
  type RateLimitStatusShape,
  HttpClient,
  type HttpClientShape,
  type RequestConfig,
  AccountService,
  type AccountServiceShape,
  QuoteService,
  type QuoteServiceShape,
  PriceHistoryService,
  type PriceHistoryServiceShape,
  MoverService,
  type MoverServiceShape,
  InstrumentService,
  type InstrumentServiceShape,
  OptionChainService,
  type OptionChainServiceShape,
  UserPreferenceService,
  type UserPreferenceServiceShape,
  OrderService,
  type OrderServiceShape,
} from "./services/index.js";

// Layers
export {
  SchwabServicesLive,
  type SchwabServices,
  type AllErrors,
} from "./layers/live.js";
export * from "./layers/test.js";

// Runtime helpers
export {
  runSchwab,
  runSchwabExit,
  handleExit,
  formatError,
  formatCause,
} from "./runtime.js";

// Validation utilities
export { decode } from "./validation.js";

// Auth utilities (for CLI auth command)
export {
  SchwabTokenManager,
  saveConfig,
  loadConfig,
  getConfigDir,
  getTokensPath,
  type StoredConfig,
} from "./auth/index.js";

// Utilities (option symbols, order builder)
export {
  buildOptionSymbol,
  parseOptionSymbol,
  formatOptionSymbol,
  isOptionSymbol,
  OrderBuilder,
  type OptionSymbolParams,
  type OrderSpec,
  type OrderLeg,
  type OrderInstruction,
  type LegSpec,
} from "./utils/index.js";

// Legacy types (for compatibility)
export type { TokenManager as LegacyTokenManager } from "./auth/index.js";
