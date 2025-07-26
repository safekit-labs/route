# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


## [0.2.0] - 2025-07-26

### Improved
- Enhanced type safety by eliminating all explicit `any` types throughout codebase
- Removed unnecessary runtime type assertions in validation pipeline
- Constrained schema outputs to object-like structures for better type safety
- Improved code organization with better section separators
- Enabled stricter ESLint rules by removing `@typescript-eslint/no-explicit-any` exception

### Changed
- Schema outputs for params and query are now constrained to `Record<string, unknown>`
- Replaced runtime casting with compile-time type constraints

### Added
- Enhanced Zod v4 coercion support with proper input/output type inference
- Comprehensive tests for Zod v4 coercion (string → number, string → boolean, etc.)
- Direct Standard Schema validation using built-in `StandardSchemaV1.InferInput` and `StandardSchemaV1.InferOutput` types

### Changed
- **BREAKING:** Simplified validation to use Standard Schema exclusively
- **BREAKING:** Removed support for non-Standard Schema libraries (Yup, Runtypes, Superstruct)
- Replaced factory pattern (`createValidateFn`) with direct validation (`standardValidate`)
- Updated router to use `StandardSchemaV1.InferInput` for user input parameters (enables proper coercion support)
- Merged `libs/standard-schema-v1/` files into single `standard-schema.ts` file for flatter structure
- Eliminated central `types.ts` file - types now co-located with their usage in `router.ts` and `query-serializers.ts`

### Improved
- Better type accuracy with proper Standard Schema input/output type distinction
- Cleaner validation flow without unnecessary function creation overhead
- More direct validation approach aligned with Standard Schema specification
- Simplified codebase with fewer abstraction layers
- Enhanced documentation focusing on Standard Schema compatibility

### Removed
- Factory pattern for validator creation
- Support for Yup validation library
- Support for Runtypes validation library
- Support for Superstruct validation library
- Unused utility types (`Prettify`, `Simplify`, `InferParams`, `InferQuery`, `InferSchemaOutput`)
- Central `types.ts` file and `libs/` directory structure

### Fixed
- Zod v4 coercion now works correctly with string inputs being properly accepted and transformed
- Type system now properly handles cases where input and output types differ (e.g., `string` input → `number` output)

## [0.1.0] - 2025-07-24

### Changed
- **BREAKING:** Renamed `serializeQuery` option to `querySerializer` in `createRouter()` for better clarity
- **BREAKING:** All router methods (`path()`, `href()`, `URL()`) are now synchronous and no longer return Promises
- **BREAKING:** Removed async validation support - all validation is now synchronous for better performance

### Improved
- Updated all examples, tests, and documentation to use `as const` with route registration for better type safety
- Improved TypeScript type inference for route paths and parameters
- Better error handling with synchronous validation
- Enhanced documentation with more comprehensive examples
- Added social authentication callback route examples in README

### Fixed
- Simplified validation logic by removing unnecessary async overhead
- More intuitive API naming conventions

## [0.0.1] - 2024-07-24

### Added
- Initial release of @safekit/route package
- Type-safe URL builder with path parameter support
- Query string serialization using `qs` library with multiple formats (brackets, comma, native, indices)
- Validation support for any Standard Schema compatible library
- Support for Zod (v3 and v4), Yup, Superstruct, Valibot, custom functions, and Standard Schema validators
- Path parameter validation and type inference
- Query parameter validation and type inference
- Multiple router methods: `path()`, `URL()`, `href()`, `paths()`
- Comprehensive test suite with validation library examples
- Complete examples and documentation

### Features
- `createRouter()` function to create router instances with optional baseUrl and query serializer
- `router.register()` method to register route definitions with validation schemas
- Support for path patterns with `:param` syntax
- Automatic URL encoding of path parameters
- Configurable query string serialization with `qs` as default
- Type-safe path and query parameter inference
- Runtime validation with detailed error messages
- Base URL support for absolute URLs with method-level overrides
- Async validation support for all schema types
- Required schema registration for params/query usage
