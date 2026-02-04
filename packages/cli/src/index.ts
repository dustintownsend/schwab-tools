#!/usr/bin/env bun
import { Command } from 'commander';
import { createAuthCommand } from './commands/auth.js';
import { createAccountsCommand } from './commands/accounts.js';
import { createQuoteCommand, createHistoryCommand } from './commands/quote.js';
import { createOptionsCommand } from './commands/options.js';
import { createMarketCommand } from './commands/market.js';
import { createOrdersCommand, createOrderCommand } from './commands/orders.js';

const program = new Command();

program
  .name('schwab')
  .description('Schwab API command-line tools')
  .version('0.1.0');

// Add commands
program.addCommand(createAuthCommand());
program.addCommand(createAccountsCommand());
program.addCommand(createQuoteCommand());
program.addCommand(createHistoryCommand());
program.addCommand(createOptionsCommand());
program.addCommand(createMarketCommand());
program.addCommand(createOrdersCommand());
program.addCommand(createOrderCommand());

// Parse and execute
program.parse(process.argv);
