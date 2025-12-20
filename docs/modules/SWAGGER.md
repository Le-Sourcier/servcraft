# Swagger Module

OpenAPI 3.0 documentation with Swagger UI integration.

## Features

- **OpenAPI 3.0** - Full OpenAPI specification support
- **Swagger UI** - Interactive API documentation at `/docs`
- **JWT Auth** - Bearer token authentication support
- **Common Schemas** - Pre-built response schemas
- **Zod Integration** - Convert Zod schemas to JSON Schema

## Usage

### Basic Setup

```typescript
import Fastify from 'fastify';
import { registerSwagger } from 'servcraft/modules/swagger';

const app = Fastify();

await registerSwagger(app, {
  title: 'My API',
  description: 'API documentation',
  version: '1.0.0',
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Users', description: 'User management' },
    { name: 'Products', description: 'Product catalog' },
  ],
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
    { url: 'https://api.example.com', description: 'Production' },
  ],
  contact: {
    name: 'API Support',
    email: 'support@example.com',
  },
  license: {
    name: 'MIT',
    url: 'https://opensource.org/licenses/MIT',
  },
});

// Documentation available at http://localhost:3000/docs
```

### Route Documentation

```typescript
fastify.post('/api/users', {
  schema: {
    description: 'Create a new user',
    tags: ['Users'],
    summary: 'Create user',
    body: {
      type: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
        name: { type: 'string' },
      },
    },
    response: {
      201: {
        description: 'User created successfully',
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
      400: commonResponses.error,
    },
    security: [{ bearerAuth: [] }],
  },
}, async (request, reply) => {
  // Handler
});
```

### Common Response Schemas

```typescript
import { commonResponses, paginationQuery, idParam } from 'servcraft/modules/swagger';

// Success response
commonResponses.success
// { success: boolean, data: object }

// Error response
commonResponses.error
// { success: boolean, message: string, errors: object }

// Unauthorized
commonResponses.unauthorized
// { success: boolean, message: 'Unauthorized' }

// Not found
commonResponses.notFound
// { success: boolean, message: 'Resource not found' }

// Paginated response
commonResponses.paginated
// { success: boolean, data: { data: [], meta: { total, page, ... } } }
```

### Query Parameters

```typescript
// Pagination query parameters
fastify.get('/api/users', {
  schema: {
    querystring: paginationQuery,
    // Adds: page, limit, sortBy, sortOrder, search
  },
});

// ID parameter
fastify.get('/api/users/:id', {
  schema: {
    params: idParam,
    // Adds: id (uuid)
  },
});
```

### Authentication

```typescript
// Protected route
fastify.get('/api/profile', {
  schema: {
    tags: ['Users'],
    security: [{ bearerAuth: [] }],
    response: {
      200: userSchema,
      401: commonResponses.unauthorized,
    },
  },
});

// Public route (no security)
fastify.get('/api/public', {
  schema: {
    tags: ['Public'],
    // No security property = public endpoint
  },
});
```

## Configuration

```typescript
interface SwaggerConfig {
  title: string;
  description?: string;
  version: string;
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  servers?: Array<{
    url: string;
    description?: string;
  }>;
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
```

## Schema Examples

### User Schema

```typescript
const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    role: { type: 'string', enum: ['user', 'admin'] },
    createdAt: { type: 'string', format: 'date-time' },
  },
};
```

### Request Body

```typescript
const createUserBody = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'User email address',
    },
    password: {
      type: 'string',
      minLength: 8,
      description: 'Password (min 8 characters)',
    },
    name: {
      type: 'string',
      maxLength: 100,
      description: 'Display name',
    },
  },
};
```

### Array Response

```typescript
const usersListResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'array',
      items: userSchema,
    },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        page: { type: 'integer' },
        limit: { type: 'integer' },
        totalPages: { type: 'integer' },
      },
    },
  },
};
```

## Complete Route Example

```typescript
fastify.route({
  method: 'GET',
  url: '/api/products',
  schema: {
    description: 'Get all products with pagination and filtering',
    tags: ['Products'],
    summary: 'List products',
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 20 },
        category: { type: 'string', description: 'Filter by category' },
        minPrice: { type: 'number', description: 'Minimum price' },
        maxPrice: { type: 'number', description: 'Maximum price' },
        search: { type: 'string', description: 'Search term' },
      },
    },
    response: {
      200: {
        description: 'List of products',
        ...commonResponses.paginated,
      },
    },
  },
  handler: async (request, reply) => {
    // Implementation
  },
});
```

## Swagger UI Features

The documentation UI at `/docs` includes:
- **Try It Out** - Execute API calls directly
- **Filter** - Search endpoints
- **Expand/Collapse** - Organize by tags
- **Request Duration** - Show response times
- **Authorization** - Set bearer token

## Best Practices

1. **Consistent Tags** - Group related endpoints
2. **Detailed Descriptions** - Document parameters and responses
3. **Examples** - Provide example values
4. **Error Responses** - Document all error cases
5. **Security** - Mark authenticated endpoints
6. **Versioning** - Include version in title
