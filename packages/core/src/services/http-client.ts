import { Effect, Layer, Schedule, Duration } from "effect";
import {
  HttpClient,
  TokenManager,
  RateLimiter,
  SchwabConfig,
  type RequestConfig,
} from "./index.js";
import {
  ApiError,
  AuthError,
  NetworkError,
  RateLimitError,
  type SchwabClientError,
} from "../errors.js";

interface SchwabErrorResponse {
  error: string;
  error_description?: string;
}

/**
 * Build URL with query parameters
 */
const buildUrl = (
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string => {
  const url = new URL(path, baseUrl);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
};

/**
 * Execute a single HTTP request
 */
const executeRequest = <T>(
  url: string,
  config: RequestConfig,
  accessToken: string
): Effect.Effect<T, SchwabClientError> =>
  Effect.async<T, SchwabClientError>((resume) => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...config.headers,
    };

    if (config.body) {
      headers["Content-Type"] = "application/json";
    }

    fetch(url, {
      method: config.method,
      headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
    })
      .then(async (response) => {
        // Handle no-content responses
        if (response.status === 204 || response.status === 201) {
          // For 201 Created, try to get the Location header for order ID
          const location = response.headers.get("Location");
          if (location) {
            const match = location.match(/orders\/(\d+)/);
            if (match) {
              resume(Effect.succeed({ orderId: match[1] } as T));
              return;
            }
          }
          resume(Effect.succeed({} as T));
          return;
        }

        if (!response.ok) {
          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After");
            const retryAfterMs = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : 60000;
            resume(
              Effect.fail(
                new RateLimitError({
                  retryAfterMs,
                  endpoint: config.path,
                  message: `Rate limit exceeded. Retry after ${retryAfterMs}ms`,
                })
              )
            );
            return;
          }

          // Handle auth errors
          if (response.status === 401 || response.status === 403) {
            resume(
              Effect.fail(
                new AuthError({
                  code: "TOKEN_EXPIRED",
                  message: `Authentication failed: ${response.status}`,
                })
              )
            );
            return;
          }

          // Parse error response
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorBody = (await response.json()) as SchwabErrorResponse;
            errorMessage = `${response.status}: ${errorBody.error || "Unknown error"}`;
            if (errorBody.error_description) {
              errorMessage += ` - ${errorBody.error_description}`;
            }
          } catch {
            errorMessage = `${response.status}: ${response.statusText}`;
          }

          resume(
            Effect.fail(
              new ApiError({
                statusCode: response.status,
                endpoint: config.path,
                method: config.method,
                message: errorMessage,
                body: config.body,
              })
            )
          );
          return;
        }

        // Check if response has content
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          resume(Effect.succeed({} as T));
          return;
        }

        const text = await response.text();
        if (!text) {
          resume(Effect.succeed({} as T));
          return;
        }

        try {
          const data = JSON.parse(text) as T;
          resume(Effect.succeed(data));
        } catch {
          resume(Effect.succeed({} as T));
        }
      })
      .catch((error) => {
        resume(
          Effect.fail(
            new NetworkError({
              message: `Network request failed: ${error.message}`,
              isRetryable: true,
              cause: error,
            })
          )
        );
      });
  });

/**
 * Create the HTTP client implementation
 */
const makeHttpClient = Effect.gen(function* () {
  const config = yield* SchwabConfig;
  const tokenManager = yield* TokenManager;
  const rateLimiter = yield* RateLimiter;

  // Retry schedule for server errors and rate limits
  const retrySchedule = Schedule.exponential(Duration.seconds(1)).pipe(
    Schedule.compose(Schedule.recurs(config.maxRetries)),
    Schedule.whileInput<SchwabClientError>((error) => {
      // Retry on network errors that are retryable
      if (error._tag === "NetworkError" && error.isRetryable) {
        return true;
      }
      // Retry on rate limit errors
      if (error._tag === "RateLimitError") {
        return true;
      }
      // Retry on 5xx server errors
      if (error._tag === "ApiError" && error.statusCode >= 500) {
        return true;
      }
      return false;
    })
  );

  const request = <T>(requestConfig: RequestConfig): Effect.Effect<T, SchwabClientError> =>
    Effect.gen(function* () {
      // Acquire rate limit slot
      yield* rateLimiter.acquire;

      // Get access token (auto-refreshes if needed)
      const accessToken = yield* tokenManager.getAccessToken;

      // Build URL
      const url = buildUrl(config.baseUrl, requestConfig.path, requestConfig.params);

      // Execute request with retry
      const result = yield* executeRequest<T>(url, requestConfig, accessToken).pipe(
        Effect.retry(retrySchedule)
      );

      return result;
    });

  const getRateLimitStatus = rateLimiter.getStatus;

  return {
    request,
    getRateLimitStatus,
  };
});

/**
 * Live HTTP client layer
 */
export const HttpClientLive = Layer.effect(HttpClient, makeHttpClient);

/**
 * Test HTTP client that uses a mock request handler
 */
export const HttpClientTest = (
  mockHandler: <T>(config: RequestConfig) => Effect.Effect<T, SchwabClientError>
) =>
  Layer.succeed(HttpClient, {
    request: mockHandler,
    getRateLimitStatus: Effect.succeed({
      requestsRemaining: 120,
      windowResetAt: new Date(),
    }),
  });
