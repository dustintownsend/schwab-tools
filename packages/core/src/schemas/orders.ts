import { Schema } from "effect";
import {
  AssetType,
  OrderDuration,
  OrderInstruction,
  OrderSession,
  OrderStatus,
  OrderStrategyType,
  OrderType,
} from "./primitives.js";

// Order Leg
export const OrderLeg = Schema.Struct({
  instruction: OrderInstruction,
  quantity: Schema.Number,
  instrument: Schema.Struct({
    symbol: Schema.String,
    assetType: AssetType,
  }),
});
export type OrderLeg = typeof OrderLeg.Type;

// Order Spec (for placing orders)
export const OrderSpec = Schema.Struct({
  orderType: OrderType,
  session: OrderSession,
  duration: OrderDuration,
  price: Schema.optional(Schema.Number),
  stopPrice: Schema.optional(Schema.Number),
  orderLegCollection: Schema.Array(OrderLeg),
  orderStrategyType: OrderStrategyType,
});
export type OrderSpec = typeof OrderSpec.Type;

// Order (full order with status)
export const Order = Schema.Struct({
  orderId: Schema.String,
  accountNumber: Schema.String,
  orderType: OrderType,
  session: OrderSession,
  duration: OrderDuration,
  price: Schema.optional(Schema.Number),
  stopPrice: Schema.optional(Schema.Number),
  orderLegCollection: Schema.Array(OrderLeg),
  orderStrategyType: OrderStrategyType,
  status: OrderStatus,
  filledQuantity: Schema.Number,
  remainingQuantity: Schema.Number,
  enteredTime: Schema.Date,
  closeTime: Schema.optional(Schema.Date),
  statusDescription: Schema.optional(Schema.String),
});
export type Order = typeof Order.Type;

// Order Query Params
export const OrderQueryParams = Schema.Struct({
  status: Schema.optional(Schema.Union(OrderStatus, Schema.Literal("ALL"))),
  fromEnteredTime: Schema.optional(Schema.Date),
  toEnteredTime: Schema.optional(Schema.Date),
  maxResults: Schema.optional(Schema.Number),
});
export type OrderQueryParams = typeof OrderQueryParams.Type;

// Leg Spec (for order builder)
export const LegSpec = Schema.Struct({
  symbol: Schema.String,
  instruction: OrderInstruction,
});
export type LegSpec = typeof LegSpec.Type;

// Schwab API Response Types (for internal parsing)
export const SchwabOrderLeg = Schema.Struct({
  orderLegType: Schema.String,
  legId: Schema.Number,
  instrument: Schema.Struct({
    assetType: Schema.String,
    cusip: Schema.optional(Schema.String),
    symbol: Schema.String,
    description: Schema.optional(Schema.String),
    putCall: Schema.optional(Schema.String),
    underlyingSymbol: Schema.optional(Schema.String),
  }),
  instruction: Schema.String,
  positionEffect: Schema.optional(Schema.String),
  quantity: Schema.Number,
});

export const SchwabOrder = Schema.Struct({
  session: Schema.String,
  duration: Schema.String,
  orderType: Schema.String,
  complexOrderStrategyType: Schema.optional(Schema.String),
  quantity: Schema.optional(Schema.Number),
  filledQuantity: Schema.optional(Schema.Number),
  remainingQuantity: Schema.optional(Schema.Number),
  requestedDestination: Schema.optional(Schema.String),
  destinationLinkName: Schema.optional(Schema.String),
  price: Schema.optional(Schema.Number),
  stopPrice: Schema.optional(Schema.Number),
  stopPriceLinkBasis: Schema.optional(Schema.String),
  stopPriceLinkType: Schema.optional(Schema.String),
  stopPriceOffset: Schema.optional(Schema.Number),
  stopType: Schema.optional(Schema.String),
  priceLinkBasis: Schema.optional(Schema.String),
  priceLinkType: Schema.optional(Schema.String),
  orderLegCollection: Schema.Array(SchwabOrderLeg),
  orderStrategyType: Schema.String,
  orderId: Schema.Number,
  cancelable: Schema.Boolean,
  editable: Schema.Boolean,
  status: Schema.String,
  enteredTime: Schema.String,
  closeTime: Schema.optional(Schema.String),
  tag: Schema.optional(Schema.String),
  accountNumber: Schema.Number,
  statusDescription: Schema.optional(Schema.String),
});
