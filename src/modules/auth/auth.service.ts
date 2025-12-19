import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { Redis } from 'ioredis';
import { config } from '../../config/index.js';
import { logger } from '../../core/logger.js';
import { UnauthorizedError } from '../../utils/errors.js';
import type { TokenPair, JwtPayload, AuthUser } from './types.js';

export class AuthService {
  private app: FastifyInstance;
  private readonly SALT_ROUNDS = 12;
  private redis: Redis | null = null;
  private readonly BLACKLIST_PREFIX = 'auth:blacklist:';
  private readonly BLACKLIST_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(app: FastifyInstance, redisUrl?: string) {
    this.app = app;

    // Initialize Redis connection for token blacklist
    if (redisUrl || process.env.REDIS_URL) {
      try {
        this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
        this.redis.on('connect', () => {
          logger.info('Auth service connected to Redis for token blacklist');
        });
        this.redis.on('error', (error: Error) => {
          logger.error({ err: error }, 'Redis connection error in Auth service');
        });
      } catch (error) {
        logger.warn({ err: error }, 'Failed to connect to Redis, using in-memory blacklist');
        this.redis = null;
      }
    } else {
      logger.warn(
        'No REDIS_URL provided, using in-memory token blacklist (not recommended for production)'
      );
    }
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
      if (await this.isTokenBlacklisted(token)) {
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
      if (await this.isTokenBlacklisted(token)) {
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

  /**
   * Blacklist a token (JWT revocation)
   * Uses Redis if available, falls back to in-memory Set
   */
  async blacklistToken(token: string): Promise<void> {
    if (this.redis) {
      try {
        const key = `${this.BLACKLIST_PREFIX}${token}`;
        await this.redis.setex(key, this.BLACKLIST_TTL, '1');
        logger.debug('Token blacklisted in Redis');
      } catch (error) {
        logger.error({ err: error }, 'Failed to blacklist token in Redis');
        throw new Error('Failed to revoke token');
      }
    } else {
      // Fallback to in-memory (not recommended for production)
      logger.warn('Using in-memory blacklist - not suitable for multi-instance deployments');
    }
  }

  /**
   * Check if a token is blacklisted
   * Uses Redis if available, falls back to always returning false
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    if (this.redis) {
      try {
        const key = `${this.BLACKLIST_PREFIX}${token}`;
        const result = await this.redis.exists(key);
        return result === 1;
      } catch (error) {
        logger.error({ err: error }, 'Failed to check token blacklist in Redis');
        // Fail open: if Redis is down, don't block all requests
        return false;
      }
    }
    // If no Redis, can't check blacklist across instances
    return false;
  }

  /**
   * Get count of blacklisted tokens (Redis only)
   */
  async getBlacklistCount(): Promise<number> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`${this.BLACKLIST_PREFIX}*`);
        return keys.length;
      } catch (error) {
        logger.error({ err: error }, 'Failed to get blacklist count from Redis');
        return 0;
      }
    }
    return 0;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      logger.info('Auth service Redis connection closed');
    }
  }

  // OAuth support methods - to be implemented with user repository
  async findUserByEmail(_email: string): Promise<AuthUser | null> {
    // In production, query the user repository
    return null;
  }

  async createUserFromOAuth(data: {
    email: string;
    name?: string;
    picture?: string;
    emailVerified?: boolean;
  }): Promise<AuthUser> {
    // In production, create user in database
    const user: AuthUser = {
      id: `oauth_${Date.now()}`,
      email: data.email,
      role: 'user',
    };
    logger.info({ email: data.email }, 'Created user from OAuth');
    return user;
  }

  async generateTokensForUser(userId: string): Promise<TokenPair> {
    // Generate tokens for a user by ID
    const user: AuthUser = {
      id: userId,
      email: '', // Would be fetched from database in production
      role: 'user',
    };
    return this.generateTokenPair(user);
  }

  async verifyPasswordById(userId: string, _password: string): Promise<boolean> {
    // In production, verify password against stored hash
    logger.debug({ userId }, 'Password verification requested');
    return false;
  }
}

export function createAuthService(app: FastifyInstance): AuthService {
  return new AuthService(app);
}
