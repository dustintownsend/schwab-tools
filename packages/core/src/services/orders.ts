import { Effect, Layer } from "effect";
import { OrderService, HttpClient } from "./index.js";
import { OrderRejectedError } from "../errors.js";
import type {
  Order,
  OrderSpec,
  OrderQueryParams,
  OrderLeg,
  OrderStatus,
  OrderInstruction,
  AssetType,
} from "../schemas/index.js";

// Schwab API response types
interface SchwabOrderLeg {
  orderLegType: string;
  legId: number;
  instrument: {
    assetType: string;
    cusip?: string;
    symbol: string;
    description?: string;
    putCall?: string;
    underlyingSymbol?: string;
  };
  instruction: string;
  positionEffect?: string;
  quantity: number;
}

interface SchwabOrder {
  session: string;
  duration: string;
  orderType: string;
  complexOrderStrategyType?: string;
  quantity?: number;
  filledQuantity?: number;
  remainingQuantity?: number;
  price?: number;
  stopPrice?: number;
  orderLegCollection: SchwabOrderLeg[];
  orderStrategyType: string;
  orderId: number;
  cancelable: boolean;
  editable: boolean;
  status: string;
  enteredTime: string;
  closeTime?: string;
  accountNumber: number;
  statusDescription?: string;
}

// Mappers
const mapOrderLeg = (leg: SchwabOrderLeg): OrderLeg => ({
  instruction: leg.instruction as OrderInstruction,
  quantity: leg.quantity,
  instrument: {
    symbol: leg.instrument.symbol,
    assetType: leg.instrument.assetType as AssetType,
  },
});

const mapOrder = (schwabOrder: SchwabOrder): Order => {
  // Calculate total quantities from legs
  const totalQuantity = schwabOrder.orderLegCollection.reduce(
    (sum, leg) => sum + leg.quantity,
    0
  );
  const filledQuantity = schwabOrder.filledQuantity ?? 0;
  const remainingQuantity =
    schwabOrder.remainingQuantity ?? totalQuantity - filledQuantity;

  return {
    orderId: String(schwabOrder.orderId),
    accountNumber: String(schwabOrder.accountNumber),
    orderType: schwabOrder.orderType as Order["orderType"],
    session: schwabOrder.session as Order["session"],
    duration: schwabOrder.duration as Order["duration"],
    price: schwabOrder.price,
    stopPrice: schwabOrder.stopPrice,
    orderLegCollection: schwabOrder.orderLegCollection.map(mapOrderLeg),
    orderStrategyType: schwabOrder.orderStrategyType as Order["orderStrategyType"],
    status: schwabOrder.status as OrderStatus,
    filledQuantity,
    remainingQuantity,
    enteredTime: new Date(schwabOrder.enteredTime),
    closeTime: schwabOrder.closeTime
      ? new Date(schwabOrder.closeTime)
      : undefined,
    statusDescription: schwabOrder.statusDescription,
  };
};

const buildOrderBody = (order: OrderSpec): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    orderType: order.orderType,
    session: order.session,
    duration: order.duration,
    orderStrategyType: order.orderStrategyType,
    orderLegCollection: order.orderLegCollection.map((leg) => ({
      instruction: leg.instruction,
      quantity: leg.quantity,
      instrument: {
        symbol: leg.instrument.symbol,
        assetType: leg.instrument.assetType,
      },
    })),
  };

  if (order.price !== undefined) {
    body.price = order.price.toFixed(2);
  }

  if (order.stopPrice !== undefined) {
    body.stopPrice = order.stopPrice.toFixed(2);
  }

  return body;
};

/**
 * Create the Order service implementation
 */
