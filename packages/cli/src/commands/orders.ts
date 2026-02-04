import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  Effect,
  Exit,
  OrderService,
  AccountService,
  runSchwabExit,
  formatCause,
  AccountNotFoundError,
  OrderBuilder,
  formatOptionSymbol,
  isOptionSymbol,
  type Order,
  type OrderStatus,
  type OrderSpec,
  type OrderInstruction,
} from "@schwab-tools/core";

/**
 * Effect program to fetch orders for all accounts
 */
const getAllOrdersProgram = (params?: {
  status?: OrderStatus | "ALL";
  maxResults?: number;
}) =>
  Effect.gen(function* () {
    const orderService = yield* OrderService;
    return yield* orderService.getAllOrders(params);
  });

/**
 * Effect program to fetch orders for a specific account
 */
const getOrdersProgram = (
  accountHash: string,
  params?: { status?: OrderStatus | "ALL"; maxResults?: number }
) =>
  Effect.gen(function* () {
    const orderService = yield* OrderService;
    return yield* orderService.getOrders(accountHash, params);
  });

/**
 * Effect program to fetch a single order
 */
const getOrderProgram = (accountHash: string, orderId: string) =>
  Effect.gen(function* () {
    const orderService = yield* OrderService;
    return yield* orderService.getOrder(accountHash, orderId);
  });

/**
 * Effect program to cancel an order
 */
const cancelOrderProgram = (accountHash: string, orderId: string) =>
  Effect.gen(function* () {
    const orderService = yield* OrderService;
    return yield* orderService.cancelOrder(accountHash, orderId);
  });

const previewOrderProgram = (accountHash: string, order: OrderSpec) =>
  Effect.gen(function* () {
    const orderService = yield* OrderService;
    return yield* orderService.previewOrder(accountHash, order);
  });

