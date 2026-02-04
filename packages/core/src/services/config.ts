import { Effect, Layer } from "effect";
import { homedir } from "os";
import { join } from "path";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { SchwabConfig, type SchwabConfigShape } from "./index.js";
import { ConfigError } from "../errors.js";

const SCHWAB_API_BASE = "https://api.schwabapi.com";
const DEFAULT_REQUESTS_PER_MINUTE = 120;
const DEFAULT_MAX_RETRIES = 3;

const CONFIG_DIR = join(homedir(), ".schwab-tools");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface ConfigOptions {
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly callbackPort?: number;
  readonly callbackUrl?: string;
  readonly baseUrl?: string;
  readonly requestsPerMinute?: number;
  readonly maxRetries?: number;
  readonly schwabClientAppId?: string;
  readonly schwabClientChannel?: string;
  readonly schwabClientFunctionId?: string;
  readonly schwabResourceVersion?: string;
  readonly schwabThirdPartyId?: string;
  readonly schwabPilotRollout?: string;
}

interface StoredConfig {
  clientId?: string;
  clientSecret?: string;
  callbackPort?: number;
  callbackUrl?: string;
  schwabClientAppId?: string;
  schwabClientChannel?: string;
  schwabClientFunctionId?: string;
  schwabResourceVersion?: string;
  schwabThirdPartyId?: string;
  schwabPilotRollout?: string;
}

/**
 * Load stored config from file
 */
const loadStoredConfig = Effect.async<StoredConfig | null>((resume) => {
  if (!existsSync(CONFIG_FILE)) {
    resume(Effect.succeed(null));
    return;
  }
  readFile(CONFIG_FILE, "utf-8")
    .then((data) => {
      try {
        const config = JSON.parse(data) as StoredConfig;
        resume(Effect.succeed(config));
      } catch {
        resume(Effect.succeed(null));
      }
    })
    .catch(() => resume(Effect.succeed(null)));
});

/**
 * Create a SchwabConfig layer from explicit options, stored config, and env vars
 */
export const makeConfigFromOptions = (
  options: ConfigOptions
): Effect.Effect<SchwabConfigShape, ConfigError> =>
  Effect.gen(function* () {
    // Load stored config from file
    const storedConfig = yield* loadStoredConfig;

    // Priority: explicit options > env vars > stored config
    const clientId =
      options.clientId ??
      process.env.SCHWAB_CLIENT_ID ??
      storedConfig?.clientId ??
      "";
    const clientSecret =
      options.clientSecret ??
      process.env.SCHWAB_CLIENT_SECRET ??
      storedConfig?.clientSecret ??
      "";
    const callbackUrl =
      options.callbackUrl ??
      process.env.SCHWAB_CALLBACK_URL ??
      storedConfig?.callbackUrl ??
      "https://127.0.0.1";
    const callbackPort =
      options.callbackPort ?? storedConfig?.callbackPort ?? 443;

    if (!clientId) {
      return yield* Effect.fail(
        new ConfigError({
          field: "clientId",
          message:
            'Client ID not configured. Set SCHWAB_CLIENT_ID environment variable or run "schwab auth configure".',
        })
      );
    }

    if (!clientSecret) {
      return yield* Effect.fail(
        new ConfigError({
          field: "clientSecret",
          message:
            'Client secret not configured. Set SCHWAB_CLIENT_SECRET environment variable or run "schwab auth configure".',
        })
      );
    }

    return {
      clientId,
      clientSecret,
      callbackPort,
      callbackUrl,
      baseUrl: options.baseUrl ?? SCHWAB_API_BASE,
      requestsPerMinute: options.requestsPerMinute ?? DEFAULT_REQUESTS_PER_MINUTE,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      schwabClientAppId:
        options.schwabClientAppId ??
        process.env.SCHWAB_CLIENT_APP_ID ??
        storedConfig?.schwabClientAppId,
      schwabClientChannel:
        options.schwabClientChannel ??
        process.env.SCHWAB_CLIENT_CHANNEL ??
        storedConfig?.schwabClientChannel,
      schwabClientFunctionId:
        options.schwabClientFunctionId ??
        process.env.SCHWAB_CLIENT_FUNCTION_ID ??
        storedConfig?.schwabClientFunctionId,
      schwabResourceVersion:
        options.schwabResourceVersion ??
        process.env.SCHWAB_RESOURCE_VERSION ??
        storedConfig?.schwabResourceVersion,
      schwabThirdPartyId:
        options.schwabThirdPartyId ??
        process.env.SCHWAB_THIRD_PARTY_ID ??
        storedConfig?.schwabThirdPartyId,
      schwabPilotRollout:
        options.schwabPilotRollout ??
        process.env.SCHWAB_PILOT_ROLLOUT ??
        storedConfig?.schwabPilotRollout,
    };
  });

/**
 * Create a SchwabConfig layer from environment variables and stored config
 */
export const ConfigLive = (
  options: ConfigOptions = {}
): Layer.Layer<SchwabConfig, ConfigError> =>
  Layer.effect(SchwabConfig, makeConfigFromOptions(options));

/**
 * Create a SchwabConfig layer with explicit values (for testing)
 */
export const ConfigTest = (
  config: SchwabConfigShape
): Layer.Layer<SchwabConfig> => Layer.succeed(SchwabConfig, config);
