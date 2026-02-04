// Token types
export interface TokenState {
  hasAccessToken: boolean;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  needsReauth: boolean;
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  scope: string;
  tokenType: string;
}

// Rate limiting
export interface RateLimitStatus {
  requestsRemaining: number;
  windowResetAt: Date;
}

// Account types
export interface AccountNumber {
  accountNumber: string;
  hashValue: string;
}

export type AccountType = 'MARGIN' | 'CASH' | 'IRA';

export interface Account {
  accountNumber: string;
  accountHash: string;
  type: AccountType;
  positions: Position[];
  balances: Balances;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  assetType: AssetType;
  // For options
  underlyingSymbol?: string;
  putCall?: 'PUT' | 'CALL';
  strikePrice?: number;
  expirationDate?: string;
}

export type AssetType = 'EQUITY' | 'OPTION' | 'MUTUAL_FUND' | 'CASH_EQUIVALENT' | 'FIXED_INCOME';

export interface Balances {
  cashBalance: number;
  cashAvailableForTrading: number;
  cashAvailableForWithdrawal: number;
  liquidationValue: number;
  longMarketValue: number;
  shortMarketValue: number;
  longOptionMarketValue: number;
  shortOptionMarketValue: number;
  equity: number;
  marginBalance: number;
  maintenanceRequirement: number;
  buyingPower: number;
  dayTradingBuyingPower: number;
}

export interface TransactionParams {
  startDate?: Date;
  endDate?: Date;
  types?: TransactionType[];
  symbol?: string;
}

export type TransactionType = 'TRADE' | 'DIVIDEND_OR_INTEREST' | 'ACH_RECEIPT' | 'ACH_DISBURSEMENT' | 'WIRE_IN' | 'WIRE_OUT';

export interface Transaction {
  transactionId: string;
  type: TransactionType;
  description: string;
  transactionDate: Date;
  settlementDate: Date;
  netAmount: number;
  symbol?: string;
  quantity?: number;
  price?: number;
}

// Quote types
export interface Quote {
  symbol: string;
  bidPrice: number;
  askPrice: number;
  lastPrice: number;
  totalVolume: number;
  netChange: number;
  netChangePercent: number;
  mark: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  quoteTime: Date;
  tradeTime: Date;
  exchange: string;
  description: string;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  datetime: Date;
}

export type PriceHistoryPeriod = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' | '10y' | '20y';
export type PriceHistoryFrequency = '1min' | '5min' | '15min' | '30min' | '1d' | '1w' | '1mo';

export interface PriceHistoryParams {
  period?: PriceHistoryPeriod;
  frequency?: PriceHistoryFrequency;
  startDate?: Date;
  endDate?: Date;
  needExtendedHoursData?: boolean;
  needPreviousClose?: boolean;
}

export type MarketType = 'EQUITY' | 'OPTION' | 'BOND' | 'FUTURE' | 'FOREX';

export interface MarketHours {
  market: MarketType;
  marketType: string;
  isOpen: boolean;
  date: string;
  sessionHours?: {
    preMarket?: { start: string; end: string }[];
    regularMarket?: { start: string; end: string }[];
    postMarket?: { start: string; end: string }[];
  };
}

// Options types
export interface OptionChainParams {
  contractType?: 'CALL' | 'PUT' | 'ALL';
  strikeCount?: number;
  includeUnderlyingQuote?: boolean;
  fromDate?: Date;
  toDate?: Date;
  strikeRange?: 'ITM' | 'NTM' | 'OTM' | 'ALL';
  expMonth?: string;
}

export interface OptionChain {
  symbol: string;
  underlyingPrice: number;
  volatility: number;
  numberOfContracts: number;
  callExpDateMap: Record<string, Record<string, OptionContract[]>>;
  putExpDateMap: Record<string, Record<string, OptionContract[]>>;
}

export interface OptionContract {
  symbol: string;
  description: string;
  bid: number;
  ask: number;
  last: number;
  mark: number;
  volume: number;
  openInterest: number;
  strikePrice: number;
  expirationDate: string;
  daysToExpiration: number;
  putCall: 'PUT' | 'CALL';
  inTheMoney: boolean;
  multiplier: number;
  // Greeks
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
  impliedVolatility?: number;
  theoreticalValue?: number;
  timeValue?: number;
  intrinsicValue?: number;
}

export interface OptionSymbolParams {
  underlying: string;
  expiration: Date;
  putCall: 'P' | 'C';
  strike: number;
}

// Compact option chain for AI (token-efficient)
export interface CompactOptionChain {
  symbol: string;
  underlyingPrice: number;
  expirations: CompactExpiration[];
}

export interface CompactExpiration {
  date: string;
  daysToExpiration: number;
  calls: CompactOption[];
  puts: CompactOption[];
}

export interface CompactOption {
  symbol: string;
  strike: number;
  bid: number;
  ask: number;
  mid: number;
  volume: number;
  openInterest: number;
  itm: boolean;
  delta?: number;
  iv?: number;
}

// Order types
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
export type OrderSession = 'NORMAL' | 'AM' | 'PM' | 'SEAMLESS';
export type OrderDuration = 'DAY' | 'GTC' | 'FOK';
export type OrderStrategyType = 'SINGLE' | 'OCO' | 'TRIGGER';
export type OrderStatus = 'ACCEPTED' | 'WORKING' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED' | 'PENDING_ACTIVATION' | 'QUEUED' | 'AWAITING_PARENT_ORDER' | 'AWAITING_CONDITION' | 'PENDING_REPLACE' | 'PENDING_CANCEL';
export type OrderInstruction = 'BUY' | 'SELL' | 'BUY_TO_OPEN' | 'BUY_TO_CLOSE' | 'SELL_TO_OPEN' | 'SELL_TO_CLOSE';

export interface OrderLeg {
  instruction: OrderInstruction;
  quantity: number;
  instrument: {
    symbol: string;
    assetType: AssetType;
  };
}

export interface OrderSpec {
  orderType: OrderType;
  session: OrderSession;
  duration: OrderDuration;
  price?: number;
  stopPrice?: number;
  orderLegCollection: OrderLeg[];
  orderStrategyType: OrderStrategyType;
}

export interface Order extends OrderSpec {
  orderId: string;
  accountNumber: string;
  status: OrderStatus;
  filledQuantity: number;
  remainingQuantity: number;
  enteredTime: Date;
  closeTime?: Date;
  statusDescription?: string;
}

export interface OrderQueryParams {
  status?: OrderStatus | 'ALL';
  fromEnteredTime?: Date;
  toEnteredTime?: Date;
  maxResults?: number;
}

export interface LegSpec {
  symbol: string;
  instruction: OrderInstruction;
}

// Config types
export interface SchwabConfig {
  clientId: string;
  clientSecret: string;
  callbackPort: number;
  callbackUrl: string;
}

// API Response types (raw from Schwab)
export interface SchwabTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

export interface SchwabErrorResponse {
  error: string;
  error_description?: string;
}
