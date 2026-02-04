# @schwab-tools/mcp-server

> **Disclaimer:** This is an unofficial project, not affiliated with Charles Schwab & Co., Inc.

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for the Charles Schwab trading API. Enables AI assistants like Claude to interact with your Schwab accounts.

## Installation

```bash
bun add @schwab-tools/mcp-server
```

## Setup

### 1. Configure Credentials

First, set up your Schwab API credentials using the CLI:

```bash
bun cli auth configure
bun cli auth login
```

### 2. Configure Your MCP Client

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "schwab": {
      "command": "bun",
      "args": ["run", "/path/to/schwab-tools/packages/mcp-server/src/index.ts"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "schwab": {
      "command": "schwab-mcp"
    }
  }
}
```

## Available Tools

### Authentication

| Tool | Description |
|------|-------------|
| `schwab_auth_status` | Check authentication status and token expiration |

### Accounts

| Tool | Description |
|------|-------------|
| `schwab_get_accounts` | Get all accounts with balances and positions |
| `schwab_get_account` | Get details for a specific account |
| `schwab_get_account_numbers` | Get account numbers and hashes |

### Market Data

| Tool | Description |
|------|-------------|
| `schwab_get_quote` | Get quotes for stocks/ETFs |
| `schwab_get_price_history` | Get historical price candles |
| `schwab_get_market_hours` | Get market hours and sessions |

### Options

| Tool | Description |
|------|-------------|
| `schwab_get_option_chain` | Get option chain with Greeks |
| `schwab_build_option_symbol` | Build OCC option symbol from components |
| `schwab_parse_option_symbol` | Parse OCC symbol into components |

### Orders

| Tool | Description |
|------|-------------|
| `schwab_get_orders` | Get open and recent orders |
| `schwab_get_order` | Get specific order details |
| `schwab_place_order` | Place a new order (stocks or options) |
| `schwab_cancel_order` | Cancel an open order |

## Tool Details

### schwab_get_quote

Get current quotes for stocks or ETFs.

```json
{
  "symbols": ["AAPL", "MSFT", "TSLA"]
}
```

### schwab_get_price_history

Get historical price candles.

```json
{
  "symbol": "AAPL",
  "period": "1mo",
  "frequency": "1d"
}
```

**Periods:** `1d`, `5d`, `1mo`, `3mo`, `6mo`, `1y`, `5y`, `10y`, `20y`
**Frequencies:** `1min`, `5min`, `15min`, `30min`, `1d`, `1w`, `1mo`

### schwab_get_option_chain

Get option chain with Greeks and analytics.

```json
{
  "symbol": "AAPL",
  "contractType": "CALL",
  "strikeCount": 10,
  "expirationDays": 45,
  "strikeRange": "NTM"
}
```

### schwab_build_option_symbol

Build an OCC option symbol.

```json
{
  "underlying": "AAPL",
  "expiration": "2024-03-15",
  "putCall": "C",
  "strike": 180
}
```

Returns: `AAPL  240315C00180000`

### schwab_place_order

Place a stock or option order.

**Stock order:**
```json
{
  "accountHash": "ABC123...",
  "action": "BUY",
  "symbol": "AAPL",
  "quantity": 100,
  "orderType": "LIMIT",
  "price": 175.00,
  "duration": "DAY"
}
```

**Option order:**
```json
{
  "accountHash": "ABC123...",
  "action": "BUY_TO_OPEN",
  "symbol": "AAPL  240315C00180000",
  "quantity": 5,
  "orderType": "LIMIT",
  "price": 3.50,
  "duration": "GTC"
}
```

**Actions:**
- Stocks: `BUY`, `SELL`
- Options: `BUY_TO_OPEN`, `SELL_TO_OPEN`, `BUY_TO_CLOSE`, `SELL_TO_CLOSE`

## Example Conversations

### Check portfolio

> "What are my current positions?"

The assistant will use `schwab_get_accounts` to fetch and display your holdings.

### Get a quote

> "What's the current price of TSLA?"

Uses `schwab_get_quote` to fetch real-time quote data.

### Research options

> "Show me call options for AAPL expiring in the next 30 days"

Uses `schwab_get_option_chain` with appropriate filters.

### Place a trade

> "Buy 100 shares of MSFT with a limit price of $375"

The assistant will:
1. Use `schwab_get_account_numbers` to find the account
2. Use `schwab_place_order` to execute the trade
3. Confirm the order was placed

## Response Format

All tools return structured responses:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "errorType": "SymbolNotFoundError"
}
```

## Security

- Credentials are stored locally in `~/.schwab-tools/`
- Tokens are refreshed automatically
- The MCP server only responds to tool calls from connected clients
- Order placement requires explicit action (no automatic trading)

## Running Manually

```bash
# From the monorepo root
bun mcp

# Or directly
bun run packages/mcp-server/src/index.ts
```

The server communicates via stdio and is designed to be launched by MCP clients.