const replaceOrderProgram = (
  accountHash: string,
  orderId: string,
  order: OrderSpec
) =>
  Effect.gen(function* () {
    const orderService = yield* OrderService;
    return yield* orderService.replaceOrder(accountHash, orderId, order);
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

/**
 * Effect program to place an order
 */
const placeOrderProgram = (accountHash: string, order: OrderSpec) =>
  Effect.gen(function* () {
    const orderService = yield* OrderService;
    return yield* orderService.placeOrder(accountHash, order);
  });

function getStatusColor(status: string): (text: string) => string {
  switch (status) {
    case "FILLED":
      return chalk.green;
    case "WORKING":
    case "ACCEPTED":
    case "PENDING_ACTIVATION":
      return chalk.yellow;
    case "CANCELED":
    case "REJECTED":
    case "EXPIRED":
      return chalk.red;
    default:
      return chalk.white;
  }
}

function printOrderSummary(order: Order): void {
  const statusColor = getStatusColor(order.status);
  const legs = order.orderLegCollection
    .map((leg) => {
      const sym =
        leg.instrument.assetType === "OPTION"
          ? formatOptionSymbol(leg.instrument.symbol)
          : leg.instrument.symbol;
      return `${leg.instruction} ${leg.quantity} ${sym}`;
    })
    .join(", ");

  console.log(`\n  ${chalk.dim(order.orderId)} ${statusColor(order.status)}`);
  console.log(`    ${legs}`);
  console.log(
    `    ${order.orderType}${order.price ? " @ $" + order.price : ""} | ${order.duration}`
  );
  console.log(
    `    Filled: ${order.filledQuantity}/${order.filledQuantity + order.remainingQuantity}`
  );
  console.log(`    Entered: ${order.enteredTime.toLocaleString()}`);
}

function printOrderDetails(order: Order): void {
  const statusColor = getStatusColor(order.status);

  console.log(`\n${chalk.bold("Order Details")}`);
  console.log("═".repeat(60));
  console.log(`  Order ID: ${chalk.cyan(order.orderId)}`);
  console.log(`  Account: ${order.accountNumber}`);
  console.log(`  Status: ${statusColor(order.status)}`);
  console.log(`  Type: ${order.orderType}`);
  console.log(`  Duration: ${order.duration}`);
  if (order.price) {
    console.log(`  Price: $${order.price}`);
  }
  console.log(`  Filled: ${order.filledQuantity}`);
  console.log(`  Remaining: ${order.remainingQuantity}`);
  console.log(`  Entered: ${order.enteredTime.toLocaleString()}`);
  if (order.closeTime) {
    console.log(`  Closed: ${order.closeTime.toLocaleString()}`);
  }

  console.log("\n  " + chalk.bold("Legs:"));
  for (const leg of order.orderLegCollection) {
    const sym =
      leg.instrument.assetType === "OPTION"
        ? formatOptionSymbol(leg.instrument.symbol)
        : leg.instrument.symbol;
    console.log(
      `    ${leg.instruction} ${leg.quantity} ${sym} (${leg.instrument.assetType})`
    );
  }

  console.log();
}

function buildOrderSpec(
  action: OrderInstruction,
  symbol: string,
  quantity: number,
  orderType: "MARKET" | "LIMIT",
  price: number | undefined,
  duration: "DAY" | "GOOD_TILL_CANCEL" | "GTC"
): OrderSpec {
  if (orderType === "LIMIT" && price === undefined) {
    throw new Error("Limit orders require --price");
  }

  const option = isOptionSymbol(symbol);
  let order: OrderSpec;

  if (option) {
    switch (action) {
      case "BUY_TO_OPEN":
        order = OrderBuilder.optionBuyToOpen(symbol, quantity, price);
        break;
      case "SELL_TO_OPEN":
        order = OrderBuilder.optionSellToOpen(symbol, quantity, price);
        break;
      case "BUY_TO_CLOSE":
        order = OrderBuilder.optionBuyToClose(symbol, quantity, price);
        break;
      case "SELL_TO_CLOSE":
        order = OrderBuilder.optionSellToClose(symbol, quantity, price);
        break;
      default:
        throw new Error(
          `Invalid option action ${action}. Use BUY_TO_OPEN, SELL_TO_OPEN, BUY_TO_CLOSE, SELL_TO_CLOSE`
        );
    }
  } else {
    switch (action) {
      case "BUY":
        order =
          price !== undefined
            ? OrderBuilder.equityBuyLimit(symbol, quantity, price)
            : OrderBuilder.equityBuy(symbol, quantity);
        break;
      case "SELL":
        order =
          price !== undefined
            ? OrderBuilder.equitySellLimit(symbol, quantity, price)
            : OrderBuilder.equitySell(symbol, quantity);
        break;
      default:
        throw new Error(`Invalid equity action ${action}. Use BUY or SELL`);
    }
  }

  if (duration === "GTC" || duration === "GOOD_TILL_CANCEL") {
    return OrderBuilder.withGTC(order);
  }
  return order;
}

async function confirm(): Promise<boolean> {
  return new Promise((resolve) => {
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", (data) => {
      const answer = data.toString().trim().toLowerCase();
      resolve(answer === "y" || answer === "yes");
    });
  });
}

async function placeEquityOrderEffect(
  action: "BUY" | "SELL",
  symbol: string,
  quantity: number,
  options: { limit?: string; account?: string; gtc?: boolean; yes?: boolean }
): Promise<void> {
  const price = options.limit ? parseFloat(options.limit) : undefined;
  const orderType = price !== undefined ? "LIMIT" : "MARKET";

  const desc = `${action} ${quantity} ${symbol} @ ${orderType}${price ? " $" + price : ""}`;

  if (!options.yes) {
    console.log(`\n${chalk.yellow("Order:")} ${desc}`);
    console.log(chalk.yellow("Confirm order? (y/N): "));

    const confirmed = await confirm();
    if (!confirmed) {
      console.log("Order canceled");
      return;
    }
  }

  const spinner = ora("Placing order...").start();

  const program = Effect.gen(function* () {
    const accountHash = yield* getAccountHashOrFirst(options.account);

    let order =
      action === "BUY"
        ? price !== undefined
          ? OrderBuilder.equityBuyLimit(symbol, quantity, price)
          : OrderBuilder.equityBuy(symbol, quantity)
        : price !== undefined
          ? OrderBuilder.equitySellLimit(symbol, quantity, price)
          : OrderBuilder.equitySell(symbol, quantity);

    if (options.gtc) {
      order = OrderBuilder.withGTC(order);
    }

    return yield* placeOrderProgram(accountHash, order);
  });

  const exit = await runSchwabExit(program);
  spinner.stop();

  Exit.match(exit, {
    onFailure: (cause) => {
      console.error(chalk.red("Order failed: " + formatCause(cause)));
      process.exit(1);
    },
    onSuccess: (orderId) => {
      console.log(chalk.green(`Order placed: ${orderId}`));
    },
  });
}

