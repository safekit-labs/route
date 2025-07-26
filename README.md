# @safekit/route

A type-safe URL builder with validation support for TypeScript applications. Build URLs with path parameters and query strings while maintaining full type safety and runtime validation.

[![npm version](https://badge.fury.io/js/@safekit%2Froute.svg)](https://badge.fury.io/js/@safekit%2Froute)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **Type-safe** - Full TypeScript support with path and query parameter inference
- ✅ **Validation** - Support for Standard Schema compatible validation libraries (Zod, Valibot, ArkType, etc.)
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

Commonly used to have a registry of your frontend routes for navigating to different pages via links or buttons

```ts
import { z } from "zod";
import { createRouter } from "@safekit/route";

// Create a router
const router = createRouter({
  baseUrl: "http://localhost:3000",
});

// Register routes
const appRoutes = router.register([
  { path: "/login" },
  { path: "/register", query: { email: z.string().email() } },
  { path: "/users/:userId/profile", params: { userId: z.string() } },
] as const);

// Generate paths and URLs
const homePath = appRoutes.path({ path: "/login" });
// Result: "/login"

const userPath = appRoutes.path({
  path: "/users/:userId/profile",
  params: { userId: "123" },
});
// Result: "/users/123/profile"

const searchUrl = appRoutes.href({
  path: "/register",
  query: { email: "john.smith@gmail.com" },
});
// Result: "http://localhost:3000/register?email=john.smith%40gmail.com"
```

You can also use it to have a registry of your backend urls

```ts
// Create a router
const router = createRouter({
  baseUrl: "https://app.example.com/api",
});

// Register routes
const apiRoutes = router.register([
  {
    path: "/auth/social/callback/:provider",
    params: z.object({
      provider: z.enum(["google", "github"]),
    }),
    query: z.object({
      code: z.string(),
      state: z.string().optional(),
      error: z.string().optional(),
      error_description: z.string().optional(),
    }),
  },
] as const);

// Generate callback URLs
const googleCallback = apiRoutes.href({
  path: "/auth/social/callback/:provider",
  params: { provider: "google" },
  query: { code: "auth_code_123", state: "random_state_token" },
});
// Result: "https://app.example.com/api/auth/social/callback/google?code=auth_code_123&state=random_state_token"
```

## Type-Safe API

`@safekit/route` leverages TypeScript to provide a fully type-safe experience from registration to usage.

### Path Type Inference

By using `as const` on your route definitions, the router can infer a union type of all valid path strings. This type can be extracted using `typeof router.Paths`.

```ts
const appRoutes = router.register([
  { path: "/home" },
  { path: "/users/:userId" },
] as const); // 'as const' is essential!

// Extract the type
export type AppPath = typeof appRoutes.Paths;
// AppPath is now "/home" | "/users/:userId"

// Use it for type-safe functions
function navigate(path: AppPath) { /* ... */ }

navigate("/home"); // ✅ OK

// ❌ TypeScript Error! The literal string "/users/123" is not assignable
// to the type '"/home" | "/users/:userId"'.
navigate("/users/123");

// ✅ The correct way is to build the path, which is also type-safe:
const userPath = appRoutes.path({ path: "/users/:userId", params: { userId: "123" } });
// navigate(userPath) would work if the function accepted a string
```

### Parameter and Query Inference

When you use `.path()`, `.URL()`, or `.href()`, the types for `params` and `query` are automatically inferred based on the `path` you provide and the schemas you registered.

```ts
const routes = router.register([
  { path: "/users/:userId", params: z.object({ userId: z.string() }) },
  { path: "/search", query: z.object({ q: z.string() }) },
] as const);

// TypeScript knows 'params' is required and must have 'userId: string'
routes.path({
  path: "/users/:userId",
  params: { userId: "abc" },
});

// TypeScript knows 'query' is required and must have 'q: string'
routes.href({
  path: "/search",
  query: { q: "hello" },
});

// TypeScript will throw an error if you use the wrong params
routes.path({
  path: "/search",
  // @ts-expect-error: 'params' is not applicable to '/search'
  params: { id: 123 },
});
```

## API Reference

### createRouter(options?)

Creates a new router instance.

**Options:**

- `baseUrl?: string` - Default base URL for absolute URLs
- `querySerializer?: QuerySerializer` - Custom query string serializer

### router.register(definitions)

Registers route definitions with the router.

**Route Definition:**

```typescript
interface RouteDefinition {
  path: string; // URL pattern with :param syntax
  // Standard Schema compatible objects that produce object-like outputs
  params?: StandardSchemaV1<unknown, Record<string, unknown>>;
  query?: StandardSchemaV1<unknown, Record<string, unknown>>;
}
```

**Note:** To use `params` or `query` parameters, you must register validation schemas during route registration for type safety. Schemas must produce object-like outputs (e.g., `Record<string, unknown>`) to work with the router's path parameter and query serialization features.

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
] as const);

const path = router.path({
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
] as const);

const url = router.URL({
  path: "/search",
  query: { q: "test" },
});
//  Result: URL object where
//  url.href === "https://api.example.com/search?q=test"
//  origin: 'https://api.example.com',
//  protocol: 'https:',
//  host: 'api.example.com',
//  hostname: 'api.example.com',
//  pathname: '/search',
//  search: '?q=test',
//  searchParams: URLSearchParams { 'q' => 'test' },
```

#### router.href(options)

Returns an absolute URL string.

```typescript
const href = router.href({
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

The package supports any validation library that follows the [Standard Schema specification](https://github.com/standard-schema/standard-schema):

- **Zod** (v3 and v4) - Use schemas directly or with `.standardSchema()` method
- **Valibot** - Use schemas directly with Standard Schema support
- **ArkType** - Use schemas directly with Standard Schema support  
- **Effect Schema** - Use with `Schema.standardSchemaV1()` wrapper
- Any other Standard Schema v1 compatible library

All validation libraries must implement the Standard Schema interface with a `"~standard"` property containing the validation logic.

## Nested Objects and Complex Query Parameters

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
] as const);

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

const url = router.href({
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

createRouter({ querySerializer: querySerializers.brackets });
createRouter({ querySerializer: querySerializers.comma });
createRouter({ querySerializer: querySerializers.native });
createRouter({ querySerializer: querySerializers.indices });
```

**Arrays:**

```ts
const query = { tags: ["a", "b"] };
// Brackets (default): tags[]=a&tags[]=b
// Comma:              tags=a,b
// Native:             tags=a&tags=b
// Indices:            tags[0]=a&tags[1]=b
```

**Objects:**

```ts
const query = { filter: { status: "active", type: "user" } };
// Brackets (default): filter[status]=active&filter[type]=user
// Comma:              filter[status]=active&filter[type]=user
// Native:             filter={"status":"active","type":"user"} (Not recommended for objects)
// Indices:            filter[status]=active&filter[type]=user
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT © [safekit](https://github.com/safekit-labs)
