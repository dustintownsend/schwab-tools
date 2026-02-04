import type { SchwabConfig, TokenState, StoredTokens, SchwabTokenResponse } from '../types/index.js';
import { loadTokens, saveTokens, deleteTokens, loadConfig } from './storage.js';
import { buildAuthUrl, parseCallbackUrl, exchangeCodeForTokens, refreshAccessToken } from './oauth-flow.js';
import * as readline from 'readline';

// Refresh token 5 minutes before expiry
const ACCESS_TOKEN_BUFFER_MS = 5 * 60 * 1000;
// Warn 24 hours before refresh token expires
const REFRESH_TOKEN_WARNING_MS = 24 * 60 * 60 * 1000;

export interface TokenManager {
  getAccessToken(): Promise<string>;
  isRefreshTokenExpiring(): boolean;
  initiateReauth(): Promise<void>;
  getTokenState(): TokenState;
  logout(): Promise<void>;
}

export class SchwabTokenManager implements TokenManager {
  private config: SchwabConfig;
  private tokens: StoredTokens | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(config: SchwabConfig) {
    this.config = config;
  }

  static async create(config?: Partial<SchwabConfig>): Promise<SchwabTokenManager> {
    const storedConfig = await loadConfig();

    const finalConfig: SchwabConfig = {
      clientId: config?.clientId || storedConfig?.clientId || process.env.SCHWAB_CLIENT_ID || '',
      clientSecret: config?.clientSecret || storedConfig?.clientSecret || process.env.SCHWAB_CLIENT_SECRET || '',
      callbackPort: config?.callbackPort || storedConfig?.callbackPort || 443,
      callbackUrl: config?.callbackUrl || storedConfig?.callbackUrl || process.env.SCHWAB_CALLBACK_URL || 'https://127.0.0.1',
    };

    if (!finalConfig.clientId || !finalConfig.clientSecret) {
      throw new Error(
        'Schwab API credentials not configured. Set SCHWAB_CLIENT_ID and SCHWAB_CLIENT_SECRET environment variables, ' +
        'or run "schwab auth configure" to set up credentials.'
      );
    }

    const manager = new SchwabTokenManager(finalConfig);
    await manager.loadStoredTokens();
    return manager;
  }

  private async loadStoredTokens(): Promise<void> {
    this.tokens = await loadTokens();
  }

  async getAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('Not authenticated. Run "schwab auth login" first.');
    }

    const now = Date.now();
    const accessExpiry = new Date(this.tokens.accessTokenExpiresAt).getTime();

    // If access token is still valid (with buffer), return it
    if (accessExpiry - now > ACCESS_TOKEN_BUFFER_MS) {
      return this.tokens.accessToken;
    }

    // Need to refresh
    await this.refreshTokens();
    return this.tokens!.accessToken;
  }

  private async refreshTokens(): Promise<void> {
    // Deduplicate concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefreshTokens();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefreshTokens(): Promise<void> {
    if (!this.tokens) {
      throw new Error('No tokens to refresh');
    }

    const refreshExpiry = new Date(this.tokens.refreshTokenExpiresAt).getTime();
    if (Date.now() >= refreshExpiry) {
      throw new Error('Refresh token expired. Run "schwab auth login" to re-authenticate.');
    }

    try {
      const response = await refreshAccessToken(this.config, this.tokens.refreshToken);
      await this.storeTokenResponse(response);
    } catch (error) {
      // If refresh fails, tokens may be invalid
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  isRefreshTokenExpiring(): boolean {
    if (!this.tokens) {
      return true;
    }

    const refreshExpiry = new Date(this.tokens.refreshTokenExpiresAt).getTime();
    return refreshExpiry - Date.now() < REFRESH_TOKEN_WARNING_MS;
  }

  getTokenState(): TokenState {
    if (!this.tokens) {
      return {
        hasAccessToken: false,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        needsReauth: true,
      };
    }

    const now = Date.now();
    const accessExpiry = new Date(this.tokens.accessTokenExpiresAt);
    const refreshExpiry = new Date(this.tokens.refreshTokenExpiresAt);

    return {
      hasAccessToken: accessExpiry.getTime() > now,
      accessTokenExpiresAt: accessExpiry,
      refreshTokenExpiresAt: refreshExpiry,
      needsReauth: refreshExpiry.getTime() <= now,
    };
  }

  async initiateReauth(): Promise<void> {
    const { url, codeVerifier, state } = buildAuthUrl(this.config);

    console.log('\n1. Open this URL in your browser:');
    console.log(`\n   ${url}\n`);

    // Try to open browser
    const openCommand = process.platform === 'darwin' ? 'open' :
      process.platform === 'win32' ? 'start' : 'xdg-open';

    try {
      Bun.spawn([openCommand, url]);
    } catch {
      // Browser open failed, user will need to manually visit URL
    }

    console.log('2. Log in to Schwab and authorize the application.');
    console.log('3. After authorizing, you\'ll be redirected to a page that won\'t load.');
    console.log('4. Copy the FULL URL from your browser\'s address bar and paste it below.\n');

    const callbackUrl = await this.promptForInput('Paste the callback URL here: ');

    if (!callbackUrl.trim()) {
      throw new Error('No callback URL provided');
    }

    const { code } = parseCallbackUrl(callbackUrl.trim(), state);

    console.log('\nExchanging authorization code for tokens...');

    // Exchange code for tokens
    const response = await exchangeCodeForTokens(this.config, code, codeVerifier);
    await this.storeTokenResponse(response);

    console.log('Authentication successful!');
  }

  private promptForInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  private async storeTokenResponse(response: SchwabTokenResponse): Promise<void> {
    const now = Date.now();

    // Schwab access token expires in 30 minutes (1800 seconds)
    const accessExpiresIn = response.expires_in || 1800;
    // Schwab refresh token expires in 7 days (604800 seconds)
    const refreshExpiresIn = response.refresh_token_expires_in || 604800;

    this.tokens = {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      accessTokenExpiresAt: new Date(now + accessExpiresIn * 1000).toISOString(),
      refreshTokenExpiresAt: new Date(now + refreshExpiresIn * 1000).toISOString(),
      scope: response.scope || 'api',
      tokenType: response.token_type || 'Bearer',
    };

    await saveTokens(this.tokens);
  }

  async logout(): Promise<void> {
    await deleteTokens();
    this.tokens = null;
  }
}
