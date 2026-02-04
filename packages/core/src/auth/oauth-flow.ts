import { randomBytes, createHash } from 'crypto';
import type { SchwabConfig, SchwabTokenResponse } from '../types/index.js';

const SCHWAB_AUTH_URL = 'https://api.schwabapi.com/v1/oauth/authorize';
const SCHWAB_TOKEN_URL = 'https://api.schwabapi.com/v1/oauth/token';

export interface AuthUrlResult {
  url: string;
  codeVerifier: string;
  state: string;
}

export interface CallbackResult {
  code: string;
  state: string;
}

function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

function generateState(): string {
  return randomBytes(16).toString('hex');
}

export function buildAuthUrl(config: SchwabConfig): AuthUrlResult {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    scope: 'api',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return {
    url: `${SCHWAB_AUTH_URL}?${params.toString()}`,
    codeVerifier,
    state,
  };
}

/**
 * Parse the callback URL to extract authorization code and state.
 * Schwab redirects to an HTTPS URL which won't load (no server),
 * so the user copies the URL from the browser address bar.
 */
export function parseCallbackUrl(callbackUrl: string, expectedState: string): CallbackResult {
  const url = new URL(callbackUrl);

  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    throw new Error(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    throw new Error('No authorization code found in callback URL');
  }

  if (!state) {
    throw new Error('No state parameter found in callback URL');
  }

  if (state !== expectedState) {
    throw new Error('State mismatch - possible CSRF attack or stale auth attempt');
  }

  return { code, state };
}

export async function exchangeCodeForTokens(
  config: SchwabConfig,
  code: string,
  codeVerifier: string
): Promise<SchwabTokenResponse> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.callbackUrl,
    code_verifier: codeVerifier,
  });

  const response = await fetch(SCHWAB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<SchwabTokenResponse>;
}

export async function refreshAccessToken(
  config: SchwabConfig,
  refreshToken: string
): Promise<SchwabTokenResponse> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(SCHWAB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<SchwabTokenResponse>;
}
