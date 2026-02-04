/**
 * Effect-based order tools for MCP server.
 */
import {
  Effect,
  OrderService,
  AccountService,
  runSchwab,
  formatError,
  OrderBuilder,
  formatOptionSymbol,
  isOptionSymbol,
  type Order,
  type OrderStatus,
  type OrderSpec,
  type OrderInstruction,
  type SchwabClientError,
} from "@schwab-tools/core";

export const orderTools = [
  {
    name: "schwab_get_orders",
    description:
      "Get open and recent orders",
    inputSchema: {
      type: "object" as const,
      properties: {
        accountHash: {
          type: "string",
          description:
            "Account hash (optional - if omitted, returns orders from all accounts)",
        },
        status: {
          type: "string",
          enum: ["WORKING", "FILLED", "CANCELED", "REJECTED", "EXPIRED", "ALL"],
          description: "Filter by order status (default: ALL)",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of orders to return (default: 50)",
        },
      },
      required: [],
    },
  },
  {
    name: "schwab_get_order",
    description: "Get details for a specific order",
    inputSchema: {
      type: "object" as const,
      properties: {
        accountHash: {
          type: "string",
          description: "Account hash",
        },
        orderId: {
          type: "string",
          description: "Order ID",
        },
      },
      required: ["accountHash", "orderId"],
    },
  },
  {
    name: "schwab_place_order",
    description:
      "Place a new order for stocks or options. IMPORTANT: This executes a real trade.",
    inputSchema: {
      type: "object" as const,
      properties: {
        accountHash: {
          type: "string",
          description: "Account hash to place order in",
        },
        action: {
          type: "string",
          enum: [
            "BUY",
            "SELL",
            "BUY_TO_OPEN",
            "SELL_TO_OPEN",
            "BUY_TO_CLOSE",
            "SELL_TO_CLOSE",
          ],
          description:
            "Order action. For stocks: BUY/SELL. For options: BUY_TO_OPEN (long), SELL_TO_OPEN (short/write), BUY_TO_CLOSE, SELL_TO_CLOSE",
        },
        symbol: {
          type: "string",
          description:
            "Stock symbol or OCC option symbol (use schwab_build_option_symbol to construct option symbols)",
        },
        quantity: {
          type: "number",
          description: "Number of shares or contracts",
        },
        orderType: {
          type: "string",
          enum: ["MARKET", "LIMIT"],
          description: "Order type (default: LIMIT for safety)",
        },
        price: {
          type: "number",
          description: "Limit price (required for LIMIT orders)",
        },
        duration: {
          type: "string",
          enum: ["DAY", "GTC"],
          description: "Order duration (default: DAY)",
        },
      },
      required: ["accountHash", "action", "symbol", "quantity"],
    },
  },
  {
    name: "schwab_cancel_order",
    description: "Cancel an open order",
    inputSchema: {
      type: "object" as const,
      properties: {
        accountHash: {
          type: "string",
          description: "Account hash",
        },
        orderId: {
          type: "string",
          description: "Order ID to cancel",
        },
      },
      required: ["accountHash", "orderId"],
    },
  },
];

// Effect programs
const getOrdersProgram = (
  accountHash: string,
  params?: { status?: OrderStatus | "ALL"; maxResults?: number }
) =>
  Effect.gen(function* () {
    const orderService = yield* OrderService;
    return yield* orderService.getOrders(accountHash, params);
  });

const getAllOrdersProgram = (params?: {
  status?: OrderStatus | "ALL";
  maxResults?: number;
}) =>
  Effect.gen(function* () {
    const orderService = yield* OrderService;
    return yield* orderService.getAllOrders(params);
  });

const getOrderProgram = (accountHash: string, orderId: string) =>
  Effect.gen(function* () {
    const orderService = yield* OrderService;
    return yield* orderService.getOrder(accountHash, orderId);
  });

const placeOrderProgram = (accountHash: string, order: OrderSpec) =>
  Effect.gen(function* () {
    const orderService = yield* OrderService;
    // Cast to any to bridge between core OrderSpec and effect OrderSpec types
    // (structurally identical, differ only in readonly modifier)
    return yield* orderService.placeOrder(accountHash, order as any);
  });

const cancelOrderProgram = (accountHash: string, orderId: string) =>
  Effect.gen(function* () {
    const orderService = yield* OrderService;
    return yield* orderService.cancelOrder(accountHash, orderId);
  });

// Result types
interface SuccessResult<T> {
  success: true;
  data: T;
}

interface ErrorResult {
  success: false;
  error: string;
  errorType: string;
}

