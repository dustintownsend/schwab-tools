import { describe, it, expect } from "bun:test";
import { Effect, Schema } from "effect";
import { decode, decodeEither } from "./validation.js";
import { SchemaParseError } from "./errors.js";

// Test schemas
const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
});

const OptionalFieldSchema = Schema.Struct({
  required: Schema.String,
  optional: Schema.optional(Schema.Number),
});

const NestedSchema = Schema.Struct({
  id: Schema.Number,
  data: Schema.Struct({
    value: Schema.String,
  }),
});

describe("decode", () => {
  describe("successful decoding", () => {
    it("decodes valid data correctly", async () => {
      const data = { name: "John", age: 30 };

      const result = await Effect.runPromise(decode(PersonSchema, data));

      expect(result.name).toBe("John");
      expect(result.age).toBe(30);
    });

    it("decodes data with optional fields present", async () => {
      const data = { required: "test", optional: 42 };

      const result = await Effect.runPromise(decode(OptionalFieldSchema, data));

      expect(result.required).toBe("test");
      expect(result.optional).toBe(42);
    });

    it("decodes data with optional fields missing", async () => {
      const data = { required: "test" };

      const result = await Effect.runPromise(decode(OptionalFieldSchema, data));

      expect(result.required).toBe("test");
      expect(result.optional).toBeUndefined();
    });

    it("decodes nested structures", async () => {
      const data = { id: 1, data: { value: "nested" } };

      const result = await Effect.runPromise(decode(NestedSchema, data));

      expect(result.id).toBe(1);
      expect(result.data.value).toBe("nested");
    });
  });

  describe("failed decoding", () => {
    it("fails for missing required field", async () => {
      const data = { name: "John" }; // missing 'age'

      const result = await Effect.runPromiseExit(decode(PersonSchema, data));

      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        const error = result.cause;
        expect(error._tag).toBe("Fail");
      }
    });

    it("fails for wrong field type", async () => {
      const data = { name: "John", age: "thirty" }; // age should be number

      const result = await Effect.runPromiseExit(decode(PersonSchema, data));

      expect(result._tag).toBe("Failure");
    });

    it("returns SchemaParseError with context message", async () => {
      const data = { name: "John" };

      const program = decode(PersonSchema, data, "Test context");
      const exit = await Effect.runPromiseExit(program);

      expect(exit._tag).toBe("Failure");
      if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
        const error = exit.cause.error as SchemaParseError;
        expect(error._tag).toBe("SchemaParseError");
        expect(error.message).toContain("Test context");
      }
    });

    it("preserves raw data in error", async () => {
      const data = { invalid: "data" };

      const program = decode(PersonSchema, data);
      const exit = await Effect.runPromiseExit(program);

      expect(exit._tag).toBe("Failure");
      if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
        const error = exit.cause.error as SchemaParseError;
        expect(error.rawData).toEqual(data);
      }
    });

    it("fails for null data", async () => {
      const result = await Effect.runPromiseExit(decode(PersonSchema, null));
      expect(result._tag).toBe("Failure");
    });

    it("fails for undefined data", async () => {
      const result = await Effect.runPromiseExit(decode(PersonSchema, undefined));
      expect(result._tag).toBe("Failure");
    });
  });
});

describe("decodeEither", () => {
  it("decodes valid data correctly", async () => {
    const data = { name: "Jane", age: 25 };

    const result = await Effect.runPromise(decodeEither(PersonSchema, data));

    expect(result.name).toBe("Jane");
    expect(result.age).toBe(25);
  });

  it("fails for invalid data", async () => {
    const data = { name: 123 }; // name should be string

    const result = await Effect.runPromiseExit(decodeEither(PersonSchema, data));

    expect(result._tag).toBe("Failure");
  });
});

describe("complex schema decoding", () => {
  const QuoteLikeSchema = Schema.Struct({
    symbol: Schema.String,
    price: Schema.Number,
    volume: Schema.Number,
  });

  const QuotesResponseSchema = Schema.Record({
    key: Schema.String,
    value: QuoteLikeSchema,
  });

  it("decodes record/map structures", async () => {
    const data = {
      AAPL: { symbol: "AAPL", price: 178.50, volume: 1000000 },
      MSFT: { symbol: "MSFT", price: 380.00, volume: 500000 },
    };

    const result = await Effect.runPromise(decode(QuotesResponseSchema, data));

    expect(result.AAPL.symbol).toBe("AAPL");
    expect(result.MSFT.price).toBe(380.00);
  });

  it("fails for invalid record values", async () => {
    const data = {
      AAPL: { symbol: "AAPL", price: "invalid", volume: 1000000 },
    };

    const result = await Effect.runPromiseExit(decode(QuotesResponseSchema, data));

    expect(result._tag).toBe("Failure");
  });
});

describe("array schema decoding", () => {
  const ItemSchema = Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
  });

  const ArraySchema = Schema.Array(ItemSchema);

  it("decodes arrays of objects", async () => {
    const data = [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
    ];

    const result = await Effect.runPromise(decode(ArraySchema, data));

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].name).toBe("Item 2");
  });

  it("decodes empty arrays", async () => {
    const result = await Effect.runPromise(decode(ArraySchema, []));
    expect(result).toHaveLength(0);
  });

  it("fails for non-array input", async () => {
    const result = await Effect.runPromiseExit(decode(ArraySchema, { not: "array" }));
    expect(result._tag).toBe("Failure");
  });
});
