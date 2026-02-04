import { Schema } from "effect";
import { ContractType, PutCall, StrikeRange } from "./primitives.js";

// Option Contract
export const OptionContract = Schema.Struct({
  symbol: Schema.String,
  description: Schema.String,
  bid: Schema.Number,
  ask: Schema.Number,
  last: Schema.Number,
  mark: Schema.Number,
  volume: Schema.Number,
  openInterest: Schema.Number,
  strikePrice: Schema.Number,
  expirationDate: Schema.String,
  daysToExpiration: Schema.Number,
  putCall: PutCall,
  inTheMoney: Schema.Boolean,
  multiplier: Schema.Number,
  delta: Schema.optional(Schema.Number),
  gamma: Schema.optional(Schema.Number),
  theta: Schema.optional(Schema.Number),
  vega: Schema.optional(Schema.Number),
  rho: Schema.optional(Schema.Number),
  impliedVolatility: Schema.optional(Schema.Number),
  theoreticalValue: Schema.optional(Schema.Number),
  timeValue: Schema.optional(Schema.Number),
  intrinsicValue: Schema.optional(Schema.Number),
});
export type OptionContract = typeof OptionContract.Type;

// Option Chain
export const OptionChain = Schema.Struct({
  symbol: Schema.String,
  underlyingPrice: Schema.Number,
  volatility: Schema.Number,
  numberOfContracts: Schema.Number,
  callExpDateMap: Schema.Record({
    key: Schema.String,
    value: Schema.Record({
      key: Schema.String,
      value: Schema.Array(OptionContract),
    }),
  }),
  putExpDateMap: Schema.Record({
    key: Schema.String,
    value: Schema.Record({
      key: Schema.String,
      value: Schema.Array(OptionContract),
    }),
  }),
});
export type OptionChain = typeof OptionChain.Type;

// Compact Option (token-efficient for AI)
export const CompactOption = Schema.Struct({
  symbol: Schema.String,
  strike: Schema.Number,
  bid: Schema.Number,
  ask: Schema.Number,
  mid: Schema.Number,
  volume: Schema.Number,
  openInterest: Schema.Number,
  itm: Schema.Boolean,
  delta: Schema.optional(Schema.Number),
  iv: Schema.optional(Schema.Number),
});
export type CompactOption = typeof CompactOption.Type;

// Compact Expiration
export const CompactExpiration = Schema.Struct({
  date: Schema.String,
  daysToExpiration: Schema.Number,
  calls: Schema.Array(CompactOption),
  puts: Schema.Array(CompactOption),
});
export type CompactExpiration = typeof CompactExpiration.Type;

// Compact Option Chain
export const CompactOptionChain = Schema.Struct({
  symbol: Schema.String,
  underlyingPrice: Schema.Number,
  expirations: Schema.Array(CompactExpiration),
});
export type CompactOptionChain = typeof CompactOptionChain.Type;

// Option Chain Params
export const OptionChainParams = Schema.Struct({
  contractType: Schema.optional(ContractType),
  strikeCount: Schema.optional(Schema.Number),
  includeUnderlyingQuote: Schema.optional(Schema.Boolean),
  fromDate: Schema.optional(Schema.Date),
  toDate: Schema.optional(Schema.Date),
  strikeRange: Schema.optional(StrikeRange),
  expMonth: Schema.optional(Schema.String),
});
export type OptionChainParams = typeof OptionChainParams.Type;

// Option Symbol Params
export const OptionSymbolParams = Schema.Struct({
  underlying: Schema.String,
  expiration: Schema.Date,
  putCall: Schema.Literal("P", "C"),
  strike: Schema.Number,
});
export type OptionSymbolParams = typeof OptionSymbolParams.Type;

// Schwab API Response Types (for internal parsing)
export const SchwabOptionContract = Schema.Struct({
  putCall: Schema.String,
  symbol: Schema.String,
  description: Schema.String,
  exchangeName: Schema.String,
  bid: Schema.Number,
  ask: Schema.Number,
  last: Schema.Number,
  mark: Schema.Number,
  bidSize: Schema.Number,
  askSize: Schema.Number,
  bidAskSize: Schema.String,
  lastSize: Schema.Number,
  highPrice: Schema.Number,
  lowPrice: Schema.Number,
  openPrice: Schema.Number,
  closePrice: Schema.Number,
  totalVolume: Schema.Number,
  tradeDate: Schema.optional(Schema.Number),
  tradeTimeInLong: Schema.Number,
  quoteTimeInLong: Schema.Number,
  netChange: Schema.Number,
  volatility: Schema.Number,
  delta: Schema.Number,
  gamma: Schema.Number,
  theta: Schema.Number,
  vega: Schema.Number,
  rho: Schema.Number,
  openInterest: Schema.Number,
  timeValue: Schema.Number,
  theoreticalOptionValue: Schema.Number,
  theoreticalVolatility: Schema.Number,
  optionDeliverablesList: Schema.optional(Schema.Array(Schema.Unknown)),
  strikePrice: Schema.Number,
  expirationDate: Schema.String,
  daysToExpiration: Schema.Number,
  expirationType: Schema.String,
  lastTradingDay: Schema.Number,
  multiplier: Schema.Number,
  settlementType: Schema.String,
  deliverableNote: Schema.String,
  percentChange: Schema.Number,
  markChange: Schema.Number,
  markPercentChange: Schema.Number,
  intrinsicValue: Schema.Number,
  pennyPilot: Schema.Boolean,
  inTheMoney: Schema.Boolean,
  mini: Schema.Boolean,
  nonStandard: Schema.Boolean,
});

export const SchwabUnderlying = Schema.Struct({
  symbol: Schema.String,
  description: Schema.String,
  change: Schema.Number,
  percentChange: Schema.Number,
  close: Schema.Number,
  quoteTime: Schema.Number,
  tradeTime: Schema.Number,
  bid: Schema.Number,
  ask: Schema.Number,
  last: Schema.Number,
  mark: Schema.Number,
  markChange: Schema.Number,
  markPercentChange: Schema.Number,
  bidSize: Schema.Number,
  askSize: Schema.Number,
  highPrice: Schema.Number,
  lowPrice: Schema.Number,
  openPrice: Schema.Number,
  totalVolume: Schema.Number,
  exchangeName: Schema.String,
  fiftyTwoWeekHigh: Schema.Number,
  fiftyTwoWeekLow: Schema.Number,
  delayed: Schema.Boolean,
});

export const SchwabOptionChainResponse = Schema.Struct({
  symbol: Schema.String,
  status: Schema.String,
  underlying: Schema.optional(Schema.NullOr(SchwabUnderlying)),
  strategy: Schema.String,
  interval: Schema.Number,
  isDelayed: Schema.Boolean,
  isIndex: Schema.Boolean,
  interestRate: Schema.Number,
  underlyingPrice: Schema.Number,
  volatility: Schema.Number,
  daysToExpiration: Schema.Number,
  numberOfContracts: Schema.Number,
  callExpDateMap: Schema.Record({
    key: Schema.String,
    value: Schema.Record({
      key: Schema.String,
      value: Schema.Array(SchwabOptionContract),
    }),
  }),
  putExpDateMap: Schema.Record({
    key: Schema.String,
    value: Schema.Record({
      key: Schema.String,
      value: Schema.Array(SchwabOptionContract),
    }),
  }),
});
