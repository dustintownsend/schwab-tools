import { describe, it, expect } from "bun:test";
import {
  buildOptionSymbol,
  parseOptionSymbol,
  formatOptionSymbol,
  isOptionSymbol,
} from "./option-symbol.js";

describe("buildOptionSymbol", () => {
  it("builds correct OCC format for call option", () => {
    const symbol = buildOptionSymbol({
      underlying: "TSLA",
      expiration: new Date("2024-01-19"),
      putCall: "C",
      strike: 200,
    });
    expect(symbol).toBe("TSLA  240119C00200000");
  });

  it("builds correct OCC format for put option", () => {
    const symbol = buildOptionSymbol({
      underlying: "TSLA",
      expiration: new Date("2024-01-19"),
      putCall: "P",
      strike: 200,
    });
    expect(symbol).toBe("TSLA  240119P00200000");
  });

  it("pads underlying to 6 characters", () => {
    const symbol = buildOptionSymbol({
      underlying: "AAPL",
      expiration: new Date("2024-03-15"),
      putCall: "C",
      strike: 180,
    });
    expect(symbol).toBe("AAPL  240315C00180000");
    expect(symbol.slice(0, 6)).toBe("AAPL  ");
  });

  it("handles 6-character underlying symbols", () => {
    const symbol = buildOptionSymbol({
      underlying: "GOOGL",
      expiration: new Date("2024-06-21"),
      putCall: "P",
      strike: 150,
    });
    expect(symbol.slice(0, 6)).toBe("GOOGL ");
  });

  it("handles decimal strike prices", () => {
    const symbol = buildOptionSymbol({
      underlying: "SPY",
      expiration: new Date("2024-01-19"),
      putCall: "C",
      strike: 475.5,
    });
    expect(symbol).toBe("SPY   240119C00475500");
  });

  it("handles low strike prices with proper padding", () => {
    const symbol = buildOptionSymbol({
      underlying: "F",
      expiration: new Date("2024-02-16"),
      putCall: "C",
      strike: 12.5,
    });
    expect(symbol).toBe("F     240216C00012500");
  });

  it("handles high strike prices", () => {
    const symbol = buildOptionSymbol({
      underlying: "AMZN",
      expiration: new Date("2024-12-20"),
      putCall: "C",
      strike: 1500,
    });
    expect(symbol).toBe("AMZN  241220C01500000");
  });

  it("converts underlying to uppercase", () => {
    const symbol = buildOptionSymbol({
      underlying: "aapl",
      expiration: new Date("2024-01-19"),
      putCall: "C",
      strike: 180,
    });
    expect(symbol.slice(0, 4)).toBe("AAPL");
  });
});

describe("parseOptionSymbol", () => {
  it("parses a valid call option symbol", () => {
    const result = parseOptionSymbol("TSLA  240119C00200000");
    expect(result.underlying).toBe("TSLA");
    expect(result.expiration.getFullYear()).toBe(2024);
    expect(result.expiration.getMonth()).toBe(0); // January
    expect(result.expiration.getDate()).toBe(19);
    expect(result.putCall).toBe("C");
    expect(result.strike).toBe(200);
  });

  it("parses a valid put option symbol", () => {
    const result = parseOptionSymbol("AAPL  240315P00180000");
    expect(result.underlying).toBe("AAPL");
    expect(result.putCall).toBe("P");
    expect(result.strike).toBe(180);
  });

  it("parses decimal strike prices correctly", () => {
    const result = parseOptionSymbol("SPY   240119C00475500");
    expect(result.strike).toBe(475.5);
  });

  it("parses low strike prices correctly", () => {
    const result = parseOptionSymbol("F     240216C00012500");
    expect(result.strike).toBe(12.5);
  });

  it("trims underlying symbol", () => {
    const result = parseOptionSymbol("F     240216C00012500");
    expect(result.underlying).toBe("F");
  });

  it("throws error for invalid symbol length", () => {
    expect(() => parseOptionSymbol("AAPL")).toThrow("Invalid OCC symbol length");
    expect(() => parseOptionSymbol("AAPL  240119C00180")).toThrow(
      "Invalid OCC symbol length"
    );
  });

  it("throws error for invalid put/call indicator", () => {
    expect(() => parseOptionSymbol("AAPL  240119X00180000")).toThrow(
      "Invalid put/call indicator"
    );
  });
});

describe("formatOptionSymbol", () => {
  it("formats option symbol for display", () => {
    const formatted = formatOptionSymbol("TSLA  240119C00200000");
    expect(formatted).toContain("TSLA");
    expect(formatted).toContain("$200");
    expect(formatted).toContain("Call");
  });

  it("formats put option correctly", () => {
    const formatted = formatOptionSymbol("AAPL  240315P00180000");
    expect(formatted).toContain("AAPL");
    expect(formatted).toContain("$180");
    expect(formatted).toContain("Put");
  });

  it("formats decimal strike correctly", () => {
    const formatted = formatOptionSymbol("SPY   240119C00475500");
    expect(formatted).toContain("$475.5");
  });
});

describe("isOptionSymbol", () => {
  it("returns true for valid call option symbol", () => {
    expect(isOptionSymbol("TSLA  240119C00200000")).toBe(true);
  });

  it("returns true for valid put option symbol", () => {
    expect(isOptionSymbol("AAPL  240315P00180000")).toBe(true);
  });

  it("returns false for equity symbol", () => {
    expect(isOptionSymbol("AAPL")).toBe(false);
  });

  it("returns false for wrong length", () => {
    expect(isOptionSymbol("AAPL  240119C001800")).toBe(false);
    expect(isOptionSymbol("AAPL  240119C0018000000")).toBe(false);
  });

  it("returns false for invalid put/call indicator", () => {
    expect(isOptionSymbol("AAPL  240119X00180000")).toBe(false);
    expect(isOptionSymbol("AAPL  240119B00180000")).toBe(false);
  });

  it("returns false for non-numeric expiration", () => {
    expect(isOptionSymbol("AAPL  ABCDEFC00180000")).toBe(false);
  });

  it("returns false for non-numeric strike", () => {
    expect(isOptionSymbol("AAPL  240119CABCDEFGH")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isOptionSymbol("")).toBe(false);
  });
});

describe("round-trip conversion", () => {
  it("parse(build(params)) returns equivalent params", () => {
    const original = {
      underlying: "AAPL",
      expiration: new Date("2024-06-21"),
      putCall: "C" as const,
      strike: 185.5,
    };

    const symbol = buildOptionSymbol(original);
    const parsed = parseOptionSymbol(symbol);

    expect(parsed.underlying).toBe(original.underlying);
    expect(parsed.expiration.getFullYear()).toBe(original.expiration.getFullYear());
    expect(parsed.expiration.getMonth()).toBe(original.expiration.getMonth());
    expect(parsed.expiration.getDate()).toBe(original.expiration.getDate());
    expect(parsed.putCall).toBe(original.putCall);
    expect(parsed.strike).toBe(original.strike);
  });

  it("build(parse(symbol)) returns equivalent symbol", () => {
    const original = "MSFT  240920P00400000";
    const parsed = parseOptionSymbol(original);
    const rebuilt = buildOptionSymbol(parsed);
    expect(rebuilt).toBe(original);
  });
});
