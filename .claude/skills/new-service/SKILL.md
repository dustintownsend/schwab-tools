---
name: new-service
description: Create a new Effect service with proper layer composition, types, and test infrastructure
disable-model-invocation: true
---

Create a new Effect service named: $ARGUMENTS

## Files to Create/Modify

A new service requires these files:

### 1. Service Definition (`packages/core/src/services/index.ts`)

Add the service interface and Context.Tag:

```typescript
// ============================================================================
// {ServiceName} Service
// ============================================================================

export interface {ServiceName}Shape {
  readonly methodName: (
    param: ParamType
  ) => Effect.Effect<ReturnType, SchwabClientError>;
}

export class {ServiceName} extends Context.Tag("{ServiceName}")<
  {ServiceName},
  {ServiceName}Shape
>() {}
```

### 2. Service Implementation (`packages/core/src/services/{service-name}.ts`)

```typescript
import { Effect, Layer } from "effect";
import { HttpClient, {ServiceName}, type {ServiceName}Shape } from "./index.js";
import type { SchwabClientError } from "../errors.js";

export const {ServiceName}Live = Layer.effect(
  {ServiceName},
  Effect.gen(function* () {
    const http = yield* HttpClient;

    return {
      methodName: (param) =>
        Effect.gen(function* () {
          const response = yield* http.request<ApiResponseType>({
            method: "GET",
            path: "/endpoint",
            params: { param },
          });
          return transformResponse(response);
        }),
    } satisfies {ServiceName}Shape;
  })
);
```

### 3. Add to Live Layer (`packages/core/src/layers/live.ts`)

```typescript
// Import
import { {ServiceName}Live } from "../services/{service-name}.js";

// Add to SchwabServices type
export type SchwabServices =
  | ... existing services ...
  | {ServiceName};

// Add to DomainServicesLive
const DomainServicesLive = Layer.mergeAll(
  ... existing services ...,
  {ServiceName}Live
);
```

### 4. Test Layer (`packages/core/src/layers/test.ts`)

```typescript
export const {ServiceName}Test = (mockData: { /* mock data shape */ }) =>
  Layer.succeed({ServiceName}, {
    methodName: (param) => Effect.succeed(mockData.result),
  });
```

### 5. Test Fixtures (`packages/core/test/fixtures/{service-name}.ts`)

```typescript
import type { ResponseType } from "../../src/schemas/index.js";

export const mock{ServiceName}Data: ResponseType[] = [
  // Realistic test data
];
```

### 6. Tests (`packages/core/src/services/{service-name}.test.ts`)

Follow the patterns in `packages/core/src/services/quotes.test.ts`.

### 7. Export from Core (`packages/core/src/index.ts`)

Add exports for the service tag, shape type, and any new schema types.

## Instructions

1. Ask for clarification on:
   - What Schwab API endpoints this service will call
   - What methods the service should expose
   - What error types are needed

2. Create files in the order listed above

3. Run `bun run typecheck` to verify types

4. Run `bun test` to verify tests pass
