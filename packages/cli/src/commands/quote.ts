/**
 * Effect-based version of the quote command.
 * This demonstrates how to use the Effect-based services in CLI commands.
 *
 * Usage is identical to the original quote command, but uses Effect.ts
 * for better error handling, retry logic, and composability.
 */
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  Effect,
  Exit,
  QuoteService,
  PriceHistoryService,
  runSchwabExit,
  formatCause,
  type Quote,
  type Candle,
  type PriceHistoryPeriod,
  type PriceHistoryFrequency,
  type QuoteField,
  type QuoteRequestParams,
} from "@schwab-tools/core";

/**
 * Effect program to fetch quotes
 */
const getQuotesProgram = (request: QuoteRequestParams) =>
  Effect.gen(function* () {
    const quoteService = yield* QuoteService;
    return yield* quoteService.getQuotesByRequest(request);
  });

/**
 * Effect program to fetch price history
 */
const getPriceHistoryProgram = (
  symbol: string,
  params: {
    period: PriceHistoryPeriod;
    frequency: PriceHistoryFrequency;
    startDate?: Date;
    endDate?: Date;
    needExtendedHoursData?: boolean;
    needPreviousClose?: boolean;
  }
) =>
  Effect.gen(function* () {
    const priceHistoryService = yield* PriceHistoryService;
    return yield* priceHistoryService.getPriceHistory(symbol, params);
  });

function formatPrice(price: number): string {
  return price.toFixed(2);
}

function displayQuotes(quotes: readonly Quote[]): void {
  console.log("\n" + chalk.bold("Quotes"));
  console.log("=".repeat(80));

  for (const q of quotes) {
    const changeColor = q.netChange >= 0 ? chalk.green : chalk.red;
    const changeSign = q.netChange >= 0 ? "+" : "";

    console.log(`\n${chalk.bold.cyan(q.symbol)} - ${q.description}`);
    console.log(chalk.dim("-".repeat(60)));
    console.log(
      `  Last: ${chalk.bold(formatPrice(q.lastPrice))}  ` +
        `${changeColor(changeSign + formatPrice(q.netChange))} (${changeColor(changeSign + q.netChangePercent.toFixed(2) + "%")})`
    );
    console.log(
      `  Bid: ${formatPrice(q.bidPrice)}  Ask: ${formatPrice(q.askPrice)}  Spread: ${formatPrice(q.askPrice - q.bidPrice)}`
    );
    console.log(
      `  Open: ${formatPrice(q.openPrice)}  High: ${formatPrice(q.highPrice)}  Low: ${formatPrice(q.lowPrice)}`
    );
    console.log(`  Volume: ${q.totalVolume.toLocaleString()}`);
    console.log(`  Mark: ${formatPrice(q.mark)}`);
  }

  console.log();
}

function displayCandles(
  symbol: string,
  candles: readonly Candle[],
  period: string,
  frequency: string
): void {
  console.log(`\n${chalk.bold(symbol)} Price History (${period}, ${frequency})`);
  console.log("=".repeat(70));

  if (candles.length === 0) {
    console.log(chalk.yellow("No data available"));
    return;
  }

  // Show last 20 candles or all if less
  const displayCandles = candles.slice(-20);

  console.log(
    chalk.dim(
      "  Date".padEnd(14) +
        "Open".padStart(10) +
        "High".padStart(10) +
        "Low".padStart(10) +
        "Close".padStart(10) +
        "Volume".padStart(14)
    )
  );
  console.log(chalk.dim("-".repeat(70)));

  for (const candle of displayCandles) {
    const dateStr = candle.datetime.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: frequency.includes("min") ? undefined : "2-digit",
      hour: frequency.includes("min") ? "2-digit" : undefined,
      minute: frequency.includes("min") ? "2-digit" : undefined,
    });

    const changeColor = candle.close >= candle.open ? chalk.green : chalk.red;

    console.log(
      "  " +
        dateStr.padEnd(12) +
        formatPrice(candle.open).padStart(10) +
        formatPrice(candle.high).padStart(10) +
        formatPrice(candle.low).padStart(10) +
        changeColor(formatPrice(candle.close).padStart(10)) +
        candle.volume.toLocaleString().padStart(14)
    );
  }

  if (candles.length > 20) {
    console.log(chalk.dim(`  ... showing last 20 of ${candles.length} candles`));
  }

  console.log();
}

