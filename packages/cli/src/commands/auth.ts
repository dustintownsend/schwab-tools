import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  SchwabTokenManager,
  saveConfig,
  loadConfig,
  getConfigDir,
  getTokensPath,
  type StoredConfig,
} from '@schwab-tools/core';

export function createAuthCommand(): Command {
  const auth = new Command('auth')
    .description('Manage Schwab API authentication');

  auth
    .command('login')
    .description('Authenticate with Schwab API')
    .action(async () => {
      try {
        const tokenManager = await SchwabTokenManager.create();
        await tokenManager.initiateReauth();
        console.log(chalk.green('✓ Authentication successful!'));
      } catch (error) {
        console.error(chalk.red('Authentication failed:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  auth
    .command('status')
    .description('Check authentication status')
    .action(async () => {
      try {
        const tokenManager = await SchwabTokenManager.create();
        const state = tokenManager.getTokenState();

        console.log('\n' + chalk.bold('Authentication Status'));
        console.log('─'.repeat(40));

        if (state.hasAccessToken && !state.needsReauth) {
          console.log(chalk.green('✓ Authenticated'));

          if (state.accessTokenExpiresAt) {
            const accessExpiry = state.accessTokenExpiresAt;
            const now = new Date();
            const accessMinutes = Math.round((accessExpiry.getTime() - now.getTime()) / 60000);

            if (accessMinutes > 0) {
              console.log(`  Access token expires in: ${chalk.cyan(accessMinutes + ' minutes')}`);
            } else {
              console.log(`  Access token: ${chalk.yellow('expired, will refresh')}`);
            }
          }

          if (state.refreshTokenExpiresAt) {
            const refreshExpiry = state.refreshTokenExpiresAt;
            const now = new Date();
            const refreshDays = Math.round((refreshExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

            if (refreshDays > 1) {
              console.log(`  Refresh token expires in: ${chalk.cyan(refreshDays + ' days')}`);
            } else if (refreshDays === 1) {
              console.log(`  Refresh token expires in: ${chalk.yellow('1 day')}`);
            } else {
              console.log(`  Refresh token: ${chalk.red('expiring soon!')}`);
            }
          }

          if (tokenManager.isRefreshTokenExpiring()) {
            console.log(chalk.yellow('\n⚠ Refresh token expiring soon. Run "schwab auth login" to re-authenticate.'));
          }
        } else if (state.needsReauth) {
          console.log(chalk.red('✗ Re-authentication required'));
          console.log(`  Run ${chalk.cyan('schwab auth login')} to authenticate.`);
        } else {
          console.log(chalk.yellow('✗ Not authenticated'));
          console.log(`  Run ${chalk.cyan('schwab auth login')} to authenticate.`);
        }

        console.log();
      } catch (error) {
        console.error(chalk.red('Error checking status:'), error instanceof Error ? error.message : error);
        if (error instanceof Error && error.message.includes('credentials not configured')) {
          console.log(`\nRun ${chalk.cyan('schwab auth configure')} to set up your API credentials.`);
        }
        process.exit(1);
      }
    });

  auth
    .command('configure')
    .description('Configure Schwab API credentials')
    .option('--client-id <id>', 'Schwab API client ID')
    .option('--client-secret <secret>', 'Schwab API client secret')
    .option('--callback-url <url>', 'OAuth callback URL (must match Schwab app settings)')
    .action(async (options) => {
      let clientId = options.clientId;
      let clientSecret = options.clientSecret;
      let callbackUrl = options.callbackUrl;

      // Interactive prompts if not provided
      if (!clientId) {
        process.stdout.write('Schwab Client ID: ');
        clientId = await readLine();
      }

      if (!clientSecret) {
        process.stdout.write('Schwab Client Secret: ');
        clientSecret = await readLine();
      }

      if (!callbackUrl) {
        process.stdout.write('Callback URL (from Schwab app, e.g. https://127.0.0.1): ');
        callbackUrl = await readLine();
      }

      const config: StoredConfig = {
        clientId,
        clientSecret,
        callbackUrl: callbackUrl || 'https://127.0.0.1',
      };

      await saveConfig(config);

      console.log(chalk.green('\n✓ Configuration saved'));
      console.log(`  Config directory: ${chalk.dim(getConfigDir())}`);
      console.log(`  Callback URL: ${chalk.dim(config.callbackUrl)}`);
      console.log(`\nRun ${chalk.cyan('schwab auth login')} to authenticate.`);
    });

  auth
    .command('logout')
    .description('Remove stored credentials and tokens')
    .action(async () => {
      try {
        const tokenManager = await SchwabTokenManager.create();
        await tokenManager.logout();
        console.log(chalk.green('✓ Logged out successfully'));
      } catch {
        // Even if create fails, try to clean up
        const fs = await import('fs/promises');
        try {
          await fs.unlink(getTokensPath());
          console.log(chalk.green('✓ Tokens removed'));
        } catch {
          console.log(chalk.yellow('No tokens to remove'));
        }
      }
    });

  auth
    .command('refresh')
    .description('Force refresh of access token')
    .action(async () => {
      const spinner = ora('Refreshing access token...').start();

      try {
        const tokenManager = await SchwabTokenManager.create();
        await tokenManager.getAccessToken(); // This will refresh if needed
        spinner.succeed('Access token refreshed');
      } catch (error) {
        spinner.fail('Token refresh failed');
        console.error(chalk.red(error instanceof Error ? error.message : error));
        process.exit(1);
      }
    });

  return auth;
}

async function readLine(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (chunk) => {
      data = chunk.toString().trim();
      resolve(data);
    });
  });
}
