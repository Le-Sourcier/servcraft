# Validation Module

Request validation using Zod schemas with type-safe validation helpers.

## Features

- **Zod Integration** - Full Zod schema support
- **Type Safety** - Full TypeScript inference
- **Error Formatting** - Structured error messages
- **Common Schemas** - Pre-built validation schemas
- **Request Validation** - Body, query, and params validation

## Usage

### Basic Validation

```typescript
import { z } from 'zod';
import { validate, validateBody, validateQuery, validateParams } from 'servcraft/modules/validation';

// Define schema
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(50),
  age: z.number().min(18).optional(),
});

// Validate data
const validatedUser = validate(userSchema, requestBody);
// Returns typed data or throws ValidationError
```

### Request Validation

```typescript
// Validate request body
const createUser = async (request, reply) => {
  const body = validateBody(userSchema, request.body);
  // body is typed as { email: string; name: string; age?: number }
};

// Validate query parameters
const listUsers = async (request, reply) => {
  const query = validateQuery(paginationSchema, request.query);
  // query is typed with pagination fields
};

// Validate URL parameters
const getUser = async (request, reply) => {
  const params = validateParams(idParamSchema, request.params);
  // params is typed as { id: string }
};
```

## Pre-built Schemas

### ID Parameter

```typescript
import { idParamSchema, IdParam } from 'servcraft/modules/validation';

// Schema: { id: string (UUID) }
const params = validateParams(idParamSchema, request.params);
```

### Pagination

```typescript
import { paginationSchema, PaginationInput } from 'servcraft/modules/validation';

// Schema: { page, limit, sortBy, sortOrder }
const query = validateQuery(paginationSchema, request.query);
// Defaults: page=1, limit=20, sortOrder='asc'
```

### Search

```typescript
import { searchSchema } from 'servcraft/modules/validation';

// Schema: { q?, search? }
const query = validateQuery(searchSchema, request.query);
```

### Email

```typescript
import { emailSchema } from 'servcraft/modules/validation';

const email = emailSchema.parse('user@example.com');
// Throws if invalid email
```

### Password (Strong)

```typescript
import { passwordSchema } from 'servcraft/modules/validation';

// Requirements:
// - Minimum 8 characters
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one number
// - At least one special character

const password = passwordSchema.parse('MyP@ssw0rd!');
```

### URL

```typescript
import { urlSchema } from 'servcraft/modules/validation';

const url = urlSchema.parse('https://example.com');
```

### Phone

```typescript
import { phoneSchema } from 'servcraft/modules/validation';

// International format: +1234567890
const phone = phoneSchema.parse('+12025551234');
```

### Date

```typescript
import { dateSchema, futureDateSchema, pastDateSchema } from 'servcraft/modules/validation';

// Any valid date
const date = dateSchema.parse('2024-12-20');

// Must be in the future
const futureDate = futureDateSchema.parse('2025-01-01');

// Must be in the past
const pastDate = pastDateSchema.parse('2020-01-01');
```

## Custom Schemas

```typescript
import { z } from 'zod';

// User registration schema
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase'),
  confirmPassword: z.string(),
  name: z.string().min(2).max(50),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms' }),
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Order schema
const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1, 'Order must have at least one item'),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string(),
    country: z.string().length(2),
  }),
  notes: z.string().max(500).optional(),
});
```

## Error Handling

```typescript
import { ValidationError } from 'servcraft/utils/errors';

try {
  const data = validate(schema, input);
} catch (error) {
  if (error instanceof ValidationError) {
    // error.errors is structured:
    // {
    //   email: ['Invalid email address'],
    //   password: ['Password must be at least 8 characters'],
    //   'address.zipCode': ['Invalid zip code']
    // }

    return reply.status(400).send({
      success: false,
      message: 'Validation failed',
      errors: error.errors,
    });
  }
}
```

## Fastify Integration

```typescript
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from 'servcraft/modules/validation';

// Route with validation
fastify.post('/api/users', async (request, reply) => {
  const body = validateBody(registerSchema, request.body);

  const user = await userService.create(body);
  return { success: true, data: user };
});

// With query and params
fastify.get('/api/users/:id/orders', async (request, reply) => {
  const params = validateParams(idParamSchema, request.params);
  const query = validateQuery(paginationSchema, request.query);

  const orders = await orderService.findByUser(params.id, query);
  return { success: true, data: orders };
});
```

## Type Inference

```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

// Infer type from schema
type User = z.infer<typeof schema>;
// { name: string; age: number }

// Use in function
function createUser(data: z.infer<typeof schema>) {
  // data is typed
}
```

## Common Patterns

### Optional with Default

```typescript
const schema = z.object({
  limit: z.number().default(20),
  active: z.boolean().default(true),
});
```

### Transform

```typescript
const schema = z.object({
  email: z.string().email().toLowerCase(),
  tags: z.string().transform(s => s.split(',')),
});
```

### Refinement

```typescript
const schema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(
  data => data.endDate > data.startDate,
  { message: 'End date must be after start date' }
);
```

### Union Types

```typescript
const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('email'), email: z.string().email() }),
  z.object({ type: z.literal('sms'), phone: z.string() }),
]);
```

## Best Practices

1. **Reuse Schemas** - Create reusable schemas for common patterns
2. **Meaningful Errors** - Provide clear error messages
3. **Type Safety** - Use `z.infer<typeof schema>` for types
4. **Validation Early** - Validate at the start of handlers
5. **Sanitize Input** - Use transforms for normalization
