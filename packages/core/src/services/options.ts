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
  type Expiration,
  type PutCall,
  SchwabOptionChainResponse,
  SchwabExpiration,
  SchwabExpirationChainResponse,
  SchwabOptionContract,
} from "../schemas/index.js";

// Mappers
const mapOptionContract = (contract: typeof SchwabOptionContract.Type): OptionContract => ({
  symbol: contract.symbol,
  description: contract.description,
  bid: contract.bid ?? contract.bidPrice ?? 0,
  ask: contract.ask ?? contract.askPrice ?? 0,
  last: contract.last ?? contract.lastPrice ?? 0,
  mark: contract.mark ?? contract.markPrice ?? 0,
  volume: contract.totalVolume ?? 0,
  openInterest: contract.openInterest ?? 0,
  strikePrice: contract.strikePrice,
  expirationDate: contract.expirationDate,
  daysToExpiration: contract.daysToExpiration ?? 0,
  putCall: contract.putCall as PutCall,
  inTheMoney: contract.inTheMoney ?? contract.isInTheMoney ?? false,
  multiplier: contract.multiplier ?? 100,
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

const mapOptionChain = (response: typeof SchwabOptionChainResponse.Type): OptionChain => {
  const callExpDateMap = mapDateMap(response.callExpDateMap ?? {});
  const putExpDateMap = mapDateMap(response.putExpDateMap ?? {});
  const computedContracts =
    Object.values(callExpDateMap)
      .flatMap((strikeMap) => Object.values(strikeMap))
      .reduce((sum, contracts) => sum + contracts.length, 0) +
    Object.values(putExpDateMap)
      .flatMap((strikeMap) => Object.values(strikeMap))
      .reduce((sum, contracts) => sum + contracts.length, 0);

  return {
    symbol: response.symbol,
    underlyingPrice: response.underlyingPrice,
    volatility: response.volatility ?? 0,
    numberOfContracts: response.numberOfContracts ?? computedContracts,
    callExpDateMap,
    putExpDateMap,
  };
};

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

const mapExpiration = (
  expiration: typeof SchwabExpiration.Type
): Expiration => ({
  expirationDate: expiration.expirationDate ?? expiration.expiration ?? "",
  daysToExpiration: expiration.daysToExpiration,
  expirationType: expiration.expirationType,
  standard: expiration.standard,
  settlementType: expiration.settlementType,
  optionRoots: expiration.optionRoots,
});

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
      if (params?.strategy) {
        queryParams.strategy = params.strategy;
      }
      if (params?.interval !== undefined) {
        queryParams.interval = params.interval;
      }
      if (params?.strike !== undefined) {
        queryParams.strike = params.strike;
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
      if (params?.volatility !== undefined) {
        queryParams.volatility = params.volatility;
      }
      if (params?.underlyingPrice !== undefined) {
        queryParams.underlyingPrice = params.underlyingPrice;
      }
      if (params?.interestRate !== undefined) {
        queryParams.interestRate = params.interestRate;
      }
      if (params?.daysToExpiration !== undefined) {
        queryParams.daysToExpiration = params.daysToExpiration;
      }
      if (params?.optionType) {
        queryParams.optionType = params.optionType;
      }
      if (params?.entitlement) {
        queryParams.entitlement = params.entitlement;
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
      let daysToExpiration = params?.daysToExpiration;

      // Filter by expiration days if specified
      if (params?.expirationDays) {
        daysToExpiration = params.expirationDays;
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + params.expirationDays);
        toDate = expDate;
      }

      const chainParams: OptionChainParams = {
        ...params,
        strikeCount: params?.strikeCount ?? 10, // Limit strikes
        toDate,
        daysToExpiration,
      };

      const chain = yield* getOptionChain(symbol, chainParams);
      return toCompactChain(chain);
    });

  const getExpirationChain = (symbol: string) =>
    Effect.gen(function* () {
      const rawResponse = yield* httpClient.request<unknown>({
        method: "GET",
        path: "/marketdata/v1/expirationchain",
        params: {
          symbol: symbol.toUpperCase(),
        },
      });

      const response = yield* decode(
        SchwabExpirationChainResponse,
        rawResponse,
        "Option expiration chain API response"
      );

      return response.expirationList.map(mapExpiration);
    });

  return {
    getOptionChain,
    getCompactOptionChain,
    getExpirationChain,
  };
});

/**
 * Live Option Chain service layer
 */
export const OptionChainServiceLive = Layer.effect(
  OptionChainService,
  makeOptionChainService
);
