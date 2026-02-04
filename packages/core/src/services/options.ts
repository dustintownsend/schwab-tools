import { Effect, Layer } from "effect";
import { OptionChainService, HttpClient } from "./index.js";
import { decode } from "../validation.js";
import {
  type OptionChain,
  type OptionChainParams,
  type OptionContract,
  type CompactOptionChain,
  type CompactExpiration,
  type CompactOption,
  type PutCall,
  SchwabOptionChainResponse,
  SchwabOptionContract,
} from "../schemas/index.js";

// Mappers
const mapOptionContract = (contract: typeof SchwabOptionContract.Type): OptionContract => ({
  symbol: contract.symbol,
  description: contract.description,
  bid: contract.bid,
  ask: contract.ask,
  last: contract.last,
  mark: contract.mark,
  volume: contract.totalVolume,
  openInterest: contract.openInterest,
  strikePrice: contract.strikePrice,
  expirationDate: contract.expirationDate,
  daysToExpiration: contract.daysToExpiration,
  putCall: contract.putCall as PutCall,
  inTheMoney: contract.inTheMoney,
  multiplier: contract.multiplier,
  delta: contract.delta,
  gamma: contract.gamma,
  theta: contract.theta,
  vega: contract.vega,
  rho: contract.rho,
  impliedVolatility: contract.volatility,
  theoreticalValue: contract.theoreticalOptionValue,
  timeValue: contract.timeValue,
  intrinsicValue: contract.intrinsicValue,
});

const mapDateMap = (
  dateMap: Record<string, Record<string, readonly (typeof SchwabOptionContract.Type)[]>>
): Record<string, Record<string, OptionContract[]>> => {
  const result: Record<string, Record<string, OptionContract[]>> = {};

  for (const [dateKey, strikeMap] of Object.entries(dateMap)) {
    result[dateKey] = {};
    for (const [strikeKey, contracts] of Object.entries(strikeMap)) {
      result[dateKey][strikeKey] = contracts.map(mapOptionContract);
    }
  }

  return result;
};

const mapOptionChain = (response: typeof SchwabOptionChainResponse.Type): OptionChain => ({
  symbol: response.symbol,
  underlyingPrice: response.underlyingPrice,
  volatility: response.volatility,
  numberOfContracts: response.numberOfContracts,
  callExpDateMap: mapDateMap(response.callExpDateMap ?? {}),
  putExpDateMap: mapDateMap(response.putExpDateMap ?? {}),
});

const toCompactOption = (contract: OptionContract): CompactOption => ({
  symbol: contract.symbol,
  strike: contract.strikePrice,
  bid: contract.bid,
  ask: contract.ask,
  mid: (contract.bid + contract.ask) / 2,
  volume: contract.volume,
  openInterest: contract.openInterest,
  itm: contract.inTheMoney,
  delta: contract.delta,
  iv: contract.impliedVolatility,
});

const toCompactChain = (chain: OptionChain): CompactOptionChain => {
  const expirations: CompactExpiration[] = [];

  // Get all unique expiration dates
  const allDates = new Set([
    ...Object.keys(chain.callExpDateMap),
    ...Object.keys(chain.putExpDateMap),
  ]);

  for (const dateKey of Array.from(allDates).sort()) {
    const calls = chain.callExpDateMap[dateKey] ?? {};
    const puts = chain.putExpDateMap[dateKey] ?? {};

    // Get first contract to extract date info
    const firstCall = Object.values(calls).flat()[0];
    const firstPut = Object.values(puts).flat()[0];
    const firstContract = firstCall ?? firstPut;

    if (!firstContract) continue;

    expirations.push({
      date: firstContract.expirationDate,
      daysToExpiration: firstContract.daysToExpiration,
      calls: Object.values(calls).flat().map(toCompactOption),
      puts: Object.values(puts).flat().map(toCompactOption),
    });
  }

  return {
    symbol: chain.symbol,
    underlyingPrice: chain.underlyingPrice,
    expirations,
  };
};

const formatDate = (date: Date): string => date.toISOString().split("T")[0];

/**
 * Create the Option Chain service implementation
 */
const makeOptionChainService = Effect.gen(function* () {
  const httpClient = yield* HttpClient;

  const getOptionChain = (symbol: string, params?: OptionChainParams) =>
    Effect.gen(function* () {
      const queryParams: Record<
        string,
        string | number | boolean | undefined
      > = {
        symbol: symbol.toUpperCase(),
      };

      if (params?.contractType) {
        queryParams.contractType = params.contractType;
      }
      if (params?.strikeCount) {
        queryParams.strikeCount = params.strikeCount;
      }
      if (params?.includeUnderlyingQuote !== undefined) {
        queryParams.includeUnderlyingQuote = params.includeUnderlyingQuote;
      }
      if (params?.fromDate) {
        queryParams.fromDate = formatDate(params.fromDate);
      }
      if (params?.toDate) {
        queryParams.toDate = formatDate(params.toDate);
      }
      if (params?.strikeRange) {
        queryParams.range = params.strikeRange;
      }
      if (params?.expMonth) {
        queryParams.expMonth = params.expMonth;
      }

      const rawResponse = yield* httpClient.request<unknown>({
        method: "GET",
        path: "/marketdata/v1/chains",
        params: queryParams,
      });

      // Validate response with schema
      const response = yield* decode(
        SchwabOptionChainResponse,
        rawResponse,
        "Option chain API response"
      );

      return mapOptionChain(response);
    });

  const getCompactOptionChain = (
    symbol: string,
    params?: OptionChainParams & { expirationDays?: number }
  ) =>
    Effect.gen(function* () {
      // Set default filters for compact response
      let toDate = params?.toDate;

      // Filter by expiration days if specified
      if (params?.expirationDays) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + params.expirationDays);
        toDate = expDate;
      }

      const chainParams: OptionChainParams = {
        ...params,
        strikeCount: params?.strikeCount ?? 10, // Limit strikes
        toDate,
      };

      const chain = yield* getOptionChain(symbol, chainParams);
      return toCompactChain(chain);
    });

  return {
    getOptionChain,
    getCompactOptionChain,
  };
});

/**
 * Live Option Chain service layer
 */
export const OptionChainServiceLive = Layer.effect(
  OptionChainService,
  makeOptionChainService
);
