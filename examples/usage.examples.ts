import { createRouter, querySerializers } from "../src";
import { z } from "zod";

// ========================================================================
// BASIC USAGE
// ========================================================================

const router = createRouter({
  baseUrl: "https://api.example.com"
});

// Basic routes without params or query validation
const basicRouter = router.register([
  { path: "/home" },
  { path: "/about" },
  { path: "/contact" }
] as const);

function basicExamples() {
  console.log("=== BASIC USAGE ===");

  const homePath = basicRouter.path({ path: "/home" });
  console.log("Home path:", homePath);

  const aboutUrl = basicRouter.href({ path: "/about" });
  console.log("About URL:", aboutUrl);

  const allPaths = basicRouter.paths();
  console.log("All registered paths:", allPaths);
}

// ========================================================================
// PARAMS AND QUERY WITH VALIDATION
// ========================================================================


// IMPORTANT: To use params or query, you MUST register schemas for them
const validationRouter = createRouter({
  baseUrl: "https://api.example.com"
}).register([
  {
    path: "/users/:userId/profile",
    params: z.object({
      userId: z.string().min(3)
    })
  },
  {
    path: "/search",
    query: z.object({
      page: z.coerce.number().int().positive()
    })
  },
  {
    path: "/posts/:postId",
    params: z.object({
      postId: z.string().min(1)
    }),
    query: z.object({
      tab: z.string(),
      sort: z.string()
    })
  }
] as const);

function validationExamples() {
  console.log("\n=== PARAMS AND QUERY WITH VALIDATION ===");

  // Example 1: Using params (schema required)
  try {
    const userPath = validationRouter.path({
      path: "/users/:userId/profile",
      params: { userId: "user123" }
    });
    console.log("Valid user path:", userPath);
  } catch (error) {
    console.error("Validation error:", error);
  }

  // Example 2: Using query (schema required)
  try {
    const searchUrl = validationRouter.href({
      path: "/search",
      query: { page: 2 }
    });
    console.log("Valid search URL:", searchUrl);
  } catch (error) {
    console.error("Validation error:", error);
  }

  // Example 3: Using both params and query (both schemas required)
  try {
    const postUrl = validationRouter.href({
      path: "/posts/:postId",
      params: { postId: "post123" },
      query: { tab: "comments", sort: "newest" }
    });
    console.log("Valid post URL:", postUrl);
  } catch (error) {
    console.error("Validation error:", error);
  }

  // Example 4: Validation error
  try {
    validationRouter.path({
      path: "/users/:userId/profile",
      params: { userId: "ab" } // Too short, will fail validation
    });
  } catch (error) {
    console.log("Expected validation error:", (error as Error).message);
  }
}

// ========================================================================
// QUERY SERIALIZERS
// ========================================================================

// Zod schema for query parameters
const searchQuerySchema = z.object({
  tags: z.array(z.string()).optional(),
  filters: z.object({
    active: z.boolean(),
    category: z.string()
  }).optional(),
  page: z.number().optional()
});

const data = {
  tags: ['typescript', 'javascript'],
  filters: { active: true, category: 'web' },
  page: 1
};

function serializerExamples() {
  console.log("\n=== QUERY SERIALIZERS ===");

  const bracketRouter = createRouter({
    baseUrl: "https://api.example.com",
    querySerializer: querySerializers.brackets
  }).register([{ path: "/search", query: searchQuerySchema }] as const);

  const commaRouter = createRouter({
    baseUrl: "https://api.example.com",
    querySerializer: querySerializers.comma
  }).register([{ path: "/search", query: searchQuerySchema }] as const);

  const nativeRouter = createRouter({
    baseUrl: "https://api.example.com",
    querySerializer: querySerializers.native
  }).register([{ path: "/search", query: searchQuerySchema }] as const);

  console.log("Bracket style:");
  console.log(bracketRouter.href({ path: "/search", query: data }));

  console.log("\nComma style:");
  console.log(commaRouter.href({ path: "/search", query: data }));

  console.log("\nNative style:");
  console.log(nativeRouter.href({ path: "/search", query: data }));

  console.log("\nDirect serializer usage:");
  console.log("Brackets:", querySerializers.brackets(data));
  console.log("Indices:", querySerializers.indices(data));
}

// ========================================================================
// RUN ALL EXAMPLES
// ========================================================================

function runAllExamples() {
  basicExamples();
  validationExamples();
  serializerExamples();
  // customValidationExamples();
}

runAllExamples();