import type { FastifyInstance } from 'fastify';
import type { UserController } from './user.controller.js';
import type { AuthService } from '../auth/auth.service.js';
import { createAuthMiddleware, createRoleMiddleware } from '../auth/auth.middleware.js';

export function registerUserRoutes(
  app: FastifyInstance,
  controller: UserController,
  authService: AuthService
): void {
  const authenticate = createAuthMiddleware(authService);
  const isAdmin = createRoleMiddleware(['admin', 'super_admin']);
  const isModerator = createRoleMiddleware(['moderator', 'admin', 'super_admin']);

  // Profile routes (authenticated users)
  app.get(
    '/profile',
    { preHandler: [authenticate] },
    controller.getProfile.bind(controller)
  );
  app.patch(
    '/profile',
    { preHandler: [authenticate] },
    controller.updateProfile.bind(controller)
  );

  // Admin routes
  app.get(
    '/users',
    { preHandler: [authenticate, isModerator] },
    controller.list.bind(controller)
  );
  app.get(
    '/users/:id',
    { preHandler: [authenticate, isModerator] },
    controller.getById.bind(controller)
  );
  app.patch(
    '/users/:id',
    { preHandler: [authenticate, isAdmin] },
    controller.update.bind(controller)
  );
  app.delete(
    '/users/:id',
    { preHandler: [authenticate, isAdmin] },
    controller.delete.bind(controller)
  );

  // User status management
  app.post(
    '/users/:id/suspend',
    { preHandler: [authenticate, isAdmin] },
    controller.suspend.bind(controller)
  );
  app.post(
    '/users/:id/ban',
    { preHandler: [authenticate, isAdmin] },
    controller.ban.bind(controller)
  );
  app.post(
    '/users/:id/activate',
    { preHandler: [authenticate, isAdmin] },
    controller.activate.bind(controller)
  );
}
