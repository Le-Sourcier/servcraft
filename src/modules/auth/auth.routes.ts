import type { FastifyInstance } from 'fastify';
import type { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';
import { createAuthMiddleware } from './auth.middleware.js';

export function registerAuthRoutes(
  app: FastifyInstance,
  controller: AuthController,
  authService: AuthService
): void {
  const authenticate = createAuthMiddleware(authService);

  // Public routes
  app.post('/auth/register', controller.register.bind(controller));
  app.post('/auth/login', controller.login.bind(controller));
  app.post('/auth/refresh', controller.refresh.bind(controller));

  // Protected routes
  app.post('/auth/logout', { preHandler: [authenticate] }, controller.logout.bind(controller));
  app.get('/auth/me', { preHandler: [authenticate] }, controller.me.bind(controller));
  app.post(
    '/auth/change-password',
    { preHandler: [authenticate] },
    controller.changePassword.bind(controller)
  );
}
