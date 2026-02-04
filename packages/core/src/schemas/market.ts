import { Schema } from "effect";

export const MoverDirection = Schema.Literal("up", "down");
export type MoverDirection = typeof MoverDirection.Type;

export const RawMover = Schema.Struct({
  change: Schema.optional(Schema.Number),
  netChange: Schema.optional(Schema.Number),
  percentChange: Schema.optional(Schema.Number),
  description: Schema.optional(Schema.String),
  direction: Schema.optional(Schema.String),
  last: Schema.optional(Schema.Number),
  symbol: Schema.optional(Schema.String),
  totalVolume: Schema.optional(Schema.Number),
});
export type RawMover = typeof RawMover.Type;

export const Mover = Schema.Struct({
  change: Schema.Number,
  description: Schema.String,
  direction: MoverDirection,
  last: Schema.Number,
  symbol: Schema.String,
  totalVolume: Schema.Number,
});
export type Mover = typeof Mover.Type;

export const MoverResponse = Schema.Struct({
  screeners: Schema.Array(RawMover),
});

export const InstrumentProjection = Schema.Literal(
  "symbol-search",
  "symbol-regex",
  "desc-search",
  "desc-regex",
  "search",
  "fundamental"
);
export type InstrumentProjection = typeof InstrumentProjection.Type;

export const Instrument = Schema.Struct({
  cusip: Schema.optional(Schema.String),
  symbol: Schema.String,
  description: Schema.optional(Schema.String),
  exchange: Schema.optional(Schema.String),
  assetType: Schema.optional(Schema.String),
});
export type Instrument = typeof Instrument.Type;

export const InstrumentSearchResponse = Schema.Struct({
  instruments: Schema.Array(Instrument),
});
