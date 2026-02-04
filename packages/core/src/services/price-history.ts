import { Effect, Layer } from "effect";
import { PriceHistoryService, HttpClient } from "./index.js";
import type {
  Candle,
  PriceHistoryParams,
  MarketHours,
  PriceHistoryPeriod,
  PriceHistoryFrequency,
  MarketType,
} from "../schemas/index.js";

// Schwab API response types
interface SchwabCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  datetime: number; // Unix timestamp in milliseconds
}

interface SchwabPriceHistoryResponse {
  symbol: string;
  empty: boolean;
  candles: SchwabCandle[];
}

interface SchwabMarketHoursInfo {
  date: string;
  marketType: string;
  isOpen: boolean;
  sessionHours?: {
    preMarket?: { start: string; end: string }[];
    regularMarket?: { start: string; end: string }[];
    postMarket?: { start: string; end: string }[];
  };
}

interface SchwabMarketHoursResponse {
  [market: string]: {
    [marketType: string]: SchwabMarketHoursInfo;
  };
}

// Period and frequency mappings
const PERIOD_MAP: Record<
  PriceHistoryPeriod,
  { periodType: string; period: number }
> = {
  "1d": { periodType: "day", period: 1 },
  "5d": { periodType: "day", period: 5 },
  "1mo": { periodType: "month", period: 1 },
  "3mo": { periodType: "month", period: 3 },
  "6mo": { periodType: "month", period: 6 },
  "1y": { periodType: "year", period: 1 },
  "5y": { periodType: "year", period: 5 },
  "10y": { periodType: "year", period: 10 },
  "20y": { periodType: "year", period: 20 },
};

const FREQUENCY_MAP: Record<
  PriceHistoryFrequency,
  { frequencyType: string; frequency: number }
> = {
  "1min": { frequencyType: "minute", frequency: 1 },
  "5min": { frequencyType: "minute", frequency: 5 },
  "15min": { frequencyType: "minute", frequency: 15 },
  "30min": { frequencyType: "minute", frequency: 30 },
  "1d": { frequencyType: "daily", frequency: 1 },
  "1w": { frequencyType: "weekly", frequency: 1 },
  "1mo": { frequencyType: "monthly", frequency: 1 },
};

// Mappers
const mapCandle = (candle: SchwabCandle): Candle => ({
  open: candle.open,
  high: candle.high,
  low: candle.low,
  close: candle.close,
  volume: candle.volume,
  datetime: new Date(candle.datetime),
});

const formatDate = (date: Date): string => date.toISOString().split("T")[0];

/**
 * Create the Price History service implementation
 */
const makePriceHistoryService = Effect.gen(function* () {
  const httpClient = yield* HttpClient;

  const getPriceHistory = (symbol: string, params?: PriceHistoryParams) =>
    Effect.gen(function* () {
      const queryParams: Record<string, string | number | boolean | undefined> =
        {};

      // Handle period
      if (params?.period) {
        const periodConfig = PERIOD_MAP[params.period];
        queryParams.periodType = periodConfig.periodType;
        queryParams.period = periodConfig.period;
      }

      // Handle frequency
      if (params?.frequency) {
        const freqConfig = FREQUENCY_MAP[params.frequency];
        queryParams.frequencyType = freqConfig.frequencyType;
        queryParams.frequency = freqConfig.frequency;
      }

      // Handle date range (overrides period if specified)
      if (params?.startDate) {
        queryParams.startDate = params.startDate.getTime();
      }
      if (params?.endDate) {
        queryParams.endDate = params.endDate.getTime();
      }

      // Extended hours and previous close
      if (params?.needExtendedHoursData !== undefined) {
        queryParams.needExtendedHoursData = params.needExtendedHoursData;
      }
      if (params?.needPreviousClose !== undefined) {
        queryParams.needPreviousClose = params.needPreviousClose;
      }

      const response = yield* httpClient.request<SchwabPriceHistoryResponse>({
        method: "GET",
        path: "/marketdata/v1/pricehistory",
        params: {
          symbol: symbol.toUpperCase(),
          ...queryParams,
        },
      });

      if (response.empty || !response.candles) {
        return [];
      }

      return response.candles.map(mapCandle);
    });

  const getMarketHours = (markets: readonly MarketType[], date?: Date) =>
    Effect.gen(function* () {
      const dateStr = date ? formatDate(date) : formatDate(new Date());
      const marketList = markets.map((m) => m.toLowerCase()).join(",");

      const response = yield* httpClient.request<SchwabMarketHoursResponse>({
        method: "GET",
        path: "/marketdata/v1/markets",
        params: {
          markets: marketList,
          date: dateStr,
        },
      });

      const result: MarketHours[] = [];

      for (const [market, types] of Object.entries(response)) {
        for (const [, info] of Object.entries(types)) {
          result.push({
            market: market.toUpperCase() as MarketType,
            marketType: info.marketType,
            isOpen: info.isOpen,
            date: info.date,
            sessionHours: info.sessionHours,
          });
        }
      }

      return result;
    });

  return {
    getPriceHistory,
    getMarketHours,
  };
});

/**
 * Live Price History service layer
 */
export const PriceHistoryServiceLive = Layer.effect(
  PriceHistoryService,
  makePriceHistoryService
);
