import { StandardSchemaV1Error } from "./standard-schema";

import type { StandardSchemaV1 } from "./standard-schema";

// ========================================================================
// STANDARD SCHEMA VALIDATION
// ========================================================================

/**
 * Validates input using Standard Schema specification directly
 * Uses proper Standard Schema type inference for input/output
 * Note: Only supports synchronous validation
 */
export function standardValidate<T extends StandardSchemaV1>(
  schema: T,
  input: StandardSchemaV1.InferInput<T>
): StandardSchemaV1.InferOutput<T> {
  const result = schema["~standard"].validate(input);

  // Handle async results by throwing an error - we only support sync validation
  if (result instanceof Promise) {
    throw new Error("Async validation is not supported. Please use synchronous Standard Schema validation.");
  }

  // If the `issues` field exists, the validation failed
  if (result.issues) {
    throw new StandardSchemaV1Error(result.issues);
  }

  return result.value;
}