/**
 * Test fixtures for quote-related tests
 */
import type { Quote } from "../../src/schemas/index.js";

export const mockQuotes: readonly Quote[] = [
  {
    symbol: "AAPL",
    bidPrice: 178.50,
    askPrice: 178.55,
    lastPrice: 178.52,
    totalVolume: 52000000,
    netChange: 2.50,
    netChangePercent: 1.42,
    mark: 178.53,
    openPrice: 176.00,
    highPrice: 179.00,
    lowPrice: 175.50,
    closePrice: 176.02,
    quoteTime: new Date("2024-01-15T16:00:00Z"),
    tradeTime: new Date("2024-01-15T15:59:58Z"),
    exchange: "NASDAQ",
    description: "Apple Inc",
  },
  {
    symbol: "MSFT",
    bidPrice: 380.00,
    askPrice: 380.10,
    lastPrice: 380.05,
    totalVolume: 25000000,
    netChange: -1.25,
    netChangePercent: -0.33,
    mark: 380.05,
    openPrice: 381.50,
    highPrice: 382.00,
    lowPrice: 379.00,
    closePrice: 381.30,
    quoteTime: new Date("2024-01-15T16:00:00Z"),
    tradeTime: new Date("2024-01-15T15:59:59Z"),
    exchange: "NASDAQ",
    description: "Microsoft Corporation",
  },
  {
    symbol: "TSLA",
    bidPrice: 220.00,
    askPrice: 220.15,
    lastPrice: 220.10,
    totalVolume: 85000000,
    netChange: 5.50,
    netChangePercent: 2.56,
    mark: 220.08,
    openPrice: 214.50,
    highPrice: 221.00,
    lowPrice: 213.00,
    closePrice: 214.60,
    quoteTime: new Date("2024-01-15T16:00:00Z"),
    tradeTime: new Date("2024-01-15T15:59:57Z"),
    exchange: "NASDAQ",
    description: "Tesla Inc",
  },
];

/**
 * Mock Schwab API quote response format
 */
export const mockSchwabQuoteResponse = {
  AAPL: {
    assetMainType: "EQUITY",
    realtime: true,
    ssid: 1973757747,
    symbol: "AAPL",
    quote: {
      "52WeekHigh": 199.62,
      "52WeekLow": 164.08,
      askPrice: 178.55,
      askSize: 100,
      bidPrice: 178.50,
      bidSize: 200,
      closePrice: 176.02,
      highPrice: 179.00,
      lastPrice: 178.52,
      lastSize: 100,
      lowPrice: 175.50,
      mark: 178.53,
      netChange: 2.50,
      netPercentChange: 1.42,
      openPrice: 176.00,
      quoteTime: 1705344000000,
      totalVolume: 52000000,
      tradeTime: 1705343998000,
    },
    reference: {
      cusip: "037833100",
      description: "Apple Inc",
      exchange: "NASDAQ",
      exchangeName: "NASDAQ",
    },
  },
  MSFT: {
    assetMainType: "EQUITY",
    realtime: true,
    ssid: 1973757748,
    symbol: "MSFT",
    quote: {
      askPrice: 380.10,
      askSize: 50,
      bidPrice: 380.00,
      bidSize: 100,
      closePrice: 381.30,
      highPrice: 382.00,
      lastPrice: 380.05,
      lastSize: 50,
      lowPrice: 379.00,
      mark: 380.05,
      netChange: -1.25,
      netPercentChange: -0.33,
      openPrice: 381.50,
      quoteTime: 1705344000000,
      totalVolume: 25000000,
      tradeTime: 1705343999000,
    },
    reference: {
      description: "Microsoft Corporation",
      exchange: "NASDAQ",
    },
  },
};

/**
 * Invalid quote response for error testing
 */
export const mockInvalidQuoteResponse = {
  INVALID: {
    // Missing required fields
    symbol: "INVALID",
    quote: {
      lastPrice: 100,
      // Missing many required fields
    },
    reference: {
      description: "Invalid Symbol",
    },
  },
};
