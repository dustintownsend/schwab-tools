/**
 * Schema validation utilities for API responses
 */
import { Effect, Schema } from "effect";
import { SchemaParseError } from "./errors.js";

/**
 * Decode data using an Effect Schema, returning a SchemaParseError on failure
 */
export const decode = <A, I>(
  schema: Schema.Schema<A, I>,
  data: unknown,
  context?: string
): Effect.Effect<A, SchemaParseError> =>
  Schema.decodeUnknown(schema)(data).pipe(
    Effect.mapError((parseError) => {
      // Format the error message from the parse error
      const message = String(parseError);
      const errors: { path: string; message: string }[] = [
        { path: "(root)", message }
      ];

      return new SchemaParseError({
        errors,
        rawData: data,
        message: `${context ? context + ": " : ""}Schema validation failed: ${message}`,
      });
    })
  );

/**
 * Decode data using an Effect Schema, returning Either for optional handling
 */
export const decodeEither = <A, I>(
  schema: Schema.Schema<A, I>,
  data: unknown
): Effect.Effect<A, SchemaParseError> => decode(schema, data);