async function placeOptionOrderEffect(
  action: "BUY_TO_OPEN" | "SELL_TO_OPEN" | "BUY_TO_CLOSE" | "SELL_TO_CLOSE",
  symbol: string,
  quantity: number,
  options: { limit?: string; account?: string; gtc?: boolean; yes?: boolean }
): Promise<void> {
  const price = options.limit ? parseFloat(options.limit) : undefined;

  if (!isOptionSymbol(symbol)) {
    console.error(
      chalk.red(
        'Invalid OCC option symbol. Use "schwab options symbol" to build one.'
      )
    );
    process.exit(1);
  }

  const formattedSymbol = formatOptionSymbol(symbol);
  const desc = `${action.replace(/_/g, " ")} ${quantity} ${formattedSymbol}${price ? " @ $" + price : ""}`;

  if (!options.yes) {
    console.log(`\n${chalk.yellow("Order:")} ${desc}`);
    console.log(chalk.yellow("Confirm order? (y/N): "));

    const confirmed = await confirm();
    if (!confirmed) {
      console.log("Order canceled");
      return;
    }
  }

  const spinner = ora("Placing order...").start();

  const program = Effect.gen(function* () {
    const accountHash = yield* getAccountHashOrFirst(options.account);

    let order;
    switch (action) {
      case "BUY_TO_OPEN":
        order = OrderBuilder.optionBuyToOpen(symbol, quantity, price);
        break;
      case "SELL_TO_OPEN":
        order = OrderBuilder.optionSellToOpen(symbol, quantity, price);
        break;
      case "BUY_TO_CLOSE":
        order = OrderBuilder.optionBuyToClose(symbol, quantity, price);
        break;
      case "SELL_TO_CLOSE":
        order = OrderBuilder.optionSellToClose(symbol, quantity, price);
        break;
    }

    if (options.gtc) {
      order = OrderBuilder.withGTC(order);
    }

    return yield* placeOrderProgram(accountHash, order);
  });

  const exit = await runSchwabExit(program);
  spinner.stop();

  Exit.match(exit, {
    onFailure: (cause) => {
      console.error(chalk.red("Order failed: " + formatCause(cause)));
      process.exit(1);
    },
    onSuccess: (orderId) => {
      console.log(chalk.green(`Order placed: ${orderId}`));
    },
  });
}

