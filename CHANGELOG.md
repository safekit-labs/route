# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2024-01-24

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
