import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { UserController } from './user.controller.js';
import type { AuthService } from '../auth/auth.service.js';
import { createAuthMiddleware, createRoleMiddleware } from '../auth/auth.middleware.js';

// OpenAPI Schema definitions
const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string', nullable: true },
    role: { type: 'string', enum: ['user', 'admin', 'moderator', 'super_admin'] },
    status: { type: 'string', enum: ['active', 'suspended', 'banned', 'pending'] },
    emailVerified: { type: 'boolean' },
    lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const userListSchema = {
  type: 'object',
  properties: {
    data: { type: 'array', items: userSchema },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  },
};

const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

const idParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', description: 'User ID' },
  },
  required: ['id'],
} as const;

const paginationQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'number', minimum: 1, default: 1 },
    limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
    search: { type: 'string', description: 'Search by name or email' },
    role: { type: 'string', enum: ['user', 'admin', 'moderator', 'super_admin'] },
    status: { type: 'string', enum: ['active', 'suspended', 'banned', 'pending'] },
  },
};

export function registerUserRoutes(
  app: FastifyInstance,
  controller: UserController,
  authService: AuthService
): void {
  const authenticate = createAuthMiddleware(authService);
  const isAdmin = createRoleMiddleware(['admin', 'super_admin']);
  const isModerator = createRoleMiddleware(['moderator', 'admin', 'super_admin']);

  // GET /profile
  app.get(
    '/profile',
    {
      schema: {
        tags: ['Users'],
        summary: 'Get current user profile',
        description: 'Get the profile of the authenticated user',
        security: [{ bearerAuth: [] }],
        response: {
          200: { description: 'User profile', ...userSchema },
          401: { description: 'Not authenticated', ...errorSchema },
        },
      },
      preHandler: [authenticate],
    },
    controller.getProfile.bind(controller)
  );

  // PATCH /profile
  app.patch(
    '/profile',
    {
      schema: {
        tags: ['Users'],
        summary: 'Update current user profile',
        description: 'Update the profile of the authenticated user',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2 },
            email: { type: 'string', format: 'email' },
          },
        },
        response: {
          200: { description: 'Updated profile', ...userSchema },
          400: { description: 'Validation error', ...errorSchema },
          401: { description: 'Not authenticated', ...errorSchema },
        },
      },
      preHandler: [authenticate],
    },
    controller.updateProfile.bind(controller)
  );

  // GET /users (Admin)
  app.get(
    '/users',
    {
      schema: {
        tags: ['Users'],
        summary: 'List all users',
        description: 'Get paginated list of all users (admin/moderator only)',
        security: [{ bearerAuth: [] }],
        querystring: paginationQuerySchema,
        response: {
          200: { description: 'User list', ...userListSchema },
          401: { description: 'Not authenticated', ...errorSchema },
          403: { description: 'Not authorized', ...errorSchema },
        },
      },
      preHandler: [authenticate, isModerator],
    },
    controller.list.bind(controller)
  );

  // GET /users/:id (Admin)
  app.get<{ Params: { id: string } }>(
    '/users/:id',
    {
      schema: {
        tags: ['Users'],
        summary: 'Get user by ID',
        description: 'Get a specific user by ID (admin/moderator only)',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
        response: {
          200: { description: 'User details', ...userSchema },
          401: { description: 'Not authenticated', ...errorSchema },
          403: { description: 'Not authorized', ...errorSchema },
          404: { description: 'User not found', ...errorSchema },
        },
      },
      preHandler: [authenticate, isModerator],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return controller.getById(request, reply);
    }
  );

  // PATCH /users/:id (Admin)
  app.patch<{ Params: { id: string } }>(
    '/users/:id',
    {
      schema: {
        tags: ['Users'],
        summary: 'Update user',
        description: 'Update a user by ID (admin only)',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2 },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'admin', 'moderator'] },
            status: { type: 'string', enum: ['active', 'suspended', 'banned', 'pending'] },
          },
        },
        response: {
          200: { description: 'Updated user', ...userSchema },
          400: { description: 'Validation error', ...errorSchema },
          401: { description: 'Not authenticated', ...errorSchema },
          403: { description: 'Not authorized', ...errorSchema },
          404: { description: 'User not found', ...errorSchema },
        },
      },
      preHandler: [authenticate, isAdmin],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return controller.update(request, reply);
    }
  );

  // DELETE /users/:id (Admin)
  app.delete<{ Params: { id: string } }>(
    '/users/:id',
    {
      schema: {
        tags: ['Users'],
        summary: 'Delete user',
        description: 'Delete a user by ID (admin only)',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
        response: {
          200: {
            description: 'User deleted',
            type: 'object',
            properties: { message: { type: 'string', example: 'User deleted successfully' } },
          },
          401: { description: 'Not authenticated', ...errorSchema },
          403: { description: 'Not authorized', ...errorSchema },
          404: { description: 'User not found', ...errorSchema },
        },
      },
      preHandler: [authenticate, isAdmin],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return controller.delete(request, reply);
    }
  );

  // POST /users/:id/suspend (Admin)
  app.post<{ Params: { id: string } }>(
    '/users/:id/suspend',
    {
      schema: {
        tags: ['Users'],
        summary: 'Suspend user',
        description: 'Suspend a user account (admin only)',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
        response: {
          200: { description: 'User suspended', ...userSchema },
          401: { description: 'Not authenticated', ...errorSchema },
          403: { description: 'Not authorized', ...errorSchema },
          404: { description: 'User not found', ...errorSchema },
        },
      },
      preHandler: [authenticate, isAdmin],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return controller.suspend(request, reply);
    }
  );

  // POST /users/:id/ban (Admin)
  app.post<{ Params: { id: string } }>(
    '/users/:id/ban',
    {
      schema: {
        tags: ['Users'],
        summary: 'Ban user',
        description: 'Ban a user account (admin only)',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
        response: {
          200: { description: 'User banned', ...userSchema },
          401: { description: 'Not authenticated', ...errorSchema },
          403: { description: 'Not authorized', ...errorSchema },
          404: { description: 'User not found', ...errorSchema },
        },
      },
      preHandler: [authenticate, isAdmin],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return controller.ban(request, reply);
    }
  );

  // POST /users/:id/activate (Admin)
  app.post<{ Params: { id: string } }>(
    '/users/:id/activate',
    {
      schema: {
        tags: ['Users'],
        summary: 'Activate user',
        description: 'Activate a user account (admin only)',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
        response: {
          200: { description: 'User activated', ...userSchema },
          401: { description: 'Not authenticated', ...errorSchema },
          403: { description: 'Not authorized', ...errorSchema },
          404: { description: 'User not found', ...errorSchema },
        },
      },
      preHandler: [authenticate, isAdmin],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return controller.activate(request, reply);
    }
  );
}
