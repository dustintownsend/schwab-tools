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

export type AssetType =
  | 'EQUITY'
  | 'OPTION'
  | 'MUTUAL_FUND'
  | 'CASH_EQUIVALENT'
  | 'FIXED_INCOME'
  | 'FUTURE'
  | 'FOREX'
  | 'INDEX'
  | 'PRODUCT'
  | 'CURRENCY'
  | 'COLLECTIVE_INVESTMENT'
  | 'UNKNOWN';

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

export type TransactionType =
  | 'TRADE'
  | 'RECEIVE_AND_DELIVER'
  | 'DIVIDEND_OR_INTEREST'
  | 'ACH_RECEIPT'
  | 'ACH_DISBURSEMENT'
  | 'CASH_RECEIPT'
  | 'CASH_DISBURSEMENT'
  | 'ELECTRONIC_FUND'
  | 'WIRE_IN'
  | 'WIRE_OUT'
  | 'JOURNAL'
  | 'MEMORANDUM'
  | 'MARGIN_CALL'
  | 'MONEY_MARKET'
  | 'SMA_ADJUSTMENT';

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

export type PriceHistoryPeriod =
  | '1d'
  | '2d'
  | '3d'
  | '4d'
  | '5d'
  | '10d'
  | '1mo'
  | '2mo'
  | '3mo'
  | '6mo'
  | '1y'
  | '2y'
  | '3y'
  | '5y'
  | '10y'
  | '15y'
  | '20y'
  | 'ytd';
export type PriceHistoryFrequency =
  | '1min'
  | '5min'
  | '10min'
  | '15min'
  | '30min'
  | '1d'
  | '1w'
  | '1mo';

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
  sessionHours?: Record<string, { start: string; end: string }[]>;
}

// Movers and instrument types
export type MoverDirection = 'up' | 'down';

export interface Mover {
  change: number;
  description: string;
  direction: MoverDirection;
  last: number;
  symbol: string;
  totalVolume: number;
}

export type InstrumentProjection =
  | 'symbol-search'
  | 'symbol-regex'
  | 'desc-search'
  | 'desc-regex'
  | 'search'
  | 'fundamental';

export interface Instrument {
  cusip?: string;
  symbol: string;
  description?: string;
  exchange?: string;
  assetType?: string;
}

// User preference types
export interface UserPreferenceAccount {
  accountNumber: string;
  primaryAccount?: boolean;
  type?: string;
  nickName?: string;
  accountColor?: string;
  displayAcctId?: string;
  autoPositionEffect?: boolean;
}

export interface StreamerInfo {
  streamerSocketUrl?: string;
  schwabClientCustomerId?: string;
  schwabClientCorrelId?: string;
  schwabClientChannel?: string;
  schwabClientFunctionId?: string;
}

export interface Offer {
  level2Permissions?: boolean;
  mktDataPermission?: string;
}

export interface UserPreference {
  accounts?: UserPreferenceAccount[];
  streamerInfo?: StreamerInfo[];
  offers?: Offer[];
}

// Options types
export interface OptionChainParams {
  contractType?: 'CALL' | 'PUT' | 'ALL';
  strikeCount?: number;
  includeUnderlyingQuote?: boolean;
  strategy?:
    | 'SINGLE'
    | 'ANALYTICAL'
    | 'COVERED'
    | 'VERTICAL'
    | 'CALENDAR'
    | 'STRANGLE'
    | 'STRADDLE'
    | 'BUTTERFLY'
    | 'CONDOR'
    | 'DIAGONAL'
    | 'COLLAR'
    | 'ROLL';
  interval?: number;
  strike?: number;
  fromDate?: Date;
  toDate?: Date;
  strikeRange?: 'ITM' | 'NTM' | 'OTM' | 'ALL';
  expMonth?: string;
  volatility?: number;
  underlyingPrice?: number;
  interestRate?: number;
  daysToExpiration?: number;
  optionType?: string;
  entitlement?: 'PN' | 'NP' | 'PP';
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

export interface Expiration {
  expirationDate: string;
  daysToExpiration: number;
  expirationType: string;
  standard: boolean;
  settlementType?: string;
  optionRoots?: string;
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
export type OrderType =
  | 'MARKET'
  | 'LIMIT'
  | 'STOP'
  | 'STOP_LIMIT'
  | 'TRAILING_STOP'
  | 'CABINET'
  | 'NON_MARKETABLE'
  | 'MARKET_ON_CLOSE'
  | 'EXERCISE'
  | 'TRAILING_STOP_LIMIT'
  | 'NET_DEBIT'
  | 'NET_CREDIT'
  | 'NET_ZERO'
  | 'LIMIT_ON_CLOSE'
  | 'UNKNOWN';
export type OrderSession = 'NORMAL' | 'AM' | 'PM' | 'SEAMLESS';
export type OrderDuration =
  | 'DAY'
  | 'GOOD_TILL_CANCEL'
  | 'FILL_OR_KILL'
  | 'IMMEDIATE_OR_CANCEL'
  | 'END_OF_WEEK'
  | 'END_OF_MONTH'
  | 'NEXT_END_OF_MONTH'
  | 'UNKNOWN'
  // Legacy aliases
  | 'GTC'
  | 'FOK'
  | 'IOC';
export type OrderStrategyType =
  | 'SINGLE'
  | 'CANCEL'
  | 'RECALL'
  | 'PAIR'
  | 'FLATTEN'
  | 'TWO_DAY_SWAP'
  | 'BLAST_ALL'
  | 'OCO'
  | 'TRIGGER';
export type OrderStatus =
  | 'AWAITING_PARENT_ORDER'
  | 'AWAITING_CONDITION'
  | 'AWAITING_STOP_CONDITION'
  | 'AWAITING_MANUAL_REVIEW'
  | 'ACCEPTED'
  | 'AWAITING_UR_OUT'
  | 'PENDING_ACTIVATION'
  | 'QUEUED'
  | 'WORKING'
  | 'REJECTED'
  | 'PENDING_CANCEL'
  | 'CANCELED'
  | 'PENDING_REPLACE'
  | 'REPLACED'
  | 'FILLED'
  | 'EXPIRED'
  | 'NEW'
  | 'AWAITING_RELEASE_TIME'
  | 'PENDING_ACKNOWLEDGEMENT'
  | 'PENDING_RECALL'
  | 'UNKNOWN';
export type OrderInstruction =
  | 'BUY'
  | 'SELL'
  | 'BUY_TO_COVER'
  | 'SELL_SHORT'
  | 'BUY_TO_OPEN'
  | 'BUY_TO_CLOSE'
  | 'SELL_TO_OPEN'
  | 'SELL_TO_CLOSE'
  | 'EXCHANGE'
  | 'SELL_SHORT_EXEMPT';

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
  schwabClientAppId?: string;
  schwabClientChannel?: string;
  schwabClientFunctionId?: string;
  schwabResourceVersion?: string;
  schwabThirdPartyId?: string;
  schwabPilotRollout?: string;
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
