/**
 * OCC Option Symbol utilities
 *
 * OCC Option Symbol Format:
 * TSLA  240119P00200000
 * - Underlying: 6 chars, left-justified, space-padded
 * - Expiration: YYMMDD
 * - Put/Call: P or C
 * - Strike: 8 digits (5 integer + 3 decimal), zero-padded
 */

export interface OptionSymbolParams {
  underlying: string;
  expiration: Date;
  putCall: "P" | "C";
  strike: number;
}

/**
 * Build an OCC option symbol from components
 */
export function buildOptionSymbol(params: OptionSymbolParams): string {
  const { underlying, expiration, putCall, strike } = params;

  // Pad underlying to 6 characters (left-justified, space-padded)
  const paddedUnderlying = underlying.toUpperCase().padEnd(6, " ");

  // Format expiration as YYMMDD
  const year = expiration.getFullYear().toString().slice(-2);
  const month = (expiration.getMonth() + 1).toString().padStart(2, "0");
  const day = expiration.getDate().toString().padStart(2, "0");
  const expirationStr = `${year}${month}${day}`;

  // Format strike price as 8 digits (multiply by 1000 to get 3 decimal places)
  const strikeInt = Math.round(strike * 1000);
  const strikeStr = strikeInt.toString().padStart(8, "0");

  return `${paddedUnderlying}${expirationStr}${putCall}${strikeStr}`;
}

/**
 * Parse an OCC option symbol into components
 */
export function parseOptionSymbol(occSymbol: string): OptionSymbolParams {
  if (occSymbol.length !== 21) {
    throw new Error(
      `Invalid OCC symbol length: ${occSymbol.length}, expected 21`
    );
  }

  const underlying = occSymbol.slice(0, 6).trim();
  const expirationStr = occSymbol.slice(6, 12);
  const putCall = occSymbol.charAt(12) as "P" | "C";
  const strikeStr = occSymbol.slice(13, 21);

  if (putCall !== "P" && putCall !== "C") {
    throw new Error(`Invalid put/call indicator: ${putCall}`);
  }

  // Parse expiration
  const year = 2000 + parseInt(expirationStr.slice(0, 2), 10);
  const month = parseInt(expirationStr.slice(2, 4), 10) - 1; // JS months are 0-indexed
  const day = parseInt(expirationStr.slice(4, 6), 10);
  const expiration = new Date(year, month, day);

  // Parse strike (divide by 1000 to get actual price)
  const strike = parseInt(strikeStr, 10) / 1000;

  return {
    underlying,
    expiration,
    putCall,
    strike,
  };
}

/**
 * Format an option symbol for display
 */
export function formatOptionSymbol(occSymbol: string): string {
  const parsed = parseOptionSymbol(occSymbol);
  const type = parsed.putCall === "C" ? "Call" : "Put";
  const dateStr = parsed.expiration.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${parsed.underlying} ${dateStr} $${parsed.strike} ${type}`;
}

/**
 * Check if a symbol is an OCC option symbol
 */
export function isOptionSymbol(symbol: string): boolean {
  if (symbol.length !== 21) {
    return false;
  }

  const putCall = symbol.charAt(12);
  if (putCall !== "P" && putCall !== "C") {
    return false;
  }

  // Check if expiration and strike parts are numeric
  const expirationStr = symbol.slice(6, 12);
  const strikeStr = symbol.slice(13, 21);

  return /^\d{6}$/.test(expirationStr) && /^\d{8}$/.test(strikeStr);
}
