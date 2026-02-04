import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  Effect,
  Exit,
  OptionChainService,
  runSchwabExit,
  formatCause,
  buildOptionSymbol,
  parseOptionSymbol,
  formatOptionSymbol,
  type CompactOption,
  type ContractType,
  type StrikeRange,
} from "@schwab-tools/core";

/**
 * Effect program to fetch option chain
 */
const getOptionChainProgram = (
  symbol: string,
  params: {
    contractType?: ContractType;
    strikeCount?: number;
    expirationDays?: number;
    strikeRange?: StrikeRange;
  }
) =>
  Effect.gen(function* () {
    const optionService = yield* OptionChainService;
    return yield* optionService.getCompactOptionChain(symbol, params);
  });

function printOptionsTable(
  options: readonly CompactOption[],
  underlyingPrice: number
): void {
  console.log(
    chalk.dim(
      "    Strike".padEnd(12) +
        "Bid".padStart(8) +
        "Ask".padStart(8) +
        "Mid".padStart(8) +
        "Spread%".padStart(9) +
        "Vol".padStart(8) +
        "OI".padStart(8) +
        "Delta".padStart(8) +
        "IV".padStart(8)
    )
  );

  for (const opt of options) {
    const strikeColor = opt.itm ? chalk.yellow : chalk.white;
    const mid = (opt.bid + opt.ask) / 2;
    const spreadPct =
      mid > 0 ? ((opt.ask - opt.bid) / mid * 100).toFixed(1) + "%" : "N/A";

    console.log(
      "    " +
        strikeColor(("$" + opt.strike.toFixed(2)).padEnd(10)) +
        (opt.bid > 0 ? opt.bid.toFixed(2) : "-").padStart(8) +
        (opt.ask > 0 ? opt.ask.toFixed(2) : "-").padStart(8) +
        (mid > 0 ? mid.toFixed(2) : "-").padStart(8) +
        spreadPct.padStart(9) +
        (opt.volume || 0).toString().padStart(8) +
        (opt.openInterest || 0).toString().padStart(8) +
        (opt.delta !== undefined ? opt.delta.toFixed(2) : "-").padStart(8) +
        (opt.iv !== undefined ? (opt.iv * 100).toFixed(0) + "%" : "-").padStart(
          8
        )
    );
  }
}

export function createOptionsCommand(): Command {
  const options = new Command("options").description(
    "Options chain and symbol utilities"
  );

  options
    .command("chain")
    .description("Get option chain for a symbol")
    .argument("<symbol>", "Underlying symbol")
    .option("-c, --calls", "Show only calls")
    .option("-p, --puts", "Show only puts")
    .option("-s, --strikes <count>", "Number of strikes around ATM", "5")
    .option("-d, --days <days>", "Only show expirations within N days")
    .option("--itm", "Show only in-the-money options")
    .option("--otm", "Show only out-of-the-money options")
    .option("--json", "Output as JSON")
    .action(async (symbol: string, opts) => {
      const spinner = ora(`Fetching option chain for ${symbol}...`).start();

      let contractType: ContractType = "ALL";
      if (opts.calls && !opts.puts) contractType = "CALL";
      if (opts.puts && !opts.calls) contractType = "PUT";

      let strikeRange: StrikeRange = "ALL";
      if (opts.itm) strikeRange = "ITM";
      if (opts.otm) strikeRange = "OTM";

      const exit = await runSchwabExit(
        getOptionChainProgram(symbol, {
          contractType,
          strikeCount: parseInt(opts.strikes, 10),
          expirationDays: opts.days ? parseInt(opts.days, 10) : undefined,
          strikeRange,
        })
      );

      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (chain) => {
          if (opts.json) {
            console.log(JSON.stringify(chain, null, 2));
            return;
          }

          console.log(`\n${chalk.bold(chain.symbol)} Option Chain`);
          console.log(
            `Underlying: ${chalk.cyan("$" + chain.underlyingPrice.toFixed(2))}`
          );
          console.log("=".repeat(90));

          for (const exp of chain.expirations) {
            console.log(
              `\n${chalk.bold(exp.date)} (${exp.daysToExpiration} DTE)`
            );
            console.log(chalk.dim("-".repeat(90)));

            if (contractType !== "PUT" && exp.calls.length > 0) {
              console.log(chalk.green.bold("  CALLS"));
              printOptionsTable(exp.calls, chain.underlyingPrice);
            }

            if (contractType !== "CALL" && exp.puts.length > 0) {
              console.log(chalk.red.bold("  PUTS"));
              printOptionsTable(exp.puts, chain.underlyingPrice);
            }
          }

          console.log();
        },
      });
    });

  // Symbol building is a pure function - no Effect needed
  options
    .command("symbol")
    .description("Build an OCC option symbol")
    .argument("<underlying>", "Underlying symbol")
    .argument("<expiration>", "Expiration date (YYYY-MM-DD)")
    .argument("<type>", "Option type (C or P)")
    .argument("<strike>", "Strike price")
    .action(
      async (
        underlying: string,
        expiration: string,
        type: string,
        strike: string
      ) => {
        try {
          const putCall = type.toUpperCase() as "P" | "C";
          if (putCall !== "P" && putCall !== "C") {
            throw new Error("Type must be C (call) or P (put)");
          }

          const strikePrice = parseFloat(strike);
          if (isNaN(strikePrice)) {
            throw new Error("Strike must be a number");
          }

          const symbol = buildOptionSymbol({
            underlying,
            expiration: new Date(expiration),
            putCall,
            strike: strikePrice,
          });

          console.log(`\n${chalk.bold("OCC Symbol")}: ${chalk.cyan(symbol)}`);
          console.log(`${chalk.bold("Formatted")}: ${formatOptionSymbol(symbol)}`);
          console.log();
        } catch (error) {
          console.error(
            chalk.red(error instanceof Error ? error.message : error)
          );
          process.exit(1);
        }
      }
    );

  // Symbol parsing is a pure function - no Effect needed
  options
    .command("parse")
    .description("Parse an OCC option symbol")
    .argument("<symbol>", "OCC option symbol")
    .action(async (symbol: string) => {
      try {
        const parsed = parseOptionSymbol(symbol);

        console.log(`\n${chalk.bold("Parsed Option Symbol")}`);
        console.log(chalk.dim("-".repeat(40)));
        console.log(`  Symbol: ${chalk.cyan(symbol)}`);
        console.log(`  Underlying: ${chalk.bold(parsed.underlying)}`);
        console.log(
          `  Expiration: ${parsed.expiration.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
        );
        console.log(
          `  Type: ${parsed.putCall === "C" ? chalk.green("Call") : chalk.red("Put")}`
        );
        console.log(`  Strike: $${parsed.strike}`);
        console.log();
      } catch (error) {
        console.error(
          chalk.red(error instanceof Error ? error.message : error)
        );
        process.exit(1);
      }
    });

  return options;
}
