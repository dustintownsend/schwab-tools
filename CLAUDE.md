# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
bun install

# Run tests
bun test                    # All tests
bun test --watch            # Watch mode
bun test packages/core/src/services/quotes.test.ts  # Single test file

# Type checking
bun run typecheck           # All packages

# Run CLI
bun cli <command>           # e.g., bun cli auth status, bun cli quote AAPL

# Run MCP server
bun mcp
```

## Architecture

This is a TypeScript monorepo for the Charles Schwab trading API, built with [Effect](https://effect.website/) for type-safe services and Bun as the runtime.

### Package Structure

- **@schwab-tools/core** - Core library with Effect services, schemas, and utilities
- **@schwab-tools/cli** - Commander.js CLI that consumes core services
- **@schwab-tools/mcp-server** - MCP server for AI assistant integration

### Effect Service Layer Architecture

The core package uses Effect's dependency injection pattern. Services are defined as Context Tags with corresponding shape interfaces:

```typescript
// Service definition pattern (packages/core/src/services/index.ts)
export class QuoteService extends Context.Tag("QuoteService")<
  QuoteService,
  QuoteServiceShape
>() {}
```

**Layer composition** (`packages/core/src/layers/live.ts`):
- `SchwabServicesLive(options)` - Complete layer with all services
- Infrastructure layers: `ConfigLive` → `TokenStorageLive` → `TokenManagerLive` → `RateLimiterLive` → `HttpClientLive`
- Domain layers: `AccountServiceLive`, `QuoteServiceLive`, `PriceHistoryServiceLive`, `OptionChainServiceLive`, `OrderServiceLive`

**Running Effect programs** (`packages/core/src/runtime.ts`):
```typescript
import { Effect, QuoteService, runSchwab } from "@schwab-tools/core";

const result = await runSchwab(
  Effect.gen(function* () {
    const quotes = yield* QuoteService;
    return yield* quotes.getQuotes(["AAPL"]);
  })
);
```

### Error Handling

All errors are typed using Effect's `Data.TaggedError` pattern (`packages/core/src/errors.ts`). Error types include: `AuthError`, `ApiError`, `RateLimitError`, `ValidationError`, `SchemaParseError`, `AccountNotFoundError`, `SymbolNotFoundError`, `OrderRejectedError`.

Use `formatError()` and `formatCause()` from runtime.ts to convert errors to human-readable strings.

### Testing Pattern

Tests use mock service layers from `packages/core/src/layers/test.ts`:

```typescript
import { QuoteServiceTest } from "../layers/test.js";
import { mockQuotes } from "../../test/fixtures/quotes.js";

const testLayer = QuoteServiceTest(mockQuotes);
const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
```

Test fixtures live in `packages/core/test/fixtures/`.

### Schema Validation

API responses are validated with Effect Schema (`packages/core/src/schemas/`). Use the `decode()` utility from validation.ts for parsing.

### Utilities

- **Option symbols**: `buildOptionSymbol()`, `parseOptionSymbol()` in `packages/core/src/utils/option-symbol.ts`
- **Order builder**: `OrderBuilder` class in `packages/core/src/utils/order-builder.ts` for constructing order specs

### Configuration

Credentials stored in `~/.schwab-tools/config.json` and tokens in `~/.schwab-tools/tokens.json`. Managed via `bun cli auth configure` and `bun cli auth login`.