type Result<T> = SuccessResult<T> | ErrorResult;

// Helper to run an Effect and return a structured result
async function runWithResult<T>(
  effect: Effect.Effect<T, SchwabClientError, any>
): Promise<Result<T>> {
  try {
    const data = await runSchwab(effect);
    return { success: true, data };
  } catch (error) {
    const schwabError = error as SchwabClientError;
    return {
      success: false,
      error: formatError(schwabError),
      errorType: schwabError._tag,
    };
  }
}

function formatOrder(order: Order) {
  const legs = order.orderLegCollection.map((leg) => {
    const isOption = leg.instrument.assetType === "OPTION";
    return {
      action: leg.instruction,
      symbol: isOption
        ? formatOptionSymbol(leg.instrument.symbol)
        : leg.instrument.symbol,
      rawSymbol: leg.instrument.symbol,
      quantity: leg.quantity,
      assetType: leg.instrument.assetType,
    };
  });

  return {
    orderId: order.orderId,
    accountNumber: order.accountNumber,
    status: order.status,
    orderType: order.orderType,
    duration: order.duration,
    price: order.price,
    filled: order.filledQuantity,
    remaining: order.remainingQuantity,
    enteredTime: order.enteredTime.toISOString(),
    closeTime: order.closeTime?.toISOString(),
    legs,
  };
}

/**
 * Handle order tool calls
 */
export async function handleOrderTool(
  name: string,
  args: Record<string, unknown>
): Promise<Result<unknown>> {
  switch (name) {
    case "schwab_get_orders": {
      const accountHash = args.accountHash as string | undefined;
      const status = args.status as OrderStatus | "ALL" | undefined;
      const maxResults = (args.maxResults as number) || 50;

      const result = accountHash
        ? await runWithResult(getOrdersProgram(accountHash, { status, maxResults }))
        : await runWithResult(getAllOrdersProgram({ status, maxResults }));

      if (!result.success) return result;

      return {
        success: true,
        data: {
          count: result.data.length,
          orders: result.data.map(formatOrder),
        },
      };
    }

    case "schwab_get_order": {
      const accountHash = args.accountHash as string;
      const orderId = args.orderId as string;

      const result = await runWithResult(getOrderProgram(accountHash, orderId));
      if (!result.success) return result;

      return {
        success: true,
        data: formatOrder(result.data),
      };
    }

    case "schwab_place_order": {
      const accountHash = args.accountHash as string;
      const action = args.action as OrderInstruction;
      const symbol = args.symbol as string;
      const quantity = args.quantity as number;
      const orderType = (args.orderType as "MARKET" | "LIMIT") || "LIMIT";
      const price = args.price as number | undefined;
      const duration = (args.duration as "DAY" | "GTC") || "DAY";

      // Validate limit orders have price
      if (orderType === "LIMIT" && price === undefined) {
        return {
          success: false,
          error: "Limit orders require a price",
          errorType: "ValidationError",
        };
      }

      // Build the order based on action
      let order: OrderSpec;
      const isOption = isOptionSymbol(symbol);

      try {
        if (isOption) {
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
              return {
                success: false,
                error: `Invalid action for option: ${action}. Use BUY_TO_OPEN, SELL_TO_OPEN, BUY_TO_CLOSE, or SELL_TO_CLOSE`,
                errorType: "ValidationError",
              };
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
              return {
                success: false,
                error: `Invalid action for equity: ${action}. Use BUY or SELL`,
                errorType: "ValidationError",
              };
          }
        }

        // Apply duration
        if (duration === "GTC") {
          order = OrderBuilder.withGTC(order as any) as any;
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          errorType: "ValidationError",
        };
      }

      const result = await runWithResult(placeOrderProgram(accountHash, order));
      if (!result.success) return result;

      return {
        success: true,
        data: {
          orderId: result.data,
          message: "Order placed successfully",
          details: {
            action,
            symbol: isOption ? formatOptionSymbol(symbol) : symbol,
            quantity,
            orderType,
            price,
            duration,
          },
        },
      };
    }

    case "schwab_cancel_order": {
      const accountHash = args.accountHash as string;
      const orderId = args.orderId as string;

      const result = await runWithResult(
        cancelOrderProgram(accountHash, orderId)
      );
      if (!result.success) return result;

      return {
        success: true,
        data: {
          message: `Order ${orderId} canceled`,
        },
      };
    }

    default:
      return {
        success: false,
        error: `Unknown tool: ${name}`,
        errorType: "UnknownTool",
      };
  }
}
