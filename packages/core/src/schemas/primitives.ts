import { Schema } from "effect";

// Asset Types
export const AssetType = Schema.Literal(
  "EQUITY",
  "OPTION",
  "MUTUAL_FUND",
  "CASH_EQUIVALENT",
  "FIXED_INCOME",
  "FUTURE",
  "FOREX",
  "INDEX",
  "PRODUCT",
  "CURRENCY",
  "COLLECTIVE_INVESTMENT",
  "UNKNOWN"
);
export type AssetType = typeof AssetType.Type;

// Account Types
export const AccountType = Schema.Literal("MARGIN", "CASH", "IRA");
export type AccountType = typeof AccountType.Type;

// Order Types
export const OrderType = Schema.Literal(
  "MARKET",
  "LIMIT",
  "STOP",
  "STOP_LIMIT",
  "TRAILING_STOP",
  "CABINET",
  "NON_MARKETABLE",
  "MARKET_ON_CLOSE",
  "EXERCISE",
  "TRAILING_STOP_LIMIT",
  "NET_DEBIT",
  "NET_CREDIT",
  "NET_ZERO",
  "LIMIT_ON_CLOSE",
  "UNKNOWN"
);
export type OrderType = typeof OrderType.Type;

// Order Session
export const OrderSession = Schema.Literal("NORMAL", "AM", "PM", "SEAMLESS");
export type OrderSession = typeof OrderSession.Type;

// Order Duration
export const OrderDuration = Schema.Literal(
  "DAY",
  "GOOD_TILL_CANCEL",
  "FILL_OR_KILL",
  "IMMEDIATE_OR_CANCEL",
  "END_OF_WEEK",
  "END_OF_MONTH",
  "NEXT_END_OF_MONTH",
  // Legacy aliases accepted for backwards compatibility
  "GTC",
  "FOK",
  "IOC",
  // Response-only value
  "UNKNOWN"
);
export type OrderDuration = typeof OrderDuration.Type;

// Order Strategy Type
export const OrderStrategyType = Schema.Literal(
  "SINGLE",
  "CANCEL",
  "RECALL",
  "PAIR",
  "FLATTEN",
  "TWO_DAY_SWAP",
  "BLAST_ALL",
  "OCO",
  "TRIGGER"
);
export type OrderStrategyType = typeof OrderStrategyType.Type;

// Order Status
export const OrderStatus = Schema.Literal(
  "AWAITING_PARENT_ORDER",
  "AWAITING_CONDITION",
  "AWAITING_STOP_CONDITION",
  "AWAITING_MANUAL_REVIEW",
  "ACCEPTED",
  "AWAITING_UR_OUT",
  "PENDING_ACTIVATION",
  "QUEUED",
  "WORKING",
  "REJECTED",
  "PENDING_CANCEL",
  "CANCELED",
  "PENDING_REPLACE",
  "REPLACED",
  "FILLED",
  "EXPIRED",
  "NEW",
  "AWAITING_RELEASE_TIME",
  "PENDING_ACKNOWLEDGEMENT",
  "PENDING_RECALL",
  "UNKNOWN"
);
export type OrderStatus = typeof OrderStatus.Type;

// Order Instruction
export const OrderInstruction = Schema.Literal(
  "BUY",
  "SELL",
  "BUY_TO_COVER",
  "SELL_SHORT",
  "BUY_TO_OPEN",
  "BUY_TO_CLOSE",
  "SELL_TO_OPEN",
  "SELL_TO_CLOSE",
  "EXCHANGE",
  "SELL_SHORT_EXEMPT"
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
  "RECEIVE_AND_DELIVER",
  "DIVIDEND_OR_INTEREST",
  "ACH_RECEIPT",
  "ACH_DISBURSEMENT",
  "CASH_RECEIPT",
  "CASH_DISBURSEMENT",
  "ELECTRONIC_FUND",
  "WIRE_IN",
  "WIRE_OUT",
  "JOURNAL",
  "MEMORANDUM",
  "MARGIN_CALL",
  "MONEY_MARKET",
  "SMA_ADJUSTMENT"
);
export type TransactionType = typeof TransactionType.Type;

// Price History Period
export const PriceHistoryPeriod = Schema.Literal(
  "1d",
  "2d",
  "3d",
  "4d",
  "5d",
  "10d",
  "1mo",
  "2mo",
  "3mo",
  "6mo",
  "1y",
  "2y",
  "3y",
  "5y",
  "10y",
  "15y",
  "20y",
  "ytd"
);
export type PriceHistoryPeriod = typeof PriceHistoryPeriod.Type;

// Price History Frequency
export const PriceHistoryFrequency = Schema.Literal(
  "1min",
  "5min",
  "10min",
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
