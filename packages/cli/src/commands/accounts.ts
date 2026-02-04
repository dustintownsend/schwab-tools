import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  Effect,
  Exit,
  AccountService,
  UserPreferenceService,
  runSchwabExit,
  formatCause,
  AccountNotFoundError,
  type Account,
  type Position,
  type TransactionType,
} from "@schwab-tools/core";

/**
 * Effect program to fetch all accounts
 */
const getAccountsProgram = Effect.gen(function* () {
  const accountService = yield* AccountService;
  return yield* accountService.getAccounts;
});

/**
 * Effect program to fetch account numbers
 */
const getAccountNumbersProgram = Effect.gen(function* () {
  const accountService = yield* AccountService;
  return yield* accountService.getAccountNumbers;
});

/**
 * Effect program to fetch a single account
 */
const getAccountProgram = (accountHash: string) =>
  Effect.gen(function* () {
    const accountService = yield* AccountService;
    return yield* accountService.getAccount(accountHash);
  });

const getUserPreferenceProgram = Effect.gen(function* () {
  const service = yield* UserPreferenceService;
  return yield* service.getUserPreference;
});

const getTransactionsProgram = (
  accountHash: string,
  params?: {
    startDate?: Date;
    endDate?: Date;
    symbol?: string;
    types?: TransactionType[];
  }
) =>
  Effect.gen(function* () {
    const accountService = yield* AccountService;
    return yield* accountService.getTransactions(accountHash, params);
  });

const getTransactionProgram = (accountHash: string, transactionId: string) =>
  Effect.gen(function* () {
    const accountService = yield* AccountService;
    return yield* accountService.getTransaction(accountHash, transactionId);
  });

/**
 * Effect program to get account hash or first account
 */
const getAccountHashOrFirst = (providedHash?: string) =>
  Effect.gen(function* () {
    if (providedHash) {
      return providedHash;
    }
    const accountService = yield* AccountService;
    const numbers = yield* accountService.getAccountNumbers;
    if (numbers.length === 0) {
      return yield* Effect.fail(
        new AccountNotFoundError({
          accountNumber: "",
          message: "No accounts found",
        })
      );
    }
    return numbers[0].hashValue;
  });

