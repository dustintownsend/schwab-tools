import { Schema } from "effect";
import { MarketType, PriceHistoryFrequency, PriceHistoryPeriod } from "./primitives.js";

// Quote
export const Quote = Schema.Struct({
  symbol: Schema.String,
  bidPrice: Schema.Number,
  askPrice: Schema.Number,
  lastPrice: Schema.Number,
  totalVolume: Schema.Number,
  netChange: Schema.Number,
  netChangePercent: Schema.Number,
  mark: Schema.Number,
  openPrice: Schema.Number,
  highPrice: Schema.Number,
  lowPrice: Schema.Number,
  closePrice: Schema.Number,
  quoteTime: Schema.Date,
  tradeTime: Schema.Date,
  exchange: Schema.String,
  description: Schema.String,
});
export type Quote = typeof Quote.Type;

export const QuoteField = Schema.Literal(
  "all",
  "quote",
  "fundamental",
  "extended",
  "reference",
  "regular"
);
export type QuoteField = typeof QuoteField.Type;

export const QuoteRequestParams = Schema.Struct({
  symbols: Schema.optional(Schema.Array(Schema.String)),
  cusips: Schema.optional(Schema.Array(Schema.String)),
  ssids: Schema.optional(Schema.Array(Schema.String)),
  fields: Schema.optional(Schema.Array(QuoteField)),
  indicative: Schema.optional(Schema.Boolean),
  realtime: Schema.optional(Schema.Boolean),
});
export type QuoteRequestParams = typeof QuoteRequestParams.Type;

// Candle
export const Candle = Schema.Struct({
  open: Schema.Number,
  high: Schema.Number,
  low: Schema.Number,
  close: Schema.Number,
  volume: Schema.Number,
  datetime: Schema.Date,
});
export type Candle = typeof Candle.Type;

// Price History Params
export const PriceHistoryParams = Schema.Struct({
  period: Schema.optional(PriceHistoryPeriod),
  frequency: Schema.optional(PriceHistoryFrequency),
  startDate: Schema.optional(Schema.Date),
  endDate: Schema.optional(Schema.Date),
  needExtendedHoursData: Schema.optional(Schema.Boolean),
  needPreviousClose: Schema.optional(Schema.Boolean),
});
export type PriceHistoryParams = typeof PriceHistoryParams.Type;

// Session Hours
export const SessionHoursEntry = Schema.Struct({
  start: Schema.String,
  end: Schema.String,
});

export const SessionHours = Schema.Struct({
  preMarket: Schema.optional(Schema.Array(SessionHoursEntry)),
  regularMarket: Schema.optional(Schema.Array(SessionHoursEntry)),
  postMarket: Schema.optional(Schema.Array(SessionHoursEntry)),
});
export type SessionHours = typeof SessionHours.Type;

export const SessionHoursByType = Schema.Record({
  key: Schema.String,
  value: Schema.Array(SessionHoursEntry),
});
export type SessionHoursByType = typeof SessionHoursByType.Type;

// Market Hours
export const MarketHours = Schema.Struct({
  market: MarketType,
  marketType: Schema.String,
  isOpen: Schema.Boolean,
  date: Schema.String,
  sessionHours: Schema.optional(SessionHoursByType),
});
export type MarketHours = typeof MarketHours.Type;

// Schwab API Response Types (for internal parsing)
export const SchwabQuoteData = Schema.Struct({
  "52WeekHigh": Schema.optional(Schema.Number),
  "52WeekLow": Schema.optional(Schema.Number),
  askMICId: Schema.optional(Schema.String),
  askPrice: Schema.optional(Schema.Number),
  askSize: Schema.optional(Schema.Number),
  askTime: Schema.optional(Schema.Number),
  bidMICId: Schema.optional(Schema.String),
  bidPrice: Schema.optional(Schema.Number),
  bidSize: Schema.optional(Schema.Number),
  bidTime: Schema.optional(Schema.Number),
  closePrice: Schema.optional(Schema.Number),
  highPrice: Schema.optional(Schema.Number),
  lastMICId: Schema.optional(Schema.String),
  lastPrice: Schema.optional(Schema.Number),
  lastSize: Schema.optional(Schema.Number),
  lowPrice: Schema.optional(Schema.Number),
  mark: Schema.optional(Schema.Number),
  markChange: Schema.optional(Schema.Number),
  markPercentChange: Schema.optional(Schema.Number),
  netChange: Schema.optional(Schema.Number),
  netPercentChange: Schema.optional(Schema.Number),
  openPrice: Schema.optional(Schema.Number),
  postMarketChange: Schema.optional(Schema.Number),
  postMarketPercentChange: Schema.optional(Schema.Number),
  quoteTime: Schema.optional(Schema.Number),
  securityStatus: Schema.optional(Schema.String),
  totalVolume: Schema.optional(Schema.Number),
  tradeTime: Schema.optional(Schema.Number),
});

export const SchwabReference = Schema.Struct({
  cusip: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  exchange: Schema.optional(Schema.String),
  exchangeName: Schema.optional(Schema.String),
});

export const SchwabQuote = Schema.Struct({
  assetMainType: Schema.String,
  assetSubType: Schema.optional(Schema.String),
  quoteType: Schema.optional(Schema.String),
  realtime: Schema.Boolean,
  ssid: Schema.Number,
  symbol: Schema.String,
  quote: SchwabQuoteData,
  reference: SchwabReference,
  regular: Schema.optional(
    Schema.Struct({
      regularMarketLastPrice: Schema.optional(Schema.Number),
      regularMarketLastSize: Schema.optional(Schema.Number),
      regularMarketNetChange: Schema.optional(Schema.Number),
      regularMarketPercentChange: Schema.optional(Schema.Number),
      regularMarketTradeTime: Schema.optional(Schema.Number),
    })
  ),
});

export const SchwabQuoteResponse = Schema.Record({
  key: Schema.String,
  value: SchwabQuote,
});

export const SchwabCandle = Schema.Struct({
  open: Schema.Number,
  high: Schema.Number,
  low: Schema.Number,
  close: Schema.Number,
  volume: Schema.Number,
  datetime: Schema.Number, // Unix timestamp in milliseconds
});

export const SchwabPriceHistoryResponse = Schema.Struct({
  symbol: Schema.String,
  empty: Schema.Boolean,
  candles: Schema.Array(SchwabCandle),
});

export const SchwabMarketHoursInfo = Schema.Struct({
  date: Schema.String,
  marketType: Schema.String,
  exchange: Schema.optional(Schema.String),
  category: Schema.optional(Schema.String),
  product: Schema.String,
  productName: Schema.optional(Schema.String),
  isOpen: Schema.Boolean,
  sessionHours: Schema.optional(SessionHours),
});
