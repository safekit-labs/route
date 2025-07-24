import type { StandardSchemaV1 } from "./libs/standard-schema-v1/spec";

/**
 * Schema validation function type - supports multiple validation libraries
 *
 * Supports Zod, Yup, Valibot, ArkType, Effect Schema, Superstruct, Scale Codec,
 * Runtypes, custom functions, Standard Schema spec, and null for unvalidated arguments.
 */
export type SchemaValidator<T> =
  | { parse: (input: unknown) => T } // Zod schemas
  | { parseAsync: (input: unknown) => Promise<T> } // Zod async
  | { validateSync: (input: unknown) => T } // Yup schemas
  | { create: (input: unknown) => T } // Superstruct schemas
  | { assert: (value: unknown) => asserts value is T } // Scale Codec schemas
  | ((input: unknown) => T) // Plain validation functions & ArkType
  | StandardSchemaV1<T> // Standard Schema spec
  | null; // Skip validation marker

/**
 * Prettifies a type by flattening intersections and making it more readable
 * Converts intersections like A & B into a single object type
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Simplifies complex conditional types and removes unnecessary complexity
 * Helps TypeScript display cleaner types in IDE tooltips
 */
export type Simplify<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

export type QuerySerializer = (query: Record<string, any>) => string;

export interface QuerySerializers {
  brackets: (query: Record<string, any>) => string;
  indices: (query: Record<string, any>) => string;
  comma: (query: Record<string, any>) => string;
  native: (query: Record<string, any>) => string;
}

export interface RouteDefinition {
  path: string;
  params?: SchemaValidator<any>;
  query?: SchemaValidator<any>;
}

/**
 * Utility type to infer the output type of a schema validator
 */
export type InferSchemaOutput<T> = T extends null
  ? unknown // null markers produce unknown type
  : T extends StandardSchemaV1<any, infer Output>
  ? Output
  : T extends { parse: (input: unknown) => infer U }
  ? U
  : T extends { parseAsync: (input: unknown) => Promise<infer U> }
  ? U
  : T extends { validateSync: (input: unknown) => infer U }
  ? U
  : T extends { create: (input: unknown) => infer U }
  ? U
  : T extends { assert: (value: unknown) => asserts value is infer U }
  ? U
  : T extends (input: unknown) => infer U
  ? U
  : unknown;

export type InferParams<T> = T extends { params: infer P }
  ? P extends SchemaValidator<any>
    ? InferSchemaOutput<P>
    : never
  : never;

export type InferQuery<T> = T extends { query: infer Q }
  ? Q extends SchemaValidator<any>
    ? InferSchemaOutput<Q>
    : never
  : never;