function formatCurrency(value: number): string {
  return (
    "$" +
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function printAccountDetails(account: Account): void {
  console.log(
    "\n" +
      chalk.bold(`Account: ${account.accountNumber}`) +
      ` (${account.type})`
  );
  console.log("=".repeat(70));

  // Balances
  console.log("\n" + chalk.bold.underline("Balances"));
  const balances = account.balances;
  console.log(
    `  Liquidation Value:     ${formatCurrency(balances.liquidationValue).padStart(15)}`
  );
  console.log(
    `  Equity:                ${formatCurrency(balances.equity).padStart(15)}`
  );
  console.log(
    `  Cash Balance:          ${formatCurrency(balances.cashBalance).padStart(15)}`
  );
  console.log(
    `  Cash Available:        ${formatCurrency(balances.cashAvailableForTrading).padStart(15)}`
  );
  console.log(
    `  Buying Power:          ${formatCurrency(balances.buyingPower).padStart(15)}`
  );
  console.log(
    `  Long Market Value:     ${formatCurrency(balances.longMarketValue).padStart(15)}`
  );
  console.log(
    `  Long Option Value:     ${formatCurrency(balances.longOptionMarketValue).padStart(15)}`
  );
  console.log(
    `  Short Option Value:    ${formatCurrency(balances.shortOptionMarketValue).padStart(15)}`
  );

  // Positions
  if (account.positions.length > 0) {
    console.log("\n" + chalk.bold.underline("Positions"));

    // Group by asset type
    const equities = account.positions.filter((p) => p.assetType === "EQUITY");
    const options = account.positions.filter((p) => p.assetType === "OPTION");
    const other = account.positions.filter(
      (p) => !["EQUITY", "OPTION"].includes(p.assetType)
    );

    if (equities.length > 0) {
      console.log("\n  " + chalk.bold("Equities"));
      printPositionTable(equities);
    }

    if (options.length > 0) {
      console.log("\n  " + chalk.bold("Options"));
      printPositionTable(options);
    }

    if (other.length > 0) {
      console.log("\n  " + chalk.bold("Other"));
      printPositionTable(other);
    }
  } else {
    console.log("\n" + chalk.dim("  No positions"));
  }

  console.log();
}

function printPositionTable(positions: readonly Position[]): void {
  // Header
  console.log("  " + chalk.dim("-".repeat(68)));
  console.log(
    "  " +
      "Symbol".padEnd(20) +
      "Qty".padStart(8) +
      "Avg Price".padStart(12) +
      "Mkt Value".padStart(14) +
      "P/L %".padStart(12)
  );
  console.log("  " + chalk.dim("-".repeat(68)));

  for (const pos of positions) {
    let symbol = pos.symbol;
    if (pos.assetType === "OPTION" && pos.underlyingSymbol) {
      // Shorten option display
      const type = pos.putCall === "CALL" ? "C" : "P";
      const strike = pos.strikePrice ? `$${pos.strikePrice}` : "";
      const exp = pos.expirationDate ? pos.expirationDate.slice(5, 10) : "";
      symbol = `${pos.underlyingSymbol} ${exp} ${strike}${type}`;
    }

    const plColor = pos.unrealizedPL >= 0 ? chalk.green : chalk.red;
    const plPercent = plColor(
      `${pos.unrealizedPLPercent >= 0 ? "+" : ""}${pos.unrealizedPLPercent.toFixed(2)}%`
    );

    console.log(
      "  " +
        symbol.slice(0, 19).padEnd(20) +
        pos.quantity.toString().padStart(8) +
        formatCurrency(pos.averagePrice).padStart(12) +
        formatCurrency(pos.marketValue).padStart(14) +
        plPercent.padStart(12 + (pos.unrealizedPL >= 0 ? 10 : 9)) // Account for ANSI codes
    );
  }
}

function printTransactionList(
  transactions: readonly {
    transactionId: string;
    transactionDate: Date;
    type: string;
    description: string;
    symbol?: string;
    netAmount: number;
  }[]
): void {
  console.log("\n" + chalk.bold("Transactions"));
  console.log("=".repeat(90));
  console.log(
    "  " +
      "Date".padEnd(12) +
      "Type".padEnd(24) +
      "Symbol".padEnd(12) +
      "Amount".padStart(14) +
      "  Description"
  );
  console.log("  " + chalk.dim("-".repeat(88)));

  for (const tx of transactions) {
    const amountColor = tx.netAmount >= 0 ? chalk.green : chalk.red;
    console.log(
      "  " +
        tx.transactionDate.toISOString().slice(0, 10).padEnd(12) +
        tx.type.slice(0, 22).padEnd(24) +
        (tx.symbol ?? "-").slice(0, 11).padEnd(12) +
        amountColor(formatCurrency(tx.netAmount).padStart(14)) +
        `  ${tx.description}`
    );
  }

  console.log();
}

export function createAccountsCommand(): Command {
  const accounts = new Command("accounts").description(
    "View account information"
  );

  accounts
    .command("list")
    .description("List all linked accounts")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const spinner = ora("Fetching accounts...").start();

      const exit = await runSchwabExit(getAccountsProgram);
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (accountList) => {
          if (options.json) {
            console.log(JSON.stringify(accountList, null, 2));
            return;
          }

          console.log("\n" + chalk.bold("Schwab Accounts"));
          console.log("=".repeat(60));

          for (const account of accountList) {
            console.log(`\n${chalk.cyan(account.accountNumber)} (${account.type})`);
            console.log(chalk.dim(`  Hash: ${account.accountHash}`));
            console.log(
              `  ${chalk.bold("Liquidation Value:")} ${formatCurrency(account.balances.liquidationValue)}`
            );
            console.log(
              `  ${chalk.bold("Cash Available:")} ${formatCurrency(account.balances.cashAvailableForTrading)}`
            );
            console.log(
              `  ${chalk.bold("Buying Power:")} ${formatCurrency(account.balances.buyingPower)}`
            );
          }

          console.log();
        },
      });
    });

  accounts
    .command("show")
    .description("Show detailed account information with positions")
    .option(
      "-a, --account <hash>",
      "Account hash (uses first account if not specified)"
    )
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const spinner = ora("Fetching account details...").start();

      const program = Effect.gen(function* () {
        const accountHash = yield* getAccountHashOrFirst(options.account);
        const accountService = yield* AccountService;
        return yield* accountService.getAccount(accountHash);
      });

      const exit = await runSchwabExit(program);
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (account) => {
          if (options.json) {
            console.log(JSON.stringify(account, null, 2));
            return;
          }

          printAccountDetails(account);
        },
      });
    });

  accounts
    .command("preferences")
    .description("Show user preference information")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const spinner = ora("Fetching user preferences...").start();

      const exit = await runSchwabExit(getUserPreferenceProgram);
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (preferences) => {
          if (options.json) {
            console.log(JSON.stringify(preferences, null, 2));
            return;
          }

          console.log("\n" + chalk.bold("User Preferences"));
          console.log("=".repeat(60));
          console.log(`  Preference records: ${preferences.length}`);
          if (preferences[0]?.accounts) {
            console.log(`  Linked accounts: ${preferences[0].accounts.length}`);
          }
          console.log();
        },
      });
    });

  accounts
    .command("transactions")
    .description("List account transactions")
    .option(
      "-a, --account <hash>",
      "Account hash (uses first account if not specified)"
    )
    .option("--start <isoDate>", "Start date/time in ISO-8601 format")
    .option("--end <isoDate>", "End date/time in ISO-8601 format")
    .option("--symbol <symbol>", "Filter by symbol")
    .option(
      "--types <types>",
      "Comma-separated transaction types (e.g., TRADE,DIVIDEND_OR_INTEREST)"
    )
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const spinner = ora("Fetching transactions...").start();

      const parsedTypes = options.types
        ? (options.types
            .split(",")
            .map((value: string) => value.trim().toUpperCase())
            .filter(Boolean) as TransactionType[])
        : undefined;

      const program = Effect.gen(function* () {
        const accountHash = yield* getAccountHashOrFirst(options.account);
        return yield* getTransactionsProgram(accountHash, {
          startDate: options.start ? new Date(options.start) : undefined,
          endDate: options.end ? new Date(options.end) : undefined,
          symbol: options.symbol,
          types: parsedTypes,
        });
      });

      const exit = await runSchwabExit(program);
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (transactions) => {
          if (options.json) {
            console.log(JSON.stringify(transactions, null, 2));
            return;
          }
          printTransactionList(transactions);
        },
      });
    });

  accounts
    .command("transaction")
    .description("Show one transaction by ID")
    .argument("<transactionId>", "Transaction ID")
    .option(
      "-a, --account <hash>",
      "Account hash (uses first account if not specified)"
    )
    .option("--json", "Output as JSON")
    .action(async (transactionId: string, options) => {
      const spinner = ora("Fetching transaction...").start();

      const program = Effect.gen(function* () {
        const accountHash = yield* getAccountHashOrFirst(options.account);
        return yield* getTransactionProgram(accountHash, transactionId);
      });

      const exit = await runSchwabExit(program);
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (transaction) => {
          if (options.json) {
            console.log(JSON.stringify(transaction, null, 2));
            return;
          }

          console.log("\n" + chalk.bold("Transaction"));
          console.log("=".repeat(70));
          console.log(`  ID: ${chalk.cyan(transaction.transactionId)}`);
          console.log(`  Type: ${transaction.type}`);
          console.log(`  Date: ${transaction.transactionDate.toISOString()}`);
          console.log(`  Settlement: ${transaction.settlementDate.toISOString()}`);
          console.log(`  Amount: ${formatCurrency(transaction.netAmount)}`);
          console.log(`  Symbol: ${transaction.symbol ?? "-"}`);
          console.log(`  Quantity: ${transaction.quantity ?? "-"}`);
          console.log(`  Price: ${transaction.price ?? "-"}`);
          console.log(`  Description: ${transaction.description}`);
          console.log();
        },
      });
    });

  return accounts;
}
