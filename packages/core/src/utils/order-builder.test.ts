import { describe, it, expect } from "bun:test";
import { OrderBuilder } from "./order-builder.js";

describe("OrderBuilder - Equity Orders", () => {
  describe("equityBuy", () => {
    it("creates a market buy order", () => {
      const order = OrderBuilder.equityBuy("AAPL", 100);

      expect(order.orderType).toBe("MARKET");
      expect(order.session).toBe("NORMAL");
      expect(order.duration).toBe("DAY");
      expect(order.orderStrategyType).toBe("SINGLE");
      expect(order.orderLegCollection).toHaveLength(1);
      expect(order.orderLegCollection[0].instruction).toBe("BUY");
      expect(order.orderLegCollection[0].quantity).toBe(100);
      expect(order.orderLegCollection[0].instrument.symbol).toBe("AAPL");
      expect(order.orderLegCollection[0].instrument.assetType).toBe("EQUITY");
    });
  });

  describe("equityBuyLimit", () => {
    it("creates a limit buy order with price", () => {
      const order = OrderBuilder.equityBuyLimit("MSFT", 50, 375.00);

      expect(order.orderType).toBe("LIMIT");
      expect(order.price).toBe(375.00);
      expect(order.orderLegCollection[0].instruction).toBe("BUY");
      expect(order.orderLegCollection[0].quantity).toBe(50);
      expect(order.orderLegCollection[0].instrument.symbol).toBe("MSFT");
    });
  });

  describe("equitySell", () => {
    it("creates a market sell order", () => {
      const order = OrderBuilder.equitySell("TSLA", 25);

      expect(order.orderType).toBe("MARKET");
      expect(order.orderLegCollection[0].instruction).toBe("SELL");
      expect(order.orderLegCollection[0].quantity).toBe(25);
      expect(order.orderLegCollection[0].instrument.symbol).toBe("TSLA");
    });
  });

  describe("equitySellLimit", () => {
    it("creates a limit sell order with price", () => {
      const order = OrderBuilder.equitySellLimit("GOOGL", 10, 150.00);

      expect(order.orderType).toBe("LIMIT");
      expect(order.price).toBe(150.00);
      expect(order.orderLegCollection[0].instruction).toBe("SELL");
      expect(order.orderLegCollection[0].quantity).toBe(10);
    });
  });
});

describe("OrderBuilder - Option Orders", () => {
  const optionSymbol = "AAPL  240119C00180000";

  describe("optionBuyToOpen", () => {
    it("creates a market buy to open order without price", () => {
      const order = OrderBuilder.optionBuyToOpen(optionSymbol, 5);

      expect(order.orderType).toBe("MARKET");
      expect(order.price).toBeUndefined();
      expect(order.orderLegCollection[0].instruction).toBe("BUY_TO_OPEN");
      expect(order.orderLegCollection[0].quantity).toBe(5);
      expect(order.orderLegCollection[0].instrument.symbol).toBe(optionSymbol);
      expect(order.orderLegCollection[0].instrument.assetType).toBe("OPTION");
    });

    it("creates a limit buy to open order with price", () => {
      const order = OrderBuilder.optionBuyToOpen(optionSymbol, 5, 3.50);

      expect(order.orderType).toBe("LIMIT");
      expect(order.price).toBe(3.50);
      expect(order.orderLegCollection[0].instruction).toBe("BUY_TO_OPEN");
    });
  });

  describe("optionSellToOpen", () => {
    it("creates a market sell to open order without price", () => {
      const order = OrderBuilder.optionSellToOpen(optionSymbol, 3);

      expect(order.orderType).toBe("MARKET");
      expect(order.orderLegCollection[0].instruction).toBe("SELL_TO_OPEN");
      expect(order.orderLegCollection[0].quantity).toBe(3);
    });

    it("creates a limit sell to open order with price", () => {
      const order = OrderBuilder.optionSellToOpen(optionSymbol, 3, 4.25);

      expect(order.orderType).toBe("LIMIT");
      expect(order.price).toBe(4.25);
      expect(order.orderLegCollection[0].instruction).toBe("SELL_TO_OPEN");
    });
  });

  describe("optionBuyToClose", () => {
    it("creates a buy to close order", () => {
      const order = OrderBuilder.optionBuyToClose(optionSymbol, 2, 2.00);

      expect(order.orderType).toBe("LIMIT");
      expect(order.price).toBe(2.00);
      expect(order.orderLegCollection[0].instruction).toBe("BUY_TO_CLOSE");
    });
  });

  describe("optionSellToClose", () => {
    it("creates a sell to close order", () => {
      const order = OrderBuilder.optionSellToClose(optionSymbol, 5, 5.00);

      expect(order.orderType).toBe("LIMIT");
      expect(order.price).toBe(5.00);
      expect(order.orderLegCollection[0].instruction).toBe("SELL_TO_CLOSE");
    });
  });
});

