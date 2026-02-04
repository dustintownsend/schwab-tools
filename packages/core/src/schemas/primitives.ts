import { Schema } from "effect";

// Asset Types
export const AssetType = Schema.Literal(
  "EQUITY",
  "OPTION",
  "MUTUAL_FUND",
  "CASH_EQUIVALENT",
  "FIXED_INCOME"
);
export type AssetType = typeof AssetType.Type;

// Account Types
export const AccountType = Schema.Literal("MARGIN", "CASH", "IRA");
export type AccountType = typeof AccountType.Type;

// Order Types
export const OrderType = Schema.Literal("MARKET", "LIMIT", "STOP", "STOP_LIMIT");
export type OrderType = typeof OrderType.Type;

// Order Session
export const OrderSession = Schema.Literal("NORMAL", "AM", "PM", "SEAMLESS");
export type OrderSession = typeof OrderSession.Type;

// Order Duration
export const OrderDuration = Schema.Literal("DAY", "GTC", "FOK");
export type OrderDuration = typeof OrderDuration.Type;

// Order Strategy Type
export const OrderStrategyType = Schema.Literal("SINGLE", "OCO", "TRIGGER");
export type OrderStrategyType = typeof OrderStrategyType.Type;

// Order Status
export const OrderStatus = Schema.Literal(
  "ACCEPTED",
  "WORKING",
  "FILLED",
  "CANCELED",
  "REJECTED",
  "EXPIRED",
  "PENDING_ACTIVATION",
  "QUEUED",
  "AWAITING_PARENT_ORDER",
  "AWAITING_CONDITION",
  "PENDING_REPLACE",
  "PENDING_CANCEL"
);
export type OrderStatus = typeof OrderStatus.Type;

// Order Instruction
export const OrderInstruction = Schema.Literal(
  "BUY",
  "SELL",
  "BUY_TO_OPEN",
  "BUY_TO_CLOSE",
  "SELL_TO_OPEN",
  "SELL_TO_CLOSE"
);
export type OrderInstruction = typeof OrderInstruction.Type;

// Put/Call
export const PutCall = Schema.Literal("PUT", "CALL");
export type PutCall = typeof PutCall.Type;

// Put/Call Option Symbol
export const PutCallSymbol = Schema.Literal("P", "C");
export type PutCallSymbol = typeof PutCallSymbol.Type;

// Contract Type for option chains
export const ContractType = Schema.Literal("CALL", "PUT", "ALL");
export type ContractType = typeof ContractType.Type;

// Strike Range for option chains
export const StrikeRange = Schema.Literal("ITM", "NTM", "OTM", "ALL");
export type StrikeRange = typeof StrikeRange.Type;

// Market Type
export const MarketType = Schema.Literal(
  "EQUITY",
  "OPTION",
  "BOND",
  "FUTURE",
  "FOREX"
);
export type MarketType = typeof MarketType.Type;

// Transaction Type
export const TransactionType = Schema.Literal(
  "TRADE",
  "DIVIDEND_OR_INTEREST",
  "ACH_RECEIPT",
  "ACH_DISBURSEMENT",
  "WIRE_IN",
  "WIRE_OUT"
);
export type TransactionType = typeof TransactionType.Type;

// Price History Period
export const PriceHistoryPeriod = Schema.Literal(
  "1d",
  "5d",
  "1mo",
  "3mo",
  "6mo",
  "1y",
  "5y",
  "10y",
  "20y"
);
export type PriceHistoryPeriod = typeof PriceHistoryPeriod.Type;

// Price History Frequency
export const PriceHistoryFrequency = Schema.Literal(
  "1min",
  "5min",
  "15min",
  "30min",
  "1d",
  "1w",
  "1mo"
);
export type PriceHistoryFrequency = typeof PriceHistoryFrequency.Type;

// HTTP Methods
export const HttpMethod = Schema.Literal(
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH"
);
export type HttpMethod = typeof HttpMethod.Type;
