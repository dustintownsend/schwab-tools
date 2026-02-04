import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { AccountService } from "./index.js";
import { AccountServiceTest } from "../layers/test.js";
import { AccountNotFoundError } from "../errors.js";
import {
  mockAccountNumbers,
  mockAccounts,
  mockTransactions,
} from "../../test/fixtures/accounts.js";

describe("AccountService", () => {
  const testLayer = AccountServiceTest({
    accountNumbers: mockAccountNumbers,
    accounts: mockAccounts,
    transactions: mockTransactions,
  });

  describe("getAccountNumbers", () => {
    it("returns all account numbers", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getAccountNumbers;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toHaveLength(2);
      expect(result[0].accountNumber).toBe("12345678");
      expect(result[0].hashValue).toBe("ABC123HASH");
      expect(result[1].accountNumber).toBe("87654321");
    });
  });

  describe("getAccountHash", () => {
    it("returns hash for valid account number", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getAccountHash("12345678");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toBe("ABC123HASH");
    });

    it("fails with AccountNotFoundError for invalid account", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getAccountHash("99999999");
      });

      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayer)));

      expect(exit._tag).toBe("Failure");
      if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
        const error = exit.cause.error as AccountNotFoundError;
        expect(error._tag).toBe("AccountNotFoundError");
        expect(error.accountNumber).toBe("99999999");
      }
    });
  });

  describe("getAccount", () => {
    it("returns account details for valid hash", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getAccount("ABC123HASH");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.accountNumber).toBe("12345678");
      expect(result.accountHash).toBe("ABC123HASH");
      expect(result.type).toBe("MARGIN");
    });

    it("returns account with positions", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getAccount("ABC123HASH");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.positions).toHaveLength(2);

      const aaplPosition = result.positions.find((p) => p.symbol === "AAPL");
      expect(aaplPosition).toBeDefined();
      expect(aaplPosition?.quantity).toBe(100);
      expect(aaplPosition?.averagePrice).toBe(150.00);
      expect(aaplPosition?.assetType).toBe("EQUITY");
    });

    it("returns account with balances", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getAccount("ABC123HASH");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.balances.cashBalance).toBe(10000.00);
      expect(result.balances.liquidationValue).toBe(46854.50);
      expect(result.balances.buyingPower).toBe(28427.25);
    });

    it("fails with AccountNotFoundError for invalid hash", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getAccount("INVALID_HASH");
      });

      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayer)));

      expect(exit._tag).toBe("Failure");
      if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
        const error = exit.cause.error as AccountNotFoundError;
        expect(error._tag).toBe("AccountNotFoundError");
      }
    });
  });

  describe("getAccounts", () => {
    it("returns all accounts", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getAccounts;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toHaveLength(2);
      expect(result[0].accountNumber).toBe("12345678");
      expect(result[1].accountNumber).toBe("87654321");
    });

    it("returns accounts with different types", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getAccounts;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      const marginAccount = result.find((a) => a.type === "MARGIN");
      const iraAccount = result.find((a) => a.type === "IRA");

      expect(marginAccount).toBeDefined();
      expect(iraAccount).toBeDefined();
    });
  });

  describe("getTransactions", () => {
    it("returns transactions for account", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getTransactions("ABC123HASH");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toHaveLength(2);
    });

    it("returns transaction with correct fields", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getTransactions("ABC123HASH");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      const tradeTx = result.find((t) => t.type === "TRADE");
      expect(tradeTx).toBeDefined();
      expect(tradeTx?.transactionId).toBe("TX001");
      expect(tradeTx?.symbol).toBe("AAPL");
      expect(tradeTx?.quantity).toBe(100);
      expect(tradeTx?.price).toBe(150.00);
      expect(tradeTx?.netAmount).toBe(-15000.00);
    });

    it("returns transactions with Date objects", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getTransactions("ABC123HASH");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result[0].transactionDate).toBeInstanceOf(Date);
      expect(result[0].settlementDate).toBeInstanceOf(Date);
    });
  });

  describe("empty data handling", () => {
    const emptyLayer = AccountServiceTest({
      accountNumbers: [],
      accounts: [],
      transactions: [],
    });

    it("returns empty array for no accounts", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getAccountNumbers;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(emptyLayer)));
      expect(result).toHaveLength(0);
    });

    it("returns empty array for no transactions", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AccountService;
        return yield* service.getTransactions("SOME_HASH");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(emptyLayer)));
      expect(result).toHaveLength(0);
    });
  });
});
