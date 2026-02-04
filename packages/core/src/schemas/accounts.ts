import { Schema } from "effect";
import { AccountType, AssetType, PutCall, TransactionType } from "./primitives.js";

// Account Number
export const AccountNumber = Schema.Struct({
  accountNumber: Schema.String,
  hashValue: Schema.String,
});
export type AccountNumber = typeof AccountNumber.Type;

// Position
export const Position = Schema.Struct({
  symbol: Schema.String,
  quantity: Schema.Number,
  averagePrice: Schema.Number,
  marketValue: Schema.Number,
  unrealizedPL: Schema.Number,
  unrealizedPLPercent: Schema.Number,
  assetType: AssetType,
  underlyingSymbol: Schema.optional(Schema.String),
  putCall: Schema.optional(PutCall),
  strikePrice: Schema.optional(Schema.Number),
  expirationDate: Schema.optional(Schema.String),
});
export type Position = typeof Position.Type;

// Balances
export const Balances = Schema.Struct({
  cashBalance: Schema.Number,
  cashAvailableForTrading: Schema.Number,
  cashAvailableForWithdrawal: Schema.Number,
  liquidationValue: Schema.Number,
  longMarketValue: Schema.Number,
  shortMarketValue: Schema.Number,
  longOptionMarketValue: Schema.Number,
  shortOptionMarketValue: Schema.Number,
  equity: Schema.Number,
  marginBalance: Schema.Number,
  maintenanceRequirement: Schema.Number,
  buyingPower: Schema.Number,
  dayTradingBuyingPower: Schema.Number,
});
export type Balances = typeof Balances.Type;

// Account
export const Account = Schema.Struct({
  accountNumber: Schema.String,
  accountHash: Schema.String,
  type: AccountType,
  positions: Schema.Array(Position),
  balances: Balances,
});
export type Account = typeof Account.Type;

// Transaction
export const Transaction = Schema.Struct({
  transactionId: Schema.String,
  type: TransactionType,
  description: Schema.String,
  transactionDate: Schema.Date,
  settlementDate: Schema.Date,
  netAmount: Schema.Number,
  symbol: Schema.optional(Schema.String),
  quantity: Schema.optional(Schema.Number),
  price: Schema.optional(Schema.Number),
});
export type Transaction = typeof Transaction.Type;

// Transaction Query Params
export const TransactionParams = Schema.Struct({
  startDate: Schema.optional(Schema.Date),
  endDate: Schema.optional(Schema.Date),
  types: Schema.optional(Schema.Array(TransactionType)),
  symbol: Schema.optional(Schema.String),
});
export type TransactionParams = typeof TransactionParams.Type;

// Schwab API Response Types (for internal parsing)
export const SchwabAccountNumber = Schema.Struct({
  accountNumber: Schema.String,
  hashValue: Schema.String,
});

export const SchwabInstrument = Schema.Struct({
  assetType: Schema.String,
  cusip: Schema.optional(Schema.String),
  symbol: Schema.String,
  description: Schema.optional(Schema.String),
  putCall: Schema.optional(Schema.String),
  underlyingSymbol: Schema.optional(Schema.String),
  optionExpirationDate: Schema.optional(Schema.String),
  strikePrice: Schema.optional(Schema.Number),
});

export const SchwabPosition = Schema.Struct({
  shortQuantity: Schema.Number,
  averagePrice: Schema.Number,
  currentDayProfitLoss: Schema.Number,
  currentDayProfitLossPercentage: Schema.Number,
  longQuantity: Schema.Number,
  settledLongQuantity: Schema.Number,
  settledShortQuantity: Schema.Number,
  instrument: SchwabInstrument,
  marketValue: Schema.Number,
  maintenanceRequirement: Schema.optional(Schema.Number),
  currentDayCost: Schema.optional(Schema.Number),
});

export const SchwabBalances = Schema.Struct({
  cashBalance: Schema.optional(Schema.Number),
  cashAvailableForTrading: Schema.optional(Schema.Number),
  cashAvailableForWithdrawal: Schema.optional(Schema.Number),
  liquidationValue: Schema.optional(Schema.Number),
  longMarketValue: Schema.optional(Schema.Number),
  shortMarketValue: Schema.optional(Schema.Number),
  longOptionMarketValue: Schema.optional(Schema.Number),
  shortOptionMarketValue: Schema.optional(Schema.Number),
  equity: Schema.optional(Schema.Number),
  marginBalance: Schema.optional(Schema.Number),
  maintenanceRequirement: Schema.optional(Schema.Number),
  buyingPower: Schema.optional(Schema.Number),
  dayTradingBuyingPower: Schema.optional(Schema.Number),
  availableFunds: Schema.optional(Schema.Number),
  stockBuyingPower: Schema.optional(Schema.Number),
  optionBuyingPower: Schema.optional(Schema.Number),
});

export const SchwabSecuritiesAccount = Schema.Struct({
  accountNumber: Schema.String,
  type: Schema.String,
  positions: Schema.optional(Schema.Array(SchwabPosition)),
  currentBalances: Schema.optional(SchwabBalances),
  initialBalances: Schema.optional(SchwabBalances),
});

export const SchwabAccount = Schema.Struct({
  securitiesAccount: SchwabSecuritiesAccount,
});

export const SchwabTransaction = Schema.Struct({
  activityId: Schema.Number,
  time: Schema.String,
  type: Schema.String,
  status: Schema.String,
  description: Schema.String,
  netAmount: Schema.Number,
  settlementDate: Schema.String,
  transactionItem: Schema.optional(
    Schema.Struct({
      instrument: Schema.optional(
        Schema.Struct({
          symbol: Schema.String,
        })
      ),
      amount: Schema.optional(Schema.Number),
      price: Schema.optional(Schema.Number),
    })
  ),
});
