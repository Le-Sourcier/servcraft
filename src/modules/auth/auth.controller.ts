import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthService } from './auth.service.js';
import type { UserService } from '../user/user.service.js';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from './schemas.js';
import { success, created } from '../../utils/response.js';
import { BadRequestError, UnauthorizedError } from '../../utils/errors.js';
import { validateBody } from '../validation/validator.js';
import type { AuthenticatedRequest } from './types.js';

export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService
  ) {}

  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = validateBody(registerSchema, request.body);

    // Check if user already exists
    const existingUser = await this.userService.findByEmail(data.email);
    if (existingUser) {
      throw new BadRequestError('Email already registered');
    }

    // Hash password and create user
    const hashedPassword = await this.authService.hashPassword(data.password);
    const user = await this.userService.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
    });

    // Generate tokens
    const tokens = this.authService.generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    created(reply, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    });
  }

  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = validateBody(loginSchema, request.body);

    // Find user
    const user = await this.userService.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    // Verify password
    const isValidPassword = await this.authService.verifyPassword(data.password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Generate tokens
    const tokens = this.authService.generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    success(reply, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    });
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = validateBody(refreshTokenSchema, request.body);

    // Verify refresh token
    const payload = await this.authService.verifyRefreshToken(data.refreshToken);

    // Get fresh user data
    const user = await this.userService.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Blacklist old refresh token (token rotation)
    this.authService.blacklistToken(data.refreshToken);

    // Generate new tokens
    const tokens = this.authService.generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    success(reply, tokens);
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      this.authService.blacklistToken(token);
    }

    success(reply, { message: 'Logged out successfully' });
  }

  async me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authRequest = request as AuthenticatedRequest;
    const user = await this.userService.findById(authRequest.user.id);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    success(reply, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    });
  }

  async changePassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authRequest = request as AuthenticatedRequest;
    const data = validateBody(changePasswordSchema, request.body);

    // Get current user
    const user = await this.userService.findById(authRequest.user.id);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const isValidPassword = await this.authService.verifyPassword(
      data.currentPassword,
      user.password
    );
    if (!isValidPassword) {
      throw new BadRequestError('Current password is incorrect');
    }

    // Hash and update password
    const hashedPassword = await this.authService.hashPassword(data.newPassword);
    await this.userService.updatePassword(user.id, hashedPassword);

    success(reply, { message: 'Password changed successfully' });
  }
}

export function createAuthController(
  authService: AuthService,
  userService: UserService
): AuthController {
  return new AuthController(authService, userService);
}
