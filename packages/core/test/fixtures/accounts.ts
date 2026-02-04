/**
 * Test fixtures for account-related tests
 */
import type { Account, AccountNumber, Transaction } from "../../src/schemas/index.js";

export const mockAccountNumbers: readonly AccountNumber[] = [
  {
    accountNumber: "12345678",
    hashValue: "ABC123HASH",
  },
  {
    accountNumber: "87654321",
    hashValue: "XYZ789HASH",
  },
];

export const mockAccounts: readonly Account[] = [
  {
    accountNumber: "12345678",
    accountHash: "ABC123HASH",
    type: "MARGIN",
    positions: [
      {
        symbol: "AAPL",
        quantity: 100,
        averagePrice: 150.00,
        marketValue: 17852.00,
        unrealizedPL: 2852.00,
        unrealizedPLPercent: 19.01,
        assetType: "EQUITY",
      },
      {
        symbol: "MSFT",
        quantity: 50,
        averagePrice: 350.00,
        marketValue: 19002.50,
        unrealizedPL: 1502.50,
        unrealizedPLPercent: 8.59,
        assetType: "EQUITY",
      },
    ],
    balances: {
      cashBalance: 10000.00,
      cashAvailableForTrading: 10000.00,
      cashAvailableForWithdrawal: 8000.00,
      liquidationValue: 46854.50,
      longMarketValue: 36854.50,
      shortMarketValue: 0,
      longOptionMarketValue: 0,
      shortOptionMarketValue: 0,
      equity: 46854.50,
      marginBalance: 0,
      maintenanceRequirement: 18427.25,
      buyingPower: 28427.25,
      dayTradingBuyingPower: 0,
    },
  },
  {
    accountNumber: "87654321",
    accountHash: "XYZ789HASH",
    type: "IRA",
    positions: [],
    balances: {
      cashBalance: 5000.00,
      cashAvailableForTrading: 5000.00,
      cashAvailableForWithdrawal: 0,
      liquidationValue: 5000.00,
      longMarketValue: 0,
      shortMarketValue: 0,
      longOptionMarketValue: 0,
      shortOptionMarketValue: 0,
      equity: 5000.00,
      marginBalance: 0,
      maintenanceRequirement: 0,
      buyingPower: 5000.00,
      dayTradingBuyingPower: 0,
    },
  },
];

export const mockTransactions: readonly Transaction[] = [
  {
    transactionId: "TX001",
    type: "TRADE",
    description: "BUY 100 AAPL @ 150.00",
    transactionDate: new Date("2024-01-10T10:30:00Z"),
    settlementDate: new Date("2024-01-12T00:00:00Z"),
    netAmount: -15000.00,
    symbol: "AAPL",
    quantity: 100,
    price: 150.00,
  },
  {
    transactionId: "TX002",
    type: "DIVIDEND_OR_INTEREST",
    description: "DIVIDEND RECEIVED - AAPL",
    transactionDate: new Date("2024-01-15T08:00:00Z"),
    settlementDate: new Date("2024-01-15T00:00:00Z"),
    netAmount: 25.00,
    symbol: "AAPL",
  },
];

/**
 * Mock Schwab API account numbers response
 */
export const mockSchwabAccountNumbersResponse = [
  {
    accountNumber: "12345678",
    hashValue: "ABC123HASH",
  },
  {
    accountNumber: "87654321",
    hashValue: "XYZ789HASH",
  },
];

/**
 * Mock Schwab API account response
 */
export const mockSchwabAccountResponse = {
  securitiesAccount: {
    type: "MARGIN",
    accountNumber: "12345678",
    roundTrips: 0,
    isDayTrader: false,
    isClosingOnlyRestricted: false,
    pfcbFlag: false,
    positions: [
      {
        shortQuantity: 0,
        averagePrice: 150.00,
        currentDayProfitLoss: 50.00,
        currentDayProfitLossPercentage: 0.33,
        longQuantity: 100,
        settledLongQuantity: 100,
        settledShortQuantity: 0,
        instrument: {
          assetType: "EQUITY",
          cusip: "037833100",
          symbol: "AAPL",
          description: "APPLE INC",
          type: "COMMON_STOCK",
        },
        marketValue: 17852.00,
        maintenanceRequirement: 8926.00,
        previousSessionLongQuantity: 100,
      },
    ],
    currentBalances: {
      cashBalance: 10000.00,
      cashAvailableForTrading: 10000.00,
      cashAvailableForWithdrawal: 8000.00,
      liquidationValue: 46854.50,
      longMarketValue: 36854.50,
      shortMarketValue: 0,
      longOptionMarketValue: 0,
      shortOptionMarketValue: 0,
      equity: 46854.50,
      marginBalance: 0,
      maintenanceRequirement: 18427.25,
      buyingPower: 28427.25,
      dayTradingBuyingPower: 0,
      availableFunds: 10000.00,
      stockBuyingPower: 28427.25,
    },
  },
};

/**
 * Mock Schwab API transactions response
 */
export const mockSchwabTransactionsResponse = [
  {
    activityId: 12345,
    type: "TRADE",
    description: "BUY 100 AAPL @ 150.00",
    time: "2024-01-10T10:30:00Z",
    settlementDate: "2024-01-12",
    netAmount: -15000.00,
    transactionItem: {
      instrument: {
        symbol: "AAPL",
        assetType: "EQUITY",
      },
      amount: 100,
      price: 150.00,
    },
  },
];