const makeOrderService = Effect.gen(function* () {
  const httpClient = yield* HttpClient;

  const placeOrder = (accountHash: string, order: OrderSpec) =>
    Effect.gen(function* () {
      const body = buildOrderBody(order);

      const response = yield* httpClient.request<{ orderId?: string }>({
        method: "POST",
        path: `/trader/v1/accounts/${accountHash}/orders`,
        body,
      });

      if (!response.orderId) {
        return yield* Effect.fail(
          new OrderRejectedError({
            reason: "Order placed but no order ID returned",
            orderDetails: order,
            message: "Order placed but no order ID returned",
          })
        );
      }

      return response.orderId;
    });

  const getOrders = (accountHash: string, params?: OrderQueryParams) =>
    Effect.gen(function* () {
      const queryParams: Record<string, string | number | undefined> = {};

      if (params?.status && params.status !== "ALL") {
        queryParams.status = params.status;
      }
      if (params?.fromEnteredTime) {
        queryParams.fromEnteredTime = params.fromEnteredTime.toISOString();
      }
      if (params?.toEnteredTime) {
        queryParams.toEnteredTime = params.toEnteredTime.toISOString();
      }
      if (params?.maxResults) {
        queryParams.maxResults = params.maxResults;
      }

      const response = yield* httpClient.request<SchwabOrder[]>({
        method: "GET",
        path: `/trader/v1/accounts/${accountHash}/orders`,
        params: queryParams,
      });

      return response.map(mapOrder);
    });

  const getAllOrders = (params?: OrderQueryParams) =>
    Effect.gen(function* () {
      const queryParams: Record<string, string | number | undefined> = {};

      if (params?.status && params.status !== "ALL") {
        queryParams.status = params.status;
      }
      if (params?.fromEnteredTime) {
        queryParams.fromEnteredTime = params.fromEnteredTime.toISOString();
      }
      if (params?.toEnteredTime) {
        queryParams.toEnteredTime = params.toEnteredTime.toISOString();
      }
      if (params?.maxResults) {
        queryParams.maxResults = params.maxResults;
      }

      const response = yield* httpClient.request<SchwabOrder[]>({
        method: "GET",
        path: "/trader/v1/orders",
        params: queryParams,
      });

      return response.map(mapOrder);
    });

  const getOrder = (accountHash: string, orderId: string) =>
    Effect.gen(function* () {
      const response = yield* httpClient.request<SchwabOrder>({
        method: "GET",
        path: `/trader/v1/accounts/${accountHash}/orders/${orderId}`,
      });

      return mapOrder(response);
    });

  const cancelOrder = (accountHash: string, orderId: string) =>
    Effect.gen(function* () {
      yield* httpClient.request({
        method: "DELETE",
        path: `/trader/v1/accounts/${accountHash}/orders/${orderId}`,
      });
    });

  const replaceOrder = (
    accountHash: string,
    orderId: string,
    newOrder: OrderSpec
  ) =>
    Effect.gen(function* () {
      const body = buildOrderBody(newOrder);

      const response = yield* httpClient.request<{ orderId?: string }>({
        method: "PUT",
        path: `/trader/v1/accounts/${accountHash}/orders/${orderId}`,
        body,
      });

      if (!response.orderId) {
        return yield* Effect.fail(
          new OrderRejectedError({
            reason: "Order replaced but no order ID returned",
            orderDetails: newOrder,
            message: "Order replaced but no order ID returned",
          })
        );
      }

      return response.orderId;
    });

  const previewOrder = (accountHash: string, order: OrderSpec) =>
    Effect.gen(function* () {
      const body = buildOrderBody(order);

      const response = yield* httpClient.request<SchwabOrder>({
        method: "POST",
        path: `/trader/v1/accounts/${accountHash}/previewOrder`,
        body,
      });

      return mapOrder(response);
    });

  return {
    placeOrder,
    getOrders,
    getAllOrders,
    getOrder,
    cancelOrder,
    replaceOrder,
    previewOrder,
  };
});

/**
 * Live Order service layer
 */
export const OrderServiceLive = Layer.effect(OrderService, makeOrderService);
