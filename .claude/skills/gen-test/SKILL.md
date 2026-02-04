---
name: gen-test
description: Generate Effect-style tests with mock service layers following project conventions
disable-model-invocation: true
---

Generate tests for: $ARGUMENTS

## Project Test Patterns

This project uses Effect's dependency injection for testable services. Follow these patterns:

### Imports
```typescript
import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { ServiceName } from "./index.js";
import { ServiceNameTest } from "../layers/test.js";
import { mockData } from "../../test/fixtures/<domain>.js";
```

### Test Structure
```typescript
describe("ServiceName", () => {
  const testLayer = ServiceNameTest(mockData);

  describe("methodName", () => {
    it("describes expected behavior", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ServiceName;
        return yield* service.methodName(args);
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
      expect(result).toEqual(expected);
    });
  });
});
```

### Testing Errors
```typescript
it("fails with SpecificError for invalid input", async () => {
  const program = Effect.gen(function* () {
    const service = yield* ServiceName;
    return yield* service.methodThatFails("invalid");
  });

  const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayer)));

  expect(exit._tag).toBe("Failure");
  if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
    const error = exit.cause.error as SpecificError;
    expect(error._tag).toBe("SpecificError");
  }
});
```

## Instructions

1. Read the source file to understand the service/function being tested
2. Check if a test layer exists in `packages/core/src/layers/test.ts`
3. Check for existing fixtures in `packages/core/test/fixtures/`
4. Generate tests that:
   - Test the happy path for each public method
   - Test error cases using `Effect.runPromiseExit`
   - Use descriptive test names
   - Follow the import patterns above

## Reference Files
- Test example: `packages/core/src/services/quotes.test.ts`
- Test layers: `packages/core/src/layers/test.ts`
- Fixtures: `packages/core/test/fixtures/`
