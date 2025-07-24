// ========================================================================
// SCHEMA PARSING UTILITIES
// ========================================================================

import { StandardSchemaV1Error } from "./libs/standard-schema-v1/error";

import type { SchemaValidator } from "./types";

// ========================================================================
// PARSE FUNCTION TYPE
// ========================================================================

export type ParseFn<TType> = (value: unknown) => TType;

// ========================================================================
// MAIN VALIDATOR FUNCTION
// ========================================================================

/**
 * Creates a parser function that supports multiple schema libraries
 * and lets underlying schema errors flow through naturally
 */
export function createParseFn<T>(schema: SchemaValidator<T>): ParseFn<T> {
  // Handle null marker - skip validation and return input as-is
  if (schema === null) {
    return (value: unknown) => value as T;
  }

  const parser = schema as any;
  const isStandardSchema = "~standard" in parser;

  // ArkType - has both function call and assert method
  if (typeof parser === "function" && typeof parser.assert === "function") {
    return parser.assert.bind(parser);
  }

  // Custom validator function (but not Standard Schema)
  if (typeof parser === "function" && !isStandardSchema) {
    return parser;
  }

  // Zod/Valibot sync parsing
  if (typeof parser.parse === "function") {
    return parser.parse.bind(parser);
  }

  // Yup validation
  if (typeof parser.validateSync === "function") {
    return parser.validateSync.bind(parser);
  }

  // Superstruct
  if (typeof parser.create === "function") {
    return parser.create.bind(parser);
  }

  // Scale assert
  if (typeof parser.assert === "function") {
    return (value) => {
      parser.assert(value);
      return value as T;
    };
  }

  // Standard Schema - only case where we need to create our own error
  if (isStandardSchema) {
    return (value: unknown) => {
      const result = parser["~standard"].validate(value);
      if (result.issues) {
        throw new StandardSchemaV1Error(result.issues);
      }
      return result.value;
    };
  }

  throw new Error("Could not find a compatible parser method");
}