export function createOrdersCommand(): Command {
  const orders = new Command("orders").description(
    "View and manage orders"
  );

  orders
    .command("list")
    .description("List orders")
    .option(
      "-a, --account <hash>",
      "Account hash (all accounts if not specified)"
    )
    .option(
      "-s, --status <status>",
      "Filter by status (WORKING, FILLED, CANCELED, ALL)",
      "ALL"
    )
    .option("-n, --limit <count>", "Maximum number of orders", "50")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const spinner = ora("Fetching orders...").start();
      const status = opts.status as OrderStatus | "ALL";
      const maxResults = parseInt(opts.limit, 10);

      const program = opts.account
        ? getOrdersProgram(opts.account, { status, maxResults })
        : getAllOrdersProgram({ status, maxResults });

      const exit = await runSchwabExit(program);
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (orderList) => {
          if (opts.json) {
            console.log(JSON.stringify(orderList, null, 2));
            return;
          }

          console.log("\n" + chalk.bold("Orders"));
          console.log("═".repeat(90));

          if (orderList.length === 0) {
            console.log(chalk.dim("  No orders found"));
          } else {
            for (const order of orderList) {
              printOrderSummary(order);
            }
          }

          console.log();
        },
      });
    });

  orders
    .command("show")
    .description("Show order details")
    .argument("<orderId>", "Order ID")
    .option("-a, --account <hash>", "Account hash (required)")
    .option("--json", "Output as JSON")
    .action(async (orderId: string, opts) => {
      if (!opts.account) {
        console.error(
          chalk.red("Account hash is required. Use -a or --account")
        );
        process.exit(1);
      }

      const spinner = ora("Fetching order...").start();

      const exit = await runSchwabExit(getOrderProgram(opts.account, orderId));
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (order) => {
          if (opts.json) {
            console.log(JSON.stringify(order, null, 2));
            return;
          }

          printOrderDetails(order);
        },
      });
    });

  orders
    .command("cancel")
    .description("Cancel an order")
    .argument("<orderId>", "Order ID")
    .option("-a, --account <hash>", "Account hash (required)")
    .action(async (orderId: string, opts) => {
      if (!opts.account) {
        console.error(
          chalk.red("Account hash is required. Use -a or --account")
        );
        process.exit(1);
      }

      const spinner = ora("Canceling order...").start();

      const exit = await runSchwabExit(
        cancelOrderProgram(opts.account, orderId)
      );
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red("Failed to cancel: " + formatCause(cause)));
          process.exit(1);
        },
        onSuccess: () => {
          console.log(chalk.green(`Order ${orderId} canceled`));
        },
      });
    });

  orders
    .command("preview")
    .description("Preview an order without placing it")
    .requiredOption("-a, --account <hash>", "Account hash")
    .requiredOption(
      "--action <action>",
      "BUY, SELL, BUY_TO_OPEN, SELL_TO_OPEN, BUY_TO_CLOSE, SELL_TO_CLOSE"
    )
    .requiredOption("--symbol <symbol>", "Stock symbol or OCC option symbol")
    .requiredOption("--quantity <quantity>", "Quantity")
    .option("--type <type>", "MARKET or LIMIT", "LIMIT")
    .option("--price <price>", "Limit price")
    .option("--duration <duration>", "DAY or GTC", "DAY")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const spinner = ora("Previewing order...").start();

      const program = Effect.gen(function* () {
        const order = buildOrderSpec(
          opts.action as OrderInstruction,
          opts.symbol,
          parseInt(opts.quantity, 10),
          (opts.type.toUpperCase() as "MARKET" | "LIMIT"),
          opts.price ? parseFloat(opts.price) : undefined,
          opts.duration.toUpperCase() as "DAY" | "GOOD_TILL_CANCEL" | "GTC"
        );
        return yield* previewOrderProgram(opts.account, order);
      });

      const exit = await runSchwabExit(program);
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (order) => {
          if (opts.json) {
            console.log(JSON.stringify(order, null, 2));
            return;
          }
          printOrderDetails(order);
        },
      });
    });

  orders
    .command("replace")
    .description("Replace an existing order")
    .argument("<orderId>", "Order ID to replace")
    .requiredOption("-a, --account <hash>", "Account hash")
    .requiredOption(
      "--action <action>",
      "BUY, SELL, BUY_TO_OPEN, SELL_TO_OPEN, BUY_TO_CLOSE, SELL_TO_CLOSE"
    )
    .requiredOption("--symbol <symbol>", "Stock symbol or OCC option symbol")
    .requiredOption("--quantity <quantity>", "Quantity")
    .option("--type <type>", "MARKET or LIMIT", "LIMIT")
    .option("--price <price>", "Limit price")
    .option("--duration <duration>", "DAY or GTC", "DAY")
    .option("--json", "Output as JSON")
    .action(async (orderId: string, opts) => {
      const spinner = ora(`Replacing order ${orderId}...`).start();

      const program = Effect.gen(function* () {
        const order = buildOrderSpec(
          opts.action as OrderInstruction,
          opts.symbol,
          parseInt(opts.quantity, 10),
          (opts.type.toUpperCase() as "MARKET" | "LIMIT"),
          opts.price ? parseFloat(opts.price) : undefined,
          opts.duration.toUpperCase() as "DAY" | "GOOD_TILL_CANCEL" | "GTC"
        );
        return yield* replaceOrderProgram(opts.account, orderId, order);
      });

      const exit = await runSchwabExit(program);
      spinner.stop();

      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(chalk.red(formatCause(cause)));
          process.exit(1);
        },
        onSuccess: (newOrderId) => {
          if (opts.json) {
            console.log(JSON.stringify({ orderId: newOrderId }, null, 2));
            return;
          }
          console.log(chalk.green(`Order replaced: ${newOrderId}`));
        },
      });
    });

  return orders;
}

