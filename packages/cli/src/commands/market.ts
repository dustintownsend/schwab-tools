import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  Effect,
  Exit,
  MoverService,
  InstrumentService,
  PriceHistoryService,
  runSchwabExit,
  formatCause,
  type InstrumentProjection,
  type MarketType,
} from "@schwab-tools/core";

const getMoversProgram = (
  symbol: string,
  params?: {
    sort?: "VOLUME" | "TRADES" | "PERCENT_CHANGE_UP" | "PERCENT_CHANGE_DOWN";
    frequency?: 0 | 1 | 5 | 10 | 30 | 60;
  }
) =>
  Effect.gen(function* () {
    const service = yield* MoverService;
    return yield* service.getMovers(symbol, params);
  });

const getInstrumentsProgram = (
  symbol: string,
  projection: InstrumentProjection
) =>
  Effect.gen(function* () {
    const service = yield* InstrumentService;
    return yield* service.getInstruments(symbol, projection);
  });

const getInstrumentByCusipProgram = (cusip: string) =>
  Effect.gen(function* () {
    const service = yield* InstrumentService;
    return yield* service.getInstrumentByCusip(cusip);
  });

const getMarketHoursProgram = (markets: readonly MarketType[], date?: Date) =>
  Effect.gen(function* () {
    const service = yield* PriceHistoryService;
    return yield* service.getMarketHours(markets, date);
  });

const getMarketHourProgram = (market: MarketType, date?: Date) =>
  Effect.gen(function* () {
    const service = yield* PriceHistoryService;
    return yield* service.getMarketHour(market, date);
  });

const VALID_MOVER_SYMBOLS = [
  "$DJI",
  "$COMPX",
  "$SPX",
  "NYSE",
  "NASDAQ",
  "OTCBB",
  "INDEX_ALL",
  "EQUITY_ALL",
  "OPTION_ALL",
  "OPTION_PUT",
  "OPTION_CALL",
] as const;

const VALID_INSTRUMENT_PROJECTIONS = [
  "symbol-search",
  "symbol-regex",
  "desc-search",
  "desc-regex",
  "search",
  "fundamental",
] as const;

const VALID_MARKET_TYPES = [
  "EQUITY",
  "OPTION",
  "BOND",
  "FUTURE",
  "FOREX",
] as const;

const normalizeMoverSymbol = (symbol: string): string => {
  const upper = symbol.toUpperCase();
  if (upper === "SPX" || upper === "DJI" || upper === "COMPX") {
    return `$${upper}`;
  }
  return symbol;
};

