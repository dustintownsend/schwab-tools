import { Effect, Layer } from "effect";
import { homedir } from "os";
import { join } from "path";
import { mkdir, readFile, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { TokenStorage, type StoredTokensShape } from "./index.js";
import { FileSystemError } from "../errors.js";

const CONFIG_DIR = join(homedir(), ".schwab-tools");
const TOKENS_FILE = join(CONFIG_DIR, "tokens.json");

const ensureConfigDir = Effect.async<void, FileSystemError>((resume) => {
  if (existsSync(CONFIG_DIR)) {
    resume(Effect.succeed(undefined));
    return;
  }
  mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 })
    .then(() => resume(Effect.succeed(undefined)))
    .catch((error) =>
      resume(
        Effect.fail(
          new FileSystemError({
            operation: "mkdir",
            path: CONFIG_DIR,
            message: `Failed to create config directory: ${error.message}`,
            cause: error,
          })
        )
      )
    );
});

const loadTokensEffect = Effect.async<StoredTokensShape | null, FileSystemError>(
  (resume) => {
    if (!existsSync(TOKENS_FILE)) {
      resume(Effect.succeed(null));
      return;
    }
    readFile(TOKENS_FILE, "utf-8")
      .then((data) => {
        try {
          const tokens = JSON.parse(data) as StoredTokensShape;
          resume(Effect.succeed(tokens));
        } catch {
          resume(Effect.succeed(null));
        }
      })
      .catch(() => resume(Effect.succeed(null)));
  }
);

const saveTokensEffect = (tokens: StoredTokensShape) =>
  Effect.gen(function* () {
    yield* ensureConfigDir;
    const data = JSON.stringify(tokens, null, 2);
    yield* Effect.async<void, FileSystemError>((resume) => {
      writeFile(TOKENS_FILE, data, { mode: 0o600 })
        .then(() => resume(Effect.succeed(undefined)))
        .catch((error) =>
          resume(
            Effect.fail(
              new FileSystemError({
                operation: "write",
                path: TOKENS_FILE,
                message: `Failed to save tokens: ${error.message}`,
                cause: error,
              })
            )
          )
        );
    });
  });

const deleteTokensEffect = Effect.async<void, FileSystemError>((resume) => {
  if (!existsSync(TOKENS_FILE)) {
    resume(Effect.succeed(undefined));
    return;
  }
  unlink(TOKENS_FILE)
    .then(() => resume(Effect.succeed(undefined)))
    .catch((error) =>
      resume(
        Effect.fail(
          new FileSystemError({
            operation: "delete",
            path: TOKENS_FILE,
            message: `Failed to delete tokens: ${error.message}`,
            cause: error,
          })
        )
      )
    );
});

/**
 * Live implementation of TokenStorage using file system
 */
export const TokenStorageLive = Layer.succeed(TokenStorage, {
  loadTokens: loadTokensEffect,
  saveTokens: saveTokensEffect,
  deleteTokens: deleteTokensEffect,
  getTokensPath: Effect.succeed(TOKENS_FILE),
});

/**
 * In-memory implementation for testing
 */
export const TokenStorageTest = (
  initialTokens: StoredTokensShape | null = null
) => {
  let tokens: StoredTokensShape | null = initialTokens;

  return Layer.succeed(TokenStorage, {
    loadTokens: Effect.sync(() => tokens),
    saveTokens: (newTokens: StoredTokensShape) =>
      Effect.sync(() => {
        tokens = newTokens;
      }),
    deleteTokens: Effect.sync(() => {
      tokens = null;
    }),
    getTokensPath: Effect.succeed(":memory:"),
  });
};
