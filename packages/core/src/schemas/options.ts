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

// Expiration chain entry
export const Expiration = Schema.Struct({
  expirationDate: Schema.String,
  daysToExpiration: Schema.Number,
  expirationType: Schema.String,
  standard: Schema.Boolean,
  settlementType: Schema.optional(Schema.String),
  optionRoots: Schema.optional(Schema.String),
});
export type Expiration = typeof Expiration.Type;

// Expiration chain response
export const ExpirationChain = Schema.Struct({
  status: Schema.optional(Schema.String),
  expirationList: Schema.Array(Expiration),
});
export type ExpirationChain = typeof ExpirationChain.Type;

// Option Chain Params
export const OptionChainParams = Schema.Struct({
  contractType: Schema.optional(ContractType),
  strikeCount: Schema.optional(Schema.Number),
  includeUnderlyingQuote: Schema.optional(Schema.Boolean),
  strategy: Schema.optional(
    Schema.Literal(
      "SINGLE",
      "ANALYTICAL",
      "COVERED",
      "VERTICAL",
      "CALENDAR",
      "STRANGLE",
      "STRADDLE",
      "BUTTERFLY",
      "CONDOR",
      "DIAGONAL",
      "COLLAR",
      "ROLL"
    )
  ),
  interval: Schema.optional(Schema.Number),
  strike: Schema.optional(Schema.Number),
  fromDate: Schema.optional(Schema.Date),
  toDate: Schema.optional(Schema.Date),
  strikeRange: Schema.optional(StrikeRange),
  expMonth: Schema.optional(Schema.String),
  volatility: Schema.optional(Schema.Number),
  underlyingPrice: Schema.optional(Schema.Number),
  interestRate: Schema.optional(Schema.Number),
  daysToExpiration: Schema.optional(Schema.Number),
  optionType: Schema.optional(Schema.String),
  entitlement: Schema.optional(
    Schema.Literal("PN", "NP", "PP")
  ),
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
  exchangeName: Schema.optional(Schema.String),
  bid: Schema.optional(Schema.Number),
  bidPrice: Schema.optional(Schema.Number),
  ask: Schema.optional(Schema.Number),
  askPrice: Schema.optional(Schema.Number),
  last: Schema.optional(Schema.Number),
  lastPrice: Schema.optional(Schema.Number),
  mark: Schema.optional(Schema.Number),
  markPrice: Schema.optional(Schema.Number),
  bidSize: Schema.optional(Schema.Number),
  askSize: Schema.optional(Schema.Number),
  bidAskSize: Schema.optional(Schema.String),
  lastSize: Schema.optional(Schema.Number),
  highPrice: Schema.optional(Schema.Number),
  lowPrice: Schema.optional(Schema.Number),
  openPrice: Schema.optional(Schema.Number),
  closePrice: Schema.optional(Schema.Number),
  totalVolume: Schema.optional(Schema.Number),
  tradeDate: Schema.optional(Schema.NullOr(Schema.Number)),
  tradeTimeInLong: Schema.optional(Schema.Number),
  quoteTimeInLong: Schema.optional(Schema.Number),
  netChange: Schema.optional(Schema.Number),
  volatility: Schema.optional(Schema.Number),
  delta: Schema.optional(Schema.Number),
  gamma: Schema.optional(Schema.Number),
  theta: Schema.optional(Schema.Number),
  vega: Schema.optional(Schema.Number),
  rho: Schema.optional(Schema.Number),
  openInterest: Schema.optional(Schema.Number),
  timeValue: Schema.optional(Schema.Number),
  theoreticalOptionValue: Schema.optional(Schema.Number),
  theoreticalVolatility: Schema.optional(Schema.Number),
  optionDeliverablesList: Schema.optional(Schema.Array(Schema.Unknown)),
  strikePrice: Schema.Number,
  expirationDate: Schema.String,
  daysToExpiration: Schema.optional(Schema.Number),
  expirationType: Schema.optional(Schema.String),
  lastTradingDay: Schema.optional(Schema.Number),
  multiplier: Schema.optional(Schema.Number),
  settlementType: Schema.optional(Schema.String),
  deliverableNote: Schema.optional(Schema.String),
  percentChange: Schema.optional(Schema.Number),
  markChange: Schema.optional(Schema.Number),
  markPercentChange: Schema.optional(Schema.Number),
  intrinsicValue: Schema.optional(Schema.Number),
  pennyPilot: Schema.optional(Schema.Boolean),
  isPennyPilot: Schema.optional(Schema.Boolean),
  inTheMoney: Schema.optional(Schema.Boolean),
  isInTheMoney: Schema.optional(Schema.Boolean),
  mini: Schema.optional(Schema.Boolean),
  isMini: Schema.optional(Schema.Boolean),
  nonStandard: Schema.optional(Schema.Boolean),
  isNonStandard: Schema.optional(Schema.Boolean),
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
  status: Schema.optional(Schema.String),
  underlying: Schema.optional(Schema.NullOr(SchwabUnderlying)),
  strategy: Schema.optional(Schema.String),
  interval: Schema.optional(Schema.Number),
  isDelayed: Schema.optional(Schema.Boolean),
  isIndex: Schema.optional(Schema.Boolean),
  interestRate: Schema.optional(Schema.Number),
  underlyingPrice: Schema.Number,
  volatility: Schema.optional(Schema.Number),
  daysToExpiration: Schema.optional(Schema.Number),
  numberOfContracts: Schema.optional(Schema.Number),
  callExpDateMap: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Record({
      key: Schema.String,
      value: Schema.Array(SchwabOptionContract),
    }),
  })),
  putExpDateMap: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Record({
      key: Schema.String,
      value: Schema.Array(SchwabOptionContract),
    }),
  })),
});

export const SchwabExpiration = Schema.Struct({
  expirationDate: Schema.optional(Schema.String),
  expiration: Schema.optional(Schema.String),
  daysToExpiration: Schema.Number,
  expirationType: Schema.String,
  standard: Schema.Boolean,
  settlementType: Schema.optional(Schema.String),
  optionRoots: Schema.optional(Schema.String),
});

export const SchwabExpirationChainResponse = Schema.Struct({
  status: Schema.optional(Schema.String),
  expirationList: Schema.Array(SchwabExpiration),
});
