export interface SwaggerConfig {
  title: string;
  description: string;
  version: string;
  basePath?: string;
  tags?: SwaggerTag[];
  servers?: SwaggerServer[];
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface SwaggerTag {
  name: string;
  description?: string;
}

export interface SwaggerServer {
  url: string;
  description?: string;
}

export interface RouteSchema {
  summary?: string;
  description?: string;
  tags?: string[];
  security?: Array<Record<string, string[]>>;
  params?: Record<string, unknown>;
  querystring?: Record<string, unknown>;
  body?: Record<string, unknown>;
  response?: Record<number, unknown>;
}

export interface EndpointDoc {
  method: string;
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  auth: boolean;
  roles?: string[];
  params?: FieldDoc[];
  query?: FieldDoc[];
  body?: FieldDoc[];
  responses: ResponseDoc[];
}

export interface FieldDoc {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  example?: unknown;
}

export interface ResponseDoc {
  status: number;
  description: string;
  schema?: Record<string, unknown>;
}