describe("OrderBuilder - Spread Orders", () => {
  describe("verticalSpread", () => {
    it("creates a vertical spread with two legs", () => {
      const order = OrderBuilder.verticalSpread(
        { symbol: "AAPL  240119C00175000", instruction: "BUY_TO_OPEN" },
        { symbol: "AAPL  240119C00180000", instruction: "SELL_TO_OPEN" },
        5,
        1.50
      );

      expect(order.orderType).toBe("LIMIT");
      expect(order.price).toBe(1.50);
      expect(order.orderLegCollection).toHaveLength(2);

      const [longLeg, shortLeg] = order.orderLegCollection;
      expect(longLeg.instruction).toBe("BUY_TO_OPEN");
      expect(longLeg.quantity).toBe(5);
      expect(longLeg.instrument.symbol).toBe("AAPL  240119C00175000");

      expect(shortLeg.instruction).toBe("SELL_TO_OPEN");
      expect(shortLeg.quantity).toBe(5);
      expect(shortLeg.instrument.symbol).toBe("AAPL  240119C00180000");
    });
  });

  describe("ironCondor", () => {
    it("creates an iron condor with four legs", () => {
      const order = OrderBuilder.ironCondor(
        {
          shortPut: "AAPL  240119P00170000",
          longPut: "AAPL  240119P00165000",
        },
        {
          shortCall: "AAPL  240119C00190000",
          longCall: "AAPL  240119C00195000",
        },
        10,
        2.50
      );

      expect(order.orderType).toBe("LIMIT");
      expect(order.price).toBe(2.50);
      expect(order.orderLegCollection).toHaveLength(4);

      // Check put spread legs
      const shortPutLeg = order.orderLegCollection.find(
        (leg) => leg.instrument.symbol === "AAPL  240119P00170000"
      );
      expect(shortPutLeg?.instruction).toBe("SELL_TO_OPEN");
      expect(shortPutLeg?.quantity).toBe(10);

      const longPutLeg = order.orderLegCollection.find(
        (leg) => leg.instrument.symbol === "AAPL  240119P00165000"
      );
      expect(longPutLeg?.instruction).toBe("BUY_TO_OPEN");
      expect(longPutLeg?.quantity).toBe(10);

      // Check call spread legs
      const shortCallLeg = order.orderLegCollection.find(
        (leg) => leg.instrument.symbol === "AAPL  240119C00190000"
      );
      expect(shortCallLeg?.instruction).toBe("SELL_TO_OPEN");
      expect(shortCallLeg?.quantity).toBe(10);

      const longCallLeg = order.orderLegCollection.find(
        (leg) => leg.instrument.symbol === "AAPL  240119C00195000"
      );
      expect(longCallLeg?.instruction).toBe("BUY_TO_OPEN");
      expect(longCallLeg?.quantity).toBe(10);
    });
  });
});

describe("OrderBuilder - Order Modifiers", () => {
  describe("withGTC", () => {
    it("changes duration to GTC", () => {
      const order = OrderBuilder.equityBuyLimit("AAPL", 100, 175.00);
      const gtcOrder = OrderBuilder.withGTC(order);

      expect(gtcOrder.duration).toBe("GTC");
      // Original order unchanged
      expect(order.duration).toBe("DAY");
    });
  });

  describe("withExtendedHours", () => {
    it("changes session to SEAMLESS", () => {
      const order = OrderBuilder.equityBuyLimit("AAPL", 100, 175.00);
      const extendedOrder = OrderBuilder.withExtendedHours(order);

      expect(extendedOrder.session).toBe("SEAMLESS");
      // Original order unchanged
      expect(order.session).toBe("NORMAL");
    });
  });

  describe("withStopPrice", () => {
    it("adds stop price and changes to STOP type for market order", () => {
      const order = OrderBuilder.equitySell("AAPL", 100);
      const stopOrder = OrderBuilder.withStopPrice(order, 170.00);

      expect(stopOrder.orderType).toBe("STOP");
      expect(stopOrder.stopPrice).toBe(170.00);
    });

    it("changes to STOP_LIMIT type when limit price exists", () => {
      const order = OrderBuilder.equitySellLimit("AAPL", 100, 175.00);
      const stopLimitOrder = OrderBuilder.withStopPrice(order, 170.00);

      expect(stopLimitOrder.orderType).toBe("STOP_LIMIT");
      expect(stopLimitOrder.price).toBe(175.00);
      expect(stopLimitOrder.stopPrice).toBe(170.00);
    });
  });

  describe("chained modifiers", () => {
    it("allows chaining multiple modifiers", () => {
      const order = OrderBuilder.withGTC(
        OrderBuilder.withExtendedHours(
          OrderBuilder.equityBuyLimit("AAPL", 100, 175.00)
        )
      );

      expect(order.duration).toBe("GTC");
      expect(order.session).toBe("SEAMLESS");
      expect(order.orderType).toBe("LIMIT");
      expect(order.price).toBe(175.00);
    });
  });
});

describe("OrderBuilder - Asset Type Detection", () => {
  it("detects equity symbol", () => {
    const order = OrderBuilder.equityBuy("AAPL", 100);
    expect(order.orderLegCollection[0].instrument.assetType).toBe("EQUITY");
  });

  it("detects option symbol (21 chars)", () => {
    const optionSymbol = "AAPL  240119C00180000";
    const order = OrderBuilder.optionBuyToOpen(optionSymbol, 5);
    expect(order.orderLegCollection[0].instrument.assetType).toBe("OPTION");
  });
});
