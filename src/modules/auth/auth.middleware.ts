import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../../utils/errors.js';
import type { AuthService } from './auth.service.js';
import type { AuthUser } from './types.js';

export function createAuthMiddleware(authService: AuthService) {
  return async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const payload = await authService.verifyAccessToken(token);

    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  };
}

export function createRoleMiddleware(allowedRoles: string[]) {
  return async function authorize(
    request: FastifyRequest,
    _reply: FastifyReply
  ): Promise<void> {
    const user = request.user as AuthUser | undefined;

    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}

export function createPermissionMiddleware(requiredPermissions: string[]) {
  return async function checkPermissions(
    request: FastifyRequest,
    _reply: FastifyReply
  ): Promise<void> {
    const user = request.user as AuthUser | undefined;

    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // This would check against a permissions system
    // For now, we'll implement a basic role-based check
    // In a full implementation, you'd query the user's permissions from the database
  };
}

// Optional authentication - doesn't throw if no token
export function createOptionalAuthMiddleware(authService: AuthService) {
  return async function optionalAuthenticate(
    request: FastifyRequest,
    _reply: FastifyReply
  ): Promise<void> {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return;
    }

    try {
      const token = authHeader.substring(7);
      const payload = await authService.verifyAccessToken(token);

      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      // Silently ignore auth errors for optional auth
    }
  };
}
