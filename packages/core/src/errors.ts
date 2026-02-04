import { Data } from "effect";

/**
 * Base error for all Schwab client errors
 */
export class SchwabError extends Data.TaggedError("SchwabError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Authentication errors
 */
export type AuthErrorCode =
  | "NOT_AUTHENTICATED"
  | "TOKEN_EXPIRED"
  | "REFRESH_FAILED"
  | "INVALID_CREDENTIALS";

export class AuthError extends Data.TaggedError("AuthError")<{
  readonly code: AuthErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Token expiration error with specific token type
 */
export class TokenExpiredError extends Data.TaggedError("TokenExpiredError")<{
  readonly tokenType: "access" | "refresh";
  readonly expiredAt: Date;
  readonly message: string;
}> {}

/**
 * API error from Schwab API
 */
export class ApiError extends Data.TaggedError("ApiError")<{
  readonly statusCode: number;
  readonly endpoint: string;
  readonly method: string;
  readonly message: string;
  readonly body?: unknown;
}> {}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly retryAfterMs: number;
  readonly endpoint: string;
  readonly message: string;
}> {}

/**
 * Network error (connection failures, timeouts)
 */
export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly message: string;
  readonly isRetryable: boolean;
  readonly cause?: unknown;
}> {}

/**
 * Schema validation error
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly path: string;
  readonly expected: string;
  readonly received: string;
  readonly message: string;
}> {}

/**
 * Schema parse error with raw data
 */
export class SchemaParseError extends Data.TaggedError("SchemaParseError")<{
  readonly errors: readonly { path: string; message: string }[];
  readonly rawData: unknown;
  readonly message: string;
}> {}

/**
 * Account not found error
 */
export class AccountNotFoundError extends Data.TaggedError(
  "AccountNotFoundError"
)<{
  readonly accountNumber: string;
  readonly message: string;
}> {}

/**
 * Order not found error
 */
export class OrderNotFoundError extends Data.TaggedError("OrderNotFoundError")<{
  readonly orderId: string;
  readonly accountHash: string;
  readonly message: string;
}> {}

/**
 * Symbol not found error
 */
export class SymbolNotFoundError extends Data.TaggedError(
  "SymbolNotFoundError"
)<{
  readonly symbol: string;
  readonly message: string;
}> {}

/**
 * Order rejected error
 */
export class OrderRejectedError extends Data.TaggedError("OrderRejectedError")<{
  readonly reason: string;
  readonly orderDetails?: unknown;
  readonly message: string;
}> {}

/**
 * Configuration error
 */
export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly field: string;
  readonly message: string;
}> {}

/**
 * File system error
 */
export class FileSystemError extends Data.TaggedError("FileSystemError")<{
  readonly operation: "read" | "write" | "delete" | "mkdir";
  readonly path: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Union type for all Schwab client errors
 */
export type SchwabClientError =
  | AuthError
  | TokenExpiredError
  | ApiError
  | RateLimitError
  | NetworkError
  | ValidationError
  | SchemaParseError
  | AccountNotFoundError
  | OrderNotFoundError
  | SymbolNotFoundError
  | OrderRejectedError
  | ConfigError
  | FileSystemError;
