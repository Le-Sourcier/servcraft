import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserService } from './user.service.js';
import { updateUserSchema, updateProfileSchema, userQuerySchema } from './schemas.js';
import { success, noContent } from '../../utils/response.js';
import { parsePaginationParams } from '../../utils/pagination.js';
import { validateBody, validateQuery } from '../validation/validator.js';
import type { AuthenticatedRequest } from '../auth/types.js';
import { ForbiddenError } from '../../utils/errors.js';
import type { User } from './types.js';

// Helper to remove password from user object
function omitPassword(user: User): Omit<User, 'password'> {
  const { password, ...userData } = user;
  void password; // Explicitly mark as intentionally unused
  return userData;
}

export class UserController {
  constructor(private userService: UserService) {}

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = validateQuery(userQuerySchema, request.query);
    const pagination = parsePaginationParams(query);

    const filters = {
      status: query.status,
      role: query.role,
      search: query.search,
      emailVerified: query.emailVerified,
    };

    const result = await this.userService.findMany(pagination, filters);
    success(reply, result);
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const user = await this.userService.findById(request.params.id);

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
      });
    }

    // Remove password from response
    success(reply, omitPassword(user));
  }

  async update(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const data = validateBody(updateUserSchema, request.body);
    const user = await this.userService.update(request.params.id, data);

    success(reply, omitPassword(user));
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const authRequest = request as AuthenticatedRequest;

    // Prevent self-deletion
    if (authRequest.user.id === request.params.id) {
      throw new ForbiddenError('Cannot delete your own account');
    }

    await this.userService.delete(request.params.id);
    noContent(reply);
  }

  async suspend(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const authRequest = request as AuthenticatedRequest;

    if (authRequest.user.id === request.params.id) {
      throw new ForbiddenError('Cannot suspend your own account');
    }

    const user = await this.userService.suspend(request.params.id);
    const userData = omitPassword(user);
    success(reply, userData);
  }

  async ban(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const authRequest = request as AuthenticatedRequest;

    if (authRequest.user.id === request.params.id) {
      throw new ForbiddenError('Cannot ban your own account');
    }

    const user = await this.userService.ban(request.params.id);
    const userData = omitPassword(user);
    success(reply, userData);
  }

  async activate(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const user = await this.userService.activate(request.params.id);
    const userData = omitPassword(user);
    success(reply, userData);
  }

  // Profile routes (for authenticated user)
  async getProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authRequest = request as AuthenticatedRequest;
    const user = await this.userService.findById(authRequest.user.id);

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
      });
    }

    const userData = omitPassword(user);
    success(reply, userData);
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authRequest = request as AuthenticatedRequest;
    const data = validateBody(updateProfileSchema, request.body);

    const user = await this.userService.update(authRequest.user.id, data);
    const userData = omitPassword(user);
    success(reply, userData);
  }
}

export function createUserController(userService: UserService): UserController {
  return new UserController(userService);
}
