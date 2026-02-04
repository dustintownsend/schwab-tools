/**
 * Order builder with factory methods for common order types
 */
import { isOptionSymbol } from "./option-symbol.js";

// Types for order building
export type AssetType =
  | "EQUITY"
  | "OPTION"
  | "MUTUAL_FUND"
  | "CASH_EQUIVALENT"
  | "FIXED_INCOME";

export type OrderInstruction =
  | "BUY"
  | "SELL"
  | "BUY_TO_OPEN"
  | "SELL_TO_OPEN"
  | "BUY_TO_CLOSE"
  | "SELL_TO_CLOSE";

export type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
export type OrderSession = "NORMAL" | "AM" | "PM" | "SEAMLESS";
export type OrderDuration = "DAY" | "GTC" | "FOK";

export interface OrderLeg {
  instruction: OrderInstruction;
  quantity: number;
  instrument: {
    symbol: string;
    assetType: AssetType;
  };
}

export interface OrderSpec {
  orderType: OrderType;
  session: OrderSession;
  duration: OrderDuration;
  price?: number;
  stopPrice?: number;
  orderLegCollection: OrderLeg[];
  orderStrategyType: "SINGLE" | "TRIGGER" | "OCO";
}

export interface LegSpec {
  symbol: string;
  instruction: OrderInstruction;
}

/**
 * Determine asset type from symbol
 */
function getAssetType(symbol: string): AssetType {
  return isOptionSymbol(symbol) ? "OPTION" : "EQUITY";
}

/**
 * Create a single order leg
 */
function createLeg(
  symbol: string,
  instruction: OrderInstruction,
  quantity: number
): OrderLeg {
  return {
    instruction,
    quantity,
    instrument: {
      symbol,
      assetType: getAssetType(symbol),
    },
  };
}

/**
 * Order builder with factory methods for common order types
 */
export const OrderBuilder = {
  // --- Equity Orders ---

  /**
   * Create a market buy order for equity
   */
  equityBuy(symbol: string, quantity: number): OrderSpec {
    return {
      orderType: "MARKET",
      session: "NORMAL",
      duration: "DAY",
      orderLegCollection: [createLeg(symbol, "BUY", quantity)],
      orderStrategyType: "SINGLE",
    };
  },

  /**
   * Create a limit buy order for equity
   */
  equityBuyLimit(symbol: string, quantity: number, price: number): OrderSpec {
    return {
      orderType: "LIMIT",
      session: "NORMAL",
      duration: "DAY",
      price,
      orderLegCollection: [createLeg(symbol, "BUY", quantity)],
      orderStrategyType: "SINGLE",
    };
  },

  /**
   * Create a market sell order for equity
   */
  equitySell(symbol: string, quantity: number): OrderSpec {
    return {
      orderType: "MARKET",
      session: "NORMAL",
      duration: "DAY",
      orderLegCollection: [createLeg(symbol, "SELL", quantity)],
      orderStrategyType: "SINGLE",
    };
  },

  /**
   * Create a limit sell order for equity
   */
  equitySellLimit(symbol: string, quantity: number, price: number): OrderSpec {
    return {
      orderType: "LIMIT",
      session: "NORMAL",
      duration: "DAY",
      price,
      orderLegCollection: [createLeg(symbol, "SELL", quantity)],
      orderStrategyType: "SINGLE",
    };
  },

  // --- Single-Leg Option Orders ---

  /**
   * Buy to open an option (long position)
   */
  optionBuyToOpen(
    symbol: string,
    quantity: number,
    price?: number
  ): OrderSpec {
    const base: OrderSpec = {
      orderType: price !== undefined ? "LIMIT" : "MARKET",
      session: "NORMAL",
      duration: "DAY",
      orderLegCollection: [createLeg(symbol, "BUY_TO_OPEN", quantity)],
      orderStrategyType: "SINGLE",
    };

    if (price !== undefined) {
      base.price = price;
    }

    return base;
  },

  /**
   * Sell to open an option (short position, write)
   */
  optionSellToOpen(
    symbol: string,
    quantity: number,
    price?: number
  ): OrderSpec {
    const base: OrderSpec = {
      orderType: price !== undefined ? "LIMIT" : "MARKET",
      session: "NORMAL",
      duration: "DAY",
      orderLegCollection: [createLeg(symbol, "SELL_TO_OPEN", quantity)],
      orderStrategyType: "SINGLE",
    };

    if (price !== undefined) {
      base.price = price;
    }

    return base;
  },

  /**
   * Buy to close an option (close short position)
   */
  optionBuyToClose(
    symbol: string,
    quantity: number,
    price?: number
  ): OrderSpec {
    const base: OrderSpec = {
      orderType: price !== undefined ? "LIMIT" : "MARKET",
      session: "NORMAL",
      duration: "DAY",
      orderLegCollection: [createLeg(symbol, "BUY_TO_CLOSE", quantity)],
      orderStrategyType: "SINGLE",
    };

    if (price !== undefined) {
      base.price = price;
    }

    return base;
  },

  /**
   * Sell to close an option (close long position)
   */
  optionSellToClose(
    symbol: string,
    quantity: number,
    price?: number
  ): OrderSpec {
    const base: OrderSpec = {
      orderType: price !== undefined ? "LIMIT" : "MARKET",
      session: "NORMAL",
      duration: "DAY",
      orderLegCollection: [createLeg(symbol, "SELL_TO_CLOSE", quantity)],
      orderStrategyType: "SINGLE",
    };

    if (price !== undefined) {
      base.price = price;
    }

    return base;
  },

  // --- Spread Orders ---

  /**
   * Create a vertical spread order (bull call, bear put, etc.)
   */
  verticalSpread(
    longLeg: LegSpec,
    shortLeg: LegSpec,
    quantity: number,
    netPrice: number
  ): OrderSpec {
    return {
      orderType: "LIMIT",
      session: "NORMAL",
      duration: "DAY",
      price: netPrice,
      orderLegCollection: [
        createLeg(longLeg.symbol, longLeg.instruction, quantity),
        createLeg(shortLeg.symbol, shortLeg.instruction, quantity),
      ],
      orderStrategyType: "SINGLE",
    };
  },

  /**
   * Create an iron condor order
   */
  ironCondor(
    putSpread: { shortPut: string; longPut: string },
    callSpread: { shortCall: string; longCall: string },
    quantity: number,
    netCredit: number
  ): OrderSpec {
    return {
      orderType: "LIMIT",
      session: "NORMAL",
      duration: "DAY",
      price: netCredit,
      orderLegCollection: [
        createLeg(putSpread.shortPut, "SELL_TO_OPEN", quantity),
        createLeg(putSpread.longPut, "BUY_TO_OPEN", quantity),
        createLeg(callSpread.shortCall, "SELL_TO_OPEN", quantity),
        createLeg(callSpread.longCall, "BUY_TO_OPEN", quantity),
      ],
      orderStrategyType: "SINGLE",
    };
  },

  // --- Order Modifiers ---

  /**
   * Set order to Good 'Til Canceled
   */
  withGTC(order: OrderSpec): OrderSpec {
    return { ...order, duration: "GTC" };
  },

  /**
   * Set order to extended hours session
   */
  withExtendedHours(order: OrderSpec): OrderSpec {
    return { ...order, session: "SEAMLESS" };
  },

  /**
   * Add a stop price to the order
   */
  withStopPrice(order: OrderSpec, stopPrice: number): OrderSpec {
    return {
      ...order,
      orderType: order.price ? "STOP_LIMIT" : "STOP",
      stopPrice,
    };
  },
};
