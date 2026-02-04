import { Effect, Layer, Ref } from "effect";
import { randomBytes, createHash } from "crypto";
import {
  TokenManager,
  TokenStorage,
  SchwabConfig,
  type TokenStateShape,
  type StoredTokensShape,
} from "./index.js";
import { AuthError, TokenExpiredError, FileSystemError } from "../errors.js";

// Refresh token 5 minutes before expiry
const ACCESS_TOKEN_BUFFER_MS = 5 * 60 * 1000;
// Warn 24 hours before refresh token expires
const REFRESH_TOKEN_WARNING_MS = 24 * 60 * 60 * 1000;

const SCHWAB_TOKEN_URL = "https://api.schwabapi.com/v1/oauth/token";

interface SchwabTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
}

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = (
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Effect.Effect<SchwabTokenResponse, AuthError> =>
  Effect.async<SchwabTokenResponse, AuthError>((resume) => {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    fetch(SCHWAB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: body.toString(),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          resume(
            Effect.fail(
              new AuthError({
                code: "REFRESH_FAILED",
                message: `Token refresh failed: ${response.status} - ${errorText}`,
              })
            )
          );
          return;
        }
        const data = (await response.json()) as SchwabTokenResponse;
        resume(Effect.succeed(data));
      })
      .catch((error) => {
        resume(
          Effect.fail(
            new AuthError({
              code: "REFRESH_FAILED",
              message: `Token refresh failed: ${error.message}`,
              cause: error,
            })
          )
        );
      });
  });

/**
 * Store token response
 */
const storeTokenResponse = (
  response: SchwabTokenResponse
): StoredTokensShape => {
  const now = Date.now();
  const accessExpiresIn = response.expires_in ?? 1800; // 30 minutes default
  const refreshExpiresIn = response.refresh_token_expires_in ?? 604800; // 7 days default

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    accessTokenExpiresAt: new Date(now + accessExpiresIn * 1000).toISOString(),
    refreshTokenExpiresAt: new Date(
      now + refreshExpiresIn * 1000
    ).toISOString(),
    scope: response.scope ?? "api",
    tokenType: response.token_type ?? "Bearer",
  };
};

/**
 * Create a TokenManager implementation
 */
const makeTokenManager = Effect.gen(function* () {
  const config = yield* SchwabConfig;
  const storage = yield* TokenStorage;

  // Load initial tokens
  const initialTokens = yield* storage.loadTokens;

  // Mutable state for tokens
  const tokensRef = yield* Ref.make<StoredTokensShape | null>(initialTokens);

  // Track in-flight refresh to deduplicate
  const refreshingRef = yield* Ref.make<boolean>(false);

  const getTokenState: Effect.Effect<TokenStateShape> = Effect.gen(function* () {
    const tokens = yield* Ref.get(tokensRef);

    if (!tokens) {
      return {
        hasAccessToken: false,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        needsReauth: true,
      };
    }

    const now = Date.now();
    const accessExpiry = new Date(tokens.accessTokenExpiresAt);
    const refreshExpiry = new Date(tokens.refreshTokenExpiresAt);

    return {
      hasAccessToken: accessExpiry.getTime() > now,
      accessTokenExpiresAt: accessExpiry,
      refreshTokenExpiresAt: refreshExpiry,
      needsReauth: refreshExpiry.getTime() <= now,
    };
  });

  const isRefreshTokenExpiring: Effect.Effect<boolean> = Effect.gen(
    function* () {
      const tokens = yield* Ref.get(tokensRef);
      if (!tokens) {
        return true;
      }
      const refreshExpiry = new Date(tokens.refreshTokenExpiresAt).getTime();
      return refreshExpiry - Date.now() < REFRESH_TOKEN_WARNING_MS;
    }
  );

  const doRefreshTokens: Effect.Effect<
    void,
    AuthError | TokenExpiredError | FileSystemError
  > = Effect.gen(function* () {
    const tokens = yield* Ref.get(tokensRef);

    if (!tokens) {
      return yield* Effect.fail(
        new AuthError({
          code: "NOT_AUTHENTICATED",
          message: 'No tokens to refresh. Run "schwab auth login" first.',
        })
      );
    }

    const refreshExpiry = new Date(tokens.refreshTokenExpiresAt).getTime();
    if (Date.now() >= refreshExpiry) {
      return yield* Effect.fail(
        new TokenExpiredError({
          tokenType: "refresh",
          expiredAt: new Date(tokens.refreshTokenExpiresAt),
          message:
            'Refresh token expired. Run "schwab auth login" to re-authenticate.',
        })
      );
    }

    const response = yield* refreshAccessToken(
      config.clientId,
      config.clientSecret,
      tokens.refreshToken
    );

    const newTokens = storeTokenResponse(response);
    yield* Ref.set(tokensRef, newTokens);
    yield* storage.saveTokens(newTokens);
  });

  const refreshTokens: Effect.Effect<
    void,
    AuthError | TokenExpiredError | FileSystemError
  > = Effect.gen(function* () {
    // Check if already refreshing
    const isRefreshing = yield* Ref.get(refreshingRef);
    if (isRefreshing) {
      // Wait a bit and check again
      yield* Effect.sleep(100);
      const stillRefreshing = yield* Ref.get(refreshingRef);
      if (stillRefreshing) {
        yield* Effect.sleep(500);
      }
      return;
    }

    yield* Ref.set(refreshingRef, true);
    yield* Effect.ensuring(doRefreshTokens, Ref.set(refreshingRef, false));
  });

  const getAccessToken: Effect.Effect<
    string,
    AuthError | TokenExpiredError | FileSystemError
  > = Effect.gen(function* () {
    const tokens = yield* Ref.get(tokensRef);

    if (!tokens) {
      return yield* Effect.fail(
        new AuthError({
          code: "NOT_AUTHENTICATED",
          message: 'Not authenticated. Run "schwab auth login" first.',
        })
      );
    }

    const now = Date.now();
    const accessExpiry = new Date(tokens.accessTokenExpiresAt).getTime();

    // If access token is still valid (with buffer), return it
    if (accessExpiry - now > ACCESS_TOKEN_BUFFER_MS) {
      return tokens.accessToken;
    }

    // Need to refresh
    yield* refreshTokens;
    const newTokens = yield* Ref.get(tokensRef);
    return newTokens!.accessToken;
  });

  const logout: Effect.Effect<void, FileSystemError> = Effect.gen(function* () {
    yield* storage.deleteTokens;
    yield* Ref.set(tokensRef, null);
  });

  return {
    getAccessToken,
    refreshTokens,
    getTokenState,
    isRefreshTokenExpiring,
    logout,
  };
});

