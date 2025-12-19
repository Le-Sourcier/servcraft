import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { UserController } from './user.controller.js';
import type { AuthService } from '../auth/auth.service.js';
import { createAuthMiddleware, createRoleMiddleware } from '../auth/auth.middleware.js';

// Route params schema for Fastify
const idParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
} as const;

export function registerUserRoutes(
  app: FastifyInstance,
  controller: UserController,
  authService: AuthService
): void {
  const authenticate = createAuthMiddleware(authService);
  const isAdmin = createRoleMiddleware(['admin', 'super_admin']);
  const isModerator = createRoleMiddleware(['moderator', 'admin', 'super_admin']);

  // Profile routes (authenticated users)
  app.get('/profile', { preHandler: [authenticate] }, controller.getProfile.bind(controller));
  app.patch('/profile', { preHandler: [authenticate] }, controller.updateProfile.bind(controller));

  // Admin routes
  app.get('/users', { preHandler: [authenticate, isModerator] }, controller.list.bind(controller));
  app.get<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: [authenticate, isModerator], schema: { params: idParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return controller.getById(request, reply);
    }
  );
  app.patch<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: [authenticate, isAdmin], schema: { params: idParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return controller.update(request, reply);
    }
  );
  app.delete<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: [authenticate, isAdmin], schema: { params: idParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return controller.delete(request, reply);
    }
  );

  // User status management
  app.post<{ Params: { id: string } }>(
    '/users/:id/suspend',
    { preHandler: [authenticate, isAdmin], schema: { params: idParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return controller.suspend(request, reply);
    }
  );
  app.post<{ Params: { id: string } }>(
    '/users/:id/ban',
    { preHandler: [authenticate, isAdmin], schema: { params: idParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return controller.ban(request, reply);
    }
  );
  app.post<{ Params: { id: string } }>(
    '/users/:id/activate',
    { preHandler: [authenticate, isAdmin], schema: { params: idParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return controller.activate(request, reply);
    }
  );
}