export function createMarketCommand(): Command {
  const market = new Command("market").description("Market data tools");

  market
    .command("movers")
    .description("Get movers for an index or market symbol")
    .argument("[symbol]", "Index symbol (e.g., '$SPX', '$DJI', NASDAQ)")
    .option("--list-symbols", "List valid movers symbols and exit")
    .option(
      "--sort <sort>",
      "Sort (VOLUME, TRADES, PERCENT_CHANGE_UP, PERCENT_CHANGE_DOWN)"
    )
    .option("--frequency <minutes>", "Frequency (0,1,5,10,30,60)")
    .option("--json", "Output as JSON")
    .action(async (symbol: string | undefined, options) => {
      if (options.listSymbols) {
        if (options.json) {
          console.log(JSON.stringify(VALID_MOVER_SYMBOLS, null, 2));
        } else {
          console.log("\n" + chalk.bold("Valid Movers Symbols"));
          console.log("=".repeat(40));
          for (const value of VALID_MOVER_SYMBOLS) {
            console.log(`  ${value}`);
          }
          console.log();
        }
        return;
      }

      if (!symbol) {
        console.error(
          chalk.red(
            "Missing symbol. If it starts with $, quote it: schwab market movers '$SPX'"
          )
        );
        process.exit(1);
      }

      const normalizedSymbol = normalizeMoverSymbol(symbol);
      const spinner = ora(`Fetching movers for ${normalizedSymbol}...`).start();
      const parsedFrequency = options.frequency
        ? parseInt(options.frequency, 10)
        : undefined;
      if (
        parsedFrequency !== undefined &&
        !([0, 1, 5, 10, 30, 60] as const).includes(
          parsedFrequency as 0 | 1 | 5 | 10 | 30 | 60
        )
      ) {
        spinner.stop();
        console.error(chalk.red("Invalid --frequency. Use one of: 0,1,5,10,30,60"));
        process.exit(1);
      }
      const frequency = parsedFrequency as 0 | 1 | 5 | 10 | 30 | 60 | undefined;

      const exit = await runSchwabExit(
        getMoversProgram(normalizedSymbol, {
          sort: options.sort,
          frequency,
        })
      );
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (movers) => {
          if (options.json) {
            console.log(JSON.stringify(movers, null, 2));
            return;
          }

          console.log(`\n${chalk.bold(`Movers: ${normalizedSymbol}`)}`);
          console.log("=".repeat(72));
          console.log(
            "  " +
              "Symbol".padEnd(12) +
              "Direction".padEnd(12) +
              "Change".padStart(10) +
              "Last".padStart(12) +
              "Volume".padStart(14)
          );
          console.log("  " + chalk.dim("-".repeat(70)));

          for (const m of movers) {
            const directionColor = m.direction === "up" ? chalk.green : chalk.red;
            console.log(
              "  " +
                m.symbol.padEnd(12) +
                directionColor(m.direction.padEnd(12)) +
                m.change.toFixed(2).padStart(10) +
                m.last.toFixed(2).padStart(12) +
                m.totalVolume.toLocaleString().padStart(14)
            );
          }
          console.log();
        },
      });
    });

  market
    .command("instruments")
    .description("Search instruments")
    .argument("<symbol>", "Symbol search term")
    .argument(
      "<projection>",
      "symbol-search|symbol-regex|desc-search|desc-regex|search|fundamental"
    )
    .option("--json", "Output as JSON")
    .action(async (symbol: string, projection: InstrumentProjection, options) => {
      if (!VALID_INSTRUMENT_PROJECTIONS.includes(projection)) {
        console.error(
          chalk.red(
            `Invalid projection '${projection}'. Valid values: ${VALID_INSTRUMENT_PROJECTIONS.join(", ")}`
          )
        );
        process.exit(1);
      }

      const spinner = ora("Searching instruments...").start();

      const exit = await runSchwabExit(
        getInstrumentsProgram(symbol, projection)
      );
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (instruments) => {
          if (options.json) {
            console.log(JSON.stringify(instruments, null, 2));
            return;
          }

          console.log(`\n${chalk.bold(`Instruments: ${symbol}`)}`);
          console.log("=".repeat(72));
          for (const i of instruments) {
            console.log(
              `  ${chalk.cyan(i.symbol)}  ${i.assetType ?? ""}  ${i.exchange ?? ""}  ${i.description ?? ""}`
            );
            if (i.cusip) {
              console.log(chalk.dim(`    CUSIP: ${i.cusip}`));
            }
          }
          console.log();
        },
      });
    });

  market
    .command("instrument")
    .description("Get one instrument by CUSIP")
    .argument("<cusip>", "CUSIP")
    .option("--json", "Output as JSON")
    .action(async (cusip: string, options) => {
      const spinner = ora(`Fetching instrument ${cusip}...`).start();
      const exit = await runSchwabExit(getInstrumentByCusipProgram(cusip));
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (instrument) => {
          if (options.json) {
            console.log(JSON.stringify(instrument, null, 2));
            return;
          }

          console.log("\n" + chalk.bold("Instrument"));
          console.log("=".repeat(60));
          console.log(`  Symbol: ${chalk.cyan(instrument.symbol)}`);
          console.log(`  CUSIP: ${instrument.cusip ?? "-"}`);
          console.log(`  Type: ${instrument.assetType ?? "-"}`);
          console.log(`  Exchange: ${instrument.exchange ?? "-"}`);
          console.log(`  Description: ${instrument.description ?? "-"}`);
          console.log();
        },
      });
    });

  market
    .command("hours")
    .description("Get market hours for one or more markets")
    .option(
      "--markets <markets>",
      "Comma-separated: EQUITY,OPTION,BOND,FUTURE,FOREX",
      "EQUITY"
    )
    .option("--date <date>", "Date (YYYY-MM-DD)")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const spinner = ora("Fetching market hours...").start();
      const markets = options.markets
        .split(",")
        .map((m: string) => m.trim().toUpperCase())
        .filter(Boolean) as MarketType[];
      const invalidMarkets = markets.filter(
        (market) => !VALID_MARKET_TYPES.includes(market)
      );
      if (invalidMarkets.length > 0) {
        spinner.stop();
        console.error(
          chalk.red(
            `Invalid market(s): ${invalidMarkets.join(", ")}. Valid values: ${VALID_MARKET_TYPES.join(", ")}`
          )
        );
        process.exit(1);
      }
      const date = options.date ? new Date(options.date) : undefined;

      const exit = await runSchwabExit(getMarketHoursProgram(markets, date));
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (hours) => {
          if (options.json) {
            console.log(JSON.stringify(hours, null, 2));
            return;
          }

          console.log("\n" + chalk.bold("Market Hours"));
          console.log("=".repeat(72));
          for (const h of hours) {
            console.log(
              `  ${chalk.cyan(h.market)} ${h.date} - ${h.isOpen ? chalk.green("OPEN") : chalk.red("CLOSED")}`
            );
          }
          console.log();
        },
      });
    });

  market
    .command("hour")
    .description("Get market hours for one market")
    .argument("<market>", "EQUITY|OPTION|BOND|FUTURE|FOREX")
    .option("--date <date>", "Date (YYYY-MM-DD)")
    .option("--json", "Output as JSON")
    .action(async (marketType: MarketType, options) => {
      const normalizedMarket = marketType.toUpperCase() as MarketType;
      if (!VALID_MARKET_TYPES.includes(normalizedMarket)) {
        console.error(
          chalk.red(
            `Invalid market '${marketType}'. Valid values: ${VALID_MARKET_TYPES.join(", ")}`
          )
        );
        process.exit(1);
      }

      const spinner = ora(`Fetching ${marketType} market hours...`).start();
      const date = options.date ? new Date(options.date) : undefined;

      const exit = await runSchwabExit(
        getMarketHourProgram(normalizedMarket, date)
      );
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (hours) => {
          if (options.json) {
            console.log(JSON.stringify(hours, null, 2));
            return;
          }

          console.log(`\n${chalk.bold(`${marketType.toUpperCase()} Market Hours`)}`);
          console.log("=".repeat(72));
          for (const h of hours) {
            console.log(
              `  ${h.date} - ${h.isOpen ? chalk.green("OPEN") : chalk.red("CLOSED")}`
            );
          }
          console.log();
        },
      });
    });

  return market;
}