export function createOrderCommand(): Command {
  const order = new Command("order").description(
    "Place orders"
  );

  // Stock buy
  order
    .command("buy")
    .description("Buy stock")
    .argument("<symbol>", "Stock symbol")
    .argument("<quantity>", "Number of shares")
    .option("-l, --limit <price>", "Limit price (market order if not specified)")
    .option("-a, --account <hash>", "Account hash")
    .option("--gtc", "Good til canceled (default: day)")
    .option("-y, --yes", "Skip confirmation")
    .action(async (symbol: string, quantity: string, opts) => {
      await placeEquityOrderEffect("BUY", symbol, parseInt(quantity, 10), opts);
    });

  // Stock sell
  order
    .command("sell")
    .description("Sell stock")
    .argument("<symbol>", "Stock symbol")
    .argument("<quantity>", "Number of shares")
    .option("-l, --limit <price>", "Limit price (market order if not specified)")
    .option("-a, --account <hash>", "Account hash")
    .option("--gtc", "Good til canceled (default: day)")
    .option("-y, --yes", "Skip confirmation")
    .action(async (symbol: string, quantity: string, opts) => {
      await placeEquityOrderEffect("SELL", symbol, parseInt(quantity, 10), opts);
    });

  // Option orders subcommand
  const optionCmd = order
    .command("option")
    .description("Place option orders");

  optionCmd
    .command("buy-to-open")
    .description("Buy to open an option (long position)")
    .argument("<symbol>", "OCC option symbol")
    .argument("<quantity>", "Number of contracts")
    .option("-l, --limit <price>", "Limit price")
    .option("-a, --account <hash>", "Account hash")
    .option("--gtc", "Good til canceled")
    .option("-y, --yes", "Skip confirmation")
    .action(async (symbol: string, quantity: string, opts) => {
      await placeOptionOrderEffect(
        "BUY_TO_OPEN",
        symbol,
        parseInt(quantity, 10),
        opts
      );
    });

  optionCmd
    .command("sell-to-open")
    .description("Sell to open an option (short/write position)")
    .argument("<symbol>", "OCC option symbol")
    .argument("<quantity>", "Number of contracts")
    .option("-l, --limit <price>", "Limit price")
    .option("-a, --account <hash>", "Account hash")
    .option("--gtc", "Good til canceled")
    .option("-y, --yes", "Skip confirmation")
    .action(async (symbol: string, quantity: string, opts) => {
      await placeOptionOrderEffect(
        "SELL_TO_OPEN",
        symbol,
        parseInt(quantity, 10),
        opts
      );
    });

  optionCmd
    .command("buy-to-close")
    .description("Buy to close an option (close short position)")
    .argument("<symbol>", "OCC option symbol")
    .argument("<quantity>", "Number of contracts")
    .option("-l, --limit <price>", "Limit price")
    .option("-a, --account <hash>", "Account hash")
    .option("--gtc", "Good til canceled")
    .option("-y, --yes", "Skip confirmation")
    .action(async (symbol: string, quantity: string, opts) => {
      await placeOptionOrderEffect(
        "BUY_TO_CLOSE",
        symbol,
        parseInt(quantity, 10),
        opts
      );
    });

  optionCmd
    .command("sell-to-close")
    .description("Sell to close an option (close long position)")
    .argument("<symbol>", "OCC option symbol")
    .argument("<quantity>", "Number of contracts")
    .option("-l, --limit <price>", "Limit price")
    .option("-a, --account <hash>", "Account hash")
    .option("--gtc", "Good til canceled")
    .option("-y, --yes", "Skip confirmation")
    .action(async (symbol: string, quantity: string, opts) => {
      await placeOptionOrderEffect(
        "SELL_TO_CLOSE",
        symbol,
        parseInt(quantity, 10),
        opts
      );
    });

  return order;
}
