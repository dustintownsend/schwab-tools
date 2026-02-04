import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { OrderService } from "./index.js";
import { OrderServiceTest } from "../layers/test.js";
import { OrderNotFoundError, OrderRejectedError } from "../errors.js";
import { mockOrders } from "../../test/fixtures/orders.js";
import { OrderBuilder } from "../utils/order-builder.js";

describe("OrderService", () => {
  const testLayer = OrderServiceTest(mockOrders);

  describe("placeOrder", () => {
    it("returns order ID on successful placement", async () => {
      const order = OrderBuilder.equityBuyLimit("AAPL", 100, 175.00);

      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.placeOrder("ABC123HASH", order);
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toBe("test-order-id");
    });

    it("accepts market orders", async () => {
      const order = OrderBuilder.equityBuy("MSFT", 50);

      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.placeOrder("ABC123HASH", order);
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toBeDefined();
    });

    it("accepts option orders", async () => {
      const order = OrderBuilder.optionBuyToOpen("AAPL  240119C00180000", 5, 3.50);

      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.placeOrder("ABC123HASH", order);
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toBeDefined();
    });
  });

  describe("getOrders", () => {
    it("returns orders for account", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.getOrders("ABC123HASH");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toHaveLength(4);
    });

    it("returns orders with correct fields", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.getOrders("ABC123HASH");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      const order = result[0];
      expect(order.orderId).toBeDefined();
      expect(order.accountNumber).toBeDefined();
      expect(order.orderType).toBeDefined();
      expect(order.session).toBeDefined();
      expect(order.duration).toBeDefined();
      expect(order.status).toBeDefined();
      expect(order.orderLegCollection).toBeDefined();
    });
  });

  describe("getAllOrders", () => {
    it("returns all orders across accounts", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.getAllOrders();
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toHaveLength(4);
    });
  });

  describe("getOrder", () => {
    it("returns specific order by ID", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.getOrder("ABC123HASH", "1000001");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.orderId).toBe("1000001");
      expect(result.orderType).toBe("LIMIT");
      expect(result.status).toBe("WORKING");
    });

    it("fails with OrderNotFoundError for invalid order ID", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.getOrder("ABC123HASH", "INVALID");
      });

      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayer)));

      expect(exit._tag).toBe("Failure");
      if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
        const error = exit.cause.error as OrderNotFoundError;
        expect(error._tag).toBe("OrderNotFoundError");
        expect(error.orderId).toBe("INVALID");
        expect(error.accountHash).toBe("ABC123HASH");
      }
    });
  });

  describe("cancelOrder", () => {
    it("cancels order successfully", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.cancelOrder("ABC123HASH", "1000001");
      });

      // Should not throw
      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });
  });

  describe("replaceOrder", () => {
    it("returns new order ID on successful replacement", async () => {
      const newOrder = OrderBuilder.equityBuyLimit("AAPL", 100, 180.00);

      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.replaceOrder("ABC123HASH", "1000001", newOrder);
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toBe("test-new-order-id");
    });
  });

  describe("previewOrder", () => {
    it("returns preview of order", async () => {
      const order = OrderBuilder.equityBuyLimit("AAPL", 100, 175.00);

      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.previewOrder("ABC123HASH", order);
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toBeDefined();
      expect(result.orderId).toBeDefined();
    });

    it("fails with OrderRejectedError when no orders available", async () => {
      const emptyLayer = OrderServiceTest([]);
      const order = OrderBuilder.equityBuyLimit("AAPL", 100, 175.00);

      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.previewOrder("ABC123HASH", order);
      });

      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(emptyLayer)));

      expect(exit._tag).toBe("Failure");
      if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
        const error = exit.cause.error as OrderRejectedError;
        expect(error._tag).toBe("OrderRejectedError");
      }
    });
  });

  describe("order status handling", () => {
    it("returns working orders", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        const orders = yield* service.getOrders("ABC123HASH");
        return orders.filter((o) => o.status === "WORKING");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.length).toBeGreaterThan(0);
      result.forEach((order) => {
        expect(order.status).toBe("WORKING");
      });
    });

    it("returns filled orders with quantities", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        const orders = yield* service.getOrders("ABC123HASH");
        return orders.filter((o) => o.status === "FILLED");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      result.forEach((order) => {
        expect(order.status).toBe("FILLED");
        expect(order.filledQuantity).toBeGreaterThan(0);
        expect(order.remainingQuantity).toBe(0);
      });
    });

    it("returns canceled orders", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        const orders = yield* service.getOrders("ABC123HASH");
        return orders.filter((o) => o.status === "CANCELED");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      result.forEach((order) => {
        expect(order.status).toBe("CANCELED");
        expect(order.closeTime).toBeDefined();
      });
    });
  });

  describe("order leg handling", () => {
    it("handles single leg equity orders", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.getOrder("ABC123HASH", "1000001");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.orderLegCollection).toHaveLength(1);
      expect(result.orderLegCollection[0].instrument.assetType).toBe("EQUITY");
    });

    it("handles single leg option orders", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.getOrder("ABC123HASH", "1000003");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.orderLegCollection).toHaveLength(1);
      expect(result.orderLegCollection[0].instrument.assetType).toBe("OPTION");
      expect(result.orderLegCollection[0].instruction).toBe("BUY_TO_OPEN");
    });

    it("handles multi-leg spread orders", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.getOrder("ABC123HASH", "1000004");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.orderLegCollection).toHaveLength(2);
    });
  });

  describe("empty orders handling", () => {
    const emptyLayer = OrderServiceTest([]);

    it("returns empty array when no orders", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.getOrders("ABC123HASH");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(emptyLayer)));

      expect(result).toHaveLength(0);
    });

    it("returns empty array for getAllOrders", async () => {
      const program = Effect.gen(function* () {
        const service = yield* OrderService;
        return yield* service.getAllOrders();
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(emptyLayer)));

      expect(result).toHaveLength(0);
    });
  });
});
