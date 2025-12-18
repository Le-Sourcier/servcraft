import type { FieldDefinition } from '../../cli/utils/field-parser.js';

/**
 * Build OpenAPI schema from field definitions
 */
export function buildOpenApiSchema(
  fields: FieldDefinition[],
  options: { includeId?: boolean; includeTimestamps?: boolean } = {}
): Record<string, unknown> {
  const { includeId = false, includeTimestamps = false } = options;

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  if (includeId) {
    properties.id = { type: 'string', format: 'uuid', description: 'Unique identifier' };
  }

  for (const field of fields) {
    properties[field.name] = fieldToOpenApi(field);
    if (!field.isOptional) {
      required.push(field.name);
    }
  }

  if (includeTimestamps) {
    properties.createdAt = { type: 'string', format: 'date-time', description: 'Creation timestamp' };
    properties.updatedAt = { type: 'string', format: 'date-time', description: 'Last update timestamp' };
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

/**
 * Convert field definition to OpenAPI property schema
 */
function fieldToOpenApi(field: FieldDefinition): Record<string, unknown> {
  const typeMap: Record<string, Record<string, unknown>> = {
    string: { type: 'string' },
    number: { type: 'number' },
    int: { type: 'integer' },
    float: { type: 'number', format: 'float' },
    decimal: { type: 'number', format: 'double' },
    boolean: { type: 'boolean' },
    date: { type: 'string', format: 'date' },
    datetime: { type: 'string', format: 'date-time' },
    text: { type: 'string', maxLength: 65535 },
    email: { type: 'string', format: 'email' },
    url: { type: 'string', format: 'uri' },
    uuid: { type: 'string', format: 'uuid' },
    json: { type: 'object', additionalProperties: true },
    enum: { type: 'string' },
  };

  let schema = typeMap[field.type] || { type: 'string' };

  if (field.isArray) {
    schema = {
      type: 'array',
      items: schema,
    };
  }

  return schema;
}

/**
 * Generate route schema for Fastify with OpenAPI annotations
 */
export function generateRouteSchema(
  modelName: string,
  fields: FieldDefinition[],
  operation: 'list' | 'get' | 'create' | 'update' | 'delete'
): Record<string, unknown> {
  const tag = modelName + 's';

  switch (operation) {
    case 'list':
      return {
        schema: {
          summary: `List all ${modelName}s`,
          description: `Retrieve a paginated list of ${modelName}s`,
          tags: [tag],
          querystring: {
            type: 'object',
            properties: {
              page: { type: 'integer', minimum: 1, default: 1 },
              limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
              sortBy: { type: 'string' },
              sortOrder: { type: 'string', enum: ['asc', 'desc'] },
              search: { type: 'string' },
            },
          },
          response: {
            200: {
              description: 'Successful response',
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: buildOpenApiSchema(fields, { includeId: true, includeTimestamps: true }),
                    },
                    meta: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        totalPages: { type: 'integer' },
                        hasNextPage: { type: 'boolean' },
                        hasPrevPage: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

    case 'get':
      return {
        schema: {
          summary: `Get ${modelName} by ID`,
          description: `Retrieve a single ${modelName} by its ID`,
          tags: [tag],
          params: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
            },
            required: ['id'],
          },
          response: {
            200: {
              description: 'Successful response',
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: buildOpenApiSchema(fields, { includeId: true, includeTimestamps: true }),
              },
            },
            404: {
              description: 'Not found',
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: `${modelName} not found` },
              },
            },
          },
        },
      };

    case 'create':
      return {
        schema: {
          summary: `Create ${modelName}`,
          description: `Create a new ${modelName}`,
          tags: [tag],
          body: buildOpenApiSchema(fields),
          response: {
            201: {
              description: 'Created successfully',
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: buildOpenApiSchema(fields, { includeId: true, includeTimestamps: true }),
              },
            },
            400: {
              description: 'Validation error',
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string' },
                errors: { type: 'object' },
              },
            },
          },
        },
      };

    case 'update':
      // Make all fields optional for update
      const optionalFields = fields.map((f) => ({ ...f, isOptional: true }));
      return {
        schema: {
          summary: `Update ${modelName}`,
          description: `Update an existing ${modelName}`,
          tags: [tag],
          params: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
            },
            required: ['id'],
          },
          body: buildOpenApiSchema(optionalFields),
          response: {
            200: {
              description: 'Updated successfully',
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: buildOpenApiSchema(fields, { includeId: true, includeTimestamps: true }),
              },
            },
            404: {
              description: 'Not found',
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string' },
              },
            },
          },
        },
      };

    case 'delete':
      return {
        schema: {
          summary: `Delete ${modelName}`,
          description: `Delete a ${modelName} by ID`,
          tags: [tag],
          params: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
            },
            required: ['id'],
          },
          response: {
            204: {
              description: 'Deleted successfully',
              type: 'null',
            },
            404: {
              description: 'Not found',
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string' },
              },
            },
          },
        },
      };

    default:
      return {};
  }
}
