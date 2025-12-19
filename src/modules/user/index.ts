import type { FastifyInstance } from 'fastify';
import { logger } from '../../core/logger.js';
import { createUserService } from './user.service.js';
import { createUserController } from './user.controller.js';
import { createUserRepository } from './user.repository.js';
import { registerUserRoutes } from './user.routes.js';
import type { AuthService } from '../auth/auth.service.js';

export async function registerUserModule(
  app: FastifyInstance,
  authService: AuthService
): Promise<void> {
  // Create repository and service
  const repository = createUserRepository();
  const userService = createUserService(repository);

  // Create controller
  const userController = createUserController(userService);

  // Register routes
  registerUserRoutes(app, userController, authService);

  logger.info('User module registered');
}

export { UserService, createUserService } from './user.service.js';
export { UserController, createUserController } from './user.controller.js';
export { UserRepository, createUserRepository } from './user.repository.js';
export * from './types.js';
export * from './schemas.js';
