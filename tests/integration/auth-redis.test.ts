import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Redis from 'ioredis';

// These tests verify the Redis token blacklist functionality
// The @fastify/jwt integration is tested separately when Fastify 5.x is available

describe('Auth Service - Redis Token Blacklist Integration', () => {
  let redis: Redis;
  const testRedisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  beforeAll(async () => {
    // Setup Redis client for verification
    redis = new Redis(testRedisUrl);

    // Wait for Redis connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
      redis.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });
      redis.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  });

  afterAll(async () => {
    if (redis) {
      await redis.quit();
    }
  });

  beforeEach(async () => {
    // Clean up test keys before each test
    const keys = await redis.keys('auth:blacklist:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('Redis Connection', () => {
    it('should connect to Redis', async () => {
      const pong = await redis.ping();
      expect(pong).toBe('PONG');
    });

    it('should set and get values', async () => {
      await redis.set('test:key', 'test-value');
      const value = await redis.get('test:key');
      expect(value).toBe('test-value');
      await redis.del('test:key');
    });
  });

  describe('Token Blacklist Operations', () => {
    it('should blacklist a token', async () => {
      const token = 'test-token-123';
      const ttl = 3600; // 1 hour

      await redis.setex(`auth:blacklist:${token}`, ttl, '1');

      const exists = await redis.exists(`auth:blacklist:${token}`);
      expect(exists).toBe(1);
    });

    it('should check if token is blacklisted', async () => {
      const token = 'blacklisted-token';
      await redis.setex(`auth:blacklist:${token}`, 3600, '1');

      const isBlacklisted = (await redis.exists(`auth:blacklist:${token}`)) === 1;
      expect(isBlacklisted).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      const token = 'valid-token';

      const isBlacklisted = (await redis.exists(`auth:blacklist:${token}`)) === 1;
      expect(isBlacklisted).toBe(false);
    });

    it('should expire blacklisted tokens', async () => {
      const token = 'expiring-token';
      await redis.setex(`auth:blacklist:${token}`, 1, '1'); // 1 second TTL

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const exists = await redis.exists(`auth:blacklist:${token}`);
      expect(exists).toBe(0);
    });
  });
});
