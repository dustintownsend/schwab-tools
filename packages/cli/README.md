# @schwab-tools/cli

> **Disclaimer:** This is an unofficial project, not affiliated with Charles Schwab & Co., Inc.

Command-line interface for the Charles Schwab trading API.

## Installation

```bash
bun add @schwab-tools/cli
```

Or run directly from the monorepo:

```bash
bun cli <command>
```

## Setup

### 1. Configure API Credentials

```bash
schwab auth configure
```

You'll be prompted for:
- **Client ID** - From Schwab Developer Portal
- **Client Secret** - From Schwab Developer Portal
- **Callback URL** - Must match your Schwab app settings (e.g., `https://127.0.0.1`)

### 2. Authenticate

```bash
schwab auth login
```

This opens a browser for OAuth authentication. After authorizing, tokens are stored locally and refreshed automatically.

### 3. Verify

```bash
schwab auth status
```

## Commands

### Authentication

```bash
# Configure API credentials
schwab auth configure

# Authenticate with Schwab (opens browser)
schwab auth login

# Check authentication status
schwab auth status

# Force token refresh
schwab auth refresh

# Remove stored tokens
schwab auth logout
```

### Quotes

```bash
# Get quotes for one or more symbols
schwab quote AAPL
schwab quote AAPL MSFT TSLA

# Output as JSON
schwab quote AAPL --json
```

### Price History

```bash
# Get daily candles for last month (default)
schwab history AAPL

# Specify period and frequency
schwab history AAPL --period 3mo --freq 1d
schwab history AAPL -p 1d -f 5min

# Output as JSON
schwab history AAPL --json
```

**Periods:** `1d`, `5d`, `1mo`, `3mo`, `6mo`, `1y`, `5y`
**Frequencies:** `1min`, `5min`, `15min`, `30min`, `1d`, `1w`

### Accounts

```bash
# List all linked accounts
schwab accounts list

# Show detailed account info with positions
schwab accounts show

# Show specific account
schwab accounts show --account <hash>

# Output as JSON
schwab accounts list --json
```

### Options

```bash
# Get option chain
schwab options chain AAPL

# Filter by type
schwab options chain AAPL --calls
schwab options chain AAPL --puts

# Limit strikes around ATM
schwab options chain AAPL --strikes 10

# Filter by expiration
schwab options chain AAPL --days 30

# Filter by moneyness
schwab options chain AAPL --itm
schwab options chain AAPL --otm

# Build an OCC option symbol
schwab options symbol AAPL 2024-01-19 C 180
# Output: AAPL  240119C00180000

# Parse an OCC option symbol
schwab options parse "AAPL  240119C00180000"
```

### Orders

```bash
# List all orders
schwab orders list

# List orders for specific account
schwab orders list --account <hash>

# Filter by status
schwab orders list --status WORKING
schwab orders list --status FILLED

# Show order details
schwab orders show <orderId> --account <hash>

# Cancel an order
schwab orders cancel <orderId> --account <hash>
```

### Placing Orders

```bash
# Buy stock (market order)
schwab order buy AAPL 100

# Buy stock (limit order)
schwab order buy AAPL 100 --limit 175.00

# Sell stock
schwab order sell AAPL 100
schwab order sell AAPL 100 --limit 180.00

# Good-til-canceled
schwab order buy AAPL 100 --limit 175.00 --gtc

# Skip confirmation
schwab order buy AAPL 100 --yes

# Option orders
schwab order option buy-to-open "AAPL  240119C00180000" 5 --limit 3.50
schwab order option sell-to-open "AAPL  240119C00180000" 5 --limit 4.00
schwab order option buy-to-close "AAPL  240119C00180000" 5 --limit 2.00
schwab order option sell-to-close "AAPL  240119C00180000" 5 --limit 5.00
```

## Output Formats

Most commands support `--json` for machine-readable output:

```bash
# Human-readable (default)
schwab quote AAPL

# JSON output
schwab quote AAPL --json
```

## Examples

### Get a quick portfolio overview

```bash
# Check account balances
schwab accounts list

# See positions
schwab accounts show

# Get quotes for your holdings
schwab quote AAPL MSFT GOOGL
```

### Research an options trade

```bash
# Look at the option chain
schwab options chain AAPL --strikes 5 --days 45

# Build the symbol for a specific contract
schwab options symbol AAPL 2024-03-15 C 180

# Get current price
schwab quote "AAPL  240315C00180000"
```

### Place a covered call

```bash
# Check your position
schwab accounts show

# Sell a call against shares you own
schwab order option sell-to-open "AAPL  240315C00190000" 1 --limit 2.50

# Check the order status
schwab orders list --status WORKING
```

## Error Handling

The CLI provides clear error messages for common issues:

```bash
# Not authenticated
schwab quote AAPL
# Error: Not authenticated. Run "schwab auth login" to authenticate.

# Invalid symbol
schwab quote INVALID
# Error: Symbol not found: INVALID

# Token expired
schwab accounts list
# Error: Re-authentication required. Run "schwab auth login".
```

## Configuration

Credentials and tokens are stored in `~/.schwab-tools/`:

```
~/.schwab-tools/
├── config.json    # API credentials
└── tokens.json    # OAuth tokens (auto-refreshed)
```
