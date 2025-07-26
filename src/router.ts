import type { StandardSchemaV1 } from "./standard-schema";
import { standardValidate } from "./validator";
import qs from "qs";

// ========================================================================
// TYPES AND INTERFACES
// ========================================================================

export interface RouteDefinition {
  path: string;
  params?: StandardSchemaV1<unknown, Record<string, unknown>>;
  query?: StandardSchemaV1<unknown, Record<string, unknown>>;
}

export type QuerySerializer = (query: Record<string, unknown>) => string;

export interface RouterOptions {
  baseUrl?: string;
  querySerializer?: (query: Record<string, unknown>) => string;
}

type ExtractRouteByPath<TDefs extends RouteDefinition, TPath> = Extract<TDefs, { path: TPath }>;

// Type utilities following better-call pattern
type InferParamsInput<T> = T extends StandardSchemaV1 
  ? StandardSchemaV1.InferInput<T> 
  : Record<string, unknown>;

type InferParamsOutput<T> = T extends StandardSchemaV1 
  ? StandardSchemaV1.InferOutput<T> 
  : Record<string, unknown>;

type InferQueryInput<T> = T extends StandardSchemaV1 
  ? StandardSchemaV1.InferInput<T> 
  : Record<string, unknown>;

type InferQueryOutput<T> = T extends StandardSchemaV1 
  ? StandardSchemaV1.InferOutput<T> 
  : Record<string, unknown>;

// Using Standard Schema built-in type inference utilities
// User passes InferInput types, validation produces InferOutput types
type BuildOptions<TRoute extends RouteDefinition> = {
  path: TRoute["path"];
  params?: InferParamsInput<TRoute["params"]>;
  query?: InferQueryInput<TRoute["query"]>;
};

type PathOptions<TDefs extends RouteDefinition, TPath extends TDefs["path"]> = BuildOptions<
  ExtractRouteByPath<TDefs, TPath>
>;

type UrlOptions<TDefs extends RouteDefinition, TPath extends TDefs["path"]> = PathOptions<
  TDefs,
  TPath
> & { baseUrl?: string };

// ========================================================================
// ROUTER IMPLEMENTATION
// ========================================================================


export class Router<TDefs extends RouteDefinition = never> {
  private definitions = new Map<string, RouteDefinition>();
  private defaultBaseUrl?: string;
  private querySerializer: QuerySerializer;

  constructor(options: RouterOptions = {}) {
    this.defaultBaseUrl = options.baseUrl;
    this.querySerializer =
      options.querySerializer || ((query) => qs.stringify(query, { arrayFormat: "brackets" }));
  }

  register<T extends RouteDefinition>(definitions: T[]): Router<TDefs | T> {
    definitions.forEach((def) => {
      if (this.definitions.has(def.path)) {
        console.warn(`Route pattern "${def.path}" is being re-registered.`);
      }
      this.definitions.set(def.path, def);
    });

    return this as Router<TDefs | T>;
  }

  private extractParamNames(path: string): string[] {
    const paramRegex = /:([a-zA-Z0-9_]+)/g;
    const matches = path.matchAll(paramRegex);
    return Array.from(matches, (match) => match[1]!);
  }

  private validateInputs<TPath extends TDefs["path"]>(options: PathOptions<TDefs, TPath>) {
    const definition = this.definitions.get(options.path as string);
    if (!definition) {
      throw new Error(`Route pattern "${String(options.path)}" has not been registered`);
    }

    const params = options.params || {};
    const query = options.query || {};

    const paramNames = this.extractParamNames(definition.path);
    for (const paramName of paramNames) {
      if (!(paramName in (params as Record<string, unknown>))) {
        throw new Error(
          `Missing required path parameter "${paramName}" for route "${String(options.path)}"`,
        );
      }
    }

    let validatedParams: InferParamsOutput<typeof definition.params> = params;
    if (definition.params) {
      validatedParams = standardValidate(definition.params, params);
    }

    let validatedQuery: InferQueryOutput<typeof definition.query> = query;
    if (definition.query) {
      validatedQuery = standardValidate(definition.query, query);
    }

    return {
      definition,
      params: validatedParams,
      query: validatedQuery,
    };
  }

  private buildPathAndQuery(
    definition: RouteDefinition,
    params: Record<string, unknown>,
    query: Record<string, unknown>,
  ): string {
    let pathString = definition.path;
    const paramNames = this.extractParamNames(pathString);

    for (const paramName of paramNames) {
      if (!(paramName in params)) {
        throw new Error(`Missing required path parameter "${paramName}"`);
      }
      pathString = pathString.replace(
        `:${paramName}`,
        encodeURIComponent(String(params[paramName])),
      );
    }

    const queryString = this.querySerializer(query);
    const finalPath = pathString.startsWith("/") ? pathString : `/${pathString}`;
    return queryString ? `${finalPath}?${queryString}` : finalPath;
  }

  path<TPath extends TDefs["path"]>(options: PathOptions<TDefs, TPath>): string {
    const { definition, params, query } = this.validateInputs(options);
    return this.buildPathAndQuery(definition, params, query);
  }

  URL<TPath extends TDefs["path"]>(options: UrlOptions<TDefs, TPath>): URL {
    const { definition, params, query } = this.validateInputs(options);
    const relativePath = this.buildPathAndQuery(definition, params, query);

    const effectiveBaseUrl = options.baseUrl ?? this.defaultBaseUrl;
    if (!effectiveBaseUrl) {
      throw new Error("Cannot build absolute URL: No baseUrl provided in options or constructor.");
    }

    return new URL(relativePath, effectiveBaseUrl);
  }

  href<TPath extends TDefs["path"]>(options: UrlOptions<TDefs, TPath>): string {
    const url = this.URL(options);
    return url.href;
  }

  paths(): TDefs["path"][] {
    return Array.from(this.definitions.keys()) as TDefs["path"][];
  }

  get Paths(): TDefs["path"] {
    throw new Error("Paths property is only for type extraction.");
  }
}

export function createRouter(options?: RouterOptions): Router {
  return new Router(options);
}
