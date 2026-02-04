# Schwab Tools

> **Disclaimer:** This is an unofficial, community-maintained project. It is not affiliated with, endorsed by, or connected to Charles Schwab & Co., Inc. Use at your own risk. Always verify trades and account information directly with Schwab.

A TypeScript monorepo for interacting with the Charles Schwab trading API. Built with [Effect](https://effect.website/) for type-safe, composable services and [Bun](https://bun.sh/) for fast execution.

## Packages

| Package | Description |
|---------|-------------|
| [`@schwab-tools/core`](./packages/core) | Core library with API services, schemas, and utilities |
| [`@schwab-tools/cli`](./packages/cli) | Command-line interface for account management and trading |
| [`@schwab-tools/mcp-server`](./packages/mcp-server) | Model Context Protocol server for AI assistant integration |

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- A [Schwab Developer](https://developer.schwab.com/) account with API credentials

## Quick Start

```bash
# Install dependencies
bun install

# Configure API credentials
bun cli auth configure

# Authenticate with Schwab
bun cli auth login

# Check authentication status
bun cli auth status

# Get a stock quote
bun cli quote AAPL MSFT TSLA
```

## Getting Schwab API Credentials

1. Go to [Schwab Developer Portal](https://developer.schwab.com/)
2. Create a new application
3. Note your **App Key** (client ID) and **Secret** (client secret)
4. Set the callback URL to `https://127.0.0.1` (or your preferred URL)
5. Run `bun cli auth configure` to save credentials

## Project Structure

```
schwab-tools/
├── packages/
│   ├── core/           # Core library
│   │   ├── src/
│   │   │   ├── auth/       # OAuth flow, token management
│   │   │   ├── services/   # Effect services (quotes, accounts, orders, etc.)
│   │   │   ├── schemas/    # API response schemas
│   │   │   ├── layers/     # Effect layers (live, test)
│   │   │   └── utils/      # Option symbols, order builder
│   │   └── test/
│   │       └── fixtures/   # Test data
│   ├── cli/            # Command-line interface
│   │   └── src/
│   │       └── commands/   # CLI commands
│   └── mcp-server/     # MCP server for AI assistants
│       └── src/
│           └── tools/      # MCP tool definitions
├── package.json        # Workspace root
└── README.md
```

## Development

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Type check all packages
bun run typecheck

# Run CLI directly
bun cli <command>

# Run MCP server directly
bun mcp
```

## Architecture

This project uses [Effect](https://effect.website/) for:

- **Type-safe errors**: All errors are typed and handled explicitly
- **Dependency injection**: Services are composed via Effect layers
- **Testability**: Mock layers make testing easy without API calls
- **Composability**: Services can be combined and reused

### Services

The core package provides these Effect services:

- `AccountService` - Account info, positions, balances, transactions
- `QuoteService` - Real-time stock/ETF quotes
- `PriceHistoryService` - Historical candles and market hours
- `OptionChainService` - Option chains with Greeks
- `OrderService` - Place, modify, cancel orders

### Example Usage

```typescript
import { Effect, QuoteService, runSchwab } from "@schwab-tools/core";

const program = Effect.gen(function* () {
  const quotes = yield* QuoteService;
  return yield* quotes.getQuotes(["AAPL", "MSFT"]);
});

const result = await runSchwab(program);
console.log(result);
```

## Configuration

Credentials are stored in `~/.schwab-tools/`:

```
~/.schwab-tools/
├── config.json    # API credentials (client ID, secret, callback URL)
└── tokens.json    # OAuth tokens (auto-refreshed)
```

## Disclaimer

This software is provided "as is", without warranty of any kind. This is not an official Schwab product. The authors are not responsible for any financial losses incurred through the use of this software. Always verify all trades and account information directly with Charles Schwab.

## License

MIT
