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

interface SchwabPreviewOrderLeg {
  quantity: number;
  finalSymbol?: string;
  assetType?: string;
  instruction?: string;
}

interface SchwabPreviewOrderStrategy {
  accountNumber?: string;
  enteredTime?: string;
  closeTime?: string;
  orderStrategyType?: string;
  session?: string;
  duration?: string;
  orderType?: string;
  status?: string;
  price?: number;
  filledQuantity?: number;
  remainingQuantity?: number;
  orderLegs?: SchwabPreviewOrderLeg[];
}

interface SchwabPreviewOrderResponse {
  orderId?: number;
  orderStrategy?: SchwabPreviewOrderStrategy;
}

const ORDER_LOOKBACK_DAYS = 30;
const ACCOUNT_ORDER_MAX_RANGE_DAYS = 365;
const ALL_ORDER_MAX_RANGE_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

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

const toApiDuration = (duration: OrderSpec["duration"]): string => {
  switch (duration) {
    case "GTC":
      return "GOOD_TILL_CANCEL";
    case "FOK":
      return "FILL_OR_KILL";
    case "IOC":
      return "IMMEDIATE_OR_CANCEL";
    default:
      return duration;
  }
};

const mapPreviewOrder = (
  response: SchwabPreviewOrderResponse,
  fallbackOrder: OrderSpec
): Order => {
  const strategy = response.orderStrategy;
  const legs = strategy?.orderLegs ?? [];
  const orderLegCollection =
    legs.length > 0
      ? legs.map<OrderLeg>((leg) => ({
          instruction:
            (leg.instruction as OrderInstruction | undefined) ??
            fallbackOrder.orderLegCollection[0]?.instruction ??
            "BUY",
          quantity: leg.quantity,
          instrument: {
            symbol:
              leg.finalSymbol ?? fallbackOrder.orderLegCollection[0]?.instrument.symbol ?? "",
            assetType:
              (leg.assetType as AssetType | undefined) ??
              fallbackOrder.orderLegCollection[0]?.instrument.assetType ??
              "UNKNOWN",
          },
        }))
      : fallbackOrder.orderLegCollection;
  const totalQuantity = orderLegCollection.reduce((sum, leg) => sum + leg.quantity, 0);

  return {
    orderId: String(response.orderId ?? 0),
    accountNumber: String(strategy?.accountNumber ?? ""),
    orderType: (strategy?.orderType as Order["orderType"]) ?? fallbackOrder.orderType,
    session: (strategy?.session as Order["session"]) ?? fallbackOrder.session,
    duration: (strategy?.duration as Order["duration"]) ?? fallbackOrder.duration,
    price: strategy?.price ?? fallbackOrder.price,
    stopPrice: fallbackOrder.stopPrice,
    orderLegCollection,
    orderStrategyType:
      (strategy?.orderStrategyType as Order["orderStrategyType"]) ??
      fallbackOrder.orderStrategyType,
    status: (strategy?.status as OrderStatus) ?? "ACCEPTED",
    filledQuantity: strategy?.filledQuantity ?? 0,
    remainingQuantity: strategy?.remainingQuantity ?? totalQuantity,
    enteredTime: new Date(strategy?.enteredTime ?? new Date().toISOString()),
    closeTime: strategy?.closeTime ? new Date(strategy.closeTime) : undefined,
    statusDescription: undefined,
  };
};

const resolveOrderWindow = (
  params: OrderQueryParams | undefined,
  maxRangeDays: number
): {
  fromEnteredTime: string;
  toEnteredTime: string;
} => {
  const now = new Date();
  const toRaw = params?.toEnteredTime ?? now;
  const to = toRaw.getTime() > now.getTime() ? now : toRaw;
  const defaultFrom = new Date(to.getTime() - ORDER_LOOKBACK_DAYS * DAY_MS);
  const fromRaw = params?.fromEnteredTime ?? defaultFrom;
  const minFrom = new Date(to.getTime() - maxRangeDays * DAY_MS);
  const from = fromRaw.getTime() < minFrom.getTime() ? minFrom : fromRaw;

  return {
    fromEnteredTime: from.toISOString(),
    toEnteredTime: to.toISOString(),
  };
};

const buildOrderBody = (order: OrderSpec): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    orderType: order.orderType,
    session: order.session,
    duration: toApiDuration(order.duration),
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
    body.price = order.price;
  }

  if (order.stopPrice !== undefined) {
    body.stopPrice = order.stopPrice;
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
      const encodedAccountHash = encodeURIComponent(accountHash);
      const body = buildOrderBody(order);

      const response = yield* httpClient.request<{ orderId?: string }>({
        method: "POST",
        path: `/trader/v1/accounts/${encodedAccountHash}/orders`,
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
      const encodedAccountHash = encodeURIComponent(accountHash);
      const queryParams: Record<string, string | number | undefined> = {
        ...resolveOrderWindow(params, ACCOUNT_ORDER_MAX_RANGE_DAYS),
      };

      if (params?.status && params.status !== "ALL") {
        queryParams.status = params.status;
      }
      if (params?.maxResults) {
        queryParams.maxResults = params.maxResults;
      }

      const response = yield* httpClient.request<SchwabOrder[]>({
        method: "GET",
        path: `/trader/v1/accounts/${encodedAccountHash}/orders`,
        params: queryParams,
      });

      return response.map(mapOrder);
    });

  const getAllOrders = (params?: OrderQueryParams) =>
    Effect.gen(function* () {
      const queryParams: Record<string, string | number | undefined> = {
        ...resolveOrderWindow(params, ALL_ORDER_MAX_RANGE_DAYS),
      };

      if (params?.status && params.status !== "ALL") {
        queryParams.status = params.status;
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
      const encodedAccountHash = encodeURIComponent(accountHash);
      const encodedOrderId = encodeURIComponent(orderId);
      const response = yield* httpClient.request<SchwabOrder>({
        method: "GET",
        path: `/trader/v1/accounts/${encodedAccountHash}/orders/${encodedOrderId}`,
      });

      return mapOrder(response);
    });

  const cancelOrder = (accountHash: string, orderId: string) =>
    Effect.gen(function* () {
      const encodedAccountHash = encodeURIComponent(accountHash);
      const encodedOrderId = encodeURIComponent(orderId);
      yield* httpClient.request({
        method: "DELETE",
        path: `/trader/v1/accounts/${encodedAccountHash}/orders/${encodedOrderId}`,
      });
    });

  const replaceOrder = (
    accountHash: string,
    orderId: string,
    newOrder: OrderSpec
  ) =>
    Effect.gen(function* () {
      const encodedAccountHash = encodeURIComponent(accountHash);
      const encodedOrderId = encodeURIComponent(orderId);
      const body = buildOrderBody(newOrder);

      const response = yield* httpClient.request<{ orderId?: string }>({
        method: "PUT",
        path: `/trader/v1/accounts/${encodedAccountHash}/orders/${encodedOrderId}`,
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
      const encodedAccountHash = encodeURIComponent(accountHash);
      const body = buildOrderBody(order);

      const response = yield* httpClient.request<unknown>({
        method: "POST",
        path: `/trader/v1/accounts/${encodedAccountHash}/previewOrder`,
        body,
      });

      if (
        response &&
        typeof response === "object" &&
        "orderLegCollection" in response
      ) {
        return mapOrder(response as SchwabOrder);
      }

      return mapPreviewOrder(response as SchwabPreviewOrderResponse, order);
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
