import { describe, it, expect } from "vitest";
import { createRouter } from "@/index";
import { z as zod3 } from "zod/v3";
import { z as zod4 } from "zod/v4";
import * as v from "valibot";
import * as arktype from "arktype";
import { Schema } from "effect";

describe("Validation Library Support", () => {
  describe("Zod v3 schemas", () => {
    it("should validate params with Zod v3 schema", () => {
      const router = createRouter().register([
        {
          path: "/users/:id",
          params: zod3.object({
            id: zod3.string().uuid(),
          }),
        },
      ] as const);

      // Valid UUID should work
      const path = router.path({
        path: "/users/:id",
        params: { id: "123e4567-e89b-12d3-a456-426614174000" },
      });
      expect(path).toBe("/users/123e4567-e89b-12d3-a456-426614174000");

      // Invalid UUID should throw
      expect(() =>
        router.path({
          path: "/users/:id",
          params: { id: "invalid-uuid" },
        }),
      ).toThrow();
    });

    it("should validate query with Zod v3 schema", () => {
      const router = createRouter().register([
        {
          path: "/search",
          query: zod3.object({
            q: zod3.string().optional(),
            page: zod3.number().int().positive().optional(),
            limit: zod3.number().int().min(1).max(100).optional(),
          }),
        },
      ] as const);

      // Valid query should work
      const path = router.path({
        path: "/search",
        query: { q: "test", page: 2, limit: 10 },
      });
      expect(path).toMatch(/\/search\?/);
      expect(path).toMatch(/q=test/);
      expect(path).toMatch(/page=2/);
      expect(path).toMatch(/limit=10/);

      // Invalid page should throw
      expect(() =>
        router.path({
          path: "/search",
          query: { page: 0 },
        }),
      ).toThrow();
    });
  });

  describe("Zod v4 schemas", () => {
    it("should validate params with Zod v4 schema", () => {
      const router = createRouter().register([
        {
          path: "/posts/:postId/comments",
          params: zod4.object({
            postId: zod4.string().regex(/^post_[a-zA-Z0-9]+$/),
          }),
          query: zod4.object({
            sort: zod4.enum(["newest", "oldest", "popular"]).optional(),
            page: zod4.number().int().positive().optional(),
          }),
        },
      ] as const);

      // Valid params and query
      const path = router.path({
        path: "/posts/:postId/comments",
        params: { postId: "post_abc123" },
        query: { sort: "newest", page: 1 },
      });
      expect(path).toMatch(/\/posts\/post_abc123\/comments\?/);
      expect(path).toMatch(/sort=newest/);
      expect(path).toMatch(/page=1/);

      // Invalid postId format
      expect(() =>
        router.path({
          path: "/posts/:postId/comments",
          params: { postId: "invalid-format" },
          query: { sort: "newest" },
        }),
      ).toThrow();
    });

    it("should coerce query parameters with Zod v4", () => {
      const router = createRouter().register([
        {
          path: "/api/data",
          query: zod4.object({
            count: zod4.coerce.number().int().positive(),
            enabled: zod4.coerce.boolean(),
            tags: zod4.array(zod4.string()).optional(),
          }),
        },
      ] as const);

      const path = router.path({
        path: "/api/data",
        query: { count: "5", enabled: "true", tags: ["a", "b"] },
      });
      expect(path).toMatch(/count=5/);
      expect(path).toMatch(/enabled=true/);
    });

    it("should handle Zod v4 coercion with proper input/output types", () => {
      // Create schema with coercion: string input -> number output
      const paginationSchema = zod4.object({
        page: zod4.coerce.number<string>(), // Input: string, Output: number
        limit: zod4.coerce.number<string>().int().positive(),
        offset: zod4.coerce.number<string | number>().optional(), // Input: string | number, Output: number | undefined
      });

      const router = createRouter().register([
        {
          path: "/api/items",
          query: paginationSchema,
        },
      ] as const);

      // Test with string inputs (should be accepted and coerced to numbers)
      const path = router.path({
        path: "/api/items",
        query: {
          page: "1",      // string -> number
          limit: "10",    // string -> number
          offset: "20"    // string -> number
        },
      });

      expect(path).toMatch(/page=1/);
      expect(path).toMatch(/limit=10/);
      expect(path).toMatch(/offset=20/);
    });

    it("should validate Zod v4 coercion transforms string to number", () => {
      const schema = zod4.object({
        count: zod4.coerce.number<string>(),
        price: zod4.coerce.number<string>().multipleOf(0.01), // For currency
      });

      const router = createRouter().register([
        {
          path: "/products/:productId",
          params: zod4.object({ productId: zod4.string() }),
          query: schema,
        },
      ] as const);

      // Should accept string inputs and coerce to numbers
      const path = router.path({
        path: "/products/:productId",
        params: { productId: "prod123" },
        query: {
          count: "42",     // string input
          price: "19.99"   // string input
        },
      });

      expect(path).toBe("/products/prod123?count=42&price=19.99");
    });

    it("should handle mixed coercion types properly", () => {
      const mixedSchema = zod4.object({
        stringToNumber: zod4.coerce.number<string>(),
        stringToBoolean: zod4.coerce.boolean<string>(),
        numberToString: zod4.coerce.string<number>(),
        anyToNumber: zod4.coerce.number(), // accepts any input type
      });

      const router = createRouter().register([
        {
          path: "/test",
          query: mixedSchema,
        },
      ] as const);

      const path = router.path({
        path: "/test",
        query: {
          stringToNumber: "123",    // string -> number
          stringToBoolean: "true",  // string -> boolean
          numberToString: 456,      // number -> string
          anyToNumber: "789",       // any -> number
        },
      });

      expect(path).toMatch(/stringToNumber=123/);
      expect(path).toMatch(/stringToBoolean=true/);
      expect(path).toMatch(/numberToString=456/);
      expect(path).toMatch(/anyToNumber=789/);
    });

    it("should properly handle StandardSchemaV1.InferInput vs InferOutput types", () => {
      // Create a schema where input and output types differ due to coercion
      const coercionSchema = zod4.object({
        page: zod4.coerce.number<string>(), // Input: string, Output: number
        limit: zod4.coerce.number<string>(),
      });

      const router = createRouter().register([
        {
          path: "/pagination",
          query: coercionSchema,
        },
      ] as const);

      // This should work - passing string inputs that get coerced to numbers
      const path = router.path({
        path: "/pagination",
        query: {
          page: "1",    // string input (InferInput type)
          limit: "20",  // string input (InferInput type)
        },
      });

      expect(path).toBe("/pagination?page=1&limit=20");

      // The validation should have coerced strings to numbers internally
      // (this tests that our standardValidate function properly handles the transformation)
    });
  });

  describe("Valibot schemas", () => {
    it("should validate params with Valibot schema", () => {
      const router = createRouter().register([
        {
          path: "/items/:itemId",
          params: v.object({
            itemId: v.pipe(v.string(), v.minLength(3)),
          }),
        },
      ] as const);

      const path = router.path({
        path: "/items/:itemId",
        params: { itemId: "item123" },
      });
      expect(path).toBe("/items/item123");

      expect(() =>
        router.path({
          path: "/items/:itemId",
          params: { itemId: "it" },
        }),
      ).toThrow();
    });
  });

  describe("ArkType schemas", () => {
    it("should validate params with ArkType schema", () => {
      const router = createRouter().register([
        {
          path: "/users/:username",
          params: arktype.type({
            username: "string>2",
          }),
        },
      ] as const);

      const path = router.path({
        path: "/users/:username",
        params: { username: "johndoe" },
      });
      expect(path).toBe("/users/johndoe");

      expect(() =>
        router.path({
          path: "/users/:username",
          params: { username: "ab" },
        }),
      ).toThrow();
    });

    it("should validate query with ArkType schema", () => {
      const router = createRouter().register([
        {
          path: "/search",
          query: arktype.type({
            q: "string",
            page: "number>=1",
          }),
        },
      ] as const);

      const path = router.path({
        path: "/search",
        query: { q: "test", page: 2 },
      });
      expect(path).toMatch(/q=test/);
      expect(path).toMatch(/page=2/);

      expect(() =>
        router.path({
          path: "/search",
          query: { q: "test", page: 0 },
        }),
      ).toThrow();
    });
  });

  describe("Effect Schema", () => {
    it("should validate params with Effect Schema", () => {
      const router = createRouter().register([
        {
          path: "/orders/:orderId",
          params: Schema.standardSchemaV1(
            Schema.Struct({
              orderId: Schema.String,
            }),
          ),
        },
      ] as const);

      const path = router.path({
        path: "/orders/:orderId",
        params: { orderId: "order123" },
      });
      expect(path).toBe("/orders/order123");
    });

    it("should validate query with Effect Schema", () => {
      const router = createRouter().register([
        {
          path: "/api/data",
          query: Schema.standardSchemaV1(
            Schema.Struct({
              type: Schema.String,
              count: Schema.Number,
            }),
          ),
        },
      ] as const);

      const path = router.path({
        path: "/api/data",
        query: { type: "users", count: 10 },
      });
      expect(path).toMatch(/type=users/);
      expect(path).toMatch(/count=10/);
    });
  });


  describe("Standard Schema v1 format", () => {
    it("should validate params with Standard Schema", () => {
      const standardSchema = {
        "~standard": {
          version: 1 as const,
          vendor: "test",
          validate: (input: unknown) => {
            const data = input as any;
            if (!data.email || !data.email.includes("@")) {
              return {
                issues: [{ message: "Invalid email format" }],
              };
            }
            return { value: data };
          },
        },
      };

      const router = createRouter().register([
        {
          path: "/users/:email",
          params: standardSchema,
        },
      ] as const);

      const path = router.path({
        path: "/users/:email",
        params: { email: "test@example.com" },
      });
      expect(path).toBe("/users/test%40example.com");

      expect(() =>
        router.path({
          path: "/users/:email",
          params: { email: "invalid-email" },
        }),
      ).toThrow("Invalid email format");
    });

    it("should validate query with Standard Schema", () => {
      const standardSchema = {
        "~standard": {
          version: 1 as const,
          vendor: "test",
          validate: (input: unknown) => {
            const data = input as any;
            const validated = { ...data };
            if (validated.count !== undefined) {
              validated.count = Number(validated.count);
              if (isNaN(validated.count) || validated.count < 0) {
                return {
                  issues: [{ message: "Count must be a positive number" }],
                };
              }
            }
            return { value: validated };
          },
        },
      };

      const router = createRouter().register([
        {
          path: "/items",
          query: standardSchema,
        },
      ] as const);

      const path = router.path({
        path: "/items",
        query: { type: "book", count: 5 },
      });
      expect(path).toMatch(/count=5/);

      expect(() =>
        router.path({
          path: "/items",
          query: { count: -1 },
        }),
      ).toThrow("Count must be a positive number");
    });
  });

  describe("No validation", () => {
    it("should pass through params without validation when no schema", () => {
      const router = createRouter().register([
        {
          path: "/public/:any",
          // No params schema
        },
      ] as const);

      const path = router.path({
        path: "/public/:any",
        params: { any: "anything-goes-123!@#" },
      });
      expect(path).toBe("/public/anything-goes-123!%40%23");
    });

    it("should pass through query without validation when no schema", () => {
      const router = createRouter().register([
        {
          path: "/open",
          // No query schema
        },
      ] as const);

      const path = router.path({
        path: "/open",
        query: { whatever: "value", number: 123, special: "!@#$%" },
      });
      expect(path).toMatch(/\/open\?/);
      expect(path).toMatch(/whatever=value/);
      expect(path).toMatch(/number=123/);
    });
  });

  describe("Error cases", () => {
    it("should require params when path has parameters", () => {
      const router = createRouter().register([
        {
          path: "/users/:userId",
          // No params schema but path has :userId
        },
      ] as const);

      expect(() =>
        router.path({
          path: "/users/:userId",
          // Missing params
        }),
      ).toThrow('Missing required path parameter "userId"');
    });

    it("should validate schemas with sync validation", () => {
      const syncSchema = {
        "~standard": {
          version: 1 as const,
          vendor: "test",
          validate: (input: unknown) => {
            const data = input as any;
            if (!data.id || data.id.length < 3) {
              return {
                issues: [{ message: "ID must be at least 3 characters" }],
              };
            }
            return { value: data };
          },
        },
      };

      const router = createRouter().register([
        {
          path: "/sync/:id",
          params: syncSchema,
        },
      ] as const);

      const path = router.path({
        path: "/sync/:id",
        params: { id: "abc123" },
      });
      expect(path).toBe("/sync/abc123");

      expect(() =>
        router.path({
          path: "/sync/:id",
          params: { id: "ab" },
        }),
      ).toThrow("ID must be at least 3 characters");
    });
  });
});
