# @safekit/route

A type-safe URL builder with validation support for TypeScript applications. Build URLs with path parameters and query strings while maintaining full type safety and runtime validation.

[![npm version](https://badge.fury.io/js/@safekit%2Froute.svg)](https://badge.fury.io/js/@safekit%2Froute)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **Type-safe** - Full TypeScript support with path and query parameter inference
- ✅ **Validation** - Support for any Standard Schema validation library (Zod, Yup, Valibot, etc.)
- ✅ **Flexible** - Multiple query string serialization formats
- ✅ **Lightweight** - Only depends on `qs` for query serialization
- ✅ **Framework agnostic** - Works with any TypeScript project

## Installation

```bash
npm install @safekit/route
yarn add @safekit/route
bun add @safekit/route
```

## Quick Start

```typescript
import { createRouter } from "@safekit/route";

// Create a router
const router = createRouter({
  baseUrl: "https://api.example.com",
});

// Register routes
const routes = router.register([
  { path: "/home" },
  { path: "/users/:userId/profile" },
  { path: "/search" },
]);

// Generate paths and URLs
const homePath = await routes.path({ path: "/home" });
// Result: "/home"

const userPath = await routes.path({
  path: "/users/:userId/profile",
  params: { userId: "123" },
});
// Result: "/users/123/profile"

const searchUrl = await routes.href({
  path: "/search",
  query: { q: "typescript", page: 1 },
});
// Result: "https://api.example.com/search?q=typescript&page=1"
```

## API Reference

### createRouter(options?)

Creates a new router instance.

**Options:**

- `baseUrl?: string` - Default base URL for absolute URLs
- `serializeQuery?: QuerySerializer` - Custom query string serializer

### router.register(definitions)

Registers route definitions with the router.

**Route Definition:**

```typescript
interface RouteDefinition {
  path: string; // URL pattern with :param syntax
  params?: SchemaValidator; // Validation schema for path parameters
  query?: SchemaValidator; // Validation schema for query parameters
}
```

**Note:** To use `params` or `query` parameters, you must register validation schemas during route registration for type safety.

### Methods

#### router.path(options)

Returns a relative path string.

```typescript
// Route must have schemas registered to use params/query
const router = createRouter().register([
  {
    path: "/users/:id",
    params: z.object({ id: z.string() }),
    query: z.object({ tab: z.string() }),
  },
]);

const path = await router.path({
  path: "/users/:id",
  params: { id: "123" },
  query: { tab: "settings" },
});
// Result: "/users/123?tab=settings"
```

#### router.URL(options)

Returns a URL object.

```typescript
// Route must have query schema registered to use query
const router = createRouter().register([
  {
    path: "/search",
    query: z.object({ q: z.string() }),
  },
]);

const url = await router.URL({
  path: "/search",
  query: { q: "test" },
});
// Result: URL object where url.href === "https://api.example.com/search?q=test"
```

#### router.href(options)

Returns an absolute URL string.

```typescript
const href = await router.href({
  path: "/search",
  query: { q: "test" },
  baseUrl: "https://staging.example.com", // Optional override
});
// Result: "https://staging.example.com/search?q=test"
```

#### router.paths()

Returns array of registered path patterns.

```typescript
const paths = router.paths();
// Result: ["/home", "/users/:userId/profile", "/search"]
```

## Validation Support

The package supports any validation library that follows the Standard Schema specification or provides common validation methods:

- Zod (v3 and v4)
- Yup
- Superstruct
- Valibot
- Custom validators
- Any Standard Schema compatible library

### Custom Validation

```typescript
const customValidator = (input: any) => {
  if (!input.token || input.token.length !== 32) {
    throw new Error("Invalid token");
  }
  return input;
};

const router = createRouter().register([
  {
    path: "/auth/:token",
    params: customValidator,
  },
]);
```



### Nested Objects and Complex Query Parameters

The default `qs` serialization handles deeply nested objects and arrays, making it perfect for complex API endpoints like paginated queries:

```typescript
import { createRouter } from "@safekit/route";
import { z } from "zod";

// Setup router with query validation
const router = createRouter().register([
  {
    path: "/users",
    query: z.object({
      filter: z.object({
        status: z.string(),
        age: z.number(),
        userIds: z.array(z.string()),
      }),
      orderBy: z.array(z.object({
        field: z.string(),
        direction: z.string(),
      })),
      page: z.number(),
      limit: z.number(),
    }),
  },
]);

// Example: Paginated endpoint with complex filtering
const queryObject = {
  filter: {
    status: "active",
    age: 21,
    userIds: ["abc1", "xyz2"],
  },
  orderBy: [
    { field: "lastName", direction: "asc" },
    { field: "createdAt", direction: "desc" },
  ],
  page: 20,
  limit: 10,
};

const url = await router.href({
  path: "/users",
  query: queryObject,
});

// Default (brackets) serialization output:
https://api.example.com/users?
  filter[status]=active&
  filter[age]=21&
  filter[userIds][]=abc1&
  filter[userIds][]=xyz2&
  orderBy[][field]=lastName&
  orderBy[][direction]=asc&
  orderBy[][field]=createdAt&
  orderBy[][direction]=desc&
  page=20&
  limit=10
```

## Query String Serialization

Choose from multiple query string formats:

```typescript
import { createRouter, querySerializers } from "@safekit/route";

createRouter({ serializeQuery: querySerializers.brackets });
createRouter({ serializeQuery: querySerializers.comma });
createRouter({ serializeQuery: querySerializers.native });
createRouter({ serializeQuery: querySerializers.indices });
```

**Arrays:**
```ts
const query = { tags: ["a", "b"] }
// Brackets (default): tags[]=a&tags[]=b
// Comma:              tags=a,b
// Native:             tags=a&tags=b
// Indices:            tags[0]=a&tags[1]=b
```

**Objects:**
```ts
const query = { filter: { status: "active", type: "user" } }
// Brackets (default): filter[status]=active&filter[type]=user
// Comma:              filter[status]=active&filter[type]=user
// Native:             filter={"status":"active","type":"user"}
// Indices:            filter[status]=active&filter[type]=user
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT © [safekit](https://github.com/safekit-labs)
