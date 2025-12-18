import type { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { config } from '../../config/index.js';
import { logger } from '../../core/logger.js';
import { AuthService, createAuthService } from './auth.service.js';
import { AuthController, createAuthController } from './auth.controller.js';
import { registerAuthRoutes } from './auth.routes.js';
import { createUserService } from '../user/user.service.js';

export async function registerAuthModule(app: FastifyInstance): Promise<void> {
  // Register JWT plugin
  await app.register(jwt, {
    secret: config.jwt.secret,
    sign: {
      algorithm: 'HS256',
    },
  });

  // Register cookie plugin for refresh tokens
  await app.register(cookie, {
    secret: config.jwt.secret,
    hook: 'onRequest',
  });

  // Create services
  const authService = createAuthService(app);
  const userService = createUserService();

  // Create controller
  const authController = createAuthController(authService, userService);

  // Register routes
  registerAuthRoutes(app, authController, authService);

  logger.info('Auth module registered');
}

export { AuthService, createAuthService } from './auth.service.js';
export { AuthController, createAuthController } from './auth.controller.js';
export {
  createAuthMiddleware,
  createRoleMiddleware,
  createPermissionMiddleware,
  createOptionalAuthMiddleware,
} from './auth.middleware.js';
export * from './types.js';
export * from './schemas.js';
