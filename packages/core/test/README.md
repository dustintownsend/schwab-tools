# Testing Guide

This package uses [Bun's built-in test runner](https://bun.sh/docs/cli/test) for fast, native TypeScript testing.

## Running Tests

```bash
# Run all tests
bun test

# Watch mode (re-runs on file changes)
bun test --watch

# With coverage report
bun test --coverage

# Run specific test file
bun test src/utils/option-symbol.test.ts

# Run tests matching a pattern
bun test --test-name-pattern "buildOptionSymbol"
```

## Test Structure

```
packages/core/
├── src/
│   ├── utils/
│   │   ├── option-symbol.ts
│   │   ├── option-symbol.test.ts    # Unit tests
│   │   ├── order-builder.ts
│   │   └── order-builder.test.ts
│   ├── services/
│   │   ├── quotes.ts
│   │   ├── quotes.test.ts           # Service tests
│   │   ├── accounts.test.ts
│   │   ├── options.test.ts
│   │   ├── orders.test.ts
│   │   └── rate-limiter.test.ts
│   ├── validation.ts
│   └── validation.test.ts
├── test/
│   ├── fixtures/                    # Shared test data
│   │   ├── quotes.ts
│   │   ├── accounts.ts
│   │   ├── options.ts
│   │   └── orders.ts
│   └── README.md
└── package.json
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from "bun:test";

describe("MyFunction", () => {
  it("does something", () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

### Testing Pure Functions

For utility functions without dependencies, test directly:

```typescript
import { describe, it, expect } from "bun:test";
import { buildOptionSymbol } from "./option-symbol.js";

describe("buildOptionSymbol", () => {
  it("builds correct OCC format", () => {
    const symbol = buildOptionSymbol({
      underlying: "TSLA",
      expiration: new Date("2024-01-19"),
      putCall: "C",
      strike: 200,
    });
    expect(symbol).toBe("TSLA  240119C00200000");
  });
});
```

### Testing Effect Services

Use the mock layers from `layers/test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { QuoteService } from "./index.js";
import { QuoteServiceTest } from "../layers/test.js";

describe("QuoteService", () => {
  // Create test layer with mock data
  const mockQuotes = [
    { symbol: "AAPL", lastPrice: 178.52, /* ... */ }
  ];
  const testLayer = QuoteServiceTest(mockQuotes);

  it("returns quotes for valid symbols", async () => {
    const program = Effect.gen(function* () {
      const service = yield* QuoteService;
      return yield* service.getQuotes(["AAPL"]);
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("AAPL");
  });
});
```

### Testing Error Cases

Use `Effect.runPromiseExit` to inspect failures:

```typescript
it("fails with SymbolNotFoundError for invalid symbol", async () => {
  const program = Effect.gen(function* () {
    const service = yield* QuoteService;
    return yield* service.getQuote("INVALID");
  });

  const exit = await Effect.runPromiseExit(
    program.pipe(Effect.provide(testLayer))
  );

  expect(exit._tag).toBe("Failure");
  if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
    const error = exit.cause.error;
    expect(error._tag).toBe("SymbolNotFoundError");
  }
});
```

## Available Test Layers

Import from `../layers/test.js`:

| Layer | Description |
|-------|-------------|
| `QuoteServiceTest(quotes)` | Mock quote service |
| `AccountServiceTest({ accountNumbers, accounts, transactions })` | Mock account service |
| `OptionChainServiceTest({ optionChain, compactChain })` | Mock option chain service |
| `OrderServiceTest(orders)` | Mock order service |
| `TokenManagerTest(tokens)` | Mock token manager |
| `RateLimiterTest` | No-op rate limiter |
| `ConfigTest(config)` | Mock configuration |
| `HttpClientTest(handler)` | Custom HTTP mock |

## Test Fixtures

Shared mock data lives in `test/fixtures/`:

```typescript
import { mockQuotes } from "../../test/fixtures/quotes.js";
import { mockAccounts, mockTransactions } from "../../test/fixtures/accounts.js";
import { mockOptionChain } from "../../test/fixtures/options.js";
import { mockOrders } from "../../test/fixtures/orders.js";
```

Each fixture file exports:
- Typed mock objects matching the schema types
- Raw API response formats for integration tests

## Common Assertions

```typescript
// Equality
expect(value).toBe(expected);           // Strict equality
expect(value).toEqual(expected);        // Deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeUndefined();

// Numbers
expect(value).toBeGreaterThan(n);
expect(value).toBeLessThan(n);
expect(value).toBeCloseTo(n, precision);

// Strings
expect(str).toContain("substring");
expect(str).toMatch(/pattern/);

// Arrays
expect(arr).toHaveLength(n);
expect(arr).toContain(item);

// Objects
expect(obj).toHaveProperty("key");

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow("message");

// Types
expect(value).toBeInstanceOf(Date);
```

## Tips

1. **Co-locate tests**: Place `*.test.ts` files next to the code they test
2. **Use fixtures**: Share mock data via `test/fixtures/` to keep tests DRY
3. **Test behavior, not implementation**: Focus on inputs/outputs, not internal details
4. **Name tests descriptively**: Use `it("returns X when Y")` format
5. **Group related tests**: Use nested `describe()` blocks for organization
