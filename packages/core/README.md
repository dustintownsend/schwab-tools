# @schwab-tools/core

> **Disclaimer:** This is an unofficial project, not affiliated with Charles Schwab & Co., Inc.

Core library for interacting with the Charles Schwab trading API. Built with [Effect](https://effect.website/) for type-safe, composable services.

## Installation

```bash
bun add @schwab-tools/core
```

## Features

- **Type-safe API clients** - Full TypeScript types for all API responses
- **Effect services** - Composable, testable services with dependency injection
- **Automatic token refresh** - OAuth tokens are refreshed automatically
- **Rate limiting** - Built-in rate limiter respects API limits
- **Error handling** - Typed errors for all failure cases
- **Option utilities** - OCC symbol parsing and order building helpers

## Quick Start

```typescript
import { Effect, QuoteService, AccountService, runSchwab } from "@schwab-tools/core";

// Fetch quotes
const quotes = await runSchwab(
  Effect.gen(function* () {
    const service = yield* QuoteService;
    return yield* service.getQuotes(["AAPL", "MSFT", "TSLA"]);
  })
);

// Get account balances
const accounts = await runSchwab(
  Effect.gen(function* () {
    const service = yield* AccountService;
    return yield* service.getAccounts;
  })
);
```

## Services

### QuoteService

Real-time quotes for stocks and ETFs.

```typescript
const service = yield* QuoteService;

// Get multiple quotes
const quotes = yield* service.getQuotes(["AAPL", "MSFT"]);

// Get single quote
const quote = yield* service.getQuote("TSLA");
```

### AccountService

Account information, positions, and transactions.

```typescript
const service = yield* AccountService;

// List all accounts
const accounts = yield* service.getAccounts;

// Get account numbers and hashes
const numbers = yield* service.getAccountNumbers;

// Get specific account with positions
const account = yield* service.getAccount(accountHash);

// Get transactions
const transactions = yield* service.getTransactions(accountHash, {
  startDate: new Date("2024-01-01"),
  endDate: new Date(),
});
```

### PriceHistoryService

Historical price data and market hours.

```typescript
const service = yield* PriceHistoryService;

// Get daily candles for last month
const candles = yield* service.getPriceHistory("AAPL", {
  period: "1mo",
  frequency: "1d",
});

// Get market hours
const hours = yield* service.getMarketHours(["EQUITY"], new Date());
```

### OptionChainService

Option chains with Greeks and analytics.

```typescript
const service = yield* OptionChainService;

// Get full option chain
const chain = yield* service.getOptionChain("AAPL", {
  strikeCount: 10,
  contractType: "ALL",
});

// Get compact chain (simplified format)
const compact = yield* service.getCompactOptionChain("AAPL", {
  expirationDays: 45,
});
```

### OrderService

Place, modify, and cancel orders.

```typescript
const service = yield* OrderService;

// Get all orders
const orders = yield* service.getOrders(accountHash);

// Place an order
const orderId = yield* service.placeOrder(accountHash, orderSpec);

// Cancel an order
yield* service.cancelOrder(accountHash, orderId);

// Replace an order
const newOrderId = yield* service.replaceOrder(accountHash, orderId, newOrderSpec);
```

## Utilities

### Option Symbol Utilities

```typescript
import { buildOptionSymbol, parseOptionSymbol, isOptionSymbol } from "@schwab-tools/core";

// Build OCC symbol
const symbol = buildOptionSymbol({
  underlying: "AAPL",
  expiration: new Date("2024-01-19"),
  putCall: "C",
  strike: 180,
});
// => "AAPL  240119C00180000"

// Parse OCC symbol
const params = parseOptionSymbol("AAPL  240119C00180000");
// => { underlying: "AAPL", expiration: Date, putCall: "C", strike: 180 }

// Check if symbol is an option
isOptionSymbol("AAPL  240119C00180000"); // true
isOptionSymbol("AAPL"); // false
```

### Order Builder

```typescript
import { OrderBuilder } from "@schwab-tools/core";

// Equity orders
const buyOrder = OrderBuilder.equityBuy("AAPL", 100);
const limitOrder = OrderBuilder.equityBuyLimit("AAPL", 100, 175.00);

// Option orders
const optionOrder = OrderBuilder.optionBuyToOpen("AAPL  240119C00180000", 5, 3.50);

// Spreads
const spread = OrderBuilder.verticalSpread(
  { symbol: "AAPL  240119C00175000", instruction: "BUY_TO_OPEN" },
  { symbol: "AAPL  240119C00180000", instruction: "SELL_TO_OPEN" },
  5,
  1.50
);

// Modifiers
const gtcOrder = OrderBuilder.withGTC(limitOrder);
const extendedOrder = OrderBuilder.withExtendedHours(limitOrder);
```

## Error Handling

All errors are typed for explicit handling:

```typescript
import { Effect, SymbolNotFoundError, AccountNotFoundError } from "@schwab-tools/core";

const program = Effect.gen(function* () {
  const service = yield* QuoteService;
  return yield* service.getQuote("INVALID");
}).pipe(
  Effect.catchTag("SymbolNotFoundError", (error) =>
    Effect.succeed({ error: `Symbol not found: ${error.symbol}` })
  )
);
```

### Error Types

| Error | Description |
|-------|-------------|
| `AuthError` | Authentication failures |
| `TokenExpiredError` | Token expiration |
| `ApiError` | API request failures |
| `RateLimitError` | Rate limit exceeded |
| `NetworkError` | Connection failures |
| `SchemaParseError` | Response validation failures |
| `AccountNotFoundError` | Invalid account |
| `SymbolNotFoundError` | Invalid symbol |
| `OrderNotFoundError` | Invalid order ID |
| `OrderRejectedError` | Order placement rejected |

## Testing

The package includes test utilities for mocking services:

```typescript
import { Effect } from "effect";
import { QuoteService, QuoteServiceTest } from "@schwab-tools/core";

const mockQuotes = [
  { symbol: "AAPL", lastPrice: 178.52, /* ... */ }
];

const testLayer = QuoteServiceTest(mockQuotes);

const result = await Effect.runPromise(
  Effect.gen(function* () {
    const service = yield* QuoteService;
    return yield* service.getQuotes(["AAPL"]);
  }).pipe(Effect.provide(testLayer))
);
```

See [test/README.md](./test/README.md) for the full testing guide.

## API Reference

### Exports

```typescript
// Effect re-exports
export { Effect, Layer, Schema, ... } from "effect";

// Services
export { QuoteService, AccountService, OrderService, ... } from "./services";

// Layers
export { SchwabServicesLive } from "./layers/live";
export { QuoteServiceTest, AccountServiceTest, ... } from "./layers/test";

// Runtime
export { runSchwab, runSchwabExit, formatError } from "./runtime";

// Schemas (types)
export { Quote, Account, Order, OptionChain, ... } from "./schemas";

// Errors
export { AuthError, ApiError, SymbolNotFoundError, ... } from "./errors";

// Utilities
export { buildOptionSymbol, parseOptionSymbol, OrderBuilder } from "./utils";

// Auth
export { SchwabTokenManager, saveConfig, loadConfig } from "./auth";
```
