export { registerSwagger, commonResponses, paginationQuery, idParam } from './swagger.service.js';
export { buildOpenApiSchema, generateRouteSchema } from './schema-builder.js';
export type {
  SwaggerConfig,
  SwaggerTag,
  SwaggerServer,
  RouteSchema,
  EndpointDoc,
} from './types.js';
