import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { config } from '../../config/index.js';
import { logger } from '../../core/logger.js';
import {
  UnauthorizedError,
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../utils/errors.js';
import type { TokenPair, JwtPayload, AuthUser } from './types.js';
import type { LoginInput, RegisterInput, ChangePasswordInput } from './schemas.js';

// Token blacklist (in production, use Redis)
const tokenBlacklist = new Set<string>();

export class AuthService {
  private app: FastifyInstance;
  private readonly SALT_ROUNDS = 12;

  constructor(app: FastifyInstance) {
    this.app = app;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateTokenPair(user: AuthUser): TokenPair {
    const accessPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    const refreshPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
    };

    const accessToken = this.app.jwt.sign(accessPayload, {
      expiresIn: config.jwt.accessExpiresIn,
    });

    const refreshToken = this.app.jwt.sign(refreshPayload, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    // Parse expiration time to seconds
    const expiresIn = this.parseExpiration(config.jwt.accessExpiresIn);

    return { accessToken, refreshToken, expiresIn };
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1] || '0', 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      if (this.isTokenBlacklisted(token)) {
        throw new UnauthorizedError('Token has been revoked');
      }

      const payload = this.app.jwt.verify<JwtPayload>(token);

      if (payload.type !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      logger.debug({ err: error }, 'Token verification failed');
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      if (this.isTokenBlacklisted(token)) {
        throw new UnauthorizedError('Token has been revoked');
      }

      const payload = this.app.jwt.verify<JwtPayload>(token);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      logger.debug({ err: error }, 'Refresh token verification failed');
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  blacklistToken(token: string): void {
    tokenBlacklist.add(token);
    logger.debug('Token blacklisted');
  }

  isTokenBlacklisted(token: string): boolean {
    return tokenBlacklist.has(token);
  }

  // Clear expired tokens from blacklist periodically
  cleanupBlacklist(): void {
    // In production, this should be handled by Redis TTL
    tokenBlacklist.clear();
    logger.debug('Token blacklist cleared');
  }
}

export function createAuthService(app: FastifyInstance): AuthService {
  return new AuthService(app);
}
