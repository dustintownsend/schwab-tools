import { Effect, Layer } from "effect";
import { UserPreferenceService, HttpClient } from "./index.js";
import { decode } from "../validation.js";
import {
  UserPreference,
  UserPreferenceArray,
  UserPreferenceEnvelope,
  UserPreferenceSingleEnvelope,
} from "../schemas/index.js";

const normalizeUserPreferences = (raw: unknown) =>
  Effect.gen(function* () {
    const asArray = yield* decode(
      UserPreferenceArray,
      raw,
      "User preference API response"
    ).pipe(
      Effect.match({
        onFailure: () => null,
        onSuccess: (value) => value,
      })
    );
    if (asArray) {
      return asArray.map((preference) => ({
        ...preference,
        streamerInfo: Array.isArray(preference.streamerInfo)
          ? preference.streamerInfo
          : preference.streamerInfo
            ? [preference.streamerInfo]
            : undefined,
        offers: Array.isArray(preference.offers)
          ? preference.offers
          : preference.offers
            ? [preference.offers]
            : undefined,
      }));
    }

    const asSingle = yield* decode(
      UserPreference,
      raw,
      "User preference API response"
    ).pipe(
      Effect.match({
        onFailure: () => null,
        onSuccess: (value) => value,
      })
    );
    if (asSingle) {
      return [
        {
          ...asSingle,
          streamerInfo: Array.isArray(asSingle.streamerInfo)
            ? asSingle.streamerInfo
            : asSingle.streamerInfo
              ? [asSingle.streamerInfo]
              : undefined,
          offers: Array.isArray(asSingle.offers)
            ? asSingle.offers
            : asSingle.offers
              ? [asSingle.offers]
              : undefined,
        },
      ];
    }

    const asEnvelope = yield* decode(
      UserPreferenceEnvelope,
      raw,
      "User preference API response"
    ).pipe(
      Effect.match({
        onFailure: () => null,
        onSuccess: (value) => value.preferences,
      })
    );
    if (asEnvelope) {
      return asEnvelope.map((preference) => ({
        ...preference,
        streamerInfo: Array.isArray(preference.streamerInfo)
          ? preference.streamerInfo
          : preference.streamerInfo
            ? [preference.streamerInfo]
            : undefined,
        offers: Array.isArray(preference.offers)
          ? preference.offers
          : preference.offers
            ? [preference.offers]
            : undefined,
      }));
    }

    const asSingleEnvelope = yield* decode(
      UserPreferenceSingleEnvelope,
      raw,
      "User preference API response"
    ).pipe(
      Effect.match({
        onFailure: () => null,
        onSuccess: (value) => value.preference,
      })
    );
    if (asSingleEnvelope) {
      return [
        {
          ...asSingleEnvelope,
          streamerInfo: Array.isArray(asSingleEnvelope.streamerInfo)
            ? asSingleEnvelope.streamerInfo
            : asSingleEnvelope.streamerInfo
              ? [asSingleEnvelope.streamerInfo]
              : undefined,
          offers: Array.isArray(asSingleEnvelope.offers)
            ? asSingleEnvelope.offers
            : asSingleEnvelope.offers
              ? [asSingleEnvelope.offers]
              : undefined,
        },
      ];
    }

    return yield* decode(
      UserPreferenceArray,
      raw,
      "User preference API response"
    );
  });

const makeUserPreferenceService = Effect.gen(function* () {
  const httpClient = yield* HttpClient;

  const getUserPreference = Effect.gen(function* () {
    const rawResponse = yield* httpClient.request<unknown>({
      method: "GET",
      path: "/trader/v1/userPreference",
    });

    return yield* normalizeUserPreferences(rawResponse);
  });

  return {
    getUserPreference,
  };
});

export const UserPreferenceServiceLive = Layer.effect(
  UserPreferenceService,
  makeUserPreferenceService
);
