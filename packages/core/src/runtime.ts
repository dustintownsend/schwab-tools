import { Effect, Exit, Cause, pipe, Chunk } from "effect";
import type { ConfigError, FileSystemError, SchwabClientError } from "./errors.js";
import { SchwabServicesLive, type SchwabServices } from "./layers/live.js";
import type { ConfigOptions } from "./services/config.js";

type AllErrors = SchwabClientError | ConfigError | FileSystemError;

/**
 * Run an Effect program with Schwab services and return a Promise.
 * This is the main entry point for CLI and MCP server integration.
 *
 * @example
 * ```typescript
 * const quotes = await runSchwab(
 *   Effect.gen(function* () {
 *     const quoteService = yield* QuoteService;
 *     return yield* quoteService.getQuotes(["AAPL", "TSLA"]);
 *   })
 * );
 * ```
 */
export const runSchwab = <A, E extends AllErrors>(
  effect: Effect.Effect<A, E, SchwabServices>,
  options: ConfigOptions = {}
): Promise<A> =>
  Effect.runPromise(
    effect.pipe(Effect.provide(SchwabServicesLive(options)))
  );

/**
 * Run an Effect program and return an Exit value for more control over error handling.
 *
 * @example
 * ```typescript
 * const exit = await runSchwabExit(
 *   Effect.gen(function* () {
 *     const quoteService = yield* QuoteService;
 *     return yield* quoteService.getQuotes(["AAPL"]);
 *   })
 * );
 *
 * Exit.match(exit, {
 *   onFailure: (cause) => handleError(cause),
 *   onSuccess: (data) => displayQuotes(data),
 * });
 * ```
 */
export const runSchwabExit = <A, E extends AllErrors>(
  effect: Effect.Effect<A, E, SchwabServices>,
  options: ConfigOptions = {}
): Promise<Exit.Exit<A, AllErrors>> =>
  Effect.runPromiseExit(
    effect.pipe(Effect.provide(SchwabServicesLive(options)))
  );

/**
 * Format an Effect error into a human-readable message for CLI/MCP output.
 */
export const formatError = (error: AllErrors): string => {
  switch (error._tag) {
    case "AuthError":
      return `Authentication Error (${error.code}): ${error.message}`;
    case "TokenExpiredError":
      return `Token Expired: ${error.tokenType} token expired at ${error.expiredAt.toISOString()}`;
    case "ApiError":
      return `API Error ${error.statusCode} on ${error.method} ${error.endpoint}: ${error.message}`;
    case "RateLimitError":
      return `Rate Limit Exceeded: ${error.message}. Retry after ${error.retryAfterMs}ms`;
    case "NetworkError":
      return `Network Error: ${error.message}${error.isRetryable ? " (retryable)" : ""}`;
    case "ValidationError":
      return `Validation Error at ${error.path}: expected ${error.expected}, got ${error.received}`;
    case "SchemaParseError":
      return `Schema Parse Error: ${error.message}\n${error.errors.map((e) => `  - ${e.path}: ${e.message}`).join("\n")}`;
    case "AccountNotFoundError":
      return `Account Not Found: ${error.accountNumber}`;
    case "OrderNotFoundError":
      return `Order Not Found: ${error.orderId}`;
    case "SymbolNotFoundError":
      return `Symbol Not Found: ${error.symbol}`;
    case "OrderRejectedError":
      return `Order Rejected: ${error.reason}`;
    case "ConfigError":
      return `Configuration Error (${error.field}): ${error.message}`;
    case "FileSystemError":
      return `File System Error (${error.operation} ${error.path}): ${error.message}`;
    default:
      return `Unknown Error: ${JSON.stringify(error)}`;
  }
};

/**
 * Format an Exit's Cause for display.
 */
export const formatCause = <E extends AllErrors>(
  cause: Cause.Cause<E>
): string => {
  const failures = Cause.failures(cause);
  if (!Chunk.isEmpty(failures)) {
    return Chunk.toReadonlyArray(failures).map(formatError).join("\n");
  }

  const defects = Cause.defects(cause);
  if (!Chunk.isEmpty(defects)) {
    return Chunk.toReadonlyArray(defects)
      .map((d: unknown) => (d instanceof Error ? d.message : String(d)))
      .join("\n");
  }

  if (Cause.isInterruptedOnly(cause)) {
    return "Operation was interrupted";
  }

  return Cause.pretty(cause);
};

/**
 * Handle an Exit value with custom success/failure handlers.
 * Useful for CLI commands.
 *
 * @example
 * ```typescript
 * await handleExit(
 *   runSchwabExit(myEffect),
 *   (data) => console.log(JSON.stringify(data, null, 2)),
 *   (error) => {
 *     console.error(chalk.red(error));
 *     process.exit(1);
 *   }
 * );
 * ```
 */
export const handleExit = async <A, E extends AllErrors>(
  exitPromise: Promise<Exit.Exit<A, E>>,
  onSuccess: (value: A) => void,
  onFailure: (message: string) => void
): Promise<void> => {
  const exit = await exitPromise;

  Exit.match(exit, {
    onFailure: (cause) => onFailure(formatCause(cause)),
    onSuccess: onSuccess,
  });
};

/**
 * Create an Effect that catches and maps errors to a simpler format.
 * Useful for MCP tools that need structured error responses.
 */
export const withErrorMapping = <A, E extends AllErrors>(
  effect: Effect.Effect<A, E, SchwabServices>
): Effect.Effect<{ success: true; data: A } | { success: false; error: string }, never, SchwabServices> =>
  pipe(
    effect,
    Effect.map((data) => ({ success: true as const, data })),
    Effect.catchAll((error) =>
      Effect.succeed({ success: false as const, error: formatError(error) })
    )
  );
