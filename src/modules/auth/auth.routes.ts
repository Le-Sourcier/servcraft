import type { FastifyInstance } from 'fastify';
import type { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';
import { createAuthMiddleware } from './auth.middleware.js';

// OpenAPI Schema definitions
const userResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string', nullable: true },
    role: { type: 'string', enum: ['user', 'admin', 'moderator'] },
  },
};

const tokensResponseSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
  },
};

const errorResponseSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

export function registerAuthRoutes(
  app: FastifyInstance,
  controller: AuthController,
  authService: AuthService
): void {
  const authenticate = createAuthMiddleware(authService);

  // POST /auth/register
  app.post(
    '/auth/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description: 'Create a new user account with email and password',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', description: 'User email address' },
            password: {
              type: 'string',
              minLength: 8,
              description: 'Password (min 8 chars, must include uppercase, lowercase, number)',
            },
            name: { type: 'string', minLength: 2, description: 'User display name (optional)' },
          },
        },
        response: {
          201: {
            description: 'User registered successfully',
            type: 'object',
            properties: {
              user: userResponseSchema,
              ...tokensResponseSchema.properties,
            },
          },
          400: { description: 'Validation error or email already exists', ...errorResponseSchema },
        },
      },
    },
    controller.register.bind(controller)
  );

  // POST /auth/login
  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Login user',
        description: 'Authenticate user with email and password',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Login successful',
            type: 'object',
            properties: {
              user: userResponseSchema,
              ...tokensResponseSchema.properties,
            },
          },
          401: { description: 'Invalid credentials', ...errorResponseSchema },
        },
      },
    },
    controller.login.bind(controller)
  );

  // POST /auth/refresh
  app.post(
    '/auth/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description: 'Get a new access token using a refresh token',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', description: 'Valid refresh token' },
          },
        },
        response: {
          200: {
            description: 'Token refreshed successfully',
            ...tokensResponseSchema,
          },
          401: { description: 'Invalid or expired refresh token', ...errorResponseSchema },
        },
      },
    },
    controller.refresh.bind(controller)
  );

  // POST /auth/logout (protected)
  app.post(
    '/auth/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Logout user',
        description: 'Invalidate the current session',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Logged out successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Logged out successfully' },
            },
          },
          401: { description: 'Not authenticated', ...errorResponseSchema },
        },
      },
      preHandler: [authenticate],
    },
    controller.logout.bind(controller)
  );

  // GET /auth/me (protected)
  app.get(
    '/auth/me',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Get current user',
        description: 'Get the authenticated user profile',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Current user profile',
            type: 'object',
            properties: {
              user: userResponseSchema,
            },
          },
          401: { description: 'Not authenticated', ...errorResponseSchema },
        },
      },
      preHandler: [authenticate],
    },
    controller.me.bind(controller)
  );

  // POST /auth/change-password (protected)
  app.post(
    '/auth/change-password',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Change password',
        description: 'Change the authenticated user password',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', description: 'Current password' },
            newPassword: {
              type: 'string',
              minLength: 8,
              description: 'New password (min 8 chars)',
            },
          },
        },
        response: {
          200: {
            description: 'Password changed successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Password changed successfully' },
            },
          },
          400: { description: 'Current password incorrect', ...errorResponseSchema },
          401: { description: 'Not authenticated', ...errorResponseSchema },
        },
      },
      preHandler: [authenticate],
    },
    controller.changePassword.bind(controller)
  );
}
