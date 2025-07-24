import { describe, it, expect } from "vitest";
import { createRouter } from "@/index";
import { z as zod3 } from "zod/v3";
import { z as zod4 } from "zod/v4";
import * as yup from "yup";
import * as st from "superstruct";
import * as v from "valibot";
import * as arktype from "arktype";
import { Schema } from "effect";
import * as T from "runtypes";

describe("Validation Library Support", () => {
  describe("Zod v3 schemas", () => {
    it("should validate params with Zod v3 schema", async () => {
      const router = createRouter().register([
        {
          path: "/users/:id",
          params: zod3.object({
            id: zod3.string().uuid(),
          }),
        },
      ]);

      // Valid UUID should work
      const path = await router.path({
        path: "/users/:id",
        params: { id: "123e4567-e89b-12d3-a456-426614174000" },
      });
      expect(path).toBe("/users/123e4567-e89b-12d3-a456-426614174000");

      // Invalid UUID should throw
      await expect(
        router.path({
          path: "/users/:id",
          params: { id: "invalid-uuid" },
        }),
      ).rejects.toThrow();
    });

    it("should validate query with Zod v3 schema", async () => {
      const router = createRouter().register([
        {
          path: "/search",
          query: zod3.object({
            q: zod3.string().optional(),
            page: zod3.number().int().positive().optional(),
            limit: zod3.number().int().min(1).max(100).optional(),
          }),
        },
      ]);

      // Valid query should work
      const path = await router.path({
        path: "/search",
        query: { q: "test", page: 2, limit: 10 },
      });
      expect(path).toMatch(/\/search\?/);
      expect(path).toMatch(/q=test/);
      expect(path).toMatch(/page=2/);
      expect(path).toMatch(/limit=10/);

      // Invalid page should throw
      await expect(
        router.path({
          path: "/search",
          query: { page: 0 },
        }),
      ).rejects.toThrow();
    });
  });

  describe("Zod v4 schemas", () => {
    it("should validate params with Zod v4 schema", async () => {
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
      ]);

      // Valid params and query
      const path = await router.path({
        path: "/posts/:postId/comments",
        params: { postId: "post_abc123" },
        query: { sort: "newest", page: 1 },
      });
      expect(path).toMatch(/\/posts\/post_abc123\/comments\?/);
      expect(path).toMatch(/sort=newest/);
      expect(path).toMatch(/page=1/);

      // Invalid postId format
      await expect(
        router.path({
          path: "/posts/:postId/comments",
          params: { postId: "invalid-format" },
          query: { sort: "newest" },
        }),
      ).rejects.toThrow();
    });

    it("should coerce query parameters with Zod v4", async () => {
      const router = createRouter().register([
        {
          path: "/api/data",
          query: zod4.object({
            count: zod4.coerce.number().int().positive(),
            enabled: zod4.coerce.boolean(),
            tags: zod4.array(zod4.string()).optional(),
          }),
        },
      ]);

      const path = await router.path({
        path: "/api/data",
        // @ts-expect-error - testing coercion from string values
        query: { count: "5", enabled: "true", tags: ["a", "b"] },
      });
      expect(path).toMatch(/count=5/);
      expect(path).toMatch(/enabled=true/);
    });
  });

  describe("Yup schemas", () => {
    it("should validate params with Yup schema", async () => {
      const router = createRouter().register([
        {
          path: "/profiles/:userId",
          params: yup.object({
            userId: yup.string().min(5).required(),
          }),
        },
      ]);

      const path = await router.path({
        path: "/profiles/:userId",
        params: { userId: "user12345" },
      });
      expect(path).toBe("/profiles/user12345");

      await expect(
        router.path({
          path: "/profiles/:userId",
          params: { userId: "usr" },
        }),
      ).rejects.toThrow();
    });

    it("should validate query with Yup schema", async () => {
      const router = createRouter().register([
        {
          path: "/api/users",
          query: yup.object({
            search: yup.string().optional(),
            limit: yup.number().min(1).max(100).required(),
          }),
        },
      ]);

      const path = await router.path({
        path: "/api/users",
        query: { search: "john", limit: 50 },
      });
      expect(path).toMatch(/limit=50/);

      await expect(
        router.path({
          path: "/api/users",
          query: { limit: 200 },
        }),
      ).rejects.toThrow();
    });
  });

  describe("Superstruct schemas", () => {
    it("should validate params with Superstruct schema", async () => {
      const router = createRouter().register([
        {
          path: "/products/:productId",
          params: st.object({
            productId: st.pattern(st.string(), /^prod_\w+$/),
          }),
        },
      ]);

      const path = await router.path({
        path: "/products/:productId",
        params: { productId: "prod_123abc" },
      });
      expect(path).toBe("/products/prod_123abc");

      await expect(
        router.path({
          path: "/products/:productId",
          params: { productId: "invalid" },
        }),
      ).rejects.toThrow();
    });
  });

  describe("Valibot schemas", () => {
    it("should validate params with Valibot schema", async () => {
      const router = createRouter().register([
        {
          path: "/items/:itemId",
          params: v.object({
            itemId: v.pipe(v.string(), v.minLength(3)),
          }),
        },
      ]);

      const path = await router.path({
        path: "/items/:itemId",
        params: { itemId: "item123" },
      });
      expect(path).toBe("/items/item123");

      await expect(
        router.path({
          path: "/items/:itemId",
          params: { itemId: "it" },
        }),
      ).rejects.toThrow();
    });
  });

  describe("ArkType schemas", () => {
    it("should validate params with ArkType schema", async () => {
      const router = createRouter().register([
        {
          path: "/users/:username",
          params: arktype.type({
            username: "string>2",
          }),
        },
      ]);

      const path = await router.path({
        path: "/users/:username",
        params: { username: "johndoe" },
      });
      expect(path).toBe("/users/johndoe");

      await expect(
        router.path({
          path: "/users/:username",
          params: { username: "ab" },
        }),
      ).rejects.toThrow();
    });

    it("should validate query with ArkType schema", async () => {
      const router = createRouter().register([
        {
          path: "/search",
          query: arktype.type({
            q: "string",
            page: "number>=1",
          }),
        },
      ]);

      const path = await router.path({
        path: "/search",
        query: { q: "test", page: 2 },
      });
      expect(path).toMatch(/q=test/);
      expect(path).toMatch(/page=2/);

      await expect(
        router.path({
          path: "/search",
          query: { q: "test", page: 0 },
        }),
      ).rejects.toThrow();
    });
  });

  describe("Effect Schema", () => {
    it("should validate params with Effect Schema", async () => {
      const router = createRouter().register([
        {
          path: "/orders/:orderId",
          params: Schema.standardSchemaV1(
            Schema.Struct({
              orderId: Schema.String,
            }),
          ),
        },
      ]);

      const path = await router.path({
        path: "/orders/:orderId",
        params: { orderId: "order123" },
      });
      expect(path).toBe("/orders/order123");
    });

    it("should validate query with Effect Schema", async () => {
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
      ]);

      const path = await router.path({
        path: "/api/data",
        query: { type: "users", count: 10 },
      });
      expect(path).toMatch(/type=users/);
      expect(path).toMatch(/count=10/);
    });
  });

  describe("Runtypes schemas", () => {
    it("should validate params with Runtypes schema", async () => {
      const router = createRouter().register([
        {
          path: "/docs/:docId",
          params: T.Object({
            docId: T.String,
          }),
        },
      ]);

      const path = await router.path({
        path: "/docs/:docId",
        params: { docId: "doc123" },
      });
      expect(path).toBe("/docs/doc123");
    });

    it("should validate query with Runtypes schema", async () => {
      const router = createRouter().register([
        {
          path: "/documents",
          query: T.Object({
            search: T.String,
            archived: T.Boolean,
          }),
        },
      ]);

      const path = await router.path({
        path: "/documents",
        query: { search: "report", archived: false },
      });
      expect(path).toMatch(/search=report/);
      expect(path).toMatch(/archived=false/);
    });
  });

  describe("Custom function validators", () => {
    it("should validate params with custom function", async () => {
      const customValidator = (input: any) => {
        if (!input.token || typeof input.token !== "string") {
          throw new Error("Token is required and must be a string");
        }
        if (input.token.length !== 32) {
          throw new Error("Token must be exactly 32 characters");
        }
        return input;
      };

      const router = createRouter().register([
        {
          path: "/auth/:token",
          params: customValidator,
        },
      ]);

      const validToken = "a".repeat(32);
      const path = await router.path({
        path: "/auth/:token",
        params: { token: validToken },
      });
      expect(path).toBe(`/auth/${validToken}`);

      await expect(
        router.path({
          path: "/auth/:token",
          params: { token: "short" },
        }),
      ).rejects.toThrow("Token must be exactly 32 characters");
    });

    it("should validate query with custom function", async () => {
      const customValidator = (input: any) => {
        const validated = { ...input };
        if (validated.version) {
          const version = Number(validated.version);
          if (isNaN(version) || version < 1 || version > 10) {
            throw new Error("Version must be between 1 and 10");
          }
          validated.version = version;
        }
        return validated;
      };

      const router = createRouter().register([
        {
          path: "/api",
          query: customValidator,
        },
      ]);

      const path = await router.path({
        path: "/api",
        query: { action: "list", version: 3 },
      });
      expect(path).toMatch(/version=3/);

      await expect(
        router.path({
          path: "/api",
          query: { version: 15 },
        }),
      ).rejects.toThrow("Version must be between 1 and 10");
    });
  });

  describe("Standard Schema v1 format", () => {
    it("should validate params with Standard Schema", async () => {
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
      ]);

      const path = await router.path({
        path: "/users/:email",
        params: { email: "test@example.com" },
      });
      expect(path).toBe("/users/test%40example.com");

      await expect(
        router.path({
          path: "/users/:email",
          params: { email: "invalid-email" },
        }),
      ).rejects.toThrow("Invalid email format");
    });

    it("should validate query with Standard Schema", async () => {
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
      ]);

      const path = await router.path({
        path: "/items",
        query: { type: "book", count: 5 },
      });
      expect(path).toMatch(/count=5/);

      await expect(
        router.path({
          path: "/items",
          query: { count: -1 },
        }),
      ).rejects.toThrow("Count must be a positive number");
    });
  });

  describe("No validation", () => {
    it("should pass through params without validation when no schema", async () => {
      const router = createRouter().register([
        {
          path: "/public/:any",
          // No params schema
        },
      ]);

      const path = await router.path({
        path: "/public/:any",
        params: { any: "anything-goes-123!@#" },
      });
      expect(path).toBe("/public/anything-goes-123!%40%23");
    });

    it("should pass through query without validation when no schema", async () => {
      const router = createRouter().register([
        {
          path: "/open",
          // No query schema
        },
      ]);

      const path = await router.path({
        path: "/open",
        query: { whatever: "value", number: 123, special: "!@#$%" },
      });
      expect(path).toMatch(/\/open\?/);
      expect(path).toMatch(/whatever=value/);
      expect(path).toMatch(/number=123/);
    });
  });

  describe("Error cases", () => {
    it("should require params when path has parameters", async () => {
      const router = createRouter().register([
        {
          path: "/users/:userId",
          // No params schema but path has :userId
        },
      ]);

      await expect(
        router.path({
          path: "/users/:userId",
          // Missing params
        }),
      ).rejects.toThrow('Missing required path parameter "userId"');
    });

    it("should validate async schemas", async () => {
      const asyncSchema = {
        "~standard": {
          version: 1 as const,
          vendor: "test",
          validate: async (input: unknown) => {
            // Simulate async validation
            await new Promise((resolve) => setTimeout(resolve, 10));
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
          path: "/async/:id",
          params: asyncSchema,
        },
      ]);

      const path = await router.path({
        path: "/async/:id",
        params: { id: "abc123" },
      });
      expect(path).toBe("/async/abc123");

      await expect(
        router.path({
          path: "/async/:id",
          params: { id: "ab" },
        }),
      ).rejects.toThrow("ID must be at least 3 characters");
    });
  });
});