export function createQuoteCommand(): Command {
  const quote = new Command("quote")
    .description("Get stock/ETF quotes")
    .argument("[symbols...]", "Stock/ETF symbols")
    .option("--cusips <cusips>", "Comma-separated CUSIPs")
    .option("--ssids <ssids>", "Comma-separated SSIDs")
    .option(
      "--fields <fields>",
      "Comma-separated fields (all,quote,fundamental,extended,reference,regular)"
    )
    .option(
      "--indicative",
      "Include indicative ETF symbols (returns $XYZ.IV alongside ETFs)"
    )
    .option("--realtime", "Advisor-token-only realtime quote request")
    .option("--json", "Output as JSON")
    .action(async (symbols: string[], options) => {
      const spinner = ora("Fetching quotes...").start();
      const fields = options.fields
        ? (options.fields
            .split(",")
            .map((value: string) => value.trim())
            .filter(Boolean) as QuoteField[])
        : undefined;
      const cusips = options.cusips
        ? (options.cusips
            .split(",")
            .map((value: string) => value.trim())
            .filter(Boolean) as string[])
        : undefined;
      const ssids = options.ssids
        ? (options.ssids
            .split(",")
            .map((value: string) => value.trim())
            .filter(Boolean) as string[])
        : undefined;

      if (symbols.length === 0 && !cusips?.length && !ssids?.length) {
        spinner.stop();
        console.error(
          chalk.red("Provide symbols, --cusips, or --ssids to fetch quotes.")
        );
        process.exit(1);
      }

      const exit = await runSchwabExit(
        getQuotesProgram({
          symbols: symbols.length > 0 ? symbols : undefined,
          cusips,
          ssids,
          fields,
          indicative: options.indicative,
          realtime: options.realtime,
        })
      );

      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (quotes) => {
          if (options.json) {
            console.log(JSON.stringify(quotes, null, 2));
          } else {
            displayQuotes(quotes);
          }
        },
      });
    });

  return quote;
}

export function createHistoryCommand(): Command {
  const history = new Command("history")
    .description("Get price history")
    .argument("<symbol>", "Stock/ETF symbol")
    .option(
      "-p, --period <period>",
      "Time period (1d, 2d, 3d, 4d, 5d, 10d, 1mo, 2mo, 3mo, 6mo, 1y, 2y, 3y, 5y, 10y, 15y, 20y, ytd)",
      "1mo"
    )
    .option(
      "-f, --freq <frequency>",
      "Candle frequency (1min, 5min, 10min, 15min, 30min, 1d, 1w, 1mo)",
      "1d"
    )
    .option("--start <isoDate>", "Start date/time in ISO-8601 format")
    .option("--end <isoDate>", "End date/time in ISO-8601 format")
    .option("--extended-hours", "Include extended-hours candles")
    .option("--previous-close", "Request previous close values")
    .option("--json", "Output as JSON")
    .action(async (symbol: string, options) => {
      const spinner = ora(`Fetching price history for ${symbol}...`).start();

      const exit = await runSchwabExit(
        getPriceHistoryProgram(symbol, {
          period: options.period as PriceHistoryPeriod,
          frequency: options.freq as PriceHistoryFrequency,
          startDate: options.start ? new Date(options.start) : undefined,
          endDate: options.end ? new Date(options.end) : undefined,
          needExtendedHoursData: options.extendedHours,
          needPreviousClose: options.previousClose,
        })
      );

      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (candles) => {
          if (options.json) {
            console.log(JSON.stringify(candles, null, 2));
          } else {
            displayCandles(symbol, candles, options.period, options.freq);
          }
        },
      });
    });

  return history;
}