/**
 * Live token manager layer
 */
export const TokenManagerLive = Layer.effect(TokenManager, makeTokenManager);

// OAuth flow helpers for CLI

export interface AuthUrlResult {
  url: string;
  codeVerifier: string;
  state: string;
}

export interface CallbackResult {
  code: string;
  state: string;
}

const generateCodeVerifier = (): string => {
  return randomBytes(32).toString("base64url");
};

const generateCodeChallenge = (verifier: string): string => {
  return createHash("sha256").update(verifier).digest("base64url");
};

const generateState = (): string => {
  return randomBytes(16).toString("hex");
};

/**
 * Build OAuth authorization URL (for CLI login flow)
 */
export const buildAuthUrl = (
  clientId: string,
  callbackUrl: string
): AuthUrlResult => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: "api",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return {
    url: `https://api.schwabapi.com/v1/oauth/authorize?${params.toString()}`,
    codeVerifier,
    state,
  };
};

/**
 * Parse callback URL to extract authorization code
 */
export const parseCallbackUrl = (
  callbackUrl: string,
  expectedState: string
): Effect.Effect<CallbackResult, AuthError> =>
  Effect.try({
    try: () => {
      const url = new URL(callbackUrl);

      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (error) {
        throw new Error(
          `OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`
        );
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code) {
        throw new Error("No authorization code found in callback URL");
      }

      if (!state) {
        throw new Error("No state parameter found in callback URL");
      }

      if (state !== expectedState) {
        throw new Error(
          "State mismatch - possible CSRF attack or stale auth attempt"
        );
      }

      return { code, state };
    },
    catch: (error) =>
      new AuthError({
        code: "INVALID_CREDENTIALS",
        message: error instanceof Error ? error.message : String(error),
      }),
  });

/**
 * Exchange authorization code for tokens
 */
export const exchangeCodeForTokens = (
  clientId: string,
  clientSecret: string,
  callbackUrl: string,
  code: string,
  codeVerifier: string
): Effect.Effect<SchwabTokenResponse, AuthError> =>
  Effect.async<SchwabTokenResponse, AuthError>((resume) => {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl,
      code_verifier: codeVerifier,
    });

    fetch(SCHWAB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: body.toString(),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          resume(
            Effect.fail(
              new AuthError({
                code: "INVALID_CREDENTIALS",
                message: `Token exchange failed: ${response.status} - ${errorText}`,
              })
            )
          );
          return;
        }
        const data = (await response.json()) as SchwabTokenResponse;
        resume(Effect.succeed(data));
      })
      .catch((error) => {
        resume(
          Effect.fail(
            new AuthError({
              code: "INVALID_CREDENTIALS",
              message: `Token exchange failed: ${error.message}`,
              cause: error,
            })
          )
        );
      });
  });
