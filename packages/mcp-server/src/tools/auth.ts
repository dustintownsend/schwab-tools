import type { SchwabTokenManager } from '@schwab-tools/core';

export const authTools = [
  {
    name: 'schwab_auth_status',
    description: 'Check Schwab API authentication status. Returns whether authenticated, token expiration times, and if re-authentication is needed.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

export async function handleAuthTool(
  toolName: string,
  _args: Record<string, unknown>,
  tokenManager: SchwabTokenManager
): Promise<unknown> {
  switch (toolName) {
    case 'schwab_auth_status': {
      const state = tokenManager.getTokenState();
      return {
        authenticated: state.hasAccessToken && !state.needsReauth,
        accessTokenExpiresAt: state.accessTokenExpiresAt?.toISOString() || null,
        refreshTokenExpiresAt: state.refreshTokenExpiresAt?.toISOString() || null,
        needsReauth: state.needsReauth,
        refreshTokenExpiring: tokenManager.isRefreshTokenExpiring(),
        message: state.needsReauth
          ? 'Authentication required. Run "schwab auth login" to authenticate.'
          : state.hasAccessToken
            ? 'Authenticated and ready.'
            : 'No valid tokens. Run "schwab auth login" to authenticate.',
      };
    }
    default:
      throw new Error(`Unknown auth tool: ${toolName}`);
  }
}
