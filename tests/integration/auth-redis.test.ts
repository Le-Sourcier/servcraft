import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import Redis from 'ioredis';
import { AuthService } from '../../src/modules/auth/auth.service.js';

describe('Auth Service - Redis Token Blacklist Integration', () => {
  let app: FastifyInstance;
  let authService: AuthService;
  let redis: Redis;
  const testRedisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  beforeAll(async () => {
    // Setup Fastify with JWT
    app = Fastify({ logger: false });
    await app.register(fastifyJwt, {
      secret: 'test-secret-key-min-32-characters-long-for-security',
    });

    // Setup Redis client for verification
    redis = new Redis(testRedisUrl);

    // Wait for Redis connection
    await new Promise((resolve) => {
      redis.once('ready', resolve);
    });

    // Create AuthService with Redis
    authService = new AuthService(app, testRedisUrl);

    // Give it a moment to connect
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await authService.close();
    await redis.quit();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test keys before each test
    const keys = await redis.keys('auth:blacklist:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('Token Generation', () => {
    it('should generate valid token pair', () => {
      const tokens = authService.generateTokenPair({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
      });

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(typeof tokens.expiresIn).toBe('number');
    });

    it('should generate tokens with correct payload', async () => {
      const user = {
        id: 'test-user-123',
        email: 'test@example.com',
        role: 'admin' as const,
      };

      const tokens = authService.generateTokenPair(user);
      const payload = await authService.verifyAccessToken(tokens.accessToken);

      expect(payload.sub).toBe(user.id);
      expect(payload.email).toBe(user.email);
      expect(payload.role).toBe(user.role);
      expect(payload.type).toBe('access');
    });
  });

  describe('Token Verification', () => {
    it('should verify valid access token', async () => {
      const tokens = authService.generateTokenPair({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      const payload = await authService.verifyAccessToken(tokens.accessToken);
      expect(payload).toBeDefined();
      expect(payload.sub).toBe('user-1');
      expect(payload.type).toBe('access');
    });

    it('should verify valid refresh token', async () => {
      const tokens = authService.generateTokenPair({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      const payload = await authService.verifyRefreshToken(tokens.refreshToken);
      expect(payload).toBeDefined();
      expect(payload.sub).toBe('user-1');
      expect(payload.type).toBe('refresh');
    });

    it('should reject refresh token as access token', async () => {
      const tokens = authService.generateTokenPair({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      await expect(authService.verifyAccessToken(tokens.refreshToken)).rejects.toThrow(
        'Invalid token type'
      );
    });

    it('should reject access token as refresh token', async () => {
      const tokens = authService.generateTokenPair({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      await expect(authService.verifyRefreshToken(tokens.accessToken)).rejects.toThrow(
        'Invalid token type'
      );
    });
  });

  describe('Token Blacklist - Redis', () => {
    it('should blacklist token in Redis', async () => {
      const tokens = authService.generateTokenPair({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      // Blacklist the token
      await authService.blacklistToken(tokens.accessToken);

      // Verify it's in Redis
      const key = `auth:blacklist:${tokens.accessToken}`;
      const exists = await redis.exists(key);
      expect(exists).toBe(1);
    });

    it('should detect blacklisted token', async () => {
      const tokens = authService.generateTokenPair({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      // Blacklist the token
      await authService.blacklistToken(tokens.accessToken);

      // Check if blacklisted
      const isBlacklisted = await authService.isTokenBlacklisted(tokens.accessToken);
      expect(isBlacklisted).toBe(true);
    });

    it('should reject blacklisted token on verification', async () => {
      const tokens = authService.generateTokenPair({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      // Blacklist the token
      await authService.blacklistToken(tokens.accessToken);

      // Try to verify (should fail)
      await expect(authService.verifyAccessToken(tokens.accessToken)).rejects.toThrow(
        'Token has been revoked'
      );
    });

    it('should set correct TTL on blacklisted token', async () => {
      const tokens = authService.generateTokenPair({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      await authService.blacklistToken(tokens.accessToken);

      const key = `auth:blacklist:${tokens.accessToken}`;
      const ttl = await redis.ttl(key);

      // TTL should be 7 days (604800 seconds), allow some margin
      expect(ttl).toBeGreaterThan(604700);
      expect(ttl).toBeLessThanOrEqual(604800);
    });

    it('should not affect non-blacklisted tokens', async () => {
      const tokens1 = authService.generateTokenPair({
        id: 'user-1',
        email: 'user1@example.com',
        role: 'user',
      });

      const tokens2 = authService.generateTokenPair({
        id: 'user-2',
        email: 'user2@example.com',
        role: 'user',
      });

      // Blacklist only token1
      await authService.blacklistToken(tokens1.accessToken);

      // Token1 should be blacklisted
      const isToken1Blacklisted = await authService.isTokenBlacklisted(tokens1.accessToken);
      expect(isToken1Blacklisted).toBe(true);

      // Token2 should NOT be blacklisted
      const isToken2Blacklisted = await authService.isTokenBlacklisted(tokens2.accessToken);
      expect(isToken2Blacklisted).toBe(false);

      // Token2 should still verify successfully
      const payload2 = await authService.verifyAccessToken(tokens2.accessToken);
      expect(payload2.sub).toBe('user-2');
    });
  });

  describe('Token Rotation', () => {
    it('should blacklist old refresh token on rotation', async () => {
      const tokens = authService.generateTokenPair({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      // Simulate token rotation (what happens on /auth/refresh)
      await authService.blacklistToken(tokens.refreshToken);

      // Old refresh token should be blacklisted
      const isBlacklisted = await authService.isTokenBlacklisted(tokens.refreshToken);
      expect(isBlacklisted).toBe(true);

      // Should fail to verify blacklisted refresh token
      await expect(authService.verifyRefreshToken(tokens.refreshToken)).rejects.toThrow(
        'Token has been revoked'
      );
    });
  });

  describe('Blacklist Statistics', () => {
    it('should return correct blacklist count', async () => {
      const initialCount = await authService.getBlacklistCount();

      // Generate and blacklist 3 tokens
      for (let i = 0; i < 3; i++) {
        const tokens = authService.generateTokenPair({
          id: `user-${i}`,
          email: `user${i}@example.com`,
          role: 'user',
        });
        await authService.blacklistToken(tokens.accessToken);
      }

      const finalCount = await authService.getBlacklistCount();
      expect(finalCount).toBe(initialCount + 3);
    });

    it('should handle empty blacklist', async () => {
      const count = await authService.getBlacklistCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Password Hashing', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt format
    });

    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);

      const isValid = await authService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await authService.hashPassword(password);

      const isValid = await authService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid token format', async () => {
      await expect(authService.verifyAccessToken('invalid-token')).rejects.toThrow();
    });

    it('should handle empty token', async () => {
      await expect(authService.verifyAccessToken('')).rejects.toThrow();
    });

    it('should handle malformed JWT', async () => {
      await expect(authService.verifyAccessToken('not.a.valid.jwt')).rejects.toThrow();
    });
  });

  describe('Concurrency', () => {
    it('should handle multiple simultaneous blacklist operations', async () => {
      const tokens = Array.from({ length: 10 }, (_, i) =>
        authService.generateTokenPair({
          id: `user-${i}`,
          email: `user${i}@example.com`,
          role: 'user',
        })
      );

      // Blacklist all tokens concurrently
      await Promise.all(tokens.map((t) => authService.blacklistToken(t.accessToken)));

      // Verify all are blacklisted
      const results = await Promise.all(
        tokens.map((t) => authService.isTokenBlacklisted(t.accessToken))
      );

      expect(results.every((r) => r === true)).toBe(true);
    });
  });
});
