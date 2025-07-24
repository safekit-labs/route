import type { RouteDefinition, QuerySerializer, InferParams, InferQuery, SchemaValidator, InferSchemaOutput, Prettify } from "./types";
import { createParseFn } from "./parser";
import qs from "qs";

export interface RouterOptions {
  baseUrl?: string;
  serializeQuery?: (query: Record<string, any>) => string;
}

type ExtractRouteByPath<TDefs extends RouteDefinition, TPath> = Extract<TDefs, { path: TPath }>;

// Simplified approach - always allow optional params/query
type BuildOptions<TRoute extends RouteDefinition> = {
  path: TRoute["path"];
  params?: TRoute["params"] extends SchemaValidator<any>
    ? InferSchemaOutput<TRoute["params"]>
    : Record<string, any>;
  query?: TRoute["query"] extends SchemaValidator<any>
    ? InferSchemaOutput<TRoute["query"]>
    : Record<string, any>;
};

type PathOptions<TDefs extends RouteDefinition, TPath extends TDefs["path"]> =
  BuildOptions<ExtractRouteByPath<TDefs, TPath>>;

type UrlOptions<TDefs extends RouteDefinition, TPath extends TDefs["path"]> =
  PathOptions<TDefs, TPath> & { baseUrl?: string; };

export class Router<TDefs extends RouteDefinition = never> {
  private definitions = new Map<string, RouteDefinition>();
  private defaultBaseUrl?: string;
  private querySerializer: QuerySerializer;

  constructor(options: RouterOptions = {}) {
    this.defaultBaseUrl = options.baseUrl;
    this.querySerializer = options.serializeQuery || ((query) => qs.stringify(query, { arrayFormat: 'brackets' }));
  }

  register<T extends RouteDefinition>(
    definitions: T[]
  ): Router<TDefs | T> {
    definitions.forEach(def => {
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
    return Array.from(matches, match => match[1]!);
  }

  private async validateInputs<TPath extends TDefs["path"]>(
    options: PathOptions<TDefs, TPath>
  ) {
    const definition = this.definitions.get(options.path as string);
    if (!definition) {
      throw new Error(`Route pattern "${String(options.path)}" has not been registered`);
    }

    const params = (options as any).params || {};
    const query = (options as any).query || {};

    const paramNames = this.extractParamNames(definition.path);
    for (const paramName of paramNames) {
      if (!(paramName in (params as Record<string, any>))) {
        throw new Error(
          `Missing required path parameter "${paramName}" for route "${String(options.path)}"`
        );
      }
    }

    let validatedParams = params;
    if (definition.params) {
      const parseFn = createParseFn(definition.params);
      const result = await parseFn(params);
      validatedParams = result as typeof params;
    }

    let validatedQuery = query;
    if (definition.query) {
      const parseFn = createParseFn(definition.query);
      const result = await parseFn(query);
      validatedQuery = result as typeof query;
    }

    return {
      definition,
      params: validatedParams,
      query: validatedQuery
    };
  }

  private buildPathAndQuery(
    definition: RouteDefinition,
    params: Record<string, any>,
    query: Record<string, any>
  ): string {
    let pathString = definition.path;
    const paramNames = this.extractParamNames(pathString);

    for (const paramName of paramNames) {
      if (!(paramName in params)) {
        throw new Error(`Missing required path parameter "${paramName}"`);
      }
      pathString = pathString.replace(
        `:${paramName}`,
        encodeURIComponent(String(params[paramName]))
      );
    }

    const queryString = this.querySerializer(query);
    const finalPath = pathString.startsWith("/") ? pathString : `/${pathString}`;
    return queryString ? `${finalPath}?${queryString}` : finalPath;
  }

  async path<TPath extends TDefs["path"]>(
    options: PathOptions<TDefs, TPath>
  ): Promise<string> {
    const { definition, params, query } = await this.validateInputs(options);
    return this.buildPathAndQuery(definition, params, query);
  }

  async URL<TPath extends TDefs["path"]>(
    options: UrlOptions<TDefs, TPath>
  ): Promise<URL> {
    const { definition, params, query } = await this.validateInputs(options);
    const relativePath = this.buildPathAndQuery(definition, params, query);

    const effectiveBaseUrl = options.baseUrl ?? this.defaultBaseUrl;
    if (!effectiveBaseUrl) {
      throw new Error(
        "Cannot build absolute URL: No baseUrl provided in options or constructor."
      );
    }

    return new URL(relativePath, effectiveBaseUrl);
  }

  async href<TPath extends TDefs["path"]>(
    options: UrlOptions<TDefs, TPath>
  ): Promise<string> {
    const url = await this.URL(options);
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