import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { createRouter, querySerializers } from "@/index";

describe("@safekit/route", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("createRouter", () => {
    it("should create router with default options", () => {
      const router = createRouter();
      expect(router).toBeDefined();
      expect(router.paths()).toEqual([]);
    });

    it("should create router with baseUrl", () => {
      const router = createRouter({ baseUrl: "https://api.example.com" });
      expect(router).toBeDefined();
    });

    it("should create router with custom query serializer", () => {
      const customSerializer = vi.fn().mockReturnValue("custom=query");
      const router = createRouter({ serializeQuery: customSerializer });
      expect(router).toBeDefined();
    });

    it("should create router with named query serializer", () => {
      const router = createRouter({ serializeQuery: querySerializers.comma });
      expect(router).toBeDefined();
    });
  });

  describe("register", () => {
    it("should register routes", () => {
      const router = createRouter();
      const registeredRouter = router.register([{ path: "/home" }, { path: "/users/:id" }]);

      expect(registeredRouter.paths()).toEqual(["/home", "/users/:id"]);
    });

    it("should warn on duplicate route registration", () => {
      const router = createRouter();
      router.register([{ path: "/home" }]);
      router.register([{ path: "/home" }]);

      expect(consoleSpy).toHaveBeenCalledWith('Route pattern "/home" is being re-registered.');
    });
  });

  describe("path generation", () => {
    const router = createRouter().register([
      { path: "/home" },
      {
        path: "/users/:userId/profile",
        params: z.object({
          userId: z.string(),
        }),
      },
      {
        path: "/search",
        query: z.object({
          q: z.string(),
          page: z.number(),
        }),
      },
    ]);

    it("should generate simple paths", async () => {
      const path = await router.path({ path: "/home" });
      expect(path).toBe("/home");
    });

    it("should generate paths with parameters", async () => {
      const path = await router.path({
        path: "/users/:userId/profile",
        params: { userId: "123" },
      });
      expect(path).toBe("/users/123/profile");
    });

    it("should generate paths with query parameters", async () => {
      const path = await router.path({
        path: "/search",
        query: { q: "test", page: 1 },
      });
      expect(path).toBe("/search?q=test&page=1");
    });

    it("should throw error for missing required parameters", async () => {
      await expect(router.path({ path: "/users/:userId/profile" })).rejects.toThrow(
        'Missing required path parameter "userId"',
      );
    });

    it("should throw error for unregistered route", async () => {
      await expect(router.path({ path: "/not-found" as any })).rejects.toThrow(
        'Route pattern "/not-found" has not been registered',
      );
    });
  });

  describe("URL generation", () => {
    const router = createRouter({ baseUrl: "https://api.example.com" }).register([
      {
        path: "/search",
        query: z.object({
          q: z.string(),
        }),
      },
    ]);

    it("should generate URL with default baseUrl", async () => {
      const url = await router.URL({
        path: "/search",
        query: { q: "test" },
      });
      expect(url.href).toBe("https://api.example.com/search?q=test");
    });

    it("should generate URL with override baseUrl", async () => {
      const url = await router.URL({
        path: "/search",
        baseUrl: "https://staging.example.com",
        query: { q: "test" },
      });
      expect(url.href).toBe("https://staging.example.com/search?q=test");
    });

    it("should throw error when no baseUrl available", async () => {
      const routerWithoutBase = createRouter().register([{ path: "/test" }]);
      await expect(routerWithoutBase.URL({ path: "/test" })).rejects.toThrow(
        "Cannot build absolute URL: No baseUrl provided",
      );
    });
  });

  describe("href generation", () => {
    const router = createRouter({ baseUrl: "https://api.example.com" }).register([
      {
        path: "/search",
        query: z.object({
          q: z.string(),
        }),
      },
    ]);

    it("should generate href string", async () => {
      const href = await router.href({
        path: "/search",
        query: { q: "test" },
      });
      expect(href).toBe("https://api.example.com/search?q=test");
    });
  });

  describe("validation", () => {
    const router = createRouter().register([
      {
        path: "/users/:userId",
        params: z.object({
          userId: z.string().min(3),
        }),
      },
      {
        path: "/search",
        query: z.object({
          q: z.string().optional(),
          page: z.coerce.number().min(1),
        }),
      },
    ]);

    it("should validate params successfully", async () => {
      const path = await router.path({
        path: "/users/:userId",
        params: { userId: "user123" },
      });
      expect(path).toBe("/users/user123");
    });

    it("should validate query successfully", async () => {
      const path = await router.path({
        path: "/search",
        query: { q: "test", page: "2" },
      });
      expect(path).toBe("/search?q=test&page=2");
    });

    it("should throw validation error for invalid params", async () => {
      await expect(
        router.path({
          path: "/users/:userId",
          params: { userId: "ab" },
        }),
      ).rejects.toThrow();
    });

    it("should throw validation error for invalid query", async () => {
      await expect(
        router.path({
          path: "/search",
          query: { page: "invalid" },
        }),
      ).rejects.toThrow();
    });
  });

  describe("query serializers", () => {
    it("should serialize with brackets format", () => {
      const query = { tags: ["a", "b"], active: true };
      const result = querySerializers.brackets(query);
      expect(result).toBe("tags%5B%5D=a&tags%5B%5D=b&active=true");
    });

    it("should serialize with comma format", () => {
      const query = { tags: ["a", "b"], active: true };
      const result = querySerializers.comma(query);
      expect(result).toBe("tags=a%2Cb&active=true");
    });

    it("should serialize with native format", () => {
      const query = { tags: ["a", "b"], active: true };
      const result = querySerializers.native(query);
      expect(result).toBe("tags=a&tags=b&active=true");
    });

    it("should handle null and undefined values", () => {
      const query = { a: null, b: undefined, c: "value" };
      const result = querySerializers.brackets(query);
      // qs includes null values as empty strings, filters undefined
      expect(result).toBe("a=&c=value");
    });

    it("should serialize complex nested objects for paginated endpoint", () => {
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

      const bracketsResult = querySerializers.brackets(queryObject);
      const commaResult = querySerializers.comma(queryObject);
      const indicesResult = querySerializers.indices(queryObject);
      const nativeResult = querySerializers.native(queryObject);

      expect(bracketsResult).toBe("filter%5Bstatus%5D=active&filter%5Bage%5D=21&filter%5BuserIds%5D%5B%5D=abc1&filter%5BuserIds%5D%5B%5D=xyz2&orderBy%5B%5D%5Bfield%5D=lastName&orderBy%5B%5D%5Bdirection%5D=asc&orderBy%5B%5D%5Bfield%5D=createdAt&orderBy%5B%5D%5Bdirection%5D=desc&page=20&limit=10");
      expect(commaResult).toBe("filter%5Bstatus%5D=active&filter%5Bage%5D=21&filter%5BuserIds%5D=abc1%2Cxyz2&orderBy=%5Bobject%20Object%5D%2C%5Bobject%20Object%5D&page=20&limit=10");
      expect(indicesResult).toBe("filter%5Bstatus%5D=active&filter%5Bage%5D=21&filter%5BuserIds%5D%5B0%5D=abc1&filter%5BuserIds%5D%5B1%5D=xyz2&orderBy%5B0%5D%5Bfield%5D=lastName&orderBy%5B0%5D%5Bdirection%5D=asc&orderBy%5B1%5D%5Bfield%5D=createdAt&orderBy%5B1%5D%5Bdirection%5D=desc&page=20&limit=10");
      expect(nativeResult).toBe("filter=%7B%22status%22%3A%22active%22%2C%22age%22%3A21%2C%22userIds%22%3A%5B%22abc1%22%2C%22xyz2%22%5D%7D&orderBy=%5Bobject+Object%5D&orderBy=%5Bobject+Object%5D&page=20&limit=10");
    });

    it("should generate full URL with default brackets serialization for nested objects", async () => {
      const router = createRouter({ baseUrl: "https://api.example.com" }).register([
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

      expect(url).toBe("https://api.example.com/users?filter%5Bstatus%5D=active&filter%5Bage%5D=21&filter%5BuserIds%5D%5B%5D=abc1&filter%5BuserIds%5D%5B%5D=xyz2&orderBy%5B%5D%5Bfield%5D=lastName&orderBy%5B%5D%5Bdirection%5D=asc&orderBy%5B%5D%5Bfield%5D=createdAt&orderBy%5B%5D%5Bdirection%5D=desc&page=20&limit=10");
    });
  });

  describe("Paths type helper", () => {
    const router = createRouter().register([{ path: "/home" }, { path: "/users/:id" }]);

    it("should throw error when accessing Paths property", () => {
      expect(() => router.Paths).toThrow("Paths property is only for type extraction");
    });

    it("should return registered paths array", () => {
      const paths = router.paths();
      expect(paths).toEqual(["/home", "/users/:id"]);
    });
  });
});